const { Op } = require("sequelize");
const {
  User,
  Verification,
  LedgerAccount,
  LedgerEntry,
  LedgerLine,
  EarningHold,
  LiveStream,
  Notification,
  Message,
  LockedPhoto,
  Withdrawal,
  GiftTransaction,
  Call,
} = require("../../models");
const ledgerService = require("../../services/warom/ledgerService");
const earningsReleaseService = require("../../services/warom/earningsReleaseService");
const { publicProfile } = require("../../utils/warom/profile");
const { ok, fail, asyncHandler } = require("../../utils/warom/response");

const publicSafe = (user) => {
  const json = user.toJSON();
  delete json.password;
  return json;
};

/** Account lifecycle: active | suspended | terminated | restore */
exports.setUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) return fail(res, "User not found", 404);
  const { status } = req.body;
  if (!["active", "suspended", "terminated"].includes(status)) {
    return fail(res, "status must be active|suspended|terminated");
  }
  await user.update({
    status,
    is_online: status === "active" ? user.is_online : false,
  });
  return ok(res, publicSafe(user), `Account marked ${status}`);
});

exports.suspendUser = asyncHandler(async (req, res) => {
  req.body = { ...req.body, status: "suspended" };
  return exports.setUserStatus(req, res);
});

exports.restoreUser = asyncHandler(async (req, res) => {
  req.body = { ...req.body, status: "active" };
  return exports.setUserStatus(req, res);
});

/** KYC / verification review */
exports.listVerifications = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.kind) where.kind = req.query.kind;
  const rows = await Verification.findAll({
    where,
    order: [["created_at", "DESC"]],
    limit: Number(req.query.limit) || 100,
  });
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const users = await User.findAll({ where: { id: userIds } });
  const byId = Object.fromEntries(users.map((u) => [u.id, publicProfile(u)]));
  return ok(
    res,
    rows.map((r) => ({
      ...r.toJSON(),
      user: byId[r.user_id] || null,
    }))
  );
});

exports.reviewVerification = asyncHandler(async (req, res) => {
  const row = await Verification.findByPk(req.params.id);
  if (!row) return fail(res, "Not found", 404);
  const { status, notes } = req.body;
  if (!["approved", "rejected", "pending"].includes(status)) {
    return fail(res, "status must be approved|rejected|pending");
  }
  await row.update({
    status,
    notes: notes || row.notes,
    reviewed_by: req.adminId,
    reviewed_at: new Date(),
  });

  const user = await User.findByPk(row.user_id);
  if (user) {
    if (status === "approved") {
      await user.update({
        is_verified: true,
        verification_status: "approved",
      });
    } else if (status === "rejected") {
      await user.update({
        is_verified: false,
        verification_status: "rejected",
      });
    } else {
      await user.update({ verification_status: "pending" });
    }
  }

  return ok(res, row, "Verification updated");
});

/** Ledger / wallet ops */
exports.listLedgerEntries = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.reference_type) where.reference_type = req.query.reference_type;
  if (req.query.actor_user_id) where.actor_user_id = req.query.actor_user_id;
  const rows = await LedgerEntry.findAll({
    where,
    include: [{ model: LedgerLine, as: "lines" }],
    order: [["posted_at", "DESC"]],
    limit: Number(req.query.limit) || 100,
  });
  return ok(res, rows);
});

exports.listLedgerAccounts = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.owner_type) where.owner_type = req.query.owner_type;
  if (req.query.account_code) where.account_code = req.query.account_code;
  if (req.query.owner_id) where.owner_id = req.query.owner_id;
  const rows = await LedgerAccount.findAll({
    where,
    order: [["updated_at", "DESC"]],
    limit: Number(req.query.limit) || 200,
  });
  return ok(res, rows);
});

exports.userBalances = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) return fail(res, "User not found", 404);
  const balances = await ledgerService.getBalances(user);
  return ok(res, { user: publicProfile(user), balances });
});

exports.adjustBalance = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) return fail(res, "User not found", 404);
  const { account_code = "wallet_spendable", amount, reason } = req.body;
  const delta = Number(amount);
  if (!delta || Number.isNaN(delta)) return fail(res, "amount is required");
  if (!reason) return fail(res, "reason is required");

  const accounts = await ledgerService.ensureUserAccounts(user);
  const account = accounts[account_code];
  if (!account) return fail(res, `Unknown account_code ${account_code}`);
  const platform = await ledgerService.ensurePlatformRevenueAccount();

  const abs = Math.abs(delta);
  const lines =
    delta > 0
      ? [
          { account: platform, direction: "debit", amount: abs },
          { account, direction: "credit", amount: abs },
        ]
      : [
          { account, direction: "debit", amount: abs },
          { account: platform, direction: "credit", amount: abs },
        ];

  const entry = await ledgerService.postEntry({
    referenceType: "admin_adjustment",
    referenceId: null,
    description: reason,
    actorUserId: user.id,
    metadata: { admin_id: req.adminId, account_code, amount: delta },
    lines,
  });

  const balances = await ledgerService.getBalances(user);
  return ok(res, { entry, balances }, "Balance adjusted");
});

/** Earnings holds */
exports.listEarningHolds = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.chatter_id) where.chatter_id = req.query.chatter_id;
  const rows = await EarningHold.findAll({
    where,
    order: [["available_at", "ASC"]],
    limit: Number(req.query.limit) || 100,
  });
  return ok(res, rows);
});

exports.releaseEarningHolds = asyncHandler(async (_req, res) => {
  const released = await earningsReleaseService.releaseMaturedHolds({
    limit: 500,
  });
  return ok(res, { released }, "Release job finished");
});

/** Hosts dashboard = chatters + earnings + activity */
exports.listHosts = asyncHandler(async (req, res) => {
  const where = { account_type: "chatter" };
  if (req.query.status) where.status = req.query.status;
  const hosts = await User.findAll({
    where,
    order: [["created_at", "DESC"]],
    limit: Number(req.query.limit) || 100,
  });

  const enriched = [];
  for (const host of hosts) {
    const [balances, withdrawals, gifts, calls, streams] = await Promise.all([
      ledgerService.getBalances(host),
      Withdrawal.count({ where: { chatter_id: host.id, status: "pending" } }),
      GiftTransaction.count({ where: { receiver_id: host.id } }),
      Call.count({
        where: {
          [Op.or]: [{ caller_id: host.id }, { callee_id: host.id }],
        },
      }),
      LiveStream.count({ where: { host_id: host.id } }),
    ]);
    enriched.push({
      ...publicProfile(host),
      balances,
      pending_withdrawals: withdrawals,
      gifts_received: gifts,
      calls_count: calls,
      streams_count: streams,
    });
  }
  return ok(res, enriched);
});

/** Live stream moderation */
exports.updateLiveStream = asyncHandler(async (req, res) => {
  const row = await LiveStream.findByPk(req.params.id);
  if (!row) return fail(res, "Not found", 404);
  const { status, notes } = req.body;
  if (status && !["scheduled", "live", "ended", "banned"].includes(status)) {
    return fail(res, "Invalid status");
  }
  const patch = {};
  if (status) patch.status = status;
  if (status === "ended" || status === "banned") {
    patch.ended_at = new Date();
  }
  if (notes) {
    patch.metadata = { ...(row.metadata || {}), admin_notes: notes };
  }
  await row.update(patch);
  return ok(res, row, "Live stream updated");
});

/** Content moderation — messages + locked photos */
exports.listPendingContent = asyncHandler(async (req, res) => {
  const kind = req.query.kind || "all";
  const limit = Number(req.query.limit) || 50;
  const out = { messages: [], locked_photos: [] };

  if (kind === "all" || kind === "messages") {
    out.messages = await Message.findAll({
      where: { moderation_status: { [Op.in]: ["pending", "rejected"] } },
      order: [["created_at", "DESC"]],
      limit,
    });
  }
  if (kind === "all" || kind === "locked_photos") {
    out.locked_photos = await LockedPhoto.findAll({
      order: [["created_at", "DESC"]],
      limit,
    });
  }
  return ok(res, out);
});

exports.moderateMessage = asyncHandler(async (req, res) => {
  const row = await Message.findByPk(req.params.id);
  if (!row) return fail(res, "Not found", 404);
  const { moderation_status } = req.body;
  if (!["pending", "approved", "rejected"].includes(moderation_status)) {
    return fail(res, "Invalid moderation_status");
  }
  await row.update({ moderation_status });
  return ok(res, row, "Message moderated");
});

exports.moderateLockedPhoto = asyncHandler(async (req, res) => {
  const row = await LockedPhoto.findByPk(req.params.id);
  if (!row) return fail(res, "Not found", 404);
  const { is_active, action } = req.body;
  if (action === "remove" || is_active === false) {
    await row.update({ is_active: false });
  } else if (action === "restore" || is_active === true) {
    await row.update({ is_active: true });
  }
  return ok(res, row, "Locked photo updated");
});

/** Richer notifications */
exports.broadcastNotification = asyncHandler(async (req, res) => {
  const {
    title,
    body = null,
    type = "system",
    data = {},
    audience = "user",
    user_id = null,
    account_type = null,
  } = req.body;

  if (!title) return fail(res, "title is required");

  if (audience === "user") {
    if (!user_id) return fail(res, "user_id required for audience=user");
    const row = await Notification.create({
      user_id,
      title,
      body,
      type,
      data,
    });
    return ok(res, { sent: 1, sample: row }, "Notification sent", 201);
  }

  const where = { status: "active" };
  if (audience === "users") where.account_type = "user";
  else if (audience === "chatters") where.account_type = "chatter";
  else if (audience === "all") {
    // both
  } else if (audience === "account_type" && account_type) {
    where.account_type = account_type;
  } else {
    return fail(res, "audience must be user|users|chatters|all");
  }

  const targets = await User.findAll({
    where,
    attributes: ["id"],
    limit: Number(req.body.limit) || 5000,
  });

  const rows = [];
  for (const u of targets) {
    rows.push({
      user_id: u.id,
      title,
      body,
      type,
      data,
    });
  }
  if (rows.length) await Notification.bulkCreate(rows);
  return ok(res, { sent: rows.length }, "Broadcast queued", 201);
});
