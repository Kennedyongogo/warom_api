const express = require("express");
const router = express.Router();

const profileController = require("../../controllers/warom/profileController");
const { authenticateUser, optionalUserAuth } = require("../../middleware/warom/auth");

router.get("/me/social", authenticateUser, profileController.mySocial);
router.patch("/me", authenticateUser, profileController.updateMe);
router.post("/me/password", authenticateUser, profileController.changePassword);
router.delete("/me", authenticateUser, profileController.deleteAccount);
router.get("/:id", optionalUserAuth, profileController.getById);

module.exports = router;
