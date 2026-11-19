const { ok, fail, asyncHandler } = require("../../utils/warom/response");
const { publicUrlFor } = require("../../middleware/warom/upload");

exports.uploadOne = asyncHandler(async (req, res) => {
  if (!req.file) return fail(res, "No file uploaded");
  const url = publicUrlFor(req, req.file);
  return ok(
    res,
    {
      url,
      absolute_url: `${req.protocol}://${req.get("host")}${url}`,
      mime: req.file.mimetype,
      size: req.file.size,
      kind: req.params.kind,
    },
    "Uploaded",
    201
  );
});

exports.uploadMany = asyncHandler(async (req, res) => {
  const files = req.files || [];
  if (!files.length) return fail(res, "No files uploaded");
  const items = files.map((file) => {
    const url = publicUrlFor(req, file);
    return {
      url,
      absolute_url: `${req.protocol}://${req.get("host")}${url}`,
      mime: file.mimetype,
      size: file.size,
      kind: req.params.kind,
    };
  });
  return ok(res, items, "Uploaded", 201);
});
