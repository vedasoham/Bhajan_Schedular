const MasterBhajan = require("../models/MasterBhajan");
const { Sequelize } = require("sequelize");
const BhajanSubmission = require("../models/BhajanSubmission");
const Singer = require("../models/Singer");
const DeityRule = require("../models/DeityRule");

exports.getMasterBhajans = async (req, res) => {
    try {
    const bhajans = await MasterBhajan.findAll({
      where: { deity: req.params.deity },
      order: [['title', 'ASC']]
    });
    res.json(bhajans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
exports.checkCooldown = async (req, res) => {
    try {
    const { title } = req.query;
    if (!title) return res.json(null);
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentSubmission = await BhajanSubmission.findOne({
      where: {
        title: { [Sequelize.Op.like]: title },
        session_date: { [Sequelize.Op.gte]: thirtyDaysAgo.toISOString().split('T')[0] }
      },
      order: [['session_date', 'DESC']]
    });
    
    res.json(recentSubmission);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
exports.getSingers = async (req, res) => {

try {
    const singers = await Singer.findAll({ order: [['name', 'ASC']] });
    res.json(singers);
  } 
  catch (error) { res.status(500).json({ error: error.message }); }
};
exports.getDeityRules = async (req, res) => {
  try {
    const date = req.query.date || 'default';
    let rules = await DeityRule.findAll({ where: { session_date: date } });
    if (rules.length === 0 && date !== 'default') {
      rules = await DeityRule.findAll({ where: { session_date: 'default' } });
    }
    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};