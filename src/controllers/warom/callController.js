const { Op } = require("sequelize");
const { Call, User } = require("../../models");
const notificationService = require("../../services/warom/notificationService");
const monetizationService = require("../../services/warom/monetizationService");
const { emitToUser } = require("../../realtime/socket");
const { publicProfile } = require("../../utils/warom/profile");
const { ok, fail, asyncHandler } = require("../../utils/warom/response");

exports.start = asyncHandler(async (req, res) => {
  const { callee_id, call_type } = req.body;
  if (!callee_id || !["voice", "video"].includes(call_type)) {
    return fail(res, "callee_id and call_type (voice|video) are required");
  }

  const callee = await User.findByPk(callee_id);
  if (!callee || callee.status !== "active") {
    return fail(res, "Callee not found", 404);
  }

  let charge = null;
  if (req.accountType === "user" && callee.account_type === "chatter") {
    try {
      charge = await monetizationService.chargeAndCreditChatter({
        spender: req.user,
        chatter: callee,
        transactionType: call_type === "video" ? "video_call" : "voice_call",
        coinCost: monetizationService.defaultCostFor(
          call_type === "video" ? "video_call" : "voice_call"
        ),
        referenceType: call_type === "video" ? "video_call" : "voice_call",
        description: `${call_type} call start`,
        metadata: { callee_id },
      });
    } catch (err) {
      return fail(res, err.message, 402);
    }
  }

  const call = await Call.create({
    caller_id: req.userId,
    callee_id,
    call_type,
    status: "ringing",
    coin_cost: charge ? charge.cost : 0,
  });

  if (charge?.hold) {
    await charge.hold.update({ source_id: call.id });
  }

  await notificationService.createNotification({
    userId: callee_id,
    type: "call",
    title: `Incoming ${call_type} call`,
    data: { call_id: call.id, caller_id: req.userId },
  });

  emitToUser(callee_id, "call:incoming", {
    call,
    caller_id: req.userId,
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

  const peerId =
    call.caller_id === req.userId ? call.callee_id : call.caller_id;
  emitToUser(peerId, "call:status", { call });
  if (signalling_payload) {
    emitToUser(peerId, "call:signal", {
      call_id: call.id,
      from_user_id: req.userId,
      signalling_payload,
    });
  }

  return ok(res, call, "Call updated");
});

exports.history = asyncHandler(async (req, res) => {
  const where = {
    [Op.or]: [{ caller_id: req.userId }, { callee_id: req.userId }],
  };
  if (req.query.status === "missed") {
    where.status = "missed";
  } else if (req.query.status) {
    where.status = req.query.status;
  }
  if (req.query.call_type) where.call_type = req.query.call_type;

  const rows = await Call.findAll({
    where,
    order: [["created_at", "DESC"]],
    limit: Number(req.query.limit) || 50,
  });

  const peerIds = [
    ...new Set(
      rows.flatMap((c) => [c.caller_id, c.callee_id]).filter((id) => id !== req.userId)
    ),
  ];
  const users = await User.findAll({ where: { id: peerIds } });
  const byId = Object.fromEntries(users.map((u) => [u.id, publicProfile(u)]));

  return ok(
    res,
    rows.map((c) => {
      const peerId = c.caller_id === req.userId ? c.callee_id : c.caller_id;
      return {
        ...c.toJSON(),
        direction: c.caller_id === req.userId ? "outgoing" : "incoming",
        peer: byId[peerId] || null,
      };
    })
  );
});

exports.missed = asyncHandler(async (req, res) => {
  req.query = { ...req.query, status: "missed" };
  return exports.history(req, res);
});
