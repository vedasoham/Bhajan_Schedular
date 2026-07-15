const { Sequelize } = require("sequelize");

const BhajanSubmission = require("../models/BhajanSubmission");
const SessionPermission = require("../models/SessionPermission");
const SessionMeta = require("../models/SessionMeta");
const MasterBhajan = require("../models/MasterBhajan");
const DeityRule = require("../models/DeityRule");

const {
    getNextThursday,
    formatDateHuman,
    timeSince,
    deityOrderKey,
    SPEED_ORDER,
    DEITY_ORDER
} = require("../services/helpers");

const {
    generateAdminCalendarHtml,
    generateAdminSessionViewHtml,
    generateAdminRulesHtml,
    generateEditFormHtml,
    generateSuccessHtml,
    generateErrorHtml,
    escapeHtml
} = require("../templates");
const requireLogin = require("../middleware/auth");

exports.dashboard = async (req, res) => {
    try {
    const today = new Date();
    const year = parseInt(req.query.year) || today.getFullYear();
    const month = parseInt(req.query.month) || (today.getMonth() + 1);

    // Calculate start and end of month strings manually to avoid timezone issues
    const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    
    // Fetch submissions for this month to count events
    const submissions = await BhajanSubmission.findAll({
      where: {
        session_date: {
          [Sequelize.Op.between]: [startDateStr, endDateStr]
        }
      }
    });

    // Fetch permissions for this month
    const permissions = await SessionPermission.findAll({
      where: {
        date: { [Sequelize.Op.between]: [startDateStr, endDateStr] }
      }
    });
    const permissionMap = {};
    const descriptionMap = {};
    permissions.forEach(p => {
      permissionMap[p.date] = p.type;
      descriptionMap[p.date] = p.description;
    });

    // Count events per date
    const eventCounts = {};
    submissions.forEach(s => {
      eventCounts[s.session_date] = (eventCounts[s.session_date] || 0) + 1;
    });

    // Compute Missing Bhajans Catcher
    const submittedTitles = await BhajanSubmission.findAll({
      attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('title')), 'title']],
      raw: true
    });
    const masterTitles = await MasterBhajan.findAll({
      attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('title')), 'title']],
      raw: true
    });
    const masterSet = new Set(masterTitles.map(m => (m.title || '').trim().toLowerCase()));
    const missingBhajans = submittedTitles.map(s => (s.title || '').trim()).filter(title => title && !masterSet.has(title.toLowerCase()));

    res.send(generateAdminCalendarHtml(year, month, eventCounts, permissionMap, descriptionMap, missingBhajans));
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
  }
};
exports.sessionView = async (req, res) => {
    try {
    const { date } = req.params;
    const submissions = await BhajanSubmission.findAll({
      where: { session_date: date },
    });
    
    const sorted = submissions.sort((a, b) => {
      if (a.list_order > 0 || b.list_order > 0) {
        if (a.list_order === 0) return 1; 
        if (b.list_order === 0) return -1;
        return a.list_order - b.list_order;
      }
      const deityCompare = deityOrderKey(a.deity) - deityOrderKey(b.deity);
      if (deityCompare !== 0) return deityCompare;
      return a.singer_name.toLowerCase().localeCompare(b.singer_name.toLowerCase());
    });

    const meta = await SessionMeta.findByPk(date);
    const isLocked = meta ? meta.is_locked : false;

    res.send(generateAdminSessionViewHtml(date, sorted, isLocked));
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
  }
};

exports.editSubmissionForm = async (req, res) => {
    try {
    const submission = await BhajanSubmission.findByPk(req.params.id);
    if (!submission) return res.status(404).send("Entry not found");
    res.send(generateEditFormHtml(submission));
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
  }
};

exports.updateSubmission = async (req, res) => {
    try {
    const { session_date, singer_name, partner_name, title, deity, scale, speed } = req.body;
    await BhajanSubmission.update({
      session_date, singer_name, partner_name, title, deity, scale, speed
    }, {
      where: { id: req.params.id }
    });
    res.redirect(`/admin/date/${session_date}`);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
  }
};

exports.deleteSubmission = async (req, res) => {
    try {
    const submission = await BhajanSubmission.findByPk(req.params.id);
    if (submission) {
      const date = submission.session_date;
      await submission.destroy();
      res.redirect(`/admin/date/${date}`);
    } else {
      res.redirect('/admin');
    }
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
  }
};
exports.showRules = async (req, res) => {
  try {
    const date = req.query.date || 'default';
    let rules = await DeityRule.findAll({
      where: { session_date: date },
      order: [['deity_name', 'ASC']]
    });
    if (rules.length === 0 && date !== 'default') {
      rules = await DeityRule.findAll({ where: { session_date: 'default' }, order: [['deity_name', 'ASC']] });
    }
    res.send(generateAdminRulesHtml(rules, date));
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
  }
};

exports.updateRules = async (req, res) => {
  try {
    const newRules = req.body.rules;
    const date = req.body.date || 'default';
    for (let rule of newRules) {
      const existing = await DeityRule.findOne({ where: { session_date: date, deity_name: rule.deity_name } });
      if (existing) {
        await existing.update({ min_required: rule.min_required, max_allowed: rule.max_allowed });
      } else {
        await DeityRule.create({
          session_date: date,
          deity_name: rule.deity_name,
          min_required: rule.min_required,
          max_allowed: rule.max_allowed
        });
      }
    }
    res.json({ success: true, message: 'Rules successfully saved!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.updatePermission = async (req, res) => {
  try {
    const { date, type, description } = req.body;
    if (type === 'clear') {
      await SessionPermission.destroy({ where: { date } });
    } else {
      await SessionPermission.upsert({ date, type, description });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.toggleLock = async (req, res) =>{
try {
    const { date, is_locked } = req.body;
    await SessionMeta.upsert({ session_date: date, is_locked });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
};
exports.reorderBhajans =async (req, res) => {
  try {
    const { orderData } = req.body; // Array of { id, order }
    for (let item of orderData) {
      await BhajanSubmission.update({ list_order: item.order }, { where: { id: item.id } });
    }
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
};
exports.copySession = async (req, res) => {
  try {
    const { source_date, target_date } = req.body;
    const sourceSubs = await BhajanSubmission.findAll({ where: { session_date: source_date }, raw: true });
    
    const newSubs = sourceSubs.map(s => {
      delete s.id;
      s.session_date = target_date;
      s.list_order = 0; // Reset order for new session
      s.created_at = new Date();
      return s;
    });
    await BhajanSubmission.bulkCreate(newSubs);
    res.redirect(`/admin/date/${target_date}`);
  } catch(e) { res.status(500).send(e.message); }
};