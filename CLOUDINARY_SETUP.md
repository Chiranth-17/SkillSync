# Cloudinary Integration Setup

This project uses Cloudinary for file uploads (images, videos, PDFs).

## Environment Variables

The following environment variables must be set in `backend/.env`:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Upload Flow

1.  **Frontend**:
    *   The frontend should send a `POST` request to `/api/upload` with a `multipart/form-data` body containing a `file` field.
    *   The request must be authenticated (include `accessToken` cookie or header).

2.  **Backend**:
    *   The `upload` route uses `multer` with `multer-storage-cloudinary` to stream the file directly to Cloudinary.
    *   Upon success, Cloudinary returns the file URL and metadata.
    *   The backend responds with the file URL.

3.  **Usage**:
    *   The frontend receives the URL and can then use it to update user profiles (e.g., `avatarUrl`, `demoVideos`, `projectFiles`) via the `/api/auth/me` or other relevant endpoints.

## API Endpoint

### POST `/api/upload`

*   **Headers**: `Authorization: Bearer <token>` (or cookie)
*   **Body**: `FormData` with `file` field.
*   **Response**:
    ```json
    {
      "message": "File uploaded successfully",
      "url": "https://res.cloudinary.com/...",
      "public_id": "skillswap/..."
    }
    ```

## Security

*   Cloudinary credentials are stored only in the backend `.env` file.
*   The `.env` file is gitignored.
*   Uploads are restricted to authenticated users.
