const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");

router.get("/admin-login", authController.showLogin);

router.post("/admin-login", authController.login);

router.get("/logout", authController.logout);

module.exports = router;