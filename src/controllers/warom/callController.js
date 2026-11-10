const { Op } = require("sequelize");
const { Call } = require("../../models");
const notificationService = require("../../services/warom/notificationService");
const { ok, fail, asyncHandler } = require("../../utils/warom/response");

exports.start = asyncHandler(async (req, res) => {
  const { callee_id, call_type } = req.body;
  if (!callee_id || !["voice", "video"].includes(call_type)) {
    return fail(res, "callee_id and call_type (voice|video) are required");
  }

  const call = await Call.create({
    caller_id: req.userId,
    callee_id,
    call_type,
    status: "ringing",
  });

  await notificationService.createNotification({
    userId: callee_id,
    type: "call",
    title: `Incoming ${call_type} call`,
    data: { call_id: call.id, caller_id: req.userId },
  });

  return ok(res, call, "Call started", 201);
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const call = await Call.findByPk(req.params.id);
  if (!call) return fail(res, "Call not found", 404);
  if (![call.caller_id, call.callee_id].includes(req.userId)) {
    return fail(res, "Forbidden", 403);
  }

  const { status, duration_seconds, signalling_payload } = req.body;
  const patch = {};
  if (status) patch.status = status;
  if (duration_seconds !== undefined) patch.duration_seconds = duration_seconds;
  if (signalling_payload !== undefined) patch.signalling_payload = signalling_payload;
  if (status === "answered") patch.started_at = new Date();
  if (["ended", "missed", "rejected", "failed"].includes(status)) {
    patch.ended_at = new Date();
  }

  await call.update(patch);
  return ok(res, call, "Call updated");
});

exports.history = asyncHandler(async (req, res) => {
  const rows = await Call.findAll({
    where: {
      [Op.or]: [{ caller_id: req.userId }, { callee_id: req.userId }],
    },
    order: [["created_at", "DESC"]],
    limit: Number(req.query.limit) || 50,
  });
  return ok(res, rows);
});
