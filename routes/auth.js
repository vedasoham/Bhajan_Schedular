const express = require("express");

const router = express.Router();

const authController = require("../controllers/authController");

router.get("/admin-login", authController.showLogin);
router.post("/admin-login", authController.login);
router.post("/auth/google", authController.googleLogin);
router.get("/logout", authController.logout);
router.get("/forgot-password",authController.showForgotPassword);
router.post("/forgot-password",authController.checkForgotPassword);
router.get("/forgot-password/google/:id",authController.showGoogleRecovery);
router.post("/auth/google/recovery",authController.googleRecovery);
router.get("/forgot-password/reset",authController.showPasswordReset);
router.post("/forgot-password/reset",authController.resetForgotPassword);

module.exports = router;