const { Sequelize } = require("sequelize");
const activityService = require("../services/activityService");
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
  DEITY_ORDER,
} = require("../services/helpers");

const {
  generateAdminCalendarHtml,
  generateAdminSessionViewHtml,
  generateAdminRulesHtml,
  generateEditFormHtml,
  generateSuccessHtml,
  generateErrorHtml,
  escapeHtml,
} = require("../templates");
const requireLogin = require("../middleware/auth");

exports.dashboard = async (req, res) => {
  try {
    const today = new Date();
    const year = parseInt(req.query.year) || today.getFullYear();
    const month = parseInt(req.query.month) || today.getMonth() + 1;

    const startDateStr = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDateStr = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    // Fetch submissions for this month
    const submissions = await BhajanSubmission.findAll({
      where: {
        session_date: {
          [Sequelize.Op.between]: [startDateStr, endDateStr],
        },
      },
    });

    // Fetch permissions
    const permissions = await SessionPermission.findAll({
      where: {
        date: {
          [Sequelize.Op.between]: [startDateStr, endDateStr],
        },
      },
    });

    const permissionMap = {};
    const descriptionMap = {};

    permissions.forEach((p) => {
      permissionMap[p.date] = p.type;
      descriptionMap[p.date] = p.description;
    });

    // Count events
    const eventCounts = {};

    submissions.forEach((s) => {
      eventCounts[s.session_date] = (eventCounts[s.session_date] || 0) + 1;
    });

    // Missing bhajans
    const submittedTitles = await BhajanSubmission.findAll({
      attributes: [[Sequelize.fn("DISTINCT", Sequelize.col("title")), "title"]],
      raw: true,
    });

    const masterTitles = await MasterBhajan.findAll({
      attributes: [[Sequelize.fn("DISTINCT", Sequelize.col("title")), "title"]],
      raw: true,
    });

    const masterSet = new Set(
      masterTitles.map((m) => (m.title || "").trim().toLowerCase()),
    );

    const missingBhajans = submittedTitles
      .map((s) => (s.title || "").trim())
      .filter((title) => title && !masterSet.has(title.toLowerCase()));

    // Dashboard statistics
    const [
      totalSessions,
      totalBhajans,
      totalSingers,
      nextSession,
      recentActivity,
    ] = await Promise.all([
      SessionMeta.count(),
      MasterBhajan.count(),
      BhajanSubmission.count({
        distinct: true,
        col: "singer_name",
      }),
      SessionPermission.findOne({
        where: {
          date: {
            [Sequelize.Op.gte]: new Date().toISOString().split("T")[0],
          },
        },
        order: [["date", "ASC"]],
      }),
      activityService.getRecent(10),
    ]);
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const currentMonthName = monthNames[month - 1];

    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayIndex = new Date(year, month - 1, 1).getDay();

    let calendarCells = "";

    for (let i = 0; i < firstDayIndex; i++) {
      calendarCells += `<div class="calendar-day empty"></div>`;
    }

    const todayDate = new Date();
    const isCurrentMonth =
      todayDate.getFullYear() === year && todayDate.getMonth() + 1 === month;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      const count = eventCounts[dateStr] || 0;
      const perm = permissionMap[dateStr];
      const desc = descriptionMap[dateStr] || "";

      const dow = new Date(year, month - 1, day).getDay();

      let colorClass = "day-none";

      if (perm === "special") colorClass = "day-special";
      else if (perm === "festival") colorClass = "day-festival-perm";
      else if (count > 0)
        colorClass = dow === 4 ? "day-thursday" : "day-festival";

      const isToday = isCurrentMonth && todayDate.getDate() === day;

      calendarCells += `
<div class="calendar-day ${colorClass} ${isToday ? "today" : ""}"
onclick="openAdminDateModal('${dateStr}','${perm || ""}','${desc.replace(/'/g, "&apos;")}')">
<div class="calendar-date-num">${day}</div>
<div class="calendar-actions">
${count ? `<div class="event-pill">${count} Bhajans</div>` : ""}
${perm ? `<div class="perm-pill">${perm.toUpperCase()}</div>` : ""}
</div>
</div>`;
    }

    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;

    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;

    res.render("admin-dashboard", {
      page: "dashboard",
      pageTitle: "Dashboard",

      year,
      month,

      currentMonthName,
      calendarCells,
      prevMonth,
      prevYear,
      nextMonth,
      nextYear,

      eventCounts,
      permissionMap,
      descriptionMap,
      missingBhajans,

      stats: {
        totalSessions,
        totalBhajans,
        totalSingers,
        nextSession,
      },
      recentActivity,
    });
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
      return a.singer_name
        .toLowerCase()
        .localeCompare(b.singer_name.toLowerCase());
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
    const {
      session_date,
      singer_name,
      partner_name,
      title,
      deity,
      scale,
      speed,
    } = req.body;
    await BhajanSubmission.update(
      {
        session_date,
        singer_name,
        partner_name,
        title,
        deity,
        scale,
        speed,
      },
      {
        where: { id: req.params.id },
      },
    );
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
      res.redirect("/admin");
    }
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
  }
};
exports.showRules = async (req, res) => {
  try {
    const date = req.query.date || "default";
    let rules = await DeityRule.findAll({
      where: { session_date: date },
      order: [["deity_name", "ASC"]],
    });
    if (rules.length === 0 && date !== "default") {
      rules = await DeityRule.findAll({
        where: { session_date: "default" },
        order: [["deity_name", "ASC"]],
      });
    }
    res.send(generateAdminRulesHtml(rules, date));
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
  }
};

exports.updateRules = async (req, res) => {
  try {
    const newRules = req.body.rules;
    const date = req.body.date || "default";
    for (let rule of newRules) {
      const existing = await DeityRule.findOne({
        where: { session_date: date, deity_name: rule.deity_name },
      });
      if (existing) {
        await existing.update({
          min_required: rule.min_required,
          max_allowed: rule.max_allowed,
        });
      } else {
        await DeityRule.create({
          session_date: date,
          deity_name: rule.deity_name,
          min_required: rule.min_required,
          max_allowed: rule.max_allowed,
        });
      }
    }
    res.json({ success: true, message: "Rules successfully saved!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.updatePermission = async (req, res) => {
  try {
    const { date, type, description } = req.body;
    if (type === "clear") {
      await SessionPermission.destroy({ where: { date } });
    } else {
      await SessionPermission.upsert({ date, type, description });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.toggleLock = async (req, res) => {
  try {
    const { date, is_locked } = req.body;
    await SessionMeta.upsert({ session_date: date, is_locked });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.reorderBhajans = async (req, res) => {
  try {
    const { orderData } = req.body; // Array of { id, order }
    for (let item of orderData) {
      await BhajanSubmission.update(
        { list_order: item.order },
        { where: { id: item.id } },
      );
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.copySession = async (req, res) => {
  try {
    const { source_date, target_date } = req.body;
    const sourceSubs = await BhajanSubmission.findAll({
      where: { session_date: source_date },
      raw: true,
    });

    const newSubs = sourceSubs.map((s) => {
      delete s.id;
      s.session_date = target_date;
      s.list_order = 0; // Reset order for new session
      s.created_at = new Date();
      return s;
    });
    await BhajanSubmission.bulkCreate(newSubs);
    res.redirect(`/admin/date/${target_date}`);
  } catch (e) {
    res.status(500).send(e.message);
  }
};
exports.dangerResetHistory = async (req, res) => {
  try {
    // Wipes all history and resets the ID counters
    await BhajanSubmission.destroy({ where: {}, truncate: true });
    await SessionMeta.destroy({ where: {}, truncate: true }); // Removes all locks

    // Drop the old v1 table so it doesn't automatically restore data on server restart
    try {
      await sequelize.query("DROP TABLE IF EXISTS bhajan_submissions");
    } catch (err) {}

    res.send(`
      <!DOCTYPE html><html><head><link rel="stylesheet" href="/css/style.css"><title>Reset Complete</title></head>
      <body style="text-align:center; padding:50px; background:#fff5f5;">
        <h1 style="color:#e03131; font-size:40px;">🚨 History Wiped!</h1>
        <p style="font-size:18px; margin-bottom:20px;">All past bhajan submissions and session locks have been permanently deleted.</p>
        <a class="button" href="/admin">Return to Control Tower</a>
      </body></html>
    `);
  } catch (error) {
    res.status(500).send(error.message);
  }
};
