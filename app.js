// ============================================================
// BHAJAN SCHEDULER - Node.js + Express + SQLite
// Sri Sathya Sai Seva Organisation - Gandhinagar
// ============================================================

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const sequelize = require("./config/database");
const { Sequelize, DataTypes } = require("sequelize");
const path = require('path');
const {
  requireLogin,
  requireApiLogin
} = require("./middleware/auth");
const session = require('express-session');
const { 
  generateSubmitFormHtml, 
  generatePlanViewHtml, 
  generateErrorHtml, 
  generateSuccessHtml,
  generateDatePickerHtml,
  generateEditFormHtml,
  generateAdminCalendarHtml,
  generateAdminSessionViewHtml,
  generateAdminRulesHtml,
  escapeHtml
} = require('./templates');

// ============================================================
// DATABASE SETUP (SQLite)
// ============================================================

// Define BhajanSubmission Model
const BhajanSubmission = require("./models/BhajanSubmission");
// Define SessionPermission Model (For Special/Festival days)
const SessionPermission = require("./models/SessionPermission");
// Define SessionMeta Model (For Locking Sessions)
const SessionMeta = require("./models/SessionMeta");
// Define Singer Dictionary Model
const Singer = require("./models/Singer");
// Define MasterBhajan Model
const MasterBhajan = require("./models/MasterBhajan");
// Define Deity Rule Model
const DeityRule = require("./models/DeityRule");

// Load Master Bhajans from JSON to Database if empty
async function loadMasterBhajans() {
  try {
    const count = await MasterBhajan.count();
    if (count === 0) {
      const filePath = path.join(__dirname, 'master_bhajans.json');
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        await MasterBhajan.bulkCreate(data);
        console.log(`✅ Loaded ${data.length} master bhajans into the database.`);
      } else {
        console.log('⚠️ master_bhajans.json not found. Skipping load.');
      }
    }
  } catch (error) {
    console.error('Error loading master bhajans:', error);
  }
}

// Setup Default Rules for "Regular Thursday"
async function initDeityRules() {
  try {
    const count = await DeityRule.count({ where: { session_date: 'default' } });
    if (count === 0) {
      // Attempt to migrate from v3
      try {
        const [oldRules] = await sequelize.query('SELECT session_date, deity_name, min_required, max_allowed FROM deity_rules_v3');
        if (oldRules && oldRules.length > 0) {
          await DeityRule.bulkCreate(oldRules);
          console.log('✅ Migrated old deity rules to v4.');
          return;
        }
      } catch(e) {} // Silently ignore if v3 doesn't exist

      // Attempt to migrate from v2
      try {
        const [oldRules] = await sequelize.query('SELECT session_date, deity_name, min_required, max_allowed FROM deity_rules_v2');
        if (oldRules && oldRules.length > 0) {
          await DeityRule.bulkCreate(oldRules);
          console.log('✅ Migrated old deity rules to v4.');
          return;
        }
      } catch(e) {} // Silently ignore if v2 doesn't exist

      await DeityRule.bulkCreate([
        { session_date: 'default', deity_name: 'Ganesha', min_required: 0, max_allowed: 2 },
        { session_date: 'default', deity_name: 'Guru', min_required: 0, max_allowed: 2 },
        { session_date: 'default', deity_name: 'Mata', min_required: 0, max_allowed: 2 },
        { session_date: 'default', deity_name: 'SarvaDharma', min_required: 0, max_allowed: 2 },
        { session_date: 'default', deity_name: 'Sai', min_required: 0, max_allowed: 2 },
        { session_date: 'default', deity_name: 'Shiva', min_required: 0, max_allowed: 2 },
        { session_date: 'default', deity_name: 'Krishna', min_required: 0, max_allowed: 2 },
        { session_date: 'default', deity_name: 'Rama', min_required: 0, max_allowed: 2 },
        { session_date: 'default', deity_name: 'Vitthala', min_required: 0, max_allowed: 2 },
        { session_date: 'default', deity_name: 'Hanuman', min_required: 0, max_allowed: 2 }
      ]);
    }
  } catch (error) {
    console.error('Error initializing deity rules:', error);
  }
}

// Sync database
sequelize.sync().then(async () => {
  // Auto-Migrate data from the old constrained table to the new one
  BhajanSubmission.count().then(async (count) => {
    if (count === 0) {
      try {
        const [oldData] = await sequelize.query(
          'SELECT * FROM bhajan_submissions'
        );

        if (oldData && oldData.length > 0) {
          // Copy data over, but let the new table generate fresh IDs
          const mappedData = oldData.map(d => {
            delete d.id;
            return d;
          });

          await BhajanSubmission.bulkCreate(mappedData);

          console.log(
            `✅ Migrated ${oldData.length} records to the new unconstrained database table.`
          );
        }
      } catch (err) {
        // Silently ignore if old table doesn't exist
      }
    }
  });

  await loadMasterBhajans();
  await initDeityRules();
  // Normalize 'Sarva dharma' to 'SarvaDharma'
  try {
    await MasterBhajan.update({ deity: 'SarvaDharma' }, { where: { deity: 'Sarva dharma' } });
    await BhajanSubmission.update({ deity: 'SarvaDharma' }, { where: { deity: 'Sarva dharma' } });
  } catch (e) { console.error('Error normalizing SarvaDharma:', e); }
});

// ============================================================
// EXPRESS APP SETUP
// ============================================================

const app = express();
const PORT = process.env.PORT || 8000;

// Configure EJS Templating Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve specific static files securely (instead of exposing the whole root directory)
app.use(express.static("public"));

const plannerRoutes = require("./routes/planner");

app.use("/", plannerRoutes);

// Session Setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'sai_ram_gandhinagar_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production' 
  }
  
}));

const {
    DEITY_ORDER,
    SPEED_ORDER,
    deityOrderKey,
    getNextThursday,
    formatDateHuman,
    timeSince
} = require("./services/helpers");

// ============================================================
// ROUTES
// ============================================================
const apiRoutes = require("./routes/api");
const masterBankRoutes = require("./routes/masterBank");
app.use("/", masterBankRoutes);

app.use("/", apiRoutes);
// Root endpoint
app.get('/', (req, res) => {
  res.render('dashboard');
});

// ============================================================
// JSON API: POST /submit
// ============================================================

// ============================================================
// JSON API: GET /plan/:session_date
// ============================================================

// ============================================================
// API: GET /api/deity-rules
// ============================================================

app.get('/api/deity-rules', async (req, res) => {
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
});

// ============================================================
// API: POST /admin/update-rules
// ============================================================

// ============================================================
// WEB FORM: GET /submit-form
// ============================================================


// ============================================================
// WEB FORM: POST /submit-form
// ============================================================

// ============================================================
// API: GET /api/master-bhajans/:deity
// ============================================================


// ============================================================
// WEB VIEW: GET /plan-view
// ============================================================

// ============================================================
// ADMIN ROUTES
// ============================================================
const authRoutes = require("./routes/auth");
app.use("/", authRoutes);

const adminRoutes = require("./routes/admin");
app.use("/", adminRoutes);
//analytics route
const analyticsRoutes = require("./routes/analytics");
app.use("/", analyticsRoutes);

//singer control routes
const singerRoutes = require("./routes/singer");
app.use("/", singerRoutes);

// ============================================================
// API: GET /api/singers (For Frontend Autocomplete)
// ============================================================


// ============================================================
// API: POST /api/admin/update-master-bhajan/:id
// ============================================================

// ============================================================
// API: POST /api/admin/delete-master-bhajan/:id
// ============================================================

// ============================================================
// API: GET /admin/export-master
// ============================================================

// ============================================================
// API: GET /admin/danger-reset-history (HIDDEN FACTORY RESET)
// ============================================================
app.get('/admin/danger-reset-history', requireLogin, async (req, res) => {
  try {
    // Wipes all history and resets the ID counters
    await BhajanSubmission.destroy({ where: {}, truncate: true });
    await SessionMeta.destroy({ where: {}, truncate: true }); // Removes all locks
    
    // Drop the old v1 table so it doesn't automatically restore data on server restart
    try {
      await sequelize.query('DROP TABLE IF EXISTS bhajan_submissions');
    } catch (err) {}

    res.send(`
      <!DOCTYPE html><html><head><link rel="stylesheet" href="/css/style.css"><title>Reset Complete</title></head>
      <body style="text-align:center; padding:50px; background:#fff5f5;">
        <h1 style="color:#e03131; font-size:40px;">🚨 History Wiped!</h1>
        <p style="font-size:18px; margin-bottom:20px;">All past bhajan submissions and session locks have been permanently deleted.</p>
        <a class="button" href="/admin">Return to Control Tower</a>
      </body></html>
    `);
  } catch (error) { res.status(500).send(error.message); }
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
  console.log(`🕉️ Sai Ram! Bhajan Scheduler is running on http://localhost:${PORT}`);
  console.log(`📋 Submit Form: http://localhost:${PORT}/submit-form`);
  console.log(`📊 Plan View: http://localhost:${PORT}/plan-view`);
  console.log(`🛠️ Admin Dashboard: http://localhost:${PORT}/admin`);
});