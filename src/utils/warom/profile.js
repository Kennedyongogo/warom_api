const publicProfile = (user) => {
  if (!user) return null;
  const json = typeof user.toJSON === "function" ? user.toJSON() : user;
  delete json.password;
  delete json.device_tokens;
  return json;
};

const orderedPair = (a, b) => (String(a) < String(b) ? [a, b] : [b, a]);

module.exports = { publicProfile, orderedPair };
