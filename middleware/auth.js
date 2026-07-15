const requireLogin = (req, res, next) => {
  if (req.session && req.session.isAdmin) {
    return next();
  }

return res.redirect("/admin-login");
};

const requireApiLogin = (req, res, next) => {
  if (req.session && req.session.isAdmin) {
    return next();
  }

  return res.status(401).json({
    success: false,
    error: "Unauthorized"
  });
};

module.exports = {
  requireLogin,
  requireApiLogin
};