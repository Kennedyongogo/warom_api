const express = require("express");
const router = express.Router();
const authController = require("../../controllers/warom/authController");
const { authenticateUser } = require("../../middleware/warom/auth");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/social", authController.social);
router.get("/me", authenticateUser, authController.me);
router.post("/logout", authenticateUser, authController.logout);
router.post("/device-token", authenticateUser, authController.registerDevice);
router.delete("/device-token", authenticateUser, authController.removeDevice);

module.exports = router;
