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
      phone: admin.phone,
      role: admin.role,
    },
    token: signAdminToken(admin),
  });
});

exports.me = asyncHandler(async (req, res) => {
  return ok(res, {
    id: req.admin.id,
    name: req.admin.name,
    email: req.admin.email,
    phone: req.admin.phone,
    role: req.admin.role,
    is_active: req.admin.is_active,
    last_login_at: req.admin.last_login_at,
  });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const phone =
    typeof req.body.phone === "string" ? req.body.phone.trim() || null : req.admin.phone;

  if (!name || !email) {
    return fail(res, "name and email are required");
  }

  const existing = await AdminUser.findOne({
    where: { email, id: { [Op.ne]: req.adminId } },
  });
  if (existing) return fail(res, "That email is already in use", 409);

  await req.admin.update({ name, email, phone });
  return ok(
    res,
    {
      id: req.admin.id,
      name: req.admin.name,
      email: req.admin.email,
      phone: req.admin.phone,
      role: req.admin.role,
      is_active: req.admin.is_active,
      last_login_at: req.admin.last_login_at,
    },
    "Profile updated"
  );
});

exports.updatePassword = asyncHandler(async (req, res) => {
  const currentPassword = req.body.currentPassword || req.body.current_password || "";
  const newPassword = req.body.newPassword || req.body.new_password || "";

  if (!currentPassword || !newPassword) {
    return fail(res, "currentPassword and newPassword are required");
  }
  if (String(newPassword).length < 6) {
    return fail(res, "New password must be at least 6 characters");
  }

  const admin = await AdminUser.findByPk(req.adminId);
  if (!admin) return fail(res, "Admin not found", 404);

  const valid = await bcrypt.compare(currentPassword, admin.password);
  if (!valid) return fail(res, "Current password is incorrect", 401);

  await admin.update({ password: await bcrypt.hash(String(newPassword), 10) });
  return ok(res, { id: admin.id }, "Password updated");
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

exports.directoryStats = asyncHandler(async (_req, res) => {
  const [users, chatters, superadmin, moderator, finance, support] = await Promise.all([
    User.count({ where: { account_type: "user" } }),
    User.count({ where: { account_type: "chatter" } }),
    AdminUser.count({ where: { role: "superadmin" } }),
    AdminUser.count({ where: { role: "moderator" } }),
    AdminUser.count({ where: { role: "finance" } }),
    AdminUser.count({ where: { role: "support" } }),
  ]);
  return ok(res, {
    users,
    chatters,
    superadmin,
    moderator,
    finance,
    support,
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
      { phone: { [Op.iLike]: `%${req.query.q}%` } },
    ];
  }

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
  const offset = (page - 1) * limit;

  const { rows, count } = await User.findAndCountAll({
    where,
    attributes: { exclude: ["password"] },
    order: [["created_at", "DESC"]],
    limit,
    offset,
  });

  return ok(res, {
    rows,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.max(1, Math.ceil(count / limit)),
    },
  });
});

exports.listAdmins = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.role) where.role = req.query.role;
  if (req.query.q) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${req.query.q}%` } },
      { email: { [Op.iLike]: `%${req.query.q}%` } },
      { phone: { [Op.iLike]: `%${req.query.q}%` } },
    ];
  }

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
  const offset = (page - 1) * limit;

  const { rows, count } = await AdminUser.findAndCountAll({
    where,
    attributes: { exclude: ["password"] },
    order: [["created_at", "DESC"]],
    limit,
    offset,
  });

  return ok(res, {
    rows,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.max(1, Math.ceil(count / limit)),
    },
  });
});

function publicAdmin(admin) {
  const json = admin.toJSON ? admin.toJSON() : { ...admin };
  delete json.password;
  return {
    ...json,
    full_name: json.name,
    last_login: json.last_login_at,
    createdAt: json.created_at || json.createdAt,
    _kind: "admin",
  };
}

exports.getAdmin = asyncHandler(async (req, res) => {
  const admin = await AdminUser.findByPk(req.params.id, {
    attributes: { exclude: ["password"] },
  });
  if (!admin) return fail(res, "Admin not found", 404);
  return ok(res, publicAdmin(admin));
});

const ADMIN_ROLES = ["superadmin", "moderator", "finance", "support"];

exports.createAdmin = asyncHandler(async (req, res) => {
  if (req.adminRole !== "superadmin") {
    return fail(res, "Only a superadmin can create admin accounts", 403);
  }

  const name =
    typeof req.body.name === "string"
      ? req.body.name.trim()
      : typeof req.body.full_name === "string"
        ? req.body.full_name.trim()
        : "";
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const phone = typeof req.body.phone === "string" ? req.body.phone.trim() || null : null;
  const password = req.body.password || "";
  const role = ADMIN_ROLES.includes(req.body.role) ? req.body.role : "";

  if (!name || !email || !password || !role) {
    return fail(res, "name, email, password and role are required");
  }
  if (String(password).length < 6) {
    return fail(res, "Password must be at least 6 characters");
  }

  const existing = await AdminUser.findOne({ where: { email } });
  if (existing) return fail(res, "That email is already in use", 409);

  const admin = await AdminUser.create({
    name,
    email,
    phone,
    password: await bcrypt.hash(String(password), 10),
    role,
    is_active: true,
  });

  return ok(res, publicAdmin(admin), "Admin created", 201);
});

exports.updateAdmin = asyncHandler(async (req, res) => {
  const admin = await AdminUser.findByPk(req.params.id);
  if (!admin) return fail(res, "Admin not found", 404);

  const name =
    typeof req.body.name === "string"
      ? req.body.name.trim()
      : typeof req.body.full_name === "string"
        ? req.body.full_name.trim()
        : admin.name;
  const email =
    typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : admin.email;
  const phone =
    typeof req.body.phone === "string" ? req.body.phone.trim() || null : admin.phone;
  const is_active =
    typeof req.body.is_active === "boolean" ? req.body.is_active : admin.is_active;

  if (!name || !email) return fail(res, "name and email are required");

  if (req.adminId === admin.id && is_active === false) {
    return fail(res, "You can't deactivate your own account", 403);
  }

  const existing = await AdminUser.findOne({
    where: { email, id: { [Op.ne]: admin.id } },
  });
  if (existing) return fail(res, "That email is already in use", 409);

  await admin.update({ name, email, phone, is_active });
  return ok(res, publicAdmin(admin), "Admin updated");
});

exports.getUser = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id, {
    attributes: { exclude: ["password"] },
  });
  if (!user) return fail(res, "User not found", 404);
  const json = user.toJSON();
  return ok(res, {
    ...json,
    full_name: json.username || json.email || "User",
    is_active: json.status === "active",
    last_login: json.last_active_at,
    createdAt: json.created_at || json.createdAt,
    profile_image: json.profile_picture || null,
    role: json.account_type,
    _kind: "app",
  });
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

async function buildInquiryStats() {
  const [all, neu, read, replied, closed] = await Promise.all([
    Inquiry.count(),
    Inquiry.count({ where: { status: "new" } }),
    Inquiry.count({ where: { status: "read" } }),
    Inquiry.count({ where: { status: "replied" } }),
    Inquiry.count({ where: { status: "closed" } }),
  ]);
  return {
    all,
    new: neu,
    read,
    replied,
    closed,
  };
}

exports.inquiryStats = asyncHandler(async (_req, res) => {
  return ok(res, await buildInquiryStats());
});

exports.listInquiries = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.status && req.query.status !== "all") {
    where.status = req.query.status;
  }
  if (req.query.q) {
    const q = `%${req.query.q}%`;
    where[Op.or] = [
      { name: { [Op.iLike]: q } },
      { email: { [Op.iLike]: q } },
      { subject: { [Op.iLike]: q } },
      { message: { [Op.iLike]: q } },
    ];
  }

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
  const offset = (page - 1) * limit;

  const [{ rows, count }, stats] = await Promise.all([
    Inquiry.findAndCountAll({
      where,
      order: [["created_at", "DESC"]],
      limit,
      offset,
    }),
    buildInquiryStats(),
  ]);

  return ok(res, {
    rows,
    stats,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.max(1, Math.ceil(count / limit) || 1),
    },
  });
});

exports.getInquiry = asyncHandler(async (req, res) => {
  const row = await Inquiry.findByPk(req.params.id);
  if (!row) return fail(res, "Inquiry not found", 404);
  if (row.status === "new") {
    await row.update({ status: "read", handled_by: req.adminId });
  }
  return ok(res, row);
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
