const bcrypt = require("bcrypt");
const AdminUser = require("../models/AdminUser");
const adminUserService = require("../services/adminUserService");

exports.listAdmins = async (req, res) => {
  try {
    const admins = await AdminUser.findAll({
      order: [
        ["role", "ASC"],
        ["display_name", "ASC"]
      ]
    });

    res.render("admin-users", {
      admins,
      currentAdmin: req.session.admin
    });

  } catch (error) {
    res.status(500).send(error.message);
  }
};
exports.showCreateForm = (req, res) => {
    res.render("admin-user-form", {
        pageTitle: "Create Administrator",
        admin: null,
        error: null
    });
};
exports.createAdmin = async (req, res) => {

    try {

        await adminUserService.createAdmin(
            req.body
        );

        res.redirect(
            "/admin/admin-users"
        );

    }

    catch (error) {

        res.render(
            "admin-user-form",
            {
                admin: null,
                error: error.message
            }
        );

    }

};

exports.showEditForm = async (req, res) => {

    try {

        const admin =
            await adminUserService.findById(
                req.params.id
            );

        res.render(
            "admin-user-form",
            {
                admin,
                error: null
            }
        );

    }

    catch (error) {

        res.status(404).send(error.message);

    }

};
exports.updateAdmin = async (req, res) => {

    try {

        await adminUserService.updateAdmin(
            req.params.id,
            req.body
        );

        res.redirect(
            "/admin/admin-users"
        );

    }

    catch (error) {

        const admin =
            await adminUserService.findById(
                req.params.id
            );

        res.render(
            "admin-user-form",
            {
                admin,
                error: error.message
            }
        );

    }

};
exports.deleteAdmin = async (req, res) => {

    try {

        await adminUserService.deleteAdmin(

            req.session.adminUserId,

            req.params.id

        );

        res.redirect(
            "/admin/admin-users"
        );

    }

    catch (error) {

        res.status(400).send(
            error.message
        );

    }

};
exports.toggleActive = async (req, res) => {

    try {

        await adminUserService.toggleActive(
            req.session.adminUserId,
            req.params.id
        );

        res.redirect("/admin/admin-users");

    } catch (error) {

        res.status(400).send(error.message);

    }

};
exports.showResetPasswordForm = async (req, res) => {

    try {

        const admin =
            await adminUserService.findById(
                req.params.id
            );

        res.render(
            "admin-reset-password",
            {
                admin,
                error: null
            }
        );

    } catch (error) {

        res.status(404).send(error.message);

    }

};
exports.resetPassword = async (req, res) => {

    try {

        await adminUserService.resetPassword(
            req.params.id,
            req.body.password
        );

        res.redirect("/admin/admin-users");

    } catch (error) {

        const admin =
            await adminUserService.findById(
                req.params.id
            );

        res.render(
            "admin-reset-password",
            {
                admin,
                error: error.message
            }
        );

    }

};