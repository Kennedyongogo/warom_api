const { LockedPhoto, PhotoUnlock, User } = require("../../models");
const monetizationService = require("../../services/warom/monetizationService");
const { ok, fail, asyncHandler } = require("../../utils/warom/response");

exports.create = asyncHandler(async (req, res) => {
  if (req.accountType !== "chatter") {
    return fail(res, "Only chatters can create locked photos", 403);
  }
  const { media_url, thumbnail_url, caption, coin_price } = req.body;
  if (!media_url) return fail(res, "media_url is required");

  const photo = await LockedPhoto.create({
    owner_id: req.userId,
    media_url,
    thumbnail_url: thumbnail_url || null,
    caption: caption || null,
    coin_price: Number(coin_price) || 10,
    is_active: true,
  });
  return ok(res, photo, "Locked photo created", 201);
});

exports.mine = asyncHandler(async (req, res) => {
  const rows = await LockedPhoto.findAll({
    where: { owner_id: req.userId },
    order: [["created_at", "DESC"]],
  });
  return ok(res, rows);
});

exports.forOwner = asyncHandler(async (req, res) => {
  const ownerId = req.params.userId;
  const photos = await LockedPhoto.findAll({
    where: { owner_id: ownerId, is_active: true },
    order: [["created_at", "DESC"]],
  });

  let unlockedIds = new Set();
  if (req.userId) {
    const unlocks = await PhotoUnlock.findAll({
      where: { buyer_id: req.userId, owner_id: ownerId },
      attributes: ["photo_id"],
    });
    unlockedIds = new Set(unlocks.map((u) => u.photo_id));
  }

  const payload = photos.map((p) => {
    const unlocked = unlockedIds.has(p.id) || p.owner_id === req.userId;
    return {
      id: p.id,
      owner_id: p.owner_id,
      caption: p.caption,
      coin_price: p.coin_price,
      thumbnail_url: p.thumbnail_url,
      unlocked,
      media_url: unlocked ? p.media_url : null,
    };
  });

  return ok(res, payload);
});

exports.unlock = asyncHandler(async (req, res) => {
  const photo = await LockedPhoto.findByPk(req.params.id);
  if (!photo || !photo.is_active) return fail(res, "Photo not found", 404);
  if (photo.owner_id === req.userId) {
    return ok(res, { photo, already_owned: true });
  }

  const existing = await PhotoUnlock.findOne({
    where: { photo_id: photo.id, buyer_id: req.userId },
  });
  if (existing) {
    return ok(res, { photo, unlock: existing, already_unlocked: true });
  }

  const owner = await User.findByPk(photo.owner_id);
  if (!owner || owner.status !== "active") {
    return fail(res, "Owner unavailable", 404);
  }

  try {
    const result = await monetizationService.chargeAndCreditChatter({
      spender: req.user,
      chatter: owner,
      transactionType: "photo_unlock",
      coinCost: photo.coin_price,
      referenceType: "photo_unlock",
      description: "Photo unlock",
      metadata: { photo_id: photo.id },
    });

    const unlock = await PhotoUnlock.create({
      photo_id: photo.id,
      buyer_id: req.userId,
      owner_id: owner.id,
      coin_cost: result.cost,
      chatter_share_coins: result.chatterShare,
      platform_share_coins: result.platformShare,
      ledger_entry_id: result.entry.id,
      available_at: result.availableAt,
    });

    if (result.hold) {
      await result.hold.update({ source_id: unlock.id });
    }

    return ok(res, { photo, unlock }, "Unlocked", 201);
  } catch (err) {
    return fail(res, err.message, 400);
  }
});

exports.deactivate = asyncHandler(async (req, res) => {
  const photo = await LockedPhoto.findByPk(req.params.id);
  if (!photo) return fail(res, "Photo not found", 404);
  if (photo.owner_id !== req.userId) return fail(res, "Forbidden", 403);
  await photo.update({ is_active: false });
  return ok(res, photo, "Deactivated");
});
