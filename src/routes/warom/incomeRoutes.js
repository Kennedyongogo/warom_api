const express = require("express");
const router = express.Router();

const incomeController = require("../../controllers/warom/incomeController");
const {
  authenticateUser,
  requireAccountType,
} = require("../../middleware/warom/auth");

router.use(authenticateUser, requireAccountType("chatter"));
router.get("/", incomeController.summary);
router.get("/withdrawals", incomeController.history);
router.post("/withdrawals", incomeController.withdraw);

module.exports = router;
