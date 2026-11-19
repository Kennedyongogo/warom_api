const express = require("express");
const router = express.Router();

const incomeController = require("../../controllers/warom/incomeController");
const {
  authenticateUser,
  requireAccountType,
} = require("../../middleware/warom/auth");

router.use(authenticateUser, requireAccountType("chatter"));
router.get("/", incomeController.summary);
router.get("/holds", incomeController.holds);
router.get("/transactions", incomeController.transactions);
router.get("/withdrawals", incomeController.history);
router.post("/withdrawals", incomeController.withdraw);
router.post("/release-due", incomeController.releaseDue);

module.exports = router;
