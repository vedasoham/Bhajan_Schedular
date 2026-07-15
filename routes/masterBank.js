const express = require("express");
const router = express.Router();

const masterBankController = require("../controllers/masterBankController");
router.get("/master-bank", masterBankController.showMasterBank);
router.post("/api/add-master-bhajan",masterBankController.addMasterBhajan);
router.post("/api/admin/update-master-bhajan/:id", masterBankController.updateMasterBhajan);
router.post("/api/admin/delete-master-bhajan/:id", masterBankController.deleteMasterBhajan);
router.get("/admin/export-master", masterBankController.exportMaster);
module.exports = router;