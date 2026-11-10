const { sequelize, LedgerAccount, LedgerEntry, LedgerLine } = require("../../models");

const ensureUserAccounts = async (user, transaction) => {
  const ownerType = user.account_type === "chatter" ? "chatter" : "user";
  const codes =
    ownerType === "chatter"
      ? ["wallet_spendable", "pending_earnings", "available_earnings"]
      : ["wallet_spendable"];

  const accounts = {};
  for (const code of codes) {
    const [account] = await LedgerAccount.findOrCreate({
      where: {
        owner_type: ownerType,
        owner_id: user.id,
        account_code: code,
        currency: "COIN",
      },
      defaults: { balance: 0, is_active: true },
      transaction,
    });
    accounts[code] = account;
  }
  return accounts;
};

const ensurePlatformRevenueAccount = async (transaction) => {
  const [account] = await LedgerAccount.findOrCreate({
    where: {
      owner_type: "platform",
      owner_id: null,
      account_code: "platform_revenue",
      currency: "COIN",
    },
    defaults: { balance: 0, is_active: true },
    transaction,
  });
  return account;
};

const assertBalanced = (lines) => {
  const debit = lines
    .filter((l) => l.direction === "debit")
    .reduce((s, l) => s + Number(l.amount), 0);
  const credit = lines
    .filter((l) => l.direction === "credit")
    .reduce((s, l) => s + Number(l.amount), 0);
  if (Math.abs(debit - credit) > 0.0001) {
    throw new Error(`Unbalanced ledger entry: debit=${debit} credit=${credit}`);
  }
};

/**
 * Post a balanced journal entry and update materialized account balances.
 * lines: [{ account, direction: 'debit'|'credit', amount }]
 */
const postEntry = async ({
  referenceType,
  referenceId = null,
  description = null,
  actorUserId = null,
  metadata = {},
  lines,
  externalTransaction = null,
}) => {
  assertBalanced(lines);

  const run = async (transaction) => {
    const entry = await LedgerEntry.create(
      {
        reference_type: referenceType,
        reference_id: referenceId,
        description,
        actor_user_id: actorUserId,
        metadata,
        posted_at: new Date(),
      },
      { transaction }
    );

    for (const line of lines) {
      await LedgerLine.create(
        {
          entry_id: entry.id,
          account_id: line.account.id,
          direction: line.direction,
          amount: line.amount,
        },
        { transaction }
      );

      const delta =
        line.direction === "debit"
          ? Number(line.amount)
          : -Number(line.amount);

      // Liability-style wallet: credit increases what platform owes user (spendable/earnings).
      // For wallet_spendable / pending / available we treat credit as balance++, debit as balance--.
      const isLiability = [
        "wallet_spendable",
        "pending_earnings",
        "available_earnings",
        "platform_revenue",
        "escrow_holding",
      ].includes(line.account.account_code);

      const balanceDelta = isLiability
        ? line.direction === "credit"
          ? Number(line.amount)
          : -Number(line.amount)
        : delta;

      const next = Number(line.account.balance) + balanceDelta;
      const isPlatformOwned = line.account.owner_type === "platform";
      if (!isPlatformOwned && next < -0.0001) {
        throw new Error("Insufficient account balance");
      }
      await line.account.update({ balance: next }, { transaction });
    }

    return entry;
  };

  if (externalTransaction) return run(externalTransaction);
  return sequelize.transaction(run);
};

const getBalances = async (user) => {
  const accounts = await ensureUserAccounts(user);
  return Object.fromEntries(
    Object.entries(accounts).map(([code, account]) => [code, Number(account.balance)])
  );
};

module.exports = {
  ensureUserAccounts,
  ensurePlatformRevenueAccount,
  postEntry,
  getBalances,
};
