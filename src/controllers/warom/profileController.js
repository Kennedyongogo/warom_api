const { User, ProfileVisit, Follow, Match, GiftTransaction } = require("../../models");
const { publicProfile } = require("../../utils/warom/profile");
const { ok, fail, asyncHandler } = require("../../utils/warom/response");
const walletService = require("../../services/warom/walletService");

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
  await req.user.update(patch);
  return ok(res, publicProfile(req.user), "Profile updated");
});

exports.getById = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user || user.status !== "active") return fail(res, "User not found", 404);

  if (req.userId && req.userId !== user.id) {
    await ProfileVisit.create({
      visitor_id: req.userId,
      visited_id: user.id,
      visited_at: new Date(),
    });
  }

  return ok(res, publicProfile(user));
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
  await req.user.update({
    status: "deleted",
    email: null,
    phone: null,
    is_online: false,
  });
  return ok(res, null, "Account deleted");
});
