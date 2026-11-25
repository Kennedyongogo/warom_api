const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

const folders = {
  profile: "profiles",
  cover: "covers",
  chat: "chat-media",
  gift: "gifts",
  verification: "verifications",
  locked: "locked-photos",
  report: "reports",
  misc: "misc",
};

const uploadsRoot = path.join(__dirname, "..", "..", "..", "uploads");

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const kind = req.params.kind || req.query.kind || "misc";
    const folder = folders[kind] || folders.misc;
    const dest = path.join(uploadsRoot, folder);
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    cb(null, `${Date.now()}_${crypto.randomUUID()}${ext}`);
  },
});

const allowed = new Set([
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/x-png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
  "image/*",
  "application/octet-stream", // some Android pickers omit a real image MIME
  "video/mp4",
  "video/quicktime",
  "audio/mpeg",
  "audio/mp4",
  "audio/aac",
  "audio/wav",
  "audio/webm",
  "application/pdf",
]);

const imageExt = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif"]);

const upload = multer({
  storage,
  limits: { fileSize: 40 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const mime = String(file.mimetype || "").toLowerCase();
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (allowed.has(mime) || mime.startsWith("image/")) return cb(null, true);
    // Android sometimes sends octet-stream / empty type for gallery JPEGs.
    if ((!mime || mime === "application/octet-stream") && imageExt.has(ext)) {
      return cb(null, true);
    }
    cb(new Error(`Unsupported file type: ${file.mimetype || "unknown"}`));
  },
});

const publicUrlFor = (req, file) => {
  const kind = req.params.kind || req.query.kind || "misc";
  const folder = folders[kind] || folders.misc;
  return `/uploads/${folder}/${file.filename}`;
};

module.exports = { upload, publicUrlFor, folders };
