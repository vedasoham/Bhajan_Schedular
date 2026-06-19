const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");

router.get("/admin", adminController.dashboard);
router.get("/admin/date/:date", adminController.sessionView);
router.get("/admin/edit/:id", adminController.editSubmissionForm);
router.post("/admin/edit/:id", adminController.updateSubmission);
router.post("/admin/delete/:id", adminController.deleteSubmission);

module.exports = router;