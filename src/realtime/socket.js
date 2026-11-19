const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const config = require("../config/config");
const { User, Conversation, Message } = require("../models");
const presenceService = require("../services/warom/presenceService");
const notificationService = require("../services/warom/notificationService");

let io = null;

const getIo = () => io;

const emitToUser = (userId, event, payload) => {
  if (!io) return;
  for (const sid of presenceService.socketIdsFor(userId)) {
    io.to(sid).emit(event, payload);
  }
};

const attachRealtime = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    path: "/socket.io",
  });

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token ||
        socket.handshake.headers?.authorization?.split(" ")[1];
      if (!token) return next(new Error("Unauthorized"));
      const decoded = jwt.verify(token, config.jwtSecret);
      if (decoded.type !== "warom_user") return next(new Error("Unauthorized"));
      const user = await User.findByPk(decoded.id);
      if (!user || user.status !== "active") return next(new Error("Unauthorized"));
      socket.userId = user.id;
      socket.user = user;
      next();
    } catch (_err) {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    await presenceService.markOnline(socket.userId, socket.id);
    socket.join(`user:${socket.userId}`);
    io.emit("presence:update", { user_id: socket.userId, is_online: true });

    socket.on("presence:heartbeat", async () => {
      await presenceService.heartbeat(socket.userId);
    });

    socket.on("chat:join", async ({ conversation_id }) => {
      if (!conversation_id) return;
      const conversation = await Conversation.findByPk(conversation_id);
      if (
        !conversation ||
        ![conversation.participant_a_id, conversation.participant_b_id].includes(
          socket.userId
        )
      ) {
        return;
      }
      socket.join(`conversation:${conversation_id}`);
    });

    socket.on("chat:typing", ({ conversation_id, is_typing }) => {
      if (!conversation_id) return;
      socket.to(`conversation:${conversation_id}`).emit("chat:typing", {
        conversation_id,
        user_id: socket.userId,
        is_typing: Boolean(is_typing),
      });
    });

    socket.on("chat:message", async (payload, ack) => {
      try {
        const conversation = await Conversation.findByPk(payload?.conversation_id);
        if (
          !conversation ||
          ![conversation.participant_a_id, conversation.participant_b_id].includes(
            socket.userId
          )
        ) {
          throw new Error("Forbidden");
        }

        // Prefer REST send for monetization; this event is for fan-out after save.
        if (payload?.message) {
          const message = payload.message;
          io.to(`conversation:${conversation.id}`).emit("chat:message", {
            conversation_id: conversation.id,
            message,
          });
          const recipientId =
            conversation.participant_a_id === socket.userId
              ? conversation.participant_b_id
              : conversation.participant_a_id;
          emitToUser(recipientId, "chat:message", {
            conversation_id: conversation.id,
            message,
          });
          if (typeof ack === "function") ack({ ok: true });
          return;
        }

        const message = await Message.create({
          conversation_id: conversation.id,
          sender_id: socket.userId,
          message_type: payload.message_type || "text",
          body: payload.body || null,
          media_url: payload.media_url || null,
          gift_id: payload.gift_id || null,
        });
        await conversation.update({
          last_message_at: new Date(),
          last_message_preview: payload.body || payload.message_type || "message",
        });

        const packed = { conversation_id: conversation.id, message };
        io.to(`conversation:${conversation.id}`).emit("chat:message", packed);
        const recipientId =
          conversation.participant_a_id === socket.userId
            ? conversation.participant_b_id
            : conversation.participant_a_id;
        emitToUser(recipientId, "chat:message", packed);
        await notificationService.createNotification({
          userId: recipientId,
          type: "message",
          title: "New message",
          body: payload.body || payload.message_type || "message",
          data: { conversation_id: conversation.id, message_id: message.id },
        });
        if (typeof ack === "function") ack({ ok: true, message });
      } catch (err) {
        if (typeof ack === "function") ack({ ok: false, error: err.message });
      }
    });

    // WebRTC signalling relay (offer/answer/ice/end)
    socket.on("call:signal", ({ to_user_id, call_id, signal }) => {
      if (!to_user_id || !signal) return;
      emitToUser(to_user_id, "call:signal", {
        from_user_id: socket.userId,
        call_id,
        signal,
      });
    });

    socket.on("disconnect", async () => {
      const result = await presenceService.markOfflineSocket(socket.id);
      if (result && !result.online) {
        io.emit("presence:update", {
          user_id: result.userId,
          is_online: false,
        });
      }
    });
  });

  console.log("🔌 Socket.io realtime attached at /socket.io");
  return io;
};

module.exports = { attachRealtime, getIo, emitToUser };
