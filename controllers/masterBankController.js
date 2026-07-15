const { Sequelize } = require("sequelize");

const MasterBhajan = require("../models/MasterBhajan");
const BhajanSubmission = require("../models/BhajanSubmission");

const{
    escapeHTML
} = require("../templates");

exports.showMasterBank = async (req, res) =>{
    try {
    const isAdmin = req.session && req.session.isAdmin;
    const bhajans = await MasterBhajan.findAll({
      order: [['title', 'ASC']]
    });
    res.render('master-bank', { bhajans, isAdmin });
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
  }
};
exports.addMasterBhajan = async (req,res) =>{
    try {
    const { title, deity, raga, tempo, level, shruti, shruti_female } = req.body;
    await MasterBhajan.create({ title, deity, raga, tempo, level, shruti, shruti_female });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
exports.updateMasterBhajan = async (req, res) => {
  try {
    const { title, deity, level, tempo, raga, shruti, shruti_female, language } = req.body;
    
    await MasterBhajan.update(
      { title, deity, level, tempo, raga, shruti, shruti_female, language },
      { where: { id: req.params.id } }
    );
    
    res.json({ success: true, message: "Bhajan updated successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.deleteMasterBhajan = async (req, res) => {
    try {
    await MasterBhajan.destroy({ where: { id: req.params.id } });
    res.json({ success: true, message: "Bhajan deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.exportMaster = async (req, res) =>{
    try {
    const allBhajans = await MasterBhajan.findAll();
    const jsonString = JSON.stringify(allBhajans, null, 2);
    res.setHeader('Content-disposition', 'attachment; filename=cleaned_master_bhajans.json');
    res.setHeader('Content-type', 'application/json');
    res.send(jsonString);
  } catch (error) {
    res.status(500).send("Export failed");
  }
}