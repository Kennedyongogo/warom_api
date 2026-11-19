const bcrypt = require("bcryptjs");
const { User } = require("../../models");
const { signUserToken } = require("../../utils/warom/tokens");
const ledgerService = require("./ledgerService");

const sanitize = (user) => {
  const json = user.toJSON();
  delete json.password;
  return json;
};

const mapCreateError = (err) => {
  if (err.name === "SequelizeUniqueConstraintError") {
    const field = err.errors?.[0]?.path;
    if (field === "email") return new Error("Email already registered");
    if (field === "username") return new Error("Username already taken");
    return new Error("Account already exists");
  }
  if (err.name === "SequelizeValidationError") {
    const detail = err.errors?.map((e) => e.message).filter(Boolean).join("; ");
    return new Error(detail || "Validation failed");
  }
  return err;
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
    date_of_birth,
    gender,
    country,
    city,
    bio,
    hobbies,
  } = payload;

  const cleanUsername = String(username || "").trim();
  const cleanEmail =
    email == null || String(email).trim() === ""
      ? null
      : String(email).trim().toLowerCase();

  if (!cleanUsername) throw new Error("Username is required");
  if (auth_provider === "email" && (!cleanEmail || !password)) {
    throw new Error("Email and password are required");
  }

  const hashed =
    auth_provider === "email" ? await bcrypt.hash(password, 10) : null;

  let user;
  try {
    user = await User.create({
      account_type,
      email: cleanEmail,
      password: hashed,
      username: cleanUsername,
      auth_provider,
      ...(google_id ? { google_id } : {}),
      ...(apple_id ? { apple_id } : {}),
      ...(date_of_birth ? { date_of_birth } : {}),
      ...(gender ? { gender } : {}),
      ...(country ? { country } : {}),
      ...(city ? { city } : {}),
      ...(bio ? { bio } : {}),
      ...(Array.isArray(hobbies) ? { hobbies } : {}),
    });
  } catch (err) {
    throw mapCreateError(err);
  }

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

/** Google / Apple sign-in (token verification is client-trusted in this Node layer). */
const loginWithSocial = async ({
  provider,
  provider_id,
  email = null,
  username = null,
  account_type = "user",
  ...profile
}) => {
  if (!["google", "apple"].includes(provider)) {
    throw new Error("provider must be google|apple");
  }
  if (!provider_id) throw new Error("provider_id is required");

  const idField = provider === "google" ? "google_id" : "apple_id";
  let user = await User.findOne({ where: { [idField]: provider_id } });

  if (!user && email) {
    user = await User.findOne({ where: { email, account_type } });
    if (user) {
      await user.update({
        [idField]: provider_id,
        auth_provider: provider,
      });
    }
  }

  if (!user) {
    const baseName =
      username ||
      (email ? email.split("@")[0] : `${provider}_${String(provider_id).slice(0, 8)}`);
    let candidate = String(baseName)
      .replace(/[^a-zA-Z0-9_]/g, "_")
      .slice(0, 24);
    let suffix = 0;
    while (await User.findOne({ where: { username: candidate } })) {
      suffix += 1;
      candidate = `${baseName.slice(0, 20)}_${suffix}`;
    }
    user = await User.create({
      account_type,
      email,
      username: candidate,
      auth_provider: provider,
      google_id: provider === "google" ? provider_id : null,
      apple_id: provider === "apple" ? provider_id : null,
      password: null,
      ...profile,
    });
    await ledgerService.ensureUserAccounts(user);
  }

  if (user.status !== "active") throw new Error("Account unavailable");
  await user.update({ is_online: true, last_active_at: new Date() });
  return { user: sanitize(user), token: signUserToken(user) };
};

const registerDeviceToken = async (user, { token, platform = "unknown" }) => {
  if (!token) throw new Error("token is required");
  const tokens = Array.isArray(user.device_tokens) ? [...user.device_tokens] : [];
  const next = tokens.filter((t) => (typeof t === "string" ? t !== token : t?.token !== token));
  next.push({ token, platform, updated_at: new Date().toISOString() });
  await user.update({ device_tokens: next.slice(-20) });
  return next;
};

const removeDeviceToken = async (user, token) => {
  const tokens = Array.isArray(user.device_tokens) ? user.device_tokens : [];
  const next = tokens.filter((t) => (typeof t === "string" ? t !== token : t?.token !== token));
  await user.update({ device_tokens: next });
  return next;
};

module.exports = {
  register,
  loginWithEmail,
  loginWithSocial,
  registerDeviceToken,
  removeDeviceToken,
  sanitize,
};
