const bcrypt = require("bcryptjs");
const { User } = require("../../models");
const { signUserToken } = require("../../utils/warom/tokens");
const ledgerService = require("./ledgerService");

const sanitize = (user) => {
  const json = user.toJSON();
  delete json.password;
  return json;
};

const register = async (payload) => {
  const {
    account_type = "user",
    email,
    password,
    username,
    auth_provider = "email",
    google_id,
    apple_id,
    ...profile
  } = payload;

  if (!username) throw new Error("Username is required");
  if (auth_provider === "email" && (!email || !password)) {
    throw new Error("Email and password are required");
  }

  const hashed =
    auth_provider === "email" ? await bcrypt.hash(password, 10) : null;

  const user = await User.create({
    account_type,
    email,
    password: hashed,
    username,
    auth_provider,
    google_id: google_id || null,
    apple_id: apple_id || null,
    ...profile,
  });

  await ledgerService.ensureUserAccounts(user);
  const token = signUserToken(user);
  return { user: sanitize(user), token };
};

const loginWithEmail = async ({ email, password, account_type }) => {
  const where = { email };
  if (account_type) where.account_type = account_type;

  const user = await User.findOne({ where });
  if (!user || !user.password) throw new Error("Invalid credentials");
  if (user.status !== "active") throw new Error("Account unavailable");

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new Error("Invalid credentials");

  await user.update({ is_online: true, last_active_at: new Date() });
  return { user: sanitize(user), token: signUserToken(user) };
};

module.exports = { register, loginWithEmail, sanitize };
