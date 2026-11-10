const { Op } = require("sequelize");
const { Follow, Block, Swipe, Match } = require("../../models");
const { orderedPair } = require("../../utils/warom/profile");
const notificationService = require("../../services/warom/notificationService");
const { ok, fail, asyncHandler } = require("../../utils/warom/response");

exports.follow = asyncHandler(async (req, res) => {
  const followingId = req.params.userId;
  if (followingId === req.userId) return fail(res, "Cannot follow yourself");
  const [row] = await Follow.findOrCreate({
    where: { follower_id: req.userId, following_id: followingId },
  });
  await notificationService.createNotification({
    userId: followingId,
    type: "follow",
    title: "New follower",
    data: { follower_id: req.userId },
  });
  return ok(res, row, "Followed", 201);
});

exports.unfollow = asyncHandler(async (req, res) => {
  await Follow.destroy({
    where: { follower_id: req.userId, following_id: req.params.userId },
  });
  return ok(res, null, "Unfollowed");
});

exports.block = asyncHandler(async (req, res) => {
  const [row] = await Block.findOrCreate({
    where: { blocker_id: req.userId, blocked_id: req.params.userId },
    defaults: { reason: req.body.reason || null },
  });
  return ok(res, row, "Blocked", 201);
});

exports.unblock = asyncHandler(async (req, res) => {
  await Block.destroy({
    where: { blocker_id: req.userId, blocked_id: req.params.userId },
  });
  return ok(res, null, "Unblocked");
});

exports.swipe = asyncHandler(async (req, res) => {
  const { target_id, action } = req.body;
  if (!target_id || !["like", "pass"].includes(action)) {
    return fail(res, "target_id and action (like|pass) are required");
  }
  if (target_id === req.userId) return fail(res, "Invalid target");

  let swipe = await Swipe.findOne({
    where: { swiper_id: req.userId, target_id },
  });
  if (swipe) {
    await swipe.update({ action });
  } else {
    swipe = await Swipe.create({
      swiper_id: req.userId,
      target_id,
      action,
    });
  }

  let match = null;
  if (action === "like") {
    const reciprocal = await Swipe.findOne({
      where: { swiper_id: target_id, target_id: req.userId, action: "like" },
    });
    if (reciprocal) {
      const [a, b] = orderedPair(req.userId, target_id);
      const [created] = await Match.findOrCreate({
        where: { user_a_id: a, user_b_id: b },
        defaults: { matched_at: new Date(), is_active: true },
      });
      match = created;
      await notificationService.createNotification({
        userId: target_id,
        type: "new_match",
        title: "New match",
        data: { match_id: created.id, user_id: req.userId },
      });
    }
  }

  return ok(res, { swipe, match }, action === "like" ? "Liked" : "Passed");
});

exports.listMatches = asyncHandler(async (req, res) => {
  const rows = await Match.findAll({
    where: {
      is_active: true,
      [Op.or]: [{ user_a_id: req.userId }, { user_b_id: req.userId }],
    },
    order: [["matched_at", "DESC"]],
  });
  return ok(res, rows);
});
