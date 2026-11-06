import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import upload from "./config/upload.js";
import { uploadCover, deleteCover } from "./config/cloudinary.js";

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const recipes = [
  { id: "r1", title: "Roasted Tomato Pasta", coverUrl: null, coverPublicId: null },
  { id: "r2", title: "Lemon Rice Bowl", coverUrl: null, coverPublicId: null },
];

app.get("/health", (req, res) => {
  res.json({ status: "ok", app: "RecipeShelf" });
});

app.get("/api/recipes", (req, res) => {
  res.json({ recipes });
});

app.get("/api/recipes/:recipeId", (req, res) => {
  const recipe = recipes.find((item) => item.id === req.params.recipeId);
  if (!recipe) return res.status(404).json({ message: "Recipe not found" });
  return res.json({ recipe });
});

// Reject unknown IDs before Multer buffers the upload or Cloudinary creates an asset.
function requireRecipe(req, res, next) {
  const recipe = recipes.find((item) => item.id === req.params.recipeId);
  if (!recipe) return res.status(404).json({ message: "Recipe not found" });
  req.recipe = recipe;
  return next();
}

app.post(
  "/api/recipes/:recipeId/cover",
  requireRecipe,
  upload.single("cover"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "Cover image is required" });
    }

    const oldPublicId = req.recipe.coverPublicId;

    try {
      const uploaded = await uploadCover(req.file.buffer);

      // Save the new metadata first. The previous cover remains usable until this point.
      req.recipe.coverUrl = uploaded.secure_url;
      req.recipe.coverPublicId = uploaded.public_id;

      // Cleanup is deliberately last; failure cannot invalidate the newly saved cover.
      if (oldPublicId && oldPublicId !== uploaded.public_id) {
        try {
          const deletion = await deleteCover(oldPublicId);
          if (deletion?.result !== "ok" && deletion?.result !== "not found") {
            console.error("Cloudinary did not confirm old-cover deletion:", deletion);
          }
        } catch (error) {
          console.error("Could not delete previous Cloudinary cover:", error);
        }
      }

      return res.status(201).json({
        recipeId: req.recipe.id,
        coverUrl: uploaded.secure_url,
      });
    } catch (error) {
      console.error("Cloudinary cover upload failed:", error);
      return res.status(502).json({ message: "Cover storage service is unavailable" });
    }
  }
);

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ message: "Cover image must be 4 MB or smaller" });
    }
    if (error.code === "LIMIT_UNEXPECTED_FILE" || error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({ message: "Upload one file using multipart field 'cover'" });
    }
    return res.status(400).json({ message: "Invalid upload request" });
  }

  if (error.message === "Only JPG and PNG images are allowed") {
    return res.status(400).json({ message: error.message });
  }

  console.error(error);
  return res.status(500).json({ message: "Unexpected server error" });
});

app.listen(port, () => {
  console.log(`RecipeShelf API running on http://localhost:${port}`);
});
