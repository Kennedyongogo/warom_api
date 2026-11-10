const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const {
  AdminUser,
  User,
  CoinPackage,
  VipPlan,
  Gift,
  EarningsConfig,
  Payment,
  Withdrawal,
  Report,
  LiveStream,
  Notification,
  Inquiry,
  Policy,
} = require("../../models");
const { signAdminToken } = require("../../utils/warom/tokens");
const { ok, fail, asyncHandler } = require("../../utils/warom/response");

exports.bootstrap = asyncHandler(async (req, res) => {
  if ((await AdminUser.count()) > 0) {
    return fail(res, "Admin already exists", 403);
  }
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) {
    return fail(res, "name, email, password required");
  }
  const admin = await AdminUser.create({
    name,
    email,
    phone: phone || null,
    password: await bcrypt.hash(password, 10),
    role: "superadmin",
  });
  return ok(
    res,
    { id: admin.id, email: admin.email, role: admin.role },
    "Superadmin created",
    201
  );
});

exports.login = asyncHandler(async (req, res) => {
  const admin = await AdminUser.findOne({ where: { email: req.body.email } });
  if (!admin) return fail(res, "Invalid credentials", 401);
  const valid = await bcrypt.compare(req.body.password || "", admin.password);
  if (!valid) return fail(res, "Invalid credentials", 401);
  if (!admin.is_active) return fail(res, "Admin inactive", 403);
  await admin.update({ last_login_at: new Date() });
  return ok(res, {
    admin: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    },
    token: signAdminToken(admin),
  });
});

exports.dashboard = asyncHandler(async (_req, res) => {
  const [
    users,
    chatters,
    pendingWithdrawals,
    openReports,
    liveStreams,
    newInquiries,
  ] = await Promise.all([
    User.count({ where: { account_type: "user", status: "active" } }),
    User.count({ where: { account_type: "chatter", status: "active" } }),
    Withdrawal.count({ where: { status: "pending" } }),
    Report.count({ where: { status: { [Op.in]: ["open", "reviewing"] } } }),
    LiveStream.count({ where: { status: "live" } }),
    Inquiry.count({ where: { status: "new" } }),
  ]);
  return ok(res, {
    users,
    chatters,
    pendingWithdrawals,
    openReports,
    liveStreams,
    newInquiries,
  });
});

exports.listUsers = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.account_type) where.account_type = req.query.account_type;
  if (req.query.status) where.status = req.query.status;
  if (req.query.q) {
    where[Op.or] = [
      { username: { [Op.iLike]: `%${req.query.q}%` } },
      { email: { [Op.iLike]: `%${req.query.q}%` } },
    ];
  }
  const rows = await User.findAll({
    where,
    attributes: { exclude: ["password"] },
    order: [["created_at", "DESC"]],
    limit: Number(req.query.limit) || 50,
    offset: Number(req.query.offset) || 0,
  });
  return ok(res, rows);
});

exports.terminateUser = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) return fail(res, "User not found", 404);
  await user.update({ status: "terminated", is_online: false });
  return ok(res, publicSafe(user), "Account terminated");
});

function publicSafe(user) {
  const json = user.toJSON();
  delete json.password;
  return json;
}

exports.upsertCoinPackage = asyncHandler(async (req, res) => {
  if (req.params.id) {
    const row = await CoinPackage.findByPk(req.params.id);
    if (!row) return fail(res, "Not found", 404);
    await row.update(req.body);
    return ok(res, row, "Updated");
  }
  const row = await CoinPackage.create(req.body);
  return ok(res, row, "Created", 201);
});

exports.listCoinPackages = asyncHandler(async (_req, res) => {
  return ok(res, await CoinPackage.findAll({ order: [["sort_order", "ASC"]] }));
});

exports.upsertVipPlan = asyncHandler(async (req, res) => {
  if (req.params.id) {
    const row = await VipPlan.findByPk(req.params.id);
    if (!row) return fail(res, "Not found", 404);
    await row.update(req.body);
    return ok(res, row, "Updated");
  }
  const row = await VipPlan.create(req.body);
  return ok(res, row, "Created", 201);
});

exports.listVipPlans = asyncHandler(async (_req, res) => {
  return ok(res, await VipPlan.findAll({ order: [["sort_order", "ASC"]] }));
});

exports.upsertGift = asyncHandler(async (req, res) => {
  if (req.params.id) {
    const row = await Gift.findByPk(req.params.id);
    if (!row) return fail(res, "Not found", 404);
    await row.update(req.body);
    return ok(res, row, "Updated");
  }
  const row = await Gift.create(req.body);
  return ok(res, row, "Created", 201);
});

exports.listGifts = asyncHandler(async (_req, res) => {
  return ok(res, await Gift.findAll({ order: [["sort_order", "ASC"]] }));
});

exports.listEarningsConfigs = asyncHandler(async (_req, res) => {
  return ok(res, await EarningsConfig.findAll());
});

exports.upsertEarningsConfig = asyncHandler(async (req, res) => {
  const { transaction_type } = req.body;
  if (!transaction_type) return fail(res, "transaction_type required");
  const [row] = await EarningsConfig.upsert({
    ...req.body,
    updated_by: req.adminId,
  });
  return ok(res, row, "Saved");
});

exports.listPayments = asyncHandler(async (req, res) => {
  const rows = await Payment.findAll({
    order: [["created_at", "DESC"]],
    limit: Number(req.query.limit) || 50,
  });
  return ok(res, rows);
});

exports.listWithdrawals = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.status) where.status = req.query.status;
  const rows = await Withdrawal.findAll({
    where,
    order: [["created_at", "DESC"]],
    limit: Number(req.query.limit) || 50,
  });
  return ok(res, rows);
});

exports.reviewWithdrawal = asyncHandler(async (req, res) => {
  const row = await Withdrawal.findByPk(req.params.id);
  if (!row) return fail(res, "Not found", 404);
  const { status, notes } = req.body;
  if (!["processing", "paid", "rejected", "failed"].includes(status)) {
    return fail(res, "Invalid status");
  }
  await row.update({
    status,
    notes: notes || row.notes,
    reviewed_by: req.adminId,
    reviewed_at: new Date(),
  });
  return ok(res, row, "Withdrawal updated");
});

exports.listReports = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.status) where.status = req.query.status;
  const rows = await Report.findAll({
    where,
    order: [["created_at", "DESC"]],
    limit: Number(req.query.limit) || 50,
  });
  return ok(res, rows);
});

exports.resolveReport = asyncHandler(async (req, res) => {
  const row = await Report.findByPk(req.params.id);
  if (!row) return fail(res, "Not found", 404);
  await row.update({
    status: req.body.status || "resolved",
    resolution_notes: req.body.resolution_notes || null,
    handled_by: req.adminId,
    handled_at: new Date(),
  });
  return ok(res, row, "Report updated");
});

exports.listLiveStreams = asyncHandler(async (_req, res) => {
  return ok(
    res,
    await LiveStream.findAll({ order: [["created_at", "DESC"]], limit: 50 })
  );
});

exports.broadcastNotification = asyncHandler(async (req, res) => {
  const { user_id, title, body, type = "system", data = {} } = req.body;
  if (!user_id || !title) return fail(res, "user_id and title required");
  const row = await Notification.create({
    user_id,
    title,
    body: body || null,
    type,
    data,
  });
  return ok(res, row, "Notification sent", 201);
});

exports.listInquiries = asyncHandler(async (_req, res) => {
  return ok(
    res,
    await Inquiry.findAll({ order: [["created_at", "DESC"]], limit: 100 })
  );
});

exports.updateInquiry = asyncHandler(async (req, res) => {
  const row = await Inquiry.findByPk(req.params.id);
  if (!row) return fail(res, "Not found", 404);
  await row.update({
    status: req.body.status || row.status,
    admin_notes: req.body.admin_notes ?? row.admin_notes,
    handled_by: req.adminId,
  });
  return ok(res, row, "Inquiry updated");
});

exports.upsertPolicy = asyncHandler(async (req, res) => {
  if (req.params.id) {
    const row = await Policy.findByPk(req.params.id);
    if (!row) return fail(res, "Not found", 404);
    await row.update({ ...req.body, updated_by: req.adminId });
    return ok(res, row, "Policy updated");
  }
  const row = await Policy.create({
    ...req.body,
    updated_by: req.adminId,
    published_at: req.body.is_published === false ? null : new Date(),
  });
  return ok(res, row, "Policy created", 201);
});

exports.listPolicies = asyncHandler(async (_req, res) => {
  return ok(res, await Policy.findAll({ order: [["title", "ASC"]] }));
});
