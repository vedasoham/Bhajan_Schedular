const { Sequelize } = require("sequelize");

const BhajanSubmission = require("../models/BhajanSubmission");
const SessionPermission = require("../models/SessionPermission");
const SessionMeta = require("../models/SessionMeta");
const MasterBhajan = require("../models/MasterBhajan");
const DeityRule = require("../models/DeityRule");

const {
    getNextThursday,
    formatDateHuman,
    timeSince
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