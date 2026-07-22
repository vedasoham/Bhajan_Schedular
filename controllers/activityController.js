const ActivityLog = require("../models/ActivityLog");
const UserPresence = require("../models/UserPresence");
const AdminUser = require("../models/AdminUser");
const { Sequelize } = require("sequelize");

exports.showActivityLogs = async (req, res) => {
  try {
    if (!req.session.admin || req.session.admin.role !== "super_admin") {
      return res.status(403).send("<h1>403 Forbidden</h1><p>Only Super Administrators can access the Activity Monitor.</p>");
    }

    // 1. Fetch Presence List & evaluate online/offline status (45 seconds threshold)
    const presence = await UserPresence.findAll({
      order: [Sequelize.literal("last_seen_at DESC")]
    });

    const now = new Date();
    const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);

    const presenceList = presence.map((p) => {
      const pObj = p.toJSON();
      const lastSeen = new Date(pObj.last_seen_at);
      pObj.isOnline = lastSeen >= thirtySecondsAgo;
      pObj.timeAgo = Math.max(0, Math.round((now - lastSeen) / 1000));
      return pObj;
    });

    // Deduplicate online admins & online users
    const onlinePresence = presenceList.filter(p => p.isOnline);
    const uniqueOnlineAdmins = new Set(
      onlinePresence
        .filter(p => p.user_type !== 'user' || p.admin_id !== null)
        .map(p => p.admin_id ? `admin_${p.admin_id}` : p.username)
    ).size;

    const uniqueOnlineUsers = new Set(
      onlinePresence
        .filter(p => p.user_type === 'user' && p.admin_id === null)
        .map(p => p.session_id || p.username)
    ).size;

    // 2. Fetch Activity Logs
    const pageNum = parseInt(req.query.page || 1, 10);
    const limit = 150;
    const offset = (pageNum - 1) * limit;

    const { count, rows: logs } = await ActivityLog.findAndCountAll({
      order: [Sequelize.literal("created_at DESC")],
      limit,
      offset
    });

    // 3. Section Surfing & Time Spent Summary
    const sectionStats = await ActivityLog.findAll({
      attributes: [
        "section",
        [Sequelize.fn("COUNT", Sequelize.col("id")), "visit_count"],
        [Sequelize.fn("SUM", Sequelize.col("duration_seconds")), "total_duration"]
      ],
      group: ["section"],
      order: [[Sequelize.fn("COUNT", Sequelize.col("id")), "DESC"]],
      raw: true
    });

    // 4. Admin Users List for quick filtering
    const admins = await AdminUser.findAll({
      attributes: ["id", "username", "display_name", "title", "role"]
    });

    res.render("activity-logs", {
      presenceList,
      logs,
      totalLogs: count,
      sectionStats,
      admins,
      onlineAdminsCount: uniqueOnlineAdmins,
      onlineUsersCount: uniqueOnlineUsers,
      currentPage: pageNum,
      totalPages: Math.ceil(count / limit),
      currentAdmin: req.session.admin,
      page: "activity"
    });
  } catch (error) {
    res.status(500).send(`<h1>Error loading Activity Logs</h1><p>${error.message}</p>`);
  }
};

exports.purgeOldLogs = async (req, res) => {
  try {
    if (!req.session.admin || req.session.admin.role !== "super_admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const deletedLogs = await ActivityLog.destroy({
      where: {
        created_at: { [Sequelize.Op.lt]: thirtyDaysAgo }
      }
    });

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await UserPresence.destroy({
      where: {
        last_seen_at: { [Sequelize.Op.lt]: sevenDaysAgo }
      }
    });

    res.json({ success: true, message: `Purged ${deletedLogs} logs older than 30 days.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getActivityFeedJson = async (req, res) => {
  try {
    if (!req.session.admin || req.session.admin.role !== "super_admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const presence = await UserPresence.findAll({
      order: [Sequelize.literal("last_seen_at DESC")]
    });

    const now = new Date();
    const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);

    const presenceList = presence.map((p) => {
      const pObj = p.toJSON();
      const lastSeen = new Date(pObj.last_seen_at);
      pObj.isOnline = lastSeen >= thirtySecondsAgo;
      pObj.timeAgo = Math.max(0, Math.round((now - lastSeen) / 1000));
      return pObj;
    });

    const onlinePresence = presenceList.filter(p => p.isOnline);
    const uniqueOnlineAdmins = new Set(
      onlinePresence
        .filter(p => p.user_type !== 'user' || p.admin_id !== null)
        .map(p => p.admin_id ? `admin_${p.admin_id}` : p.username)
    ).size;

    const uniqueOnlineUsers = new Set(
      onlinePresence
        .filter(p => p.user_type === 'user' && p.admin_id === null)
        .map(p => p.session_id || p.username)
    ).size;

    const { count, rows: logs } = await ActivityLog.findAndCountAll({
      order: [Sequelize.literal("created_at DESC")],
      limit: 150
    });

    const sectionStats = await ActivityLog.findAll({
      attributes: [
        "section",
        [Sequelize.fn("COUNT", Sequelize.col("id")), "visit_count"],
        [Sequelize.fn("SUM", Sequelize.col("duration_seconds")), "total_duration"]
      ],
      group: ["section"],
      order: [[Sequelize.fn("COUNT", Sequelize.col("id")), "DESC"]],
      raw: true
    });

    res.json({
      success: true,
      presenceList,
      logs,
      totalLogs: count,
      sectionStats,
      onlineAdminsCount: uniqueOnlineAdmins,
      onlineUsersCount: uniqueOnlineUsers
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
