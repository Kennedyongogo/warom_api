const { Verification, User } = require("../../models");
const { ok, fail, asyncHandler } = require("../../utils/warom/response");

exports.submit = asyncHandler(async (req, res) => {
  const kind = req.body.kind || "identity";
  if (!["age", "identity", "chatter_kyc"].includes(kind)) {
    return fail(res, "kind must be age|identity|chatter_kyc");
  }

  if (kind === "chatter_kyc" && req.accountType !== "chatter") {
    return fail(res, "Only chatters can submit chatter_kyc", 403);
  }

  const documentUrls = Array.isArray(req.body.document_urls)
    ? req.body.document_urls
    : [];
  if (!documentUrls.length) {
    return fail(res, "document_urls is required");
  }

  const existing = await Verification.findOne({
    where: { user_id: req.userId, kind, status: "pending" },
  });
  if (existing) {
    await existing.update({
      document_urls: documentUrls,
      liveness_payload: req.body.liveness_payload || existing.liveness_payload,
      notes: req.body.notes || existing.notes,
    });
    return ok(res, existing, "Verification updated");
  }

  const row = await Verification.create({
    user_id: req.userId,
    kind,
    status: "pending",
    document_urls: documentUrls,
    liveness_payload: req.body.liveness_payload || null,
    notes: req.body.notes || null,
  });

  await User.update(
    { verification_status: "pending" },
    { where: { id: req.userId } }
  );

  return ok(res, row, "Verification submitted", 201);
});

exports.mine = asyncHandler(async (req, res) => {
  const rows = await Verification.findAll({
    where: { user_id: req.userId },
    order: [["created_at", "DESC"]],
  });
  return ok(res, {
    verification_status: req.user.verification_status,
    is_verified: req.user.is_verified,
    items: rows,
  });
});
