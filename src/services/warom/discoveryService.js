const { Op } = require("sequelize");
const { User, Swipe, Block } = require("../../models");
const { publicProfile } = require("../../utils/warom/profile");

const homeFeed = async (viewerId, { limit = 40 } = {}) => {
  const blocked = await Block.findAll({
    where: {
      [Op.or]: [{ blocker_id: viewerId }, { blocked_id: viewerId }],
    },
  });
  const blockedIds = blocked.flatMap((b) => [b.blocker_id, b.blocked_id]);
  const swiped = await Swipe.findAll({
    where: { swiper_id: viewerId },
    attributes: ["target_id"],
  });
  const exclude = new Set([viewerId, ...blockedIds, ...swiped.map((s) => s.target_id)]);

  const users = await User.findAll({
    where: {
      status: "active",
      id: { [Op.notIn]: [...exclude] },
    },
    order: [
      ["is_online", "DESC"],
      ["is_vip", "DESC"],
      ["last_active_at", "DESC"],
    ],
    limit,
  });

  const online = [];
  const offline = [];
  const trending = [];
  for (const u of users) {
    const profile = publicProfile(u);
    if (u.is_online) online.push(profile);
    else offline.push(profile);
    if (u.is_vip || u.is_verified) trending.push(profile);
  }

  return { online, offline, trending };
};

const discoverByLocation = async (viewerId, { country, city, limit = 40 } = {}) => {
  const where = { status: "active", id: { [Op.ne]: viewerId } };
  if (country) where.country = country;
  if (city) where.city = city;

  const users = await User.findAll({
    where,
    order: [
      ["is_online", "DESC"],
      ["created_at", "DESC"],
    ],
    limit,
  });
  return users.map(publicProfile);
};

module.exports = { homeFeed, discoverByLocation };
