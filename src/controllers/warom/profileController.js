const { Op } = require("sequelize");
const {
  User,
  ProfileVisit,
  Follow,
  Match,
  GiftTransaction,
  Gift,
} = require("../../models");
const { publicProfile, orderedPair } = require("../../utils/warom/profile");
const { ok, fail, asyncHandler } = require("../../utils/warom/response");
const walletService = require("../../services/warom/walletService");
const { hardDeleteUser } = require("../../services/warom/accountDeletionService");

exports.updateMe = asyncHandler(async (req, res) => {
  const allowed = [
    "username",
    "date_of_birth",
    "gender",
    "hobbies",
    "country",
    "city",
    "bio",
    "profile_picture",
    "cover_photos",
    "photos",
    "profile_visibility",
    "privacy_settings",
    "onboarding_completed",
  ];
  const patch = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) patch[key] = req.body[key];
  }
  // Keep avatar in sync with the first gallery photo when one isn't set explicitly.
  if (Array.isArray(patch.photos) && patch.photos.length && patch.profile_picture === undefined) {
    patch.profile_picture = patch.photos[0];
  }
  await req.user.update(patch);
  return ok(res, publicProfile(req.user), "Profile updated");
});

exports.getById = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user || user.status !== "active") return fail(res, "User not found", 404);

  if (user.profile_visibility === "private" && req.userId !== user.id) {
    return fail(res, "This profile is private", 403);
  }

  if (user.profile_visibility === "matches" && req.userId && req.userId !== user.id) {
    const [a, b] = orderedPair(req.userId, user.id);
    const match = await Match.findOne({
      where: { user_a_id: a, user_b_id: b, is_active: true },
    });
    if (!match) return fail(res, "This profile is visible to matches only", 403);
  }

  if (req.userId && req.userId !== user.id) {
    await ProfileVisit.create({
      visitor_id: req.userId,
      visited_id: user.id,
      visited_at: new Date(),
    });
  }

  return ok(res, publicProfile(user));
});

exports.getPrivacy = asyncHandler(async (req, res) => {
  return ok(res, {
    profile_visibility: req.user.profile_visibility,
    privacy_settings: req.user.privacy_settings || {},
  });
});

exports.updatePrivacy = asyncHandler(async (req, res) => {
  const patch = {};
  if (req.body.profile_visibility !== undefined) {
    if (!["public", "matches", "private"].includes(req.body.profile_visibility)) {
      return fail(res, "profile_visibility must be public|matches|private");
    }
    patch.profile_visibility = req.body.profile_visibility;
  }
  if (req.body.privacy_settings !== undefined) {
    patch.privacy_settings = {
      ...(req.user.privacy_settings || {}),
      ...req.body.privacy_settings,
    };
  }
  await req.user.update(patch);
  return ok(
    res,
    {
      profile_visibility: req.user.profile_visibility,
      privacy_settings: req.user.privacy_settings,
    },
    "Privacy updated"
  );
});

exports.matches = asyncHandler(async (req, res) => {
  const rows = await Match.findAll({
    where: {
      is_active: true,
      [Op.or]: [{ user_a_id: req.userId }, { user_b_id: req.userId }],
    },
    order: [["matched_at", "DESC"]],
    limit: Number(req.query.limit) || 100,
  });
  const otherIds = rows.map((m) =>
    m.user_a_id === req.userId ? m.user_b_id : m.user_a_id
  );
  const users = await User.findAll({ where: { id: otherIds } });
  return ok(res, users.map(publicProfile));
});

exports.mySocial = asyncHandler(async (req, res) => {
  const [followers, following, matchesAsA, matchesAsB, gifts, visits] =
    await Promise.all([
      Follow.count({ where: { following_id: req.userId } }),
      Follow.count({ where: { follower_id: req.userId } }),
      Match.findAll({ where: { user_a_id: req.userId, is_active: true } }),
      Match.findAll({ where: { user_b_id: req.userId, is_active: true } }),
      GiftTransaction.findAll({
        where: { receiver_id: req.userId },
        order: [["created_at", "DESC"]],
        limit: 50,
      }),
      ProfileVisit.findAll({
        where: { visited_id: req.userId },
        order: [["visited_at", "DESC"]],
        limit: 50,
      }),
    ]);

  const wallet = await walletService.getWalletSummary(req.user);

  return ok(res, {
    followers,
    following,
    matches: [...matchesAsA, ...matchesAsB],
    gifts,
    visits,
    wallet,
  });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const bcrypt = require("bcryptjs");
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return fail(res, "current_password and new_password are required");
  }
  const user = await User.findByPk(req.userId);
  const valid = await bcrypt.compare(current_password, user.password || "");
  if (!valid) return fail(res, "Current password is incorrect", 401);
  await user.update({ password: await bcrypt.hash(new_password, 10) });
  return ok(res, null, "Password changed");
});

exports.deleteAccount = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const removed = await hardDeleteUser(userId);
  if (!removed) return fail(res, "User not found", 404);
  return ok(res, null, "Account permanently deleted");
});

exports.visitors = asyncHandler(async (req, res) => {
  const visits = await ProfileVisit.findAll({
    where: { visited_id: req.userId },
    order: [["visited_at", "DESC"]],
    limit: Number(req.query.limit) || 50,
  });
  const visitorIds = [...new Set(visits.map((v) => v.visitor_id))];
  const users = await User.findAll({ where: { id: visitorIds } });
  const byId = Object.fromEntries(users.map((u) => [u.id, publicProfile(u)]));
  return ok(
    res,
    visits.map((v) => ({
      id: v.id,
      visited_at: v.visited_at,
      visitor: byId[v.visitor_id] || null,
    }))
  );
});

exports.followers = asyncHandler(async (req, res) => {
  const rows = await Follow.findAll({
    where: { following_id: req.userId },
    order: [["created_at", "DESC"]],
    limit: Number(req.query.limit) || 100,
  });
  const ids = rows.map((r) => r.follower_id);
  const users = await User.findAll({ where: { id: ids } });
  return ok(res, users.map(publicProfile));
});

exports.following = asyncHandler(async (req, res) => {
  const rows = await Follow.findAll({
    where: { follower_id: req.userId },
    order: [["created_at", "DESC"]],
    limit: Number(req.query.limit) || 100,
  });
  const ids = rows.map((r) => r.following_id);
  const users = await User.findAll({ where: { id: ids } });
  return ok(res, users.map(publicProfile));
});

exports.giftsReceived = asyncHandler(async (req, res) => {
  const rows = await GiftTransaction.findAll({
    where: { receiver_id: req.userId },
    include: [{ model: Gift, as: "gift" }],
    order: [["created_at", "DESC"]],
    limit: Number(req.query.limit) || 50,
  });
  return ok(res, rows);
});
