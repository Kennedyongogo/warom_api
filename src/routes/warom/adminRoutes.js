const express = require("express");
const router = express.Router();

const adminController = require("../../controllers/warom/adminController");
const { authenticateAdmin } = require("../../middleware/warom/auth");

router.post("/bootstrap", adminController.bootstrap);
router.post("/login", adminController.login);

router.use(authenticateAdmin);
router.get("/me", adminController.me);
router.patch("/me", adminController.updateProfile);
router.patch("/me/password", adminController.updatePassword);
router.get("/dashboard", adminController.dashboard);

router.get("/directory-stats", adminController.directoryStats);
router.get("/users", adminController.listUsers);
router.get("/users/:id", adminController.getUser);
router.get("/admins", adminController.listAdmins);
router.post("/admins", adminController.createAdmin);
router.get("/admins/:id", adminController.getAdmin);
router.patch("/admins/:id", adminController.updateAdmin);
router.post("/users/:id/terminate", adminController.terminateUser);

router.get("/coin-packages", adminController.listCoinPackages);
router.post("/coin-packages", adminController.upsertCoinPackage);
router.patch("/coin-packages/:id", adminController.upsertCoinPackage);

router.get("/vip-plans", adminController.listVipPlans);
router.post("/vip-plans", adminController.upsertVipPlan);
router.patch("/vip-plans/:id", adminController.upsertVipPlan);

router.get("/gifts", adminController.listGifts);
router.post("/gifts", adminController.upsertGift);
router.patch("/gifts/:id", adminController.upsertGift);

router.get("/earnings-configs", adminController.listEarningsConfigs);
router.post("/earnings-configs", adminController.upsertEarningsConfig);

router.get("/payments", adminController.listPayments);
router.get("/withdrawals", adminController.listWithdrawals);
router.patch("/withdrawals/:id", adminController.reviewWithdrawal);

router.get("/reports", adminController.listReports);
router.patch("/reports/:id", adminController.resolveReport);

router.get("/live-streams", adminController.listLiveStreams);
router.post("/notifications/broadcast", adminController.broadcastNotification);

router.get("/inquiry-stats", adminController.inquiryStats);
router.get("/inquiries", adminController.listInquiries);
router.get("/inquiries/:id", adminController.getInquiry);
router.patch("/inquiries/:id", adminController.updateInquiry);

router.get("/policies", adminController.listPolicies);
router.post("/policies", adminController.upsertPolicy);
router.patch("/policies/:id", adminController.upsertPolicy);

module.exports = router;
