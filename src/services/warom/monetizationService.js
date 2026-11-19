const {
  sequelize,
  User,
  EarningsConfig,
  EarningHold,
} = require("../../models");
const ledgerService = require("./ledgerService");

const DEFAULT_COSTS = {
  messaging: 2,
  photo_unlock: 10,
  voice_call: 15,
  video_call: 25,
};

const getConfig = async (transactionType, transaction) => {
  const row = await EarningsConfig.findOne({
    where: { transaction_type: transactionType, is_active: true },
    transaction,
  });
  return (
    row || {
      chatter_share_percent: 70,
      platform_share_percent: 30,
      pending_hold_days: 7,
    }
  );
};

/**
 * Charge a user (spender) and credit a chatter's pending earnings.
 * Returns { entry, chatterShare, platformShare, availableAt, hold }.
 */
const chargeAndCreditChatter = async ({
  spender,
  chatter,
  transactionType,
  coinCost,
  referenceType,
  referenceId = null,
  description = null,
  metadata = {},
  externalTransaction = null,
}) => {
  if (!spender || !chatter) throw new Error("spender and chatter are required");
  if (spender.id === chatter.id) throw new Error("Cannot pay yourself");
  if (Number(coinCost) <= 0) throw new Error("coinCost must be positive");

  const run = async (transaction) => {
    const config = await getConfig(transactionType, transaction);
    const cost = Number(coinCost);
    const chatterShare = Math.floor(
      (cost * Number(config.chatter_share_percent)) / 100
    );
    const platformShare = cost - chatterShare;
    const holdDays = Number(config.pending_hold_days || 7);
    const availableAt = new Date(Date.now() + holdDays * 24 * 60 * 60 * 1000);

    const spenderAccounts = await ledgerService.ensureUserAccounts(
      spender,
      transaction
    );
    const chatterAccounts = await ledgerService.ensureUserAccounts(
      chatter,
      transaction
    );
    const platformAccount = await ledgerService.ensurePlatformRevenueAccount(
      transaction
    );

    if (Number(spenderAccounts.wallet_spendable.balance) < cost) {
      throw new Error("Insufficient coin balance");
    }

    const lines = [
      {
        account: spenderAccounts.wallet_spendable,
        direction: "debit",
        amount: cost,
      },
      {
        account: platformAccount,
        direction: "credit",
        amount: platformShare,
      },
    ];

    if (chatter.account_type === "chatter" && chatterShare > 0) {
      lines.push({
        account: chatterAccounts.pending_earnings,
        direction: "credit",
        amount: chatterShare,
      });
    } else if (chatterShare > 0) {
      lines.push({
        account: chatterAccounts.wallet_spendable,
        direction: "credit",
        amount: chatterShare,
      });
    }

    const entry = await ledgerService.postEntry({
      referenceType,
      referenceId,
      description: description || `${transactionType} charge`,
      actorUserId: spender.id,
      metadata: {
        ...metadata,
        transaction_type: transactionType,
        chatter_id: chatter.id,
      },
      lines,
      externalTransaction: transaction,
    });

    let hold = null;
    if (chatter.account_type === "chatter" && chatterShare > 0) {
      hold = await EarningHold.create(
        {
          chatter_id: chatter.id,
          source_type: transactionType,
          source_id: referenceId,
          amount_coins: chatterShare,
          ledger_entry_id: entry.id,
          available_at: availableAt,
          status: "pending",
        },
        { transaction }
      );
    }

    return {
      entry,
      cost,
      chatterShare,
      platformShare,
      availableAt,
      hold,
    };
  };

  if (externalTransaction) return run(externalTransaction);
  return sequelize.transaction(run);
};

const resolvePeer = async (conversation, senderId) => {
  const peerId =
    conversation.participant_a_id === senderId
      ? conversation.participant_b_id
      : conversation.participant_a_id;
  return User.findByPk(peerId);
};

const defaultCostFor = (type) => DEFAULT_COSTS[type] || 1;

module.exports = {
  chargeAndCreditChatter,
  getConfig,
  resolvePeer,
  defaultCostFor,
  DEFAULT_COSTS,
};
