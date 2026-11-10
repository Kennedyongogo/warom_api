const express = require("express");
const router = express.Router();

const authController = require("../../controllers/warom/authController");
const { authenticateUser } = require("../../middleware/warom/auth");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/me", authenticateUser, authController.me);

module.exports = router;
