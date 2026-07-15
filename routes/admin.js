const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");

router.get("/admin", adminController.dashboard);
router.get("/admin/date/:date", adminController.sessionView);
router.get("/admin/edit/:id", adminController.editSubmissionForm);
router.post("/admin/edit/:id", adminController.updateSubmission);
router.post("/admin/delete/:id", adminController.deleteSubmission);
router.get("/admin/rules", adminController.showRules);
router.post("/admin/update-rules", adminController.updateRules);
router.post("/admin/permission", adminController.updatePermission);
router.post("/api/admin/toggle-lock", adminController.toggleLock);
router.post("/api/admin/reorder", adminController.reorderBhajans);
router.post("/admin/copy-session", adminController.copySession);
module.exports = router;