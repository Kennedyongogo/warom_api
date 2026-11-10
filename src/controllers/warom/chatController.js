const { Op } = require("sequelize");
const { Conversation, Message } = require("../../models");
const { orderedPair } = require("../../utils/warom/profile");
const notificationService = require("../../services/warom/notificationService");
const { ok, fail, asyncHandler } = require("../../utils/warom/response");

exports.listConversations = asyncHandler(async (req, res) => {
  const rows = await Conversation.findAll({
    where: {
      [Op.or]: [
        { participant_a_id: req.userId },
        { participant_b_id: req.userId },
      ],
    },
    order: [["last_message_at", "DESC"]],
  });
  return ok(res, rows);
});

exports.openConversation = asyncHandler(async (req, res) => {
  const otherId = req.body.user_id;
  if (!otherId) return fail(res, "user_id is required");
  const [a, b] = orderedPair(req.userId, otherId);
  const [conversation] = await Conversation.findOrCreate({
    where: { participant_a_id: a, participant_b_id: b },
  });
  return ok(res, conversation);
});

exports.listMessages = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findByPk(req.params.id);
  if (!conversation) return fail(res, "Conversation not found", 404);
  if (
    ![conversation.participant_a_id, conversation.participant_b_id].includes(
      req.userId
    )
  ) {
    return fail(res, "Forbidden", 403);
  }

  const messages = await Message.findAll({
    where: { conversation_id: conversation.id },
    order: [["created_at", "DESC"]],
    limit: Number(req.query.limit) || 50,
  });
  return ok(res, messages);
});

exports.sendMessage = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findByPk(req.params.id);
  if (!conversation) return fail(res, "Conversation not found", 404);
  if (
    ![conversation.participant_a_id, conversation.participant_b_id].includes(
      req.userId
    )
  ) {
    return fail(res, "Forbidden", 403);
  }

  const {
    message_type = "text",
    body = null,
    media_url = null,
    gift_id = null,
  } = req.body;

  const message = await Message.create({
    conversation_id: conversation.id,
    sender_id: req.userId,
    message_type,
    body,
    media_url,
    gift_id,
  });

  await conversation.update({
    last_message_at: new Date(),
    last_message_preview: body || message_type,
  });

  const recipientId =
    conversation.participant_a_id === req.userId
      ? conversation.participant_b_id
      : conversation.participant_a_id;

  await notificationService.createNotification({
    userId: recipientId,
    type: "message",
    title: "New message",
    body: body || message_type,
    data: { conversation_id: conversation.id, message_id: message.id },
  });

  return ok(res, message, "Sent", 201);
});
