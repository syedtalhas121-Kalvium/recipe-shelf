import { v2 as cloudinary } from "cloudinary";
import { Readable } from "node:stream";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export function uploadCover(buffer) {
  return new Promise((resolve, reject) => {
    const configured =
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET;

    if (!configured) {
      reject(new Error("Cloudinary credentials are not configured"));
      return;
    }

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "recipeshelf/covers",
        resource_type: "image",
        allowed_formats: ["jpg", "png"],
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result?.secure_url || !result?.public_id) {
          return reject(new Error("Cloudinary returned an incomplete upload result"));
        }
        return resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
        });
      }
    );

    Readable.from(buffer).pipe(stream);
  });
}

export function deleteCover(publicId) {
  if (!publicId) return Promise.resolve(null);
  return cloudinary.uploader.destroy(publicId, { resource_type: "image" });
}
