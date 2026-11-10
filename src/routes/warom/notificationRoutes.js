const express = require("express");
const router = express.Router();

const notificationController = require("../../controllers/warom/notificationController");
const { authenticateUser } = require("../../middleware/warom/auth");

router.use(authenticateUser);
router.get("/", notificationController.list);
router.post("/:id/read", notificationController.markRead);

module.exports = router;
