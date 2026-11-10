const { Policy, Inquiry } = require("../../models");
const { ok, fail, asyncHandler } = require("../../utils/warom/response");

exports.listPolicies = asyncHandler(async (_req, res) => {
  const rows = await Policy.findAll({
    where: { is_published: true },
    order: [["title", "ASC"]],
  });
  return ok(res, rows);
});

exports.getPolicy = asyncHandler(async (req, res) => {
  const row = await Policy.findOne({
    where: { slug: req.params.slug, is_published: true },
  });
  if (!row) return fail(res, "Policy not found", 404);
  return ok(res, row);
});

exports.createInquiry = asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !subject || !message) {
    return fail(res, "name, email, subject and message are required");
  }
  const inquiry = await Inquiry.create({ name, email, subject, message });
  return ok(res, inquiry, "Inquiry received", 201);
});
