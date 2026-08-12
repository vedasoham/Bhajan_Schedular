const { Sequelize } = require("sequelize");

const MasterBhajan = require("../models/MasterBhajan");
const BhajanSubmission = require("../models/BhajanSubmission");
const { normalizeBhajanTitle } = require("../services/fuzzyMatcher");

const{
    escapeHTML
} = require("../templates");

exports.showMasterBank = async (req, res) =>{
    try {
    const isAdmin = !!(req.session && req.session.adminUserId);
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

/**
 * POST /api/admin/reconcile-bhajan
 *
 * Body: { submitted_title, action: 'link', master_bhajan_id }
 *       { submitted_title, action: 'add' }   ← no-op here; caller will use addMasterBhajan separately
 *
 * 'link': update every BhajanSubmission whose normalised title matches
 *         submitted_title to use the master bhajan's canonical title.
 *         This fixes the mismatch once and removes it from the catcher.
 */
exports.reconcileBhajan = async (req, res) => {
  try {
    const { submitted_title, action, master_bhajan_id } = req.body;

    if (!submitted_title || !action) {
      return res.status(400).json({ error: 'submitted_title and action are required.' });
    }

    if (action === 'link') {
      if (!master_bhajan_id) {
        return res.status(400).json({ error: 'master_bhajan_id is required for link action.' });
      }

      const master = await MasterBhajan.findByPk(master_bhajan_id);
      if (!master) {
        return res.status(404).json({ error: 'Master bhajan not found.' });
      }

      const normSubmitted = normalizeBhajanTitle(submitted_title);

      // Find all submissions whose normalised title matches the submitted title
      const allSubmissions = await BhajanSubmission.findAll({
        attributes: ['id', 'title'],
        raw: true
      });

      const toUpdate = allSubmissions.filter(
        s => normalizeBhajanTitle(s.title) === normSubmitted
      );

      if (toUpdate.length > 0) {
        const ids = toUpdate.map(s => s.id);
        await BhajanSubmission.update(
          { title: master.title },
          { where: { id: { [Sequelize.Op.in]: ids } } }
        );
      }

      return res.json({
        success: true,
        updatedCount: toUpdate.length,
        masterTitle: master.title
      });
    }

    // action === 'add' — caller handles this separately via addMasterBhajan
    return res.json({ success: true, action: 'add' });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};