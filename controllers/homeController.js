exports.home = (req, res) => {
  // If an admin is still logged in, take them straight to the admin dashboard
  if (req.session.admin) {
    return res.redirect('/admin');
  }
  res.render('dashboard');
};