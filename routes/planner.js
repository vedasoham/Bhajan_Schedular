const express = require("express");
const router = express.Router();

const plannerController = require("../controllers/plannerController");

router.get("/submit-form", plannerController.showSubmitForm);
router.post("/submit-form", plannerController.submitForm);
router.get("/plan-view", plannerController.planView);
router.post("/submit", plannerController.submitApi);
router.get("/plan/:session_date", plannerController.getPlan);

module.exports = router;