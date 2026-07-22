const express = require("express");
const router = express.Router();
const {
  requireLogin,
  requireApiLogin
} = require("../middleware/auth");

const masterBankController = require("../controllers/masterBankController");
router.get("/master-bank", masterBankController.showMasterBank);
router.post("/api/add-master-bhajan", requireApiLogin, masterBankController.addMasterBhajan);
router.post("/api/admin/update-master-bhajan/:id", requireApiLogin, masterBankController.updateMasterBhajan);
router.post("/api/admin/delete-master-bhajan/:id", requireApiLogin, masterBankController.deleteMasterBhajan);
router.get("/admin/export-master", requireLogin, masterBankController.exportMaster);
module.exports = router;