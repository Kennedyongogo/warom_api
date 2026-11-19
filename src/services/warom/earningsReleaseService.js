const { Op } = require("sequelize");
const { sequelize, User, EarningHold } = require("../../models");
const ledgerService = require("./ledgerService");

/**
 * Move matured pending earnings into available_earnings.
 * Returns number of holds released.
 */
const releaseMaturedHolds = async ({ limit = 200 } = {}) => {
  const due = await EarningHold.findAll({
    where: {
      status: "pending",
      available_at: { [Op.lte]: new Date() },
    },
    order: [["available_at", "ASC"]],
    limit,
  });

  let released = 0;
  for (const hold of due) {
    try {
      await sequelize.transaction(async (transaction) => {
        const locked = await EarningHold.findByPk(hold.id, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (!locked || locked.status !== "pending") return;

        const chatter = await User.findByPk(locked.chatter_id, { transaction });
        if (!chatter || chatter.account_type !== "chatter") {
          await locked.update({ status: "reversed" }, { transaction });
          return;
        }

        const accounts = await ledgerService.ensureUserAccounts(
          chatter,
          transaction
        );
        const amount = Number(locked.amount_coins);
        if (amount <= 0) {
          await locked.update(
            { status: "released", released_at: new Date() },
            { transaction }
          );
          return;
        }

        if (Number(accounts.pending_earnings.balance) < amount) {
          // Balance already moved or adjusted — mark released to avoid loop.
          await locked.update(
            { status: "released", released_at: new Date() },
            { transaction }
          );
          return;
        }

        await ledgerService.postEntry({
          referenceType: "earnings_release",
          referenceId: locked.id,
          description: "Pending earnings released to available",
          actorUserId: chatter.id,
          metadata: {
            source_type: locked.source_type,
            source_id: locked.source_id,
          },
          lines: [
            {
              account: accounts.pending_earnings,
              direction: "debit",
              amount,
            },
            {
              account: accounts.available_earnings,
              direction: "credit",
              amount,
            },
          ],
          externalTransaction: transaction,
        });

        await locked.update(
          { status: "released", released_at: new Date() },
          { transaction }
        );
        released += 1;
      });
    } catch (err) {
      console.error("earnings release failed", hold.id, err.message);
    }
  }
  return released;
};

const listHoldsForChatter = async (chatterId, { status } = {}) => {
  const where = { chatter_id: chatterId };
  if (status) where.status = status;
  return EarningHold.findAll({
    where,
    order: [["available_at", "ASC"]],
  });
};

module.exports = { releaseMaturedHolds, listHoldsForChatter };
