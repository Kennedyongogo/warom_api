const express = require("express");
const router = express.Router();

const socialController = require("../../controllers/warom/socialController");
const { authenticateUser } = require("../../middleware/warom/auth");

router.use(authenticateUser);
router.post("/follow/:userId", socialController.follow);
router.delete("/follow/:userId", socialController.unfollow);
router.post("/block/:userId", socialController.block);
router.delete("/block/:userId", socialController.unblock);
router.post("/swipe", socialController.swipe);
router.get("/matches", socialController.listMatches);

module.exports = router;
