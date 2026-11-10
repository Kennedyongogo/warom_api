const {
  CoinPackage,
  Payment,
  Gift,
  VipPlan,
  LedgerEntry,
} = require("../../models");
const walletService = require("../../services/warom/walletService");
const { ok, fail, asyncHandler } = require("../../utils/warom/response");

exports.summary = asyncHandler(async (req, res) => {
  const data = await walletService.getWalletSummary(req.user);
  return ok(res, data);
});

exports.catalogue = asyncHandler(async (_req, res) => {
  const [coinPackages, gifts, vipPlans] = await Promise.all([
    CoinPackage.findAll({ where: { is_active: true }, order: [["sort_order", "ASC"]] }),
    Gift.findAll({ where: { is_active: true }, order: [["sort_order", "ASC"]] }),
    VipPlan.findAll({ where: { is_active: true }, order: [["sort_order", "ASC"]] }),
  ]);
  return ok(res, { coinPackages, gifts, vipPlans });
});

exports.createCoinPurchase = asyncHandler(async (req, res) => {
  const packageRow = await CoinPackage.findByPk(req.body.package_id);
  if (!packageRow || !packageRow.is_active) return fail(res, "Package not found", 404);

  const payment = await Payment.create({
    user_id: req.userId,
    purpose: "coin_purchase",
    package_id: packageRow.id,
    amount: packageRow.price_amount,
    currency: packageRow.currency,
    status: "pending",
    provider: req.body.provider || "paystack",
  });

  // MVP: mark success immediately for local/dev; wire webhook later
  if (req.body.simulate_success) {
    await payment.update({ status: "success", provider_reference: `sim_${payment.id}` });
    await walletService.creditCoinsFromPurchase({
      user: req.user,
      packageRow,
      payment,
    });
  }

  return ok(res, payment, "Payment created", 201);
});

exports.sendGift = asyncHandler(async (req, res) => {
  try {
    const tx = await walletService.sendGift({
      sender: req.user,
      receiverId: req.body.receiver_id,
      giftId: req.body.gift_id,
      conversationId: req.body.conversation_id || null,
    });
    return ok(res, tx, "Gift sent", 201);
  } catch (err) {
    return fail(res, err.message, 400);
  }
});

exports.history = asyncHandler(async (req, res) => {
  const rows = await LedgerEntry.findAll({
    where: { actor_user_id: req.userId },
    order: [["posted_at", "DESC"]],
    limit: Number(req.query.limit) || 50,
  });
  return ok(res, rows);
});
