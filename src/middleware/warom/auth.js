const jwt = require("jsonwebtoken");
const config = require("../../config/config");
const { User, AdminUser } = require("../../models");
const { fail } = require("../../utils/warom/response");

const authenticateUser = async (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) return fail(res, "No token provided", 401);

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    if (decoded.type !== "warom_user") {
      return fail(res, "Invalid token type", 403);
    }

    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ["password"] },
    });

    if (!user || user.status !== "active") {
      return fail(res, "Account unavailable", 403);
    }

    req.userId = user.id;
    req.user = user;
    req.accountType = user.account_type;
    next();
  } catch (err) {
    return fail(res, "Invalid token", 401);
  }
};

const requireAccountType = (...types) => (req, res, next) => {
  if (!types.includes(req.accountType)) {
    return fail(res, "Wrong account type for this action", 403);
  }
  next();
};

const authenticateAdmin = async (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) return fail(res, "No token provided", 401);

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    if (decoded.type !== "warom_admin") {
      return fail(res, "Admin privileges required", 403);
    }

    const admin = await AdminUser.findByPk(decoded.id, {
      attributes: { exclude: ["password"] },
    });

    if (!admin || !admin.is_active) {
      return fail(res, "Invalid or inactive admin", 403);
    }

    req.adminId = admin.id;
    req.admin = admin;
    req.adminRole = admin.role;
    next();
  } catch (err) {
    return fail(res, "Invalid token", 401);
  }
};

const optionalUserAuth = async (req, _res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    if (decoded.type === "warom_user") {
      const user = await User.findByPk(decoded.id, {
        attributes: { exclude: ["password"] },
      });
      if (user && user.status === "active") {
        req.userId = user.id;
        req.user = user;
        req.accountType = user.account_type;
      }
    }
  } catch (_err) {
    // ignore optional auth failures
  }
  next();
};

module.exports = {
  authenticateUser,
  requireAccountType,
  authenticateAdmin,
  optionalUserAuth,
};
