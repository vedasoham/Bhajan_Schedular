exports.showLogin = (req, res) => {
    res.render("admin-login", { error: null });
};

exports.login = (req, res) => {
    const { username, password } = req.body;

    const adminUser = (process.env.ADMIN_USER || "admin").trim().toLowerCase();
    const adminPass = (process.env.ADMIN_PASS || "sairam").trim();

    if (
        (username || "").trim().toLowerCase() === adminUser &&
        (password || "").trim() === adminPass
    ) {
        req.session.isAdmin = true;

        req.session.save(() => {
            res.redirect("/admin");
        });
    } else {
        res.render("admin-login", {
            error: "Invalid ID or Password"
        });
    }
};

exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect("/");
    });
};