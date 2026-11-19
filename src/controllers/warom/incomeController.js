const { Withdrawal, LedgerEntry, EarningHold } = require("../../models");
const walletService = require("../../services/warom/walletService");
const earningsReleaseService = require("../../services/warom/earningsReleaseService");
const { ok, fail, asyncHandler } = require("../../utils/warom/response");

exports.summary = asyncHandler(async (req, res) => {
  const data = await walletService.getWalletSummary(req.user);
  const pendingHolds = await earningsReleaseService.listHoldsForChatter(
    req.userId,
    { status: "pending" }
  );
  return ok(res, {
    ...data,
    pending_holds: pendingHolds,
  });
});

exports.withdraw = asyncHandler(async (req, res) => {
  try {
    if (!req.user.is_verified && req.user.verification_status !== "approved") {
      return fail(
        res,
        "Complete chatter KYC verification before withdrawing",
        403
      );
    }
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

exports.holds = asyncHandler(async (req, res) => {
  const rows = await earningsReleaseService.listHoldsForChatter(req.userId, {
    status: req.query.status,
  });
  return ok(res, rows);
});

/** Full income activity: holds + ledger posts + withdrawals. */
exports.transactions = asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit) || 50;
  const [holds, ledger, withdrawals] = await Promise.all([
    EarningHold.findAll({
      where: { chatter_id: req.userId },
      order: [["created_at", "DESC"]],
      limit,
    }),
    LedgerEntry.findAll({
      where: { actor_user_id: req.userId },
      order: [["posted_at", "DESC"]],
      limit,
    }),
    Withdrawal.findAll({
      where: { chatter_id: req.userId },
      order: [["created_at", "DESC"]],
      limit,
    }),
  ]);
  return ok(res, { holds, ledger, withdrawals });
});

/** Manual trigger useful in admin/dev; cron also runs this. */
exports.releaseDue = asyncHandler(async (_req, res) => {
  const released = await earningsReleaseService.releaseMaturedHolds();
  return ok(res, { released }, "Release job finished");
});
