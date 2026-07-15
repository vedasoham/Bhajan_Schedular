const {Sequelize} = require("sequelize");
const Singer = require("../models/Singer");
const BhajanSubmission = require("../models/BhajanSubmission");
const {timeSince, formatDateHuman} = require("../services/helpers");
exports.showSingers = async (req, res) => {
  try {
    const singers = await BhajanSubmission.findAll({
      attributes: [
        'singer_name', 
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'total_sung'],
        [Sequelize.fn('MAX', Sequelize.col('session_date')), 'last_sung']
      ],
      group: ['singer_name'],
      order: [[Sequelize.col('singer_name'), 'ASC']],
      raw: true
    });
    
    const mapped = singers.map(s => {
      s.lastSungHuman = timeSince(s.last_sung);
      s.formattedDate = formatDateHuman(s.last_sung);
      return s;
    });
    res.render('singers', { singers: mapped });
  } catch (error) { res.status(500).send(error.message); }
};
exports.showSingerDictionary = async (req, res) => {
   try {
    const singers = await Singer.findAll({ order: [['name', 'ASC']] });
    res.render('singer-dictionary', { singers });
  } catch (error) { res.status(500).send(error.message); }
};
exports.addSinger = async (req, res) => {
  try {
    const { name } = req.body;
    if (name && name.trim()) {
      await Singer.findOrCreate({ where: { name: name.trim() } });
    }
    res.redirect('/admin/singer-dictionary');
  } catch (error) {
    res.status(500).send(`<h1>Error adding singer</h1><p>${error.message}</p><a href="/admin/singer-dictionary">Back</a>`);
  }
};
exports.editSinger = async (req, res) => {
  try {
    const { name } = req.body;
    if (name && name.trim()) {
      await Singer.update({ name: name.trim() }, { where: { id: req.params.id } });
    }
    res.redirect('/admin/singer-dictionary');
  } catch (error) {
    res.status(500).send(`<h1>Error editing singer</h1><p>${error.message}</p><a href="/admin/singer-dictionary">Back</a>`);
  }
};
exports.deleteSinger = async (req, res) => {
  try {
    await Singer.destroy({ where: { id: req.params.id } });
    res.redirect('/admin/singer-dictionary');
  } catch (error) {
    res.status(500).send(error.message);
  }
};