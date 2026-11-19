const express = require("express");
const path = require("path");
const cors = require("cors");
const fs = require("fs");
const { initializeModels, setupAssociations } = require("./models");
const { errorHandler } = require("./middleware/errorHandler");
const { seedDefaults } = require("./services/warom/seedDefaults");

const authRoutes = require("./routes/warom/authRoutes");
const profileRoutes = require("./routes/warom/profileRoutes");
const socialRoutes = require("./routes/warom/socialRoutes");
const discoveryRoutes = require("./routes/warom/discoveryRoutes");
const chatRoutes = require("./routes/warom/chatRoutes");
const callRoutes = require("./routes/warom/callRoutes");
const walletRoutes = require("./routes/warom/walletRoutes");
const incomeRoutes = require("./routes/warom/incomeRoutes");
const vipRoutes = require("./routes/warom/vipRoutes");
const notificationRoutes = require("./routes/warom/notificationRoutes");
const reportRoutes = require("./routes/warom/reportRoutes");
const publicSiteRoutes = require("./routes/warom/publicSiteRoutes");
const adminRoutes = require("./routes/warom/adminRoutes");
const mediaRoutes = require("./routes/warom/mediaRoutes");
const verificationRoutes = require("./routes/warom/verificationRoutes");
const lockedPhotoRoutes = require("./routes/warom/lockedPhotoRoutes");
const presenceRoutes = require("./routes/warom/presenceRoutes");
const liveStreamRoutes = require("./routes/warom/liveStreamRoutes");

const app = express();

app.use(
  express.json({
    limit: "50mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cors());

const uploadDirs = [
  "profiles",
  "covers",
  "chat-media",
  "gifts",
  "verifications",
  "locked-photos",
  "reports",
  "misc",
].map((dir) => path.join(__dirname, "..", "uploads", dir));

uploadDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const name = path.basename(dir);
  app.use(`/uploads/${name}`, express.static(dir));
});

console.log("🔗 Registering WAROM API routes...");

app.use("/api/auth", authRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/social", socialRoutes);
app.use("/api/feed", discoveryRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/calls", callRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/income", incomeRoutes);
app.use("/api/vip", vipRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/site", publicSiteRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/verification", verificationRoutes);
app.use("/api/locked-photos", lockedPhotoRoutes);
app.use("/api/presence", presenceRoutes);
app.use("/api/live-streams", liveStreamRoutes);

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "WAROM API is running",
    timestamp: new Date().toISOString(),
    version: "2.2.0-warom",
    features: [
      "auth",
      "social-login",
      "profiles",
      "privacy",
      "social",
      "discovery",
      "chats",
      "calls",
      "live-streams",
      "wallet",
      "income",
      "vip",
      "notifications",
      "media",
      "verification",
      "locked-photos",
      "presence",
      "device-tokens",
      "reports",
      "realtime-socket",
      "admin-ops",
    ],
  });
});

app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({
      success: false,
      message: "API endpoint not found",
      path: req.originalUrl,
    });
  }
  next();
});

app.use(errorHandler);

const initializeApp = async () => {
  console.log("🚀 Initializing WAROM application...");
  await initializeModels();
  setupAssociations();
  try {
    await seedDefaults();
  } catch (err) {
    // Do not block auth/admin login if catalogue seeding fails.
    console.error("⚠️ seedDefaults failed:", err.message);
  }
  console.log("✅ WAROM application initialized");
  return true;
};

const appInitialized = initializeApp();

module.exports = { app, appInitialized };
