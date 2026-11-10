const express = require("express");
const router = express.Router();

const callController = require("../../controllers/warom/callController");
const { authenticateUser } = require("../../middleware/warom/auth");

router.use(authenticateUser);
router.get("/history", callController.history);
router.post("/start", callController.start);
router.patch("/:id", callController.updateStatus);

module.exports = router;
