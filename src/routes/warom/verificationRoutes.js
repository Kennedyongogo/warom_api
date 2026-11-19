const express = require("express");
const router = express.Router();
const verificationController = require("../../controllers/warom/verificationController");
const { authenticateUser } = require("../../middleware/warom/auth");

router.use(authenticateUser);
router.get("/me", verificationController.mine);
router.post("/", verificationController.submit);

module.exports = router;
