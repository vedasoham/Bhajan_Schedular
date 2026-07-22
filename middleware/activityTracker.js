const crypto = require("crypto");
const { Sequelize } = require("sequelize");
const ActivityLog = require("../models/ActivityLog");
const UserPresence = require("../models/UserPresence");

// Automatic Log Retention Cleanup Routine (Runs every 12 hours)
// Purges logs older than 30 days and presence records older than 7 days
setInterval(async () => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await ActivityLog.destroy({
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
  } catch (err) {
    // Silent background cleanup error handling
  }
}, 12 * 60 * 60 * 1000);

function getSectionName(urlPath) {
  if (urlPath === "/" || urlPath.startsWith("/submit-form")) return "Submit Form";
  if (urlPath.startsWith("/master-bank")) return "Master Bhajan Bank";
  if (urlPath.startsWith("/plan-view")) return "Plan & Share";
  if (urlPath.startsWith("/admin/activity-logs")) return "Activity Monitor";
  if (urlPath.startsWith("/admin/admin-users")) return "Admin Management";
  if (urlPath.startsWith("/admin/singer-dictionary")) return "Singer Dictionary";
  if (urlPath.startsWith("/admin/singers")) return "Singer Directory";
  if (urlPath.startsWith("/admin/rules")) return "Deity Rules";
  if (urlPath.startsWith("/admin/analytics")) return "Analytics";
  if (urlPath.startsWith("/admin")) return "Admin Dashboard";
  if (urlPath.startsWith("/api")) return "API System";
  return "General";
}

function getActionName(req) {
  const path = req.path;
  const method = req.method;

  if (method === "POST") {
    if (path.includes("submit-form")) return "SUBMIT_BHAJAN";
    if (path.includes("login")) return "ADMIN_LOGIN";
    if (path.includes("add-singer")) return "ADD_SINGER";
    if (path.includes("edit-singer")) return "EDIT_SINGER";
    if (path.includes("delete-singer")) return "DELETE_SINGER";
    if (path.includes("reorder")) return "REORDER_SESSION";
    if (path.includes("toggle-lock")) return "TOGGLE_SESSION_LOCK";
    if (path.includes("copy-session")) return "COPY_SESSION";
    if (path.includes("master")) return "MODIFY_MASTER_BANK";
    return `POST_${path.replace(/[^a-zA-Z0-9_]/g, "_").toUpperCase()}`;
  }

  return `VIEW_${getSectionName(path).replace(/\s+/g, "_").toUpperCase()}`;
}

const trackActivity = async (req, res, next) => {
  try {
    // Ignore static asset requests & favicon
    const path = req.path || "";
    if (
      path.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map)$/i) ||
      path.startsWith("/css/") ||
      path.startsWith("/js/")
    ) {
      return next();
    }

    // Determine session ID
    if (!req.session) return next();
    if (!req.session.visitorId) {
      req.session.visitorId = "sess_" + crypto.randomBytes(8).toString("hex");
    }

    const sessionId = req.session.visitorId;
    const admin = req.session.admin || null;
    const userType = admin ? (admin.role === "super_admin" ? "super_admin" : "admin") : "user";
    const adminId = admin ? admin.id : null;
    const adminName = admin ? (admin.display_name || admin.displayName || admin.username || "Admin") : "Guest User";
    const adminTitleStr = admin && admin.title ? ` (${admin.title})` : "";
    const username = admin ? `${adminName}${adminTitleStr}` : "Guest User";
    const section = getSectionName(path);
    const action = getActionName(req);
    const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "127.0.0.1";
    const userAgent = (req.headers["user-agent"] || "").slice(0, 250);

    // Update UserPresence
    await UserPresence.upsert({
      session_id: sessionId,
      admin_id: adminId,
      username: username,
      user_type: userType,
      current_page: req.originalUrl || path,
      last_section: section,
      ip_address: ip,
      last_seen_at: new Date()
    });

    // Log HTTP Request Activity
    await ActivityLog.create({
      session_id: sessionId,
      user_type: userType,
      admin_id: adminId,
      username: username,
      action: action,
      section: section,
      page_url: req.originalUrl || path,
      method: req.method,
      ip_address: ip,
      user_agent: userAgent,
      duration_seconds: 0,
      details: req.method === "POST" ? `Executed ${action} on ${path}` : `Navigated to ${section}`
    });
  } catch (err) {
    // Non-blocking logging
    console.error("Activity tracking error:", err.message);
  }

  next();
};

module.exports = {
  trackActivity,
  getSectionName
};
