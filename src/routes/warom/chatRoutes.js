const express = require("express");
const router = express.Router();

const chatController = require("../../controllers/warom/chatController");
const { authenticateUser } = require("../../middleware/warom/auth");

router.use(authenticateUser);
router.get("/", chatController.listConversations);
router.post("/open", chatController.openConversation);
router.get("/:id/messages", chatController.listMessages);
router.post("/:id/messages", chatController.sendMessage);

module.exports = router;
