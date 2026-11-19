const express = require("express");
const router = express.Router();
const liveStreamController = require("../../controllers/warom/liveStreamController");
const { authenticateUser } = require("../../middleware/warom/auth");

router.get("/", authenticateUser, liveStreamController.listLive);
router.get("/mine", authenticateUser, liveStreamController.mine);
router.get("/:id", authenticateUser, liveStreamController.getById);
router.post("/", authenticateUser, liveStreamController.start);
router.post("/schedule", authenticateUser, liveStreamController.schedule);
router.post("/:id/end", authenticateUser, liveStreamController.end);
router.post("/:id/join", authenticateUser, liveStreamController.join);
router.post("/:id/leave", authenticateUser, liveStreamController.leave);

module.exports = router;
