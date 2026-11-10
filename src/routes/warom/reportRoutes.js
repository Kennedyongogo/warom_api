const express = require("express");
const router = express.Router();

const reportController = require("../../controllers/warom/reportController");
const { authenticateUser } = require("../../middleware/warom/auth");

router.post("/", authenticateUser, reportController.create);

module.exports = router;
