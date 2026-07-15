const express = require("express");
const router = express.Router();
const {
  requireLogin
} = require("../middleware/auth");

const analyticsController = require("../controllers/analyticsController");

router.get("/database", requireLogin, analyticsController.showDatabase);
router.get("/admin/analytics", requireLogin, analyticsController.showAnalytics);
module.exports = router;