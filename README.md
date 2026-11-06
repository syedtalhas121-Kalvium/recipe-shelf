# RecipeShelf Cloudinary Cover Upload

An Express API that stores recipe cover images in Cloudinary instead of ephemeral application-server disk.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

Fill the Cloudinary values in `.env` using your Cloudinary dashboard. Credentials are read only by the server; never commit `.env` or expose the API secret to frontend code.

## API

- `GET /health`
- `GET /api/recipes`
- `GET /api/recipes/:recipeId`
- `POST /api/recipes/:recipeId/cover`

Send the cover request as multipart form-data with exactly one file in field **`cover`**. Only JPG (`image/jpeg`) and PNG (`image/png`) are accepted, with a strict 4 MB maximum.

Successful uploads return HTTP `201` and preserve this response contract:

```json
{
  "recipeId": "r1",
  "coverUrl": "https://res.cloudinary.com/..."
}
```

## Upload and replacement behavior

1. The route looks up the recipe before Multer processes the upload, so an unknown recipe returns `404` without creating cloud media.
2. Multer uses `memoryStorage()`; accepted bytes are available as `req.file.buffer`.
3. The buffer is streamed with `cloudinary.uploader.upload_stream` into `recipeshelf/covers` as an image.
4. The recipe receives Cloudinary's `secure_url` and `public_id`.
5. On replacement, the new URL and public ID are saved before the previous Cloudinary asset is deleted. A cleanup failure is logged and does not invalidate the new cover.

## Error handling

- `400`: missing file, unexpected multipart field, or unsupported MIME type
- `404`: unknown recipe
- `413`: file larger than 4 MB
- `502`: Cloudinary upload/configuration failure

## Notes

Recipe records in this starter are held in memory, so recipe metadata resets when the process restarts. A production database-backed version should persist `coverUrl` and `coverPublicId` before deleting the old Cloudinary asset.
