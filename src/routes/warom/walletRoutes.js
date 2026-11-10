const express = require("express");
const router = express.Router();

const walletController = require("../../controllers/warom/walletController");
const { authenticateUser } = require("../../middleware/warom/auth");

router.get("/catalogue", walletController.catalogue);
router.use(authenticateUser);
router.get("/", walletController.summary);
router.get("/history", walletController.history);
router.post("/coins/purchase", walletController.createCoinPurchase);
router.post("/gifts/send", walletController.sendGift);

module.exports = router;
