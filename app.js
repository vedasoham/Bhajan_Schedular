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
sequelize.sync({ alter: process.env.NODE_ENV !== 'production' }).then(async () => {
  // Auto-Migrate data from the old constrained table to the new one
  BhajanSubmission.count().then(async (count) => {
    if (count === 0) {
      try {
        const [oldData] = await sequelize.query('SELECT * FROM bhajan_submissions');
        if (oldData && oldData.length > 0) {
          // Copy data over, but let the new table generate fresh IDs
          const mappedData = oldData.map(d => {
            delete d.id; 
            return d;
          });
          await BhajanSubmission.bulkCreate(mappedData);
          console.log(`✅ Migrated ${oldData.length} records to the new unconstrained database table.`);
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

// Authentication Middleware (The Guard)
const requireLogin = require("./middleware/authMiddleware");

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

app.post('/admin/update-rules', requireLogin, async (req, res) => {
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
});

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

app.get('/database', async (req, res) => {
  try {
    const rawSubmissions = await BhajanSubmission.findAll({
      order: [
        ['title', 'ASC'],
        ['singer_name', 'ASC']
      ],
      raw: true
    });
    
    const submissions = rawSubmissions.map(s => {
      s.formattedDate = formatDateHuman(s.session_date);
      s.lastSung = timeSince(s.session_date);
      return s;
    });
    
    res.render('database', { submissions });
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
  }
});

app.get('/master-bank', async (req, res) => {
  try {
    const isAdmin = req.session && req.session.isAdmin;
    const bhajans = await MasterBhajan.findAll({
      order: [['title', 'ASC']]
    });
    res.render('master-bank', { bhajans, isAdmin });
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
  }
});

// ============================================================
// API: GET /api/singers (For Frontend Autocomplete)
// ============================================================
app.get('/api/singers', async (req, res) => {
  });

app.get('/admin/analytics', requireLogin, async (req, res) => {
  try {
    const topBhajans = await BhajanSubmission.findAll({
      attributes: ['title', [sequelize.fn('COUNT', sequelize.col('title')), 'count']],
      group: ['title'],
      order: [[sequelize.fn('COUNT', sequelize.col('title')), 'DESC']],
      limit: 15,
      raw: true
    });
    res.render('analytics', { topBhajans });
  } catch (error) { res.status(500).send(error.message); }
});

app.get('/admin/singers', requireLogin, async (req, res) => {
  try {
    const singers = await BhajanSubmission.findAll({
      attributes: [
        'singer_name', 
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_sung'],
        [sequelize.fn('MAX', sequelize.col('session_date')), 'last_sung']
      ],
      group: ['singer_name'],
      order: [[sequelize.col('singer_name'), 'ASC']],
      raw: true
    });
    
    const mapped = singers.map(s => {
      s.lastSungHuman = timeSince(s.last_sung);
      s.formattedDate = formatDateHuman(s.last_sung);
      return s;
    });
    res.render('singers', { singers: mapped });
  } catch (error) { res.status(500).send(error.message); }
});

app.get('/admin/singer-dictionary', requireLogin, async (req, res) => {
  try {
    const singers = await Singer.findAll({ order: [['name', 'ASC']] });
    res.render('singer-dictionary', { singers });
  } catch (error) { res.status(500).send(error.message); }
});

app.post('/api/admin/add-singer', requireLogin, async (req, res) => {
  try {
    const { name } = req.body;
    if (name && name.trim()) {
      await Singer.findOrCreate({ where: { name: name.trim() } });
    }
    res.redirect('/admin/singer-dictionary');
  } catch (error) {
    res.status(500).send(`<h1>Error adding singer</h1><p>${error.message}</p><a href="/admin/singer-dictionary">Back</a>`);
  }
});

app.post('/api/admin/edit-singer/:id', requireLogin, async (req, res) => {
  try {
    const { name } = req.body;
    if (name && name.trim()) {
      await Singer.update({ name: name.trim() }, { where: { id: req.params.id } });
    }
    res.redirect('/admin/singer-dictionary');
  } catch (error) {
    res.status(500).send(`<h1>Error editing singer</h1><p>${error.message}</p><a href="/admin/singer-dictionary">Back</a>`);
  }
});

app.post('/api/admin/delete-singer/:id', requireLogin, async (req, res) => {
  try {
    await Singer.destroy({ where: { id: req.params.id } });
    res.redirect('/admin/singer-dictionary');
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.get('/admin/rules', requireLogin, async (req, res) => {
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
});

app.post('/admin/permission', requireLogin, async (req, res) => {
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
});

app.post('/api/admin/toggle-lock', requireLogin, async (req, res) => {
  try {
    const { date, is_locked } = req.body;
    await SessionMeta.upsert({ session_date: date, is_locked });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/admin/reorder', requireLogin, async (req, res) => {
  try {
    const { orderData } = req.body; // Array of { id, order }
    for (let item of orderData) {
      await BhajanSubmission.update({ list_order: item.order }, { where: { id: item.id } });
    }
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/admin/copy-session', requireLogin, async (req, res) => {
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
});

app.post('/api/add-master-bhajan', requireLogin, async (req, res) => {
  try {
    const { title, deity, raga, tempo, level, shruti, shruti_female } = req.body;
    await MasterBhajan.create({ title, deity, raga, tempo, level, shruti, shruti_female });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// API: POST /api/admin/update-master-bhajan/:id
// ============================================================
app.post('/api/admin/update-master-bhajan/:id', requireLogin, async (req, res) => {
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
});

// ============================================================
// API: POST /api/admin/delete-master-bhajan/:id
// ============================================================
app.post('/api/admin/delete-master-bhajan/:id', requireLogin, async (req, res) => {
  try {
    await MasterBhajan.destroy({ where: { id: req.params.id } });
    res.json({ success: true, message: "Bhajan deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// API: GET /admin/export-master
// ============================================================
app.get('/admin/export-master', requireLogin, async (req, res) => {
  try {
    const allBhajans = await MasterBhajan.findAll();
    const jsonString = JSON.stringify(allBhajans, null, 2);
    res.setHeader('Content-disposition', 'attachment; filename=cleaned_master_bhajans.json');
    res.setHeader('Content-type', 'application/json');
    res.send(jsonString);
  } catch (error) {
    res.status(500).send("Export failed");
  }
});

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