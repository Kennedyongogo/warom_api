const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../../middleware/warom/auth");
const presenceService = require("../../services/warom/presenceService");
const { User } = require("../../models");
const { ok, asyncHandler } = require("../../utils/warom/response");

router.use(authenticateUser);

router.post(
  "/heartbeat",
  asyncHandler(async (req, res) => {
    await presenceService.heartbeat(req.userId);
    return ok(res, { is_online: true, last_active_at: new Date() });
  })
);

router.get(
  "/:userId",
  asyncHandler(async (req, res) => {
    const online = presenceService.isOnline(req.params.userId);
    const user = await User.findByPk(req.params.userId, {
      attributes: ["id", "is_online", "last_active_at"],
    });
    return ok(res, {
      user_id: req.params.userId,
      is_online: online || Boolean(user?.is_online),
      last_active_at: user?.last_active_at || null,
    });
  })
);

module.exports = router;
