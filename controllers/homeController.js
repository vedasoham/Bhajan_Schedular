exports.home = (req, res) => {
  // If an admin is still logged in, take them straight to the admin dashboard
  // unless they explicitly asked for the public homepage (?home=true)
  if (req.session.admin && req.query.home !== 'true') {
    return res.redirect('/admin');
  }
  res.render('dashboard');
};