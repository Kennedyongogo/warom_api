const { LiveStream, User } = require("../../models");
const { publicProfile } = require("../../utils/warom/profile");
const { emitToUser, getIo } = require("../../realtime/socket");
const { ok, fail, asyncHandler } = require("../../utils/warom/response");

exports.listLive = asyncHandler(async (req, res) => {
  const where = { status: "live" };
  if (req.query.host_id) where.host_id = req.query.host_id;
  const rows = await LiveStream.findAll({
    where,
    order: [["viewer_count", "DESC"], ["started_at", "DESC"]],
    limit: Number(req.query.limit) || 50,
  });
  const hostIds = [...new Set(rows.map((r) => r.host_id))];
  const hosts = await User.findAll({ where: { id: hostIds } });
  const byId = Object.fromEntries(hosts.map((h) => [h.id, publicProfile(h)]));
  return ok(
    res,
    rows.map((r) => ({
      ...r.toJSON(),
      host: byId[r.host_id] || null,
    }))
  );
});

exports.mine = asyncHandler(async (req, res) => {
  const rows = await LiveStream.findAll({
    where: { host_id: req.userId },
    order: [["created_at", "DESC"]],
    limit: Number(req.query.limit) || 50,
  });
  return ok(res, rows);
});

exports.getById = asyncHandler(async (req, res) => {
  const row = await LiveStream.findByPk(req.params.id);
  if (!row) return fail(res, "Stream not found", 404);
  const host = await User.findByPk(row.host_id);
  return ok(res, { ...row.toJSON(), host: publicProfile(host) });
});

exports.start = asyncHandler(async (req, res) => {
  if (req.accountType !== "chatter") {
    return fail(res, "Only chatters can start live streams", 403);
  }
  const title = (req.body.title || "").trim();
  if (!title) return fail(res, "title is required");

  const existing = await LiveStream.findOne({
    where: { host_id: req.userId, status: "live" },
  });
  if (existing) return fail(res, "You already have a live stream", 409);

  const row = await LiveStream.create({
    host_id: req.userId,
    title,
    status: "live",
    started_at: new Date(),
    metadata: req.body.metadata || {},
  });

  try {
    getIo()?.emit?.("live:started", { stream: row, host_id: req.userId });
  } catch (_) {
    /* optional fan-out */
  }

  return ok(res, row, "Live stream started", 201);
});

exports.end = asyncHandler(async (req, res) => {
  const row = await LiveStream.findByPk(req.params.id);
  if (!row) return fail(res, "Stream not found", 404);
  if (row.host_id !== req.userId) return fail(res, "Forbidden", 403);
  if (row.status !== "live" && row.status !== "scheduled") {
    return fail(res, "Stream is not active");
  }
  await row.update({ status: "ended", ended_at: new Date() });
  try {
    getIo()?.emit?.("live:ended", { stream_id: row.id, host_id: req.userId });
  } catch (_) {
    /* optional */
  }
  return ok(res, row, "Live stream ended");
});

exports.join = asyncHandler(async (req, res) => {
  const row = await LiveStream.findByPk(req.params.id);
  if (!row || row.status !== "live") return fail(res, "Stream not live", 404);
  await row.increment("viewer_count");
  await row.reload();
  emitToUser(row.host_id, "live:viewer", {
    stream_id: row.id,
    viewer_count: row.viewer_count,
    action: "join",
    user_id: req.userId,
  });
  return ok(res, row, "Joined stream");
});

exports.leave = asyncHandler(async (req, res) => {
  const row = await LiveStream.findByPk(req.params.id);
  if (!row) return fail(res, "Stream not found", 404);
  const next = Math.max(0, Number(row.viewer_count || 0) - 1);
  await row.update({ viewer_count: next });
  emitToUser(row.host_id, "live:viewer", {
    stream_id: row.id,
    viewer_count: next,
    action: "leave",
    user_id: req.userId,
  });
  return ok(res, row, "Left stream");
});

exports.schedule = asyncHandler(async (req, res) => {
  if (req.accountType !== "chatter") {
    return fail(res, "Only chatters can schedule streams", 403);
  }
  const title = (req.body.title || "").trim();
  if (!title) return fail(res, "title is required");
  const row = await LiveStream.create({
    host_id: req.userId,
    title,
    status: "scheduled",
    metadata: {
      ...(req.body.metadata || {}),
      scheduled_for: req.body.scheduled_for || null,
    },
  });
  return ok(res, row, "Stream scheduled", 201);
});
