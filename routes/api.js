const express = require("express");
const router = express.Router();

const apiController = require("../controllers/apiController");

router.get("/api/master-bhajans/:deity", apiController.getMasterBhajans);
router.get("/api/check-cooldown", apiController.checkCooldown);
router.get("/api/singers", apiController.getSingers);
router.get("/api/deity-rules", apiController.getDeityRules);
module.exports = router;