## Image Caption Generator

Generate concise, one-line captions for images using Google's GenAI models. This small Express service accepts an uploaded image and returns a short descriptive caption that summarizes the main subject, context, and notable attributes.

### Highlights
- Single endpoint: POST /api/v1/caption
- Accepts multipart/form-data uploads (field name: `image`)
- Uses the `@google/genai` library to run an image understanding + text generation model
- Removes uploaded files after processing (best-effort cleanup)

---

## Quick start

Prerequisites

- Node.js (v16+ recommended)
- npm
- A Google GenAI key or service credentials (see notes below)

1. Install dependencies

```powershell
npm install
```

2. Add environment variables

Create a `.env` file in the project root or set env vars in your environment. The project reads the following variables:

- `PORT` — port the server listens on (defaults to `3000`)
- `ORIGIN` — allowed CORS origin (optional)
- `BODY_LIMIT` — request body size limit for JSON/urlencoded (defaults to `10mb`)
- Credentials required by `@google/genai` — how you provide them depends on your Google setup (see "Google credentials" below)

Example `.env` file:

```text
PORT=3000
ORIGIN=http://localhost:5173
BODY_LIMIT=10mb
# Set your Google credentials according to the GenAI SDK docs
# GEMINI_API_KEY=...
```

3. Run the app

```powershell
npm run start
```

By default the server will log "App listening on <PORT>".

---

## API

POST /api/v1/caption

- Content-Type: multipart/form-data
- Form field: `image` (the image file to caption)

Success response

- Status: 200
- Body: JSON { caption: string }

Error responses

- 400: { error: "No image file uploaded" } when the `image` field is missing
- 500: { error: "Failed to generate caption" } for internal errors

Example — curl (cross-platform)

```powershell
# Using curl on Windows PowerShell
curl --location --request POST 'http://localhost:3000/api/v1/caption' \
  --form "image=@C:\path\to\photo.jpg"
```

Example — PowerShell native (Invoke-RestMethod)

```powershell
Invoke-RestMethod -Uri 'http://localhost:3000/api/v1/caption' -Method Post -Form @{ image = Get-Item 'C:\path\to\photo.jpg' }
```

Example response

```json
{
  "caption": "A smiling child holding a red balloon at a park"
}
```

---

## Internals / How it works

- The server is an Express app (`index.js`) that uses `multer` to accept file uploads into the `uploads/` folder.
- The file bytes are read and converted to base64 and sent to the Google GenAI client (`@google/genai`) as inline data along with a short instruction prompt asking for a concise one-line caption.
- The server attempts to delete the uploaded file after generating the caption (best-effort; deletion errors are logged but do not block the response).
- The code tries multiple result shapes to extract the text from the GenAI response since SDKs can return different structures.

Supported image file extensions by the helper function: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`. If extension is unknown the handler uses `application/octet-stream` as a fallback mime-type.

### Key files

- `index.js` — main Express server and captioning logic
- `package.json` — dependencies and scripts
- `uploads/` — temporary destination for uploaded files (created by multer)

---

## Environment & Google credentials

The project depends on the Google GenAI SDK. How you authenticate depends on the Google product and account setup:

- Option A — API Key: set a `GOOGLE_API_KEY` (or the key name required by the SDK) in `.env` and ensure the SDK reads it. (Check `@google/genai` docs for the exact env var expected.)
- Option B — Service account: set `GOOGLE_APPLICATION_CREDENTIALS` to a JSON file path of a Google service account key if the SDK supports ADC.

If you are unsure, consult the `@google/genai` documentation for authentication instructions that match your environment. I intentionally left the exact env var name flexible because the GenAI SDK may accept multiple auth patterns.

---

## Contract (brief)

- Input: multipart/form-data with `image` file (binary)
- Output: JSON { caption: string }
- Errors: 400 for missing file, 500 for server/genAI errors

Edge cases to consider

- Very large images (exceed BODY_LIMIT) — tune `BODY_LIMIT` or resize client-side
- Unsupported formats — server will fallback to application/octet-stream and result can fail
- Rate limits & costs from GenAI — add retries/backoff and usage caps
- Concurrent uploads — multer writes to disk; for heavy traffic consider streaming or direct upload to cloud storage

---

## Security & privacy notes

- Uploaded images are stored temporarily on disk and removed after processing; however, deletion is best-effort — consider using a secure, ephemeral store (or immediately stream to the GenAI API) for sensitive images.
- Protect your Google credentials and never commit them to source control.

---

## Possible improvements

1. Add an authentication layer (API key or token) to protect the captioning endpoint.
2. Store captions and metadata in a database for analytics and history.
3. Add unit tests and integration tests for the endpoint.
4. Use streaming upload and avoid writing to disk for large-scale production use.
5. Add example client code (React/Vue) that uploads an image and displays the caption with progress.

---

## Troubleshooting

- If you see errors from the GenAI call, verify your credentials and that the installed `@google/genai` version supports the model used in `index.js`.
- If uploads fail, ensure `uploads/` is writable and your `multer` configuration is correct.

---

If you'd like, I can also:
- Add a simple HTML + JavaScript frontend to upload images and display captions
- Add logging, request validation, or tests
- Wire up a persistent store for captions

Would you like me to create any of those next?
