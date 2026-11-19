const express = require("express");
const router = express.Router();
const lockedPhotoController = require("../../controllers/warom/lockedPhotoController");
const {
  authenticateUser,
  optionalUserAuth,
  requireAccountType,
} = require("../../middleware/warom/auth");

router.get("/owner/:userId", optionalUserAuth, lockedPhotoController.forOwner);

router.use(authenticateUser);
router.get("/mine", requireAccountType("chatter"), lockedPhotoController.mine);
router.post("/", requireAccountType("chatter"), lockedPhotoController.create);
router.post("/:id/unlock", lockedPhotoController.unlock);
router.delete("/:id", requireAccountType("chatter"), lockedPhotoController.deactivate);

module.exports = router;
