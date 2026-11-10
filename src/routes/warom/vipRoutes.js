const express = require("express");
const router = express.Router();

const vipController = require("../../controllers/warom/vipController");
const { authenticateUser } = require("../../middleware/warom/auth");

router.get("/plans", vipController.plans);
router.post("/subscribe", authenticateUser, vipController.subscribeWithCoins);

module.exports = router;
