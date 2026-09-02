const { getLatestBulletins, CATEGORY_INFO } = require("./bulletinController");

exports.home = async (req, res) => {
  // If an admin is still logged in, take them straight to the admin dashboard
  // unless they explicitly asked for the public homepage (?home=true)
  if (req.session.admin && req.query.home !== 'true') {
    return res.redirect('/admin');
  }

  let bulletins = [];
  try {
    bulletins = await getLatestBulletins(5);
  } catch (err) {
    // Non-critical — home page still works without bulletins
    console.error("Failed to load bulletins for home page:", err.message);
  }

  res.render('dashboard', {
    showLoader: true,
    bulletins,
    CATEGORY_INFO
  });
};