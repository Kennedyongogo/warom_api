const {
  sequelize,
  User,
  CoinPackage,
  Payment,
  Gift,
  GiftTransaction,
  EarningsConfig,
  Withdrawal,
} = require("../../models");
const ledgerService = require("./ledgerService");

const getWalletSummary = async (user) => {
  const balances = await ledgerService.getBalances(user);
  if (user.account_type === "chatter") {
    return {
      coin_balance: balances.wallet_spendable || 0,
      pending_earnings: balances.pending_earnings || 0,
      available_earnings: balances.available_earnings || 0,
    };
  }
  return { coin_balance: balances.wallet_spendable || 0 };
};

const creditCoinsFromPurchase = async ({ user, packageRow, payment }) => {
  return sequelize.transaction(async (transaction) => {
    const accounts = await ledgerService.ensureUserAccounts(user, transaction);
    const coins = Number(packageRow.coins) + Number(packageRow.bonus_coins || 0);
    const platformAccount = await ledgerService.ensurePlatformRevenueAccount(
      transaction
    );
    // Mint coins into the user wallet (liability). Platform clearing is the
    // balancing side until fiat cash accounts are introduced.
    const entry = await ledgerService.postEntry({
      referenceType: "coin_purchase",
      referenceId: payment.id,
      description: `Coin package ${packageRow.name}`,
      actorUserId: user.id,
      metadata: { package_id: packageRow.id, coins },
      lines: [
        {
          account: platformAccount,
          direction: "debit",
          amount: coins,
        },
        {
          account: accounts.wallet_spendable,
          direction: "credit",
          amount: coins,
        },
      ],
      externalTransaction: transaction,
    });
    return entry;
  });
};

const sendGift = async ({ sender, receiverId, giftId, conversationId = null }) => {
  return sequelize.transaction(async (transaction) => {
    const gift = await Gift.findByPk(giftId, { transaction });
    if (!gift || !gift.is_active) throw new Error("Gift not found");

    const receiver = await User.findByPk(receiverId, { transaction });
    if (!receiver || receiver.status !== "active") throw new Error("Receiver not found");

    const config =
      (await EarningsConfig.findOne({
        where: { transaction_type: "gift", is_active: true },
        transaction,
      })) || { chatter_share_percent: 70, platform_share_percent: 30 };

    const coinValue = Number(gift.coin_value);
    const chatterShare = Math.floor(
      (coinValue * Number(config.chatter_share_percent)) / 100
    );
    const platformShare = coinValue - chatterShare;

    const senderAccounts = await ledgerService.ensureUserAccounts(sender, transaction);
    const receiverAccounts = await ledgerService.ensureUserAccounts(receiver, transaction);
    const platformAccount = await ledgerService.ensurePlatformRevenueAccount(transaction);

    if (Number(senderAccounts.wallet_spendable.balance) < coinValue) {
      throw new Error("Insufficient coin balance");
    }

    const giftTx = await GiftTransaction.create(
      {
        gift_id: gift.id,
        sender_id: sender.id,
        receiver_id: receiver.id,
        coin_value: coinValue,
        chatter_share_coins: chatterShare,
        platform_share_coins: platformShare,
        conversation_id: conversationId,
      },
      { transaction }
    );

    const lines = [
      { account: senderAccounts.wallet_spendable, direction: "debit", amount: coinValue },
      { account: platformAccount, direction: "credit", amount: platformShare },
    ];

    if (receiver.account_type === "chatter") {
      lines.push({
        account: receiverAccounts.pending_earnings,
        direction: "credit",
        amount: chatterShare,
      });
    } else {
      lines.push({
        account: receiverAccounts.wallet_spendable,
        direction: "credit",
        amount: chatterShare,
      });
    }

    const entry = await ledgerService.postEntry({
      referenceType: "gift",
      referenceId: giftTx.id,
      description: `Gift ${gift.name}`,
      actorUserId: sender.id,
      metadata: { gift_id: gift.id, receiver_id: receiver.id },
      lines,
      externalTransaction: transaction,
    });

    await giftTx.update({ ledger_entry_id: entry.id }, { transaction });
    return giftTx;
  });
};

const requestWithdrawal = async ({ chatter, amountCoins, payoutMethod, payoutDetails }) => {
  return sequelize.transaction(async (transaction) => {
    const accounts = await ledgerService.ensureUserAccounts(chatter, transaction);
    if (Number(accounts.available_earnings.balance) < amountCoins) {
      throw new Error("Insufficient available earnings");
    }

    const withdrawal = await Withdrawal.create(
      {
        chatter_id: chatter.id,
        amount_coins: amountCoins,
        payout_method: payoutMethod,
        payout_details: payoutDetails || {},
        status: "pending",
      },
      { transaction }
    );

    const platformAccount = await ledgerService.ensurePlatformRevenueAccount(transaction);
    const entry = await ledgerService.postEntry({
      referenceType: "withdrawal",
      referenceId: withdrawal.id,
      description: "Withdrawal request hold",
      actorUserId: chatter.id,
      lines: [
        {
          account: accounts.available_earnings,
          direction: "debit",
          amount: amountCoins,
        },
        {
          account: platformAccount,
          direction: "credit",
          amount: amountCoins,
        },
      ],
      externalTransaction: transaction,
    });

    await withdrawal.update({ ledger_entry_id: entry.id }, { transaction });
    return withdrawal;
  });
};

module.exports = {
  getWalletSummary,
  creditCoinsFromPurchase,
  sendGift,
  requestWithdrawal,
  CoinPackage,
  Payment,
};
