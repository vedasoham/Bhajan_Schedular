const express = require("express");
const router = express.Router();

const apiController = require("../controllers/apiController");

router.get("/api/master-bhajans/:deity", apiController.getMasterBhajans);
router.get("/api/check-cooldown", apiController.checkCooldown);
router.get("/api/scale-suggestions", apiController.getScaleSuggestions);
router.get("/api/singers", apiController.getSingers);
router.get("/api/deity-rules", apiController.getDeityRules);
router.post("/api/activity/heartbeat", apiController.recordHeartbeat);
router.post("/api/activity/offline", apiController.recordOffline);

module.exports = router;