const notificationService = require("../../services/warom/notificationService");
const { ok, fail, asyncHandler } = require("../../utils/warom/response");

exports.list = asyncHandler(async (req, res) => {
  const rows = await notificationService.listForUser(req.userId, {
    unreadOnly: req.query.unread === "true",
    limit: Number(req.query.limit) || 50,
  });
  return ok(res, rows);
});

exports.markRead = asyncHandler(async (req, res) => {
  const row = await notificationService.markRead(req.userId, req.params.id);
  if (!row) return fail(res, "Notification not found", 404);
  return ok(res, row, "Marked read");
});
