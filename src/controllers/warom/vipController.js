const { VipPlan, Subscription, sequelize } = require("../../models");
const ledgerService = require("../../services/warom/ledgerService");
const { ok, fail, asyncHandler } = require("../../utils/warom/response");

exports.plans = asyncHandler(async (_req, res) => {
  const plans = await VipPlan.findAll({
    where: { is_active: true },
    order: [["sort_order", "ASC"]],
  });
  return ok(res, plans);
});

exports.me = asyncHandler(async (req, res) => {
  const active = await Subscription.findOne({
    where: {
      user_id: req.userId,
      status: "active",
    },
    include: [{ model: VipPlan, as: "plan", required: false }],
    order: [["expires_at", "DESC"]],
  });

  const expiresAt = req.user.vip_expires_at
    ? new Date(req.user.vip_expires_at)
    : null;
  const isVip =
    Boolean(req.user.is_vip) && (!expiresAt || expiresAt.getTime() > Date.now());

  if (req.user.is_vip && expiresAt && expiresAt.getTime() <= Date.now()) {
    await req.user.update({ is_vip: false });
  }

  return ok(res, {
    is_vip: isVip,
    vip_expires_at: req.user.vip_expires_at,
    subscription: active,
    perks: isVip
      ? {
          higher_visibility: true,
          unlimited_likes: true,
          exclusive_filters: true,
          priority_matching: true,
          vip_badge: true,
        }
      : null,
  });
});

exports.subscribeWithCoins = asyncHandler(async (req, res) => {
  const plan = await VipPlan.findByPk(req.body.vip_plan_id);
  if (!plan || !plan.is_active) return fail(res, "VIP plan not found", 404);
  if (!plan.price_coins) return fail(res, "Plan is not coin-priced");

  try {
    const subscription = await sequelize.transaction(async (transaction) => {
      const accounts = await ledgerService.ensureUserAccounts(req.user, transaction);
      const platform = await ledgerService.ensurePlatformRevenueAccount(transaction);
      if (Number(accounts.wallet_spendable.balance) < Number(plan.price_coins)) {
        throw new Error("Insufficient coin balance");
      }

      const startsAt = new Date();
      const expiresAt = new Date(
        startsAt.getTime() + Number(plan.duration_days) * 24 * 60 * 60 * 1000
      );

      const sub = await Subscription.create(
        {
          user_id: req.userId,
          vip_plan_id: plan.id,
          status: "active",
          starts_at: startsAt,
          expires_at: expiresAt,
        },
        { transaction }
      );

      const entry = await ledgerService.postEntry({
        referenceType: "vip_subscription",
        referenceId: sub.id,
        description: `VIP ${plan.name}`,
        actorUserId: req.userId,
        lines: [
          {
            account: accounts.wallet_spendable,
            direction: "debit",
            amount: plan.price_coins,
          },
          {
            account: platform,
            direction: "credit",
            amount: plan.price_coins,
          },
        ],
        externalTransaction: transaction,
      });

      await sub.update({ ledger_entry_id: entry.id }, { transaction });
      await req.user.update(
        { is_vip: true, vip_expires_at: expiresAt },
        { transaction }
      );
      return sub;
    });

    return ok(res, subscription, "VIP activated", 201);
  } catch (err) {
    return fail(res, err.message, 400);
  }
});
