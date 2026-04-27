import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { sendResponse } from "../utils/response.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const RESUMES_DIR = path.join(__dirname, "..", "uploads", "resumes");

export function ensureResumesDir() {
  fs.mkdirSync(RESUMES_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureResumesDir();
    cb(null, RESUMES_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "") || ".pdf";
    const safeExt = ext.toLowerCase() === ".pdf" ? ".pdf" : ".pdf";
    cb(null, `${req.auth.userId}-${Date.now()}${safeExt}`);
  },
});

export const resumeUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      cb(new Error("Only PDF resumes are allowed"));
      return;
    }
    cb(null, true);
  },
});

/** Runs multer and returns JSON errors (avoids relying on Express error middleware). */
export function uploadResumeMiddleware(req, res, next) {
  resumeUpload.single("resume")(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return sendResponse(res, {
        success: false,
        statusCode: 400,
        message: "Resume must be 5MB or smaller",
      });
    }
    return sendResponse(res, {
      success: false,
      statusCode: 400,
      message: err.message || "Upload failed",
    });
  });
}
