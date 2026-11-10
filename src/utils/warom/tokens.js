const jwt = require("jsonwebtoken");
const config = require("../../config/config");

const signUserToken = (user) =>
  jwt.sign(
    {
      id: user.id,
      type: "warom_user",
      account_type: user.account_type,
    },
    config.jwtSecret,
    { expiresIn: "30d" }
  );

const signAdminToken = (admin) =>
  jwt.sign(
    {
      id: admin.id,
      type: "warom_admin",
      role: admin.role,
    },
    config.jwtSecret,
    { expiresIn: "12h" }
  );

module.exports = { signUserToken, signAdminToken };
