import express from "express";
import cors from "cors";
import { config } from "dotenv";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import fs from "fs/promises";
import path from "path";
const upload = multer({ dest: "uploads/" });

config();

const app = express();

const LIMIT = process.env.BODY_LIMIT || "10mb";
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: process.env.ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: LIMIT }));
app.use(
  express.urlencoded({
    limit: LIMIT,
    extended: true,
  })
);

async function getMimeTypeFromPath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

async function generateImageCaption(imagePath, providedMimeType) {
  // Prefer the provided mime type (from multer) to avoid "application/octet-stream" for extensionless files
  const mimeType = providedMimeType || (await getMimeTypeFromPath(imagePath));

  // Read file bytes and convert to base64
  const buffer = await fs.readFile(imagePath);
  const base64ImageData = buffer.toString("base64");

  console.log("Converted Image into base64ImageData!!");
  const ai = new GoogleGenAI({});

  console.log("Generating caption for the give image!!");
  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        inlineData: {
          mimeType,
          data: base64ImageData,
        },
      },
      {
        text: "You are given an image. Generate a concise one-line caption that describes the main subject, context, and notable attributes.",
      },
    ],
  });

  // Try several common result shapes to extract the caption text
  const caption =
    result?.text ||
    result?.output?.[0]?.content?.find((c) => c.text)?.text ||
    result?.candidates?.[0]?.content?.[0]?.text ||
    (typeof result === "string" ? result : JSON.stringify(result));

  console.log("generated caption for the given image");
  return caption;
}

app.post("/api/v1/caption", upload.single("image"), async (req, res) => {
  const image = req.file;
  if (!image) {
    return res.status(400).json({ error: "No image file uploaded" });
  }

  try {
    console.log("Image Captioning started!!");
    // Pass multer's detected mimetype to avoid unsupported MIME errors
    const caption = await generateImageCaption(image.path, image.mimetype);

    console.log("deleted the image from the backend!!");
    // Attempt to remove the uploaded file (best-effort)
    fs.unlink(image.path).catch((e) => {
      console.warn("Failed to delete uploaded file:", e?.message || e);
    });

    return res.json({ caption });
  } catch (err) {
    console.error("Caption generation error:", err);

    // Clean up uploaded file even on error
    fs.unlink(req.file.path).catch(() => {});

    return res.status(500).json({ error: "Failed to generate caption" });
  }
});

app.listen(PORT, () => {
  console.log(`App listening on ${PORT}`);
});
