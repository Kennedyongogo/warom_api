const express = require("express");
const router = express.Router();

const discoveryController = require("../../controllers/warom/discoveryController");
const { authenticateUser } = require("../../middleware/warom/auth");

router.use(authenticateUser);
router.get("/home", discoveryController.home);
router.get("/discover", discoveryController.discover);

module.exports = router;
