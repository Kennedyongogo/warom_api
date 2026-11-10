const express = require("express");
const router = express.Router();

const publicSiteController = require("../../controllers/warom/publicSiteController");

router.get("/policies", publicSiteController.listPolicies);
router.get("/policies/:slug", publicSiteController.getPolicy);
router.post("/inquiries", publicSiteController.createInquiry);

module.exports = router;
