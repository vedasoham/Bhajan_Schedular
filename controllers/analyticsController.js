const { Sequelize } = require("sequelize");

const BhajanSubmission = require("../models/BhajanSubmission");
const MasterBhajan = require("../models/MasterBhajan");
const Singer = require("../models/Singer");
const {formatDateHuman} = require("../services/helpers");
const {escapeHtml, generateDatabaseHtml} = require ("../templates");

exports.showDatabase = async (req, res) => {
    try {
    const rawSubmissions = await BhajanSubmission.findAll({
      order: [
        ['title', 'ASC'],
        ['singer_name', 'ASC']
      ],
      raw: true
    });
    
    const submissions = rawSubmissions.map(s => {
      s.formattedDate = formatDateHuman(s.session_date);
      s.lastSung = timeSince(s.session_date);
      return s;
    });
    
    res.render('database', { submissions });
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
  }
};
exports.showAnalytics = async (req, res) => {
  try {
    const topBhajans = await BhajanSubmission.findAll({
      attributes: [
        "title",
        [Sequelize.fn("COUNT", Sequelize.col("title")), "count"]
      ],
      group: ["title"],
      order: [
        [Sequelize.fn("COUNT", Sequelize.col("title")), "DESC"]
      ],
      limit: 15,
      raw: true
    });

    res.render("analytics", { topBhajans });

  } catch (error) {
    res.status(500).send(error.message);
  }
};
