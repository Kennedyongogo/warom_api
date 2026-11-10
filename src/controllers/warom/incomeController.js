const { Withdrawal } = require("../../models");
const walletService = require("../../services/warom/walletService");
const { ok, fail, asyncHandler } = require("../../utils/warom/response");

exports.summary = asyncHandler(async (req, res) => {
  const data = await walletService.getWalletSummary(req.user);
  return ok(res, data);
});

exports.withdraw = asyncHandler(async (req, res) => {
  try {
    const withdrawal = await walletService.requestWithdrawal({
      chatter: req.user,
      amountCoins: Number(req.body.amount_coins),
      payoutMethod: req.body.payout_method,
      payoutDetails: req.body.payout_details,
    });
    return ok(res, withdrawal, "Withdrawal requested", 201);
  } catch (err) {
    return fail(res, err.message, 400);
  }
});

exports.history = asyncHandler(async (req, res) => {
  const rows = await Withdrawal.findAll({
    where: { chatter_id: req.userId },
    order: [["created_at", "DESC"]],
  });
  return ok(res, rows);
});
