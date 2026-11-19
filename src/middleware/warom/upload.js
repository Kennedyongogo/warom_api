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

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const kind = req.params.kind || req.query.kind || "misc";
    const folder = folders[kind] || folders.misc;
    const dest = path.join(__dirname, "..", "..", "..", "uploads", folder);
    cb(null, dest);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".bin";
    cb(null, `${Date.now()}_${crypto.randomUUID()}${ext}`);
  },
});

const allowed = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/quicktime",
  "audio/mpeg",
  "audio/mp4",
  "audio/aac",
  "audio/wav",
  "audio/webm",
  "application/pdf",
]);

const upload = multer({
  storage,
  limits: { fileSize: 40 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (allowed.has(file.mimetype)) return cb(null, true);
    cb(new Error(`Unsupported file type: ${file.mimetype}`));
  },
});

const publicUrlFor = (req, file) => {
  const kind = req.params.kind || req.query.kind || "misc";
  const folder = folders[kind] || folders.misc;
  return `/uploads/${folder}/${file.filename}`;
};

module.exports = { upload, publicUrlFor, folders };
