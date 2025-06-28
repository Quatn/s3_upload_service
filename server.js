import express from "express";
import morgan from "morgan";
import {
  AWS_ACCESS_KEY_ID,
  AWS_REGION,
  AWS_SECRET_ACCESS_KEY,
  CORS_ORIGIN,
  NODE_ENV,
  PORT,
  S3_BUCKET,
  S3_ENDPOINT,
  UPLOAD_DIR,
} from "./config/env.js";
import authorize from "./middleware/authorize.js";
import formatFileUploadName from "./utils/formatFileUploadName.js";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import multer from "multer";
import cors from "cors";

const app = express();

if (NODE_ENV === "development") {
  app.use(morgan("dev"));
}
app.use(express.json());

app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
  }),
);

const s3 = new S3Client({
  region: AWS_REGION,
  endpoint: S3_ENDPOINT,
  forcePathStyle: false, // true if provider requires path-style URLs
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

const upload = multer({ storage: multer.memoryStorage() }).array("files", 10);
app.post("/uploads", authorize, upload, async (req, res) => {
  const files = req.files;
  const saveDir = req.body.saveDir || req.query.saveDir || "uploads/";

  if (!files || files.length === 0) {
    return res.status(400).json({ error: "No files uploaded" });
  }

  try {
    const uploadedFiles = [];

    for (const file of files) {
      const key =
        `${UPLOAD_DIR}/${saveDir}/${formatFileUploadName(file.originalname)}`
          .replace(/\/+/g, "/")
          .replace(/^\//, "");

      await s3.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );

      const url = S3_ENDPOINT + `/${S3_BUCKET}/${key}`.replace(/\/+/g, "/");
      uploadedFiles.push({ file: file.originalname, url });
    }

    res.json({ files: uploadedFiles });
  } catch (err) {
    console.error("S3 Upload Error:", err);
    res.status(500).json({ error: "One or more uploads failed" });
  }
});

app.listen(PORT || 3000, () => {
  console.log(`Upload server running on http://localhost:${PORT}`);
});
