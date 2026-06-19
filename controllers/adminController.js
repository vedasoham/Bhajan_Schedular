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