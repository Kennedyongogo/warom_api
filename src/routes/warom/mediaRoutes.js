const express = require("express");
const router = express.Router();
const mediaController = require("../../controllers/warom/mediaController");
const { authenticateUser } = require("../../middleware/warom/auth");
const { upload } = require("../../middleware/warom/upload");
const { fail } = require("../../utils/warom/response");

const kinds = new Set([
  "profile",
  "cover",
  "chat",
  "gift",
  "verification",
  "locked",
  "report",
  "misc",
]);

router.use(authenticateUser);

router.post("/:kind", (req, res, next) => {
  if (!kinds.has(req.params.kind)) {
    return fail(res, "Invalid upload kind", 400);
  }
  upload.single("file")(req, res, (err) => {
    if (err) return fail(res, err.message, 400);
    return mediaController.uploadOne(req, res, next);
  });
});

router.post("/:kind/batch", (req, res, next) => {
  if (!kinds.has(req.params.kind)) {
    return fail(res, "Invalid upload kind", 400);
  }
  upload.array("files", 12)(req, res, (err) => {
    if (err) return fail(res, err.message, 400);
    return mediaController.uploadMany(req, res, next);
  });
});

module.exports = router;
