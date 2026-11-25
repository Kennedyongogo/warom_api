const { Op } = require("sequelize");
const {
  sequelize,
  User,
  Verification,
  Follow,
  Block,
  Swipe,
  Match,
  ProfileVisit,
  Conversation,
  Message,
  Call,
  LedgerAccount,
  LedgerLine,
  LedgerEntry,
  Payment,
  Subscription,
  GiftTransaction,
  Withdrawal,
  Notification,
  Report,
  LiveStream,
  LockedPhoto,
  PhotoUnlock,
  EarningHold,
} = require("../../models");

/** Permanently remove a user and related rows. */
async function hardDeleteUser(userId) {
  const user = await User.findByPk(userId);
  if (!user) return false;

  await sequelize.transaction(async (t) => {
    const opts = { transaction: t };

    const locked = await LockedPhoto.findAll({
      where: { owner_id: userId },
      attributes: ["id"],
      ...opts,
    });
    const lockedIds = locked.map((r) => r.id);
    if (lockedIds.length) {
      await PhotoUnlock.destroy({ where: { photo_id: { [Op.in]: lockedIds } }, ...opts });
    }
    await PhotoUnlock.destroy({
      where: { [Op.or]: [{ buyer_id: userId }, { owner_id: userId }] },
      ...opts,
    });
    await LockedPhoto.destroy({ where: { owner_id: userId }, ...opts });
    await EarningHold.destroy({ where: { chatter_id: userId }, ...opts });

    await Follow.destroy({
      where: { [Op.or]: [{ follower_id: userId }, { following_id: userId }] },
      ...opts,
    });
    await Block.destroy({
      where: { [Op.or]: [{ blocker_id: userId }, { blocked_id: userId }] },
      ...opts,
    });
    await Swipe.destroy({
      where: { [Op.or]: [{ swiper_id: userId }, { target_id: userId }] },
      ...opts,
    });
    await Match.destroy({
      where: { [Op.or]: [{ user_a_id: userId }, { user_b_id: userId }] },
      ...opts,
    });
    await ProfileVisit.destroy({
      where: { [Op.or]: [{ visitor_id: userId }, { visited_id: userId }] },
      ...opts,
    });
    await Verification.destroy({ where: { user_id: userId }, ...opts });

    const convs = await Conversation.findAll({
      where: { [Op.or]: [{ participant_a_id: userId }, { participant_b_id: userId }] },
      attributes: ["id"],
      ...opts,
    });
    const convIds = convs.map((c) => c.id);
    if (convIds.length) {
      await Message.destroy({ where: { conversation_id: { [Op.in]: convIds } }, ...opts });
    }
    await Message.destroy({ where: { sender_id: userId }, ...opts });
    if (convIds.length) {
      await Conversation.destroy({ where: { id: { [Op.in]: convIds } }, ...opts });
    }

    await Call.destroy({
      where: { [Op.or]: [{ caller_id: userId }, { callee_id: userId }] },
      ...opts,
    });

    await GiftTransaction.destroy({
      where: { [Op.or]: [{ sender_id: userId }, { receiver_id: userId }] },
      ...opts,
    });
    await Withdrawal.destroy({ where: { chatter_id: userId }, ...opts });
    await Subscription.destroy({ where: { user_id: userId }, ...opts });
    await Payment.destroy({ where: { user_id: userId }, ...opts });

    const accounts = await LedgerAccount.findAll({
      where: { owner_id: userId },
      attributes: ["id"],
      ...opts,
    });
    const accountIds = accounts.map((a) => a.id);
    if (accountIds.length) {
      await LedgerLine.destroy({ where: { account_id: { [Op.in]: accountIds } }, ...opts });
      await LedgerAccount.destroy({ where: { id: { [Op.in]: accountIds } }, ...opts });
    }
    await LedgerEntry.destroy({ where: { actor_user_id: userId }, ...opts });

    await Notification.destroy({ where: { user_id: userId }, ...opts });
    await Report.destroy({
      where: { [Op.or]: [{ reporter_id: userId }, { reported_user_id: userId }] },
      ...opts,
    });
    await LiveStream.destroy({ where: { host_id: userId }, ...opts });

    await user.destroy(opts);
  });

  return true;
}

module.exports = { hardDeleteUser };
