const http = require("http");
const { app, appInitialized } = require("./app");
const config = require("./config/config");
const { testConnections } = require("./config/database");
const { attachRealtime } = require("./realtime/socket");
const { startEarningsReleaseJob } = require("./jobs/earningsReleaseJob");

const PORT = process.env.PORT || 4000;

let serverInstance = null;
let isStarting = false;

async function createServer() {
  if (isStarting) {
    console.log("⚠️ Server is already starting, skipping...");
    return null;
  }

  if (serverInstance) {
    console.log("⚠️ Server instance already exists, returning existing instance");
    return serverInstance;
  }

  isStarting = true;

  try {
    await testConnections();
    await appInitialized;

    const server = http.createServer(app);

    // Keep HTTP/admin login up even if realtime/cron fail in production.
    try {
      attachRealtime(server);
    } catch (err) {
      console.error("⚠️ Socket.IO attach failed:", err.message);
    }
    try {
      startEarningsReleaseJob();
    } catch (err) {
      console.error("⚠️ Earnings release job failed to start:", err.message);
    }

    // Bind all interfaces so Docker/nginx can reach the API.
    server.listen(PORT, "0.0.0.0", () => {
      isStarting = false;
      serverInstance = server;
      console.log(`🚀 Server listening on 0.0.0.0:${PORT} (PID: ${process.pid})`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
      console.log(
        `🗄️  Database: ${config.database.direct.database}@${config.database.direct.host}:${config.database.direct.port}`
      );
      console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
      console.log(`🔌 Socket.IO: http://localhost:${PORT}/socket.io`);
    });

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`❌ Port ${PORT} is already in use`);
        console.log("💡 Try: Kill the process using this port or use a different port");
        isStarting = false;
        process.exit(1);
      } else {
        console.error("❌ Server error:", err);
        isStarting = false;
      }
    });

    const gracefulShutdown = (signal) => {
      console.log(`🔄 Received ${signal}, shutting down gracefully...`);
      if (serverInstance) {
        serverInstance.close(() => {
          console.log(`✅ Server closed (PID: ${process.pid})`);
          serverInstance = null;
          isStarting = false;
          process.exit(0);
        });

        setTimeout(() => {
          console.error("⚠️ Forcing shutdown after timeout");
          process.exit(1);
        }, 10000);
      } else {
        process.exit(0);
      }
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    return server;
  } catch (error) {
    isStarting = false;
    console.error("❌ Failed to start server:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

module.exports = { createServer };

if (require.main === module) {
  createServer();
}
