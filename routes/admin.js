const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");
const {
  requireLogin,
  requireApiLogin
} = require("../middleware/auth");

router.get("/admin", requireLogin, adminController.dashboard);
router.get("/admin/date/:date", requireLogin, adminController.sessionView);
router.get("/admin/edit/:id", requireLogin, adminController.editSubmissionForm);
router.post("/admin/edit/:id", requireLogin, adminController.updateSubmission);
router.post("/admin/delete/:id", requireLogin, adminController.deleteSubmission);
router.get("/admin/rules", requireLogin, adminController.showRules);
router.post("/admin/update-rules", requireLogin, adminController.updateRules);
router.post("/admin/permission", requireLogin, adminController.updatePermission);
router.post("/api/admin/toggle-lock", requireApiLogin, adminController.toggleLock);
router.post("/api/admin/reorder", requireApiLogin, adminController.reorderBhajans);
router.post("/admin/copy-session", requireLogin, adminController.copySession);
router.get("/admin/danger-reset-history", requireLogin, adminController.dangerResetHistory);

module.exports = router;