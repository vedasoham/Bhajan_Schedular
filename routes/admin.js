const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");

router.get("/admin", adminController.dashboard);

module.exports = router;