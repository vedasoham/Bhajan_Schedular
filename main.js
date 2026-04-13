// ============================================================
// BHAJAN SCHEDULER - Node.js + Express + SQLite
// Sri Sathya Sai Seva Organisation - Gandhinagar
// ============================================================

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const { Sequelize, DataTypes } = require('sequelize');
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
  generateDashboardHtml,
  generateDatabaseHtml,
  generateMasterBankHtml,
  generateAdminLoginHtml,
  generateAdminRulesHtml
} = require('./templates');

// ============================================================
// DATABASE SETUP (SQLite)
// ============================================================

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: 'bhajans.db',
  logging: false
});

// Define BhajanSubmission Model
const BhajanSubmission = sequelize.define('BhajanSubmission', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  session_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  singer_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  gender: {
    type: DataTypes.STRING,
    allowNull: true
  },
  partner_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  deity: {
    type: DataTypes.STRING,
    allowNull: false
  },
  scale: {
    type: DataTypes.STRING,
    allowNull: true
  },
  speed: {
    type: DataTypes.STRING,
    allowNull: false
  },
  raga: { type: DataTypes.STRING, allowNull: true },
  level: { type: DataTypes.STRING, allowNull: true },
  language: { type: DataTypes.STRING, allowNull: true },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'bhajans_submitted_v2', // Changed to bypass SQLite's locked constraints
  timestamps: false
});

// Define SessionPermission Model (For Special/Festival days)
const SessionPermission = sequelize.define('SessionPermission', {
  date: {
    type: DataTypes.DATEONLY,
    primaryKey: true
  },
  type: {
    type: DataTypes.STRING // 'special' or 'festival'
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, { tableName: 'session_permissions', timestamps: false });

// Define MasterBhajan Model
const MasterBhajan = sequelize.define('MasterBhajan', {
  title: { type: DataTypes.STRING, allowNull: false },
  deity: { type: DataTypes.STRING, allowNull: false },
  level: { type: DataTypes.STRING, allowNull: true },
  tempo: { type: DataTypes.STRING, allowNull: true },
  language: { type: DataTypes.STRING, allowNull: true },
  raga: { type: DataTypes.STRING, allowNull: true },
  shruti: { type: DataTypes.STRING, allowNull: true }
}, {
  tableName: 'master_bhajans',
  timestamps: false
});

// Define Deity Rule Model
const DeityRule = sequelize.define('DeityRule', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  session_date: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'default',
    unique: 'session_deity_unique'
  },
  deity_name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: 'session_deity_unique'
  },
  min_required: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  max_allowed: {
    type: DataTypes.INTEGER,
    defaultValue: 99
  }
}, {
  tableName: 'deity_rules_v4',
  timestamps: false
});

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
        { session_date: 'default', deity_name: 'Ganesha', min_required: 1, max_allowed: 1 },
        { session_date: 'default', deity_name: 'Guru', min_required: 1, max_allowed: 2 },
        { session_date: 'default', deity_name: 'Mata', min_required: 1, max_allowed: 2 },
        { session_date: 'default', deity_name: 'SarvaDharma', min_required: 1, max_allowed: 1 },
        { session_date: 'default', deity_name: 'Sai', min_required: 1, max_allowed: 2 },
        { session_date: 'default', deity_name: 'Shiva', min_required: 1, max_allowed: 2 },
        { session_date: 'default', deity_name: 'Krishna', min_required: 1, max_allowed: 2 },
        { session_date: 'default', deity_name: 'Rama', min_required: 1, max_allowed: 2 },
        { session_date: 'default', deity_name: 'Vitthala', min_required: 1, max_allowed: 2 },
        { session_date: 'default', deity_name: 'Hanuman', min_required: 0, max_allowed: 2 }
      ]);
    }
  } catch (error) {
    console.error('Error initializing deity rules:', error);
  }
}

// Sync database
sequelize.sync({ alter: true }).then(() => {
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
  loadMasterBhajans();
  initDeityRules();
});

// ============================================================
// EXPRESS APP SETUP
// ============================================================

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve specific static files securely (instead of exposing the whole root directory)
app.get('/style.css', (req, res) => res.sendFile(path.join(__dirname, 'style.css')));
app.get('/script.js', (req, res) => res.sendFile(path.join(__dirname, 'script.js')));
app.get('/logo.png', (req, res) => res.sendFile(path.join(__dirname, 'logo.png')));
app.get('/baba_photo.png', (req, res) => res.sendFile(path.join(__dirname, 'baba_photo.png')));
app.get('/logo_birthday.png', (req, res) => res.sendFile(path.join(__dirname, 'logo_birthday.png')));

// Session Setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'sai_ram_gandhinagar_secret_key',
  resave: false,
  saveUninitialized: true
}));

// Authentication Middleware (The Guard)
function requireLogin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    next(); // User is logged in, proceed
  } else {
    res.redirect('/admin-login'); // Kick them out to login page
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const DEITY_ORDER = [
  "Ganesha", "Guru", "Mata", "SarvaDharma", 
  "Sai", "Shiva", "Krishna", "Rama", "Vitthala", "Hanuman"
];

const SPEED_ORDER = { "slow": 0, "medium": 1, "fast": 2 };

function deityOrderKey(deity) {
  const index = DEITY_ORDER.findIndex(d => d.toLowerCase() === deity.toLowerCase());
  return index !== -1 ? index : DEITY_ORDER.length;
}

function getNextThursday() {
  const today = new Date();
  const day = today.getDay();
  const daysUntilThursday = (4 - day + 7) % 7;
  const nextThursday = new Date(today);
  nextThursday.setDate(today.getDate() + (daysUntilThursday === 0 ? 7 : daysUntilThursday));
  const y = nextThursday.getFullYear();
  const m = String(nextThursday.getMonth() + 1).padStart(2, '0');
  const d = String(nextThursday.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ============================================================
// ROUTES
// ============================================================

// Root endpoint
app.get('/', (req, res) => {
  res.send(generateDashboardHtml());
});

// ============================================================
// JSON API: POST /submit
// ============================================================

app.post('/submit', async (req, res) => {
  try {
    const { session_date, singer_name, partner_name, bhajans } = req.body;
    
    for (const bhajan of bhajans) {
      await BhajanSubmission.create({
        session_date,
        singer_name,
        partner_name,
        title: bhajan.title,
        deity: bhajan.deity,
        scale: bhajan.scale,
        speed: bhajan.speed
      });
    }
    
    res.json({
      status: "ok",
      message: "Bhajans saved to database.",
      total_bhajans_received: bhajans.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// JSON API: GET /plan/:session_date
// ============================================================

app.get('/plan/:session_date', async (req, res) => {
  try {
    const { session_date } = req.params;
    
    const results = await BhajanSubmission.findAll({
      where: { session_date }
    });
    
    const sorted = results.sort((a, b) => {
      const deityCompare = deityOrderKey(a.deity) - deityOrderKey(b.deity);
      if (deityCompare !== 0) return deityCompare;
      
      const speedCompare = (SPEED_ORDER[(a.speed || '').toLowerCase()] || 1) - 
                           (SPEED_ORDER[(b.speed || '').toLowerCase()] || 1);
      if (speedCompare !== 0) return speedCompare;
      
      return a.singer_name.toLowerCase().localeCompare(b.singer_name.toLowerCase());
    });
    
    const plan = sorted.map((item, index) => ({
      order: index + 1,
      session_date: item.session_date,
      singer: item.singer_name,
      partner: item.partner_name,
      title: item.title,
      deity: item.deity,
      scale: item.scale,
      speed: item.speed
    }));
    
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

app.get('/submit-form', async (req, res) => {
  try {
    const isAdmin = req.query.admin === 'true';
    const showSuccess = req.query.success === 'true';
    let sessionDate = req.query.session_date;

    // Helper to fetch available dates
    const getAvailableDates = async () => {
      const nextThursday = getNextThursday();
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const specialDays = await SessionPermission.findAll({
        where: { date: { [Sequelize.Op.gte]: todayStr } },
        order: [['date', 'ASC']]
      });
      
      const dates = new Map();
      dates.set(nextThursday, { label: 'Next Thursday', desc: 'Regular Session' });
      specialDays.forEach(p => {
        const label = p.type === 'festival' ? 'Festival' : 'Special';
        dates.set(p.date, { label: label, desc: p.description || '' });
      });
      return dates;
    };

    const renderSelectionScreen = async (msg) => {
      const availableDates = await getAvailableDates();
      const sortedDates = Array.from(availableDates.keys()).sort();
      let optionsHtml = '';
      sortedDates.forEach(date => {
        const info = availableDates.get(date);
        const type = info.label;
        const descText = info.desc ? ` - ${info.desc}` : '';
        const displayLabel = `${type} (${date})${descText}`;
        let btnStyle = 'margin-bottom:10px; width:100%; display:block; text-decoration:none;';
        if (type === 'Festival') btnStyle += ' background: #ff922b; border:none; color:white;';
        else if (type === 'Special') btnStyle += ' background: #4dabf7; border:none; color:white;';
        else btnStyle += ' background: linear-gradient(135deg, #ff9933 0%, #ff7700 100%); color:white;';
        optionsHtml += `<a href="/submit-form?session_date=${date}" class="button" style="${btnStyle}">${displayLabel}</a>`;
      });
      return res.send(`<!DOCTYPE html><html><head><title>Select Session</title><meta name="viewport" content="width=device-width, initial-scale=1" /><link rel="stylesheet" href="/style.css"></head><body><div class="container" style="text-align:center; padding:40px; max-width:500px;"><h2 style="color:#e65100; margin-bottom:20px;">🗓️ Select Session</h2><p style="color:#555; margin-bottom:20px;">${msg}</p><div style="background:#f8f9fa; padding:20px; border-radius:12px; border:1px solid #eee;"><div style="display:flex; flex-direction:column; gap:10px;">${optionsHtml}</div></div><div style="margin-top:25px;"><a href="/" class="button secondary">🏠 Return Home</a></div></div></body></html>`);
    };

    // If no date provided, check if we should show selection screen
    if (!sessionDate) {
      const availableDates = await getAvailableDates();
      if (availableDates.size > 1) {
        return renderSelectionScreen("Please select a session to submit your bhajan:");
      }
      sessionDate = getNextThursday();
    }

    // Check Permissions: Allow if Thursday OR Admin OR Explicitly Permitted
    const [sYear, sMonth, sDay] = sessionDate.split('-').map(Number);
    const dayOfWeek = new Date(sYear, sMonth - 1, sDay).getDay();
    const isThursday = dayOfWeek === 4;
    const permission = await SessionPermission.findByPk(sessionDate);

    if (!isAdmin && !isThursday && !permission) {
      return renderSelectionScreen(`Bhajan submission for <strong>${sessionDate}</strong> is not enabled.<br>Please select an available session:`);
    }

    const isSpecialOrFestival = !!permission;
    
    // Load rules specifically for this session
    let rules = await DeityRule.findAll({ where: { session_date: sessionDate } });
    if (rules.length === 0) rules = await DeityRule.findAll({ where: { session_date: 'default' } });

    // Fetch existing submissions
    const results = await BhajanSubmission.findAll({
      where: { session_date: sessionDate }
    });
    
    // Build base deityStatus dynamically
    const deityStatus = {};
    const ALL_DEITIES = ["Ganesha", "Guru", "Mata", "SarvaDharma", "Sai", "Shiva", "Krishna", "Rama", "Vitthala", "Hanuman"];
    ALL_DEITIES.forEach(d => {
      const rule = rules.find(r => r.deity_name === d) || { min_required: 0, max_allowed: 2 };
      deityStatus[d] = {
        taken: false, count: 0, by: "", bhajan: "", scale: "", speed: "",
        mandatory: rule.min_required > 0, minReq: rule.min_required, maxAllowed: rule.max_allowed
      };
    });

    results.forEach(bhajan => {
      if (deityStatus[bhajan.deity]) {
        deityStatus[bhajan.deity].taken = true;
        deityStatus[bhajan.deity].by = bhajan.singer_name;
        deityStatus[bhajan.deity].bhajan = bhajan.title;
        deityStatus[bhajan.deity].scale = bhajan.scale || "Not specified";
        deityStatus[bhajan.deity].speed = bhajan.speed;
        deityStatus[bhajan.deity].count += 1;
      }
    });
    
    const mandatoryFilled = Object.values(deityStatus).filter(d => d.mandatory && d.count >= 1).length;
    const totalMandatory = Object.values(deityStatus).filter(d => d.mandatory).length;
    const isMandatoryComplete = mandatoryFilled === totalMandatory;
      
    const optionalFilled = Object.values(deityStatus).filter(d => !d.mandatory && d.count >= 1).length;
    const totalOptional = Object.values(deityStatus).filter(d => !d.mandatory && d.maxAllowed > 0).length;
    
    // Generate deity cards HTML
    const generateCardHtml = (deity) => {
      const status = deityStatus[deity];
      let cardClass, statusBadge, singerInfo, onclick;
      
      if (status.maxAllowed === 0) {
        return `<div class="deity-card disabled" style="opacity:0.4; pointer-events:none;"><div class="deity-name">${deity}</div><span class="badge badge-taken" style="background:#e03131;">Blocked</span></div>`;
      }

      if (status.taken) {
        if (isSpecialOrFestival || (isMandatoryComplete && status.count < status.maxAllowed)) {
          cardClass = "deity-card available"; 
          statusBadge = `<span class="badge badge-available">Add ${status.count + 1}</span>`;
          singerInfo = `<div class="singer-name">Prev: ${status.by}</div>`;
          onclick = "";
        } else {
          cardClass = "deity-card taken";
          statusBadge = '<span class="badge badge-taken">✓ Taken</span>';
          singerInfo = `<div class="singer-name">${status.by}</div>`;
          onclick = `onclick="showDetails('${deity}', '${status.by.replace(/'/g, "\\'")}', '${status.bhajan.replace(/'/g, "\\'")}', '${status.scale}', '${status.speed}')" style="cursor:pointer;"`;
        }
      } else {
        cardClass = "deity-card available";
        statusBadge = '<span class="badge badge-available">Available</span>';
        singerInfo = "";
        onclick = "";
      }
      
      let mandatoryLabel = status.mandatory ? `<div class="rule-warning" style="color:#ff9933; font-size:11px; margin-top:6px; font-weight:700;">⭐ Required (${status.minReq})</div>` : '';

      return `
        <div class="${cardClass}" data-deity="${deity}" ${onclick}>
          <div class="deity-name">${deity}</div>
          ${statusBadge}
          ${singerInfo}
          ${mandatoryLabel}
        </div>
      `;
    };

    const ganeshaCardHtml = generateCardHtml("Ganesha");
    const otherDeities = ["Guru", "Mata", "SarvaDharma", "Sai", "Shiva", "Krishna", "Rama", "Vitthala"];
    let otherDeitiesHtml = "";
    otherDeities.forEach(d => otherDeitiesHtml += generateCardHtml(d));
    let hanumanCard = generateCardHtml("Hanuman").replace('deity-card', 'deity-card hanuman-card');
    
    // Send HTML response
    res.send(generateSubmitFormHtml(sessionDate, mandatoryFilled, totalMandatory, optionalFilled, totalOptional, ganeshaCardHtml, otherDeitiesHtml, hanumanCard, isAdmin, showSuccess));
    
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
  }
});

// ============================================================
// WEB FORM: POST /submit-form
// ============================================================

app.post('/submit-form', async (req, res) => {
  try {
    const { session_date, singer_name, gender, partner_name, deity, title, speed, scale, raga, level, language, admin } = req.body;
    
    // Fetch all submissions for this date to check rules
    const allSubmissions = await BhajanSubmission.findAll({ where: { session_date } });

    // Check if special/festival
    const permission = await SessionPermission.findByPk(session_date);
    const isSpecialOrFestival = !!permission;
    
    // Load rules specifically for this session
    let rules = await DeityRule.findAll({ where: { session_date } });
    if (rules.length === 0) rules = await DeityRule.findAll({ where: { session_date: 'default' } });
    
    const mandatoryDeities = rules.filter(r => r.min_required > 0).map(r => r.deity_name);
    const takenDeities = new Set(allSubmissions.map(s => s.deity));
    const isMandatoryComplete = mandatoryDeities.every(d => takenDeities.has(d));
    const ruleForDeity = rules.find(r => r.deity_name === deity) || { max_allowed: 2 };
    const maxAllowed = ruleForDeity.max_allowed;

    if (maxAllowed === 0 && !isSpecialOrFestival && admin !== 'true') {
      return res.send(generateErrorHtml(deity, { singer_name: "Admin", title: "Blocked for this session", created_at: new Date() }, session_date));
    }
    
    if (!isSpecialOrFestival && admin !== 'true') {
      // Check mandatory completeness
      // Check existing count for requested deity
      const existingEntries = allSubmissions.filter(s => s.deity === deity);
      
      if (existingEntries.length > 0) {
        if (!isMandatoryComplete) {
          return res.send(generateErrorHtml(deity, existingEntries[0], session_date));
        }
        
        // Check specific max limit for this deity
        if (existingEntries.length >= maxAllowed) {
          return res.send(generateErrorHtml(deity, existingEntries[existingEntries.length - 1], session_date));
        }
        
        // If we pass here, we allow the 2nd entry
      }
    }
    
    // Save submission
    await BhajanSubmission.create({
      session_date,
      singer_name,
      gender,
      partner_name: partner_name || null,
      title,
      deity,
      scale: scale || "Not specified",
      speed,
      raga,
      level,
      language
    });
    
    // Success response
    const adminQuery = admin === 'true' ? '&admin=true' : '';
    res.redirect(`/submit-form?session_date=${session_date}&success=true${adminQuery}`);
    
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
       return res.send(generateErrorHtml(req.body.deity, { 
         singer_name: "Another devotee", 
         title: "Unknown", 
         created_at: new Date() 
       }, req.body.session_date));
    }
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
  }
});

// ============================================================
// API: GET /api/master-bhajans/:deity
// ============================================================

app.get('/api/master-bhajans/:deity', async (req, res) => {
  try {
    const bhajans = await MasterBhajan.findAll({
      where: { deity: req.params.deity },
      order: [['title', 'ASC']]
    });
    res.json(bhajans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// API: GET /api/check-cooldown
// ============================================================
app.get('/api/check-cooldown', async (req, res) => {
  try {
    const { title } = req.query;
    if (!title) return res.json(null);
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentSubmission = await BhajanSubmission.findOne({
      where: {
        title: { [Sequelize.Op.like]: title },
        session_date: { [Sequelize.Op.gte]: thirtyDaysAgo.toISOString().split('T')[0] }
      },
      order: [['session_date', 'DESC']]
    });
    
    res.json(recentSubmission);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// WEB VIEW: GET /plan-view
// ============================================================

app.get('/plan-view', async (req, res) => {
  try {
    const sessionDate = req.query.session_date;
    
    if (!sessionDate) {
      // Show date picker
      const today = getNextThursday();
      return res.send(generateDatePickerHtml(today));
    }
    
    // Fetch and display plan
    const results = await BhajanSubmission.findAll({
      where: { session_date: sessionDate }
    });
    
    const sorted = results.sort((a, b) => {
      const deityCompare = deityOrderKey(a.deity) - deityOrderKey(b.deity);
      if (deityCompare !== 0) return deityCompare;
      
      const speedCompare = (SPEED_ORDER[(a.speed || '').toLowerCase()] || 1) - 
                           (SPEED_ORDER[(b.speed || '').toLowerCase()] || 1);
      if (speedCompare !== 0) return speedCompare;
      
      return a.singer_name.toLowerCase().localeCompare(b.singer_name.toLowerCase());
    });
    
    let rowsHtml = "";
    let whatsappLines = [];
    
    if (sorted.length === 0) {
      rowsHtml = '<tr><td colspan="7" style="text-align:center;">No bhajans found for this date.</td></tr>';
      whatsappLines.push("No bhajans found for this date.");
    } else {
      sorted.forEach((item, index) => {
        rowsHtml += `
          <tr>
            <td data-label="#">${index + 1}</td>
            <td data-label="Singer"><strong>${item.singer_name}</strong></td>
            <td data-label="Partner">${item.partner_name || "-"}</td>
            <td data-label="Bhajan">${item.title}</td>
            <td data-label="Deity"><span class="deity-pill">${item.deity}</span></td>
            <td data-label="Scale">${item.scale || "-"}</td>
            <td data-label="Speed">${item.speed}</td>
          </tr>
        `;
        
        let line = `${index + 1}) ${item.singer_name}`;
        if (item.partner_name) line += ` (${item.partner_name})`;
        line += ` – [${item.deity}] ${item.title} – Scale: ${item.scale || "N/A"}, Speed: ${item.speed ? item.speed.charAt(0).toUpperCase() + item.speed.slice(1) : "N/A"}`;
        whatsappLines.push(line);
      });
    }
    
    const headerLine = `Bhajan Plan – ${sessionDate}`;
    const whatsappText = headerLine + "\n" + whatsappLines.join("\n");
    const whatsappEncoded = encodeURIComponent(whatsappText);
    
    const html = generatePlanViewHtml(sessionDate, rowsHtml, whatsappText, whatsappEncoded);
    res.send(html);
    
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
  }
});

// ============================================================
// ADMIN ROUTES
// ============================================================

app.get('/admin-login', (req, res) => {
  res.send(generateAdminLoginHtml());
});

app.post('/admin-login', (req, res) => {
  const { username, password } = req.body;
  
  const adminUser = (process.env.ADMIN_USER || 'admin').trim().toLowerCase();
  const adminPass = (process.env.ADMIN_PASS || 'sairam').trim();

  if ((username || '').trim().toLowerCase() === adminUser && (password || '').trim() === adminPass) {
    req.session.isAdmin = true; // <--- SAVE LOGIN STATE
    req.session.save(() => {
      res.redirect('/admin');
    });
  } else {
    res.send(generateAdminLoginHtml("Invalid ID or Password"));
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

app.get('/database', async (req, res) => {
  try {
    const submissions = await BhajanSubmission.findAll({
      order: [
        ['title', 'ASC'],
        ['singer_name', 'ASC']
      ]
    });
    res.send(generateDatabaseHtml(submissions));
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
    res.send(generateMasterBankHtml(bhajans, isAdmin));
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
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

app.get('/admin', requireLogin, async (req, res) => {
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
});

app.get('/admin/date/:date', requireLogin, async (req, res) => {
  try {
    const { date } = req.params;
    const submissions = await BhajanSubmission.findAll({
      where: { session_date: date },
      order: [['session_date', 'DESC'], ['created_at', 'DESC']]
    });
    res.send(generateAdminSessionViewHtml(date, submissions));
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
  }
});

app.get('/admin/edit/:id', requireLogin, async (req, res) => {
  try {
    const submission = await BhajanSubmission.findByPk(req.params.id);
    if (!submission) return res.status(404).send("Entry not found");
    res.send(generateEditFormHtml(submission));
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
  }
});

app.post('/admin/edit/:id', requireLogin, async (req, res) => {
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
});

app.post('/admin/delete/:id', requireLogin, async (req, res) => {
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

app.post('/api/add-master-bhajan', requireLogin, async (req, res) => {
  try {
    const { title, deity, raga, tempo, level, shruti } = req.body;
    await MasterBhajan.create({ title, deity, raga, tempo, level, shruti });
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
    const { title, deity, level, tempo, raga, shruti, language } = req.body;
    
    await MasterBhajan.update(
      { title, deity, level, tempo, raga, shruti, language },
      { where: { id: req.params.id } }
    );
    
    res.json({ success: true, message: "Bhajan updated successfully!" });
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
// START SERVER
// ============================================================

app.listen(PORT, () => {
  console.log(`🕉️ Sai Ram! Bhajan Scheduler is running on http://localhost:${PORT}`);
  console.log(`📋 Submit Form: http://localhost:${PORT}/submit-form`);
  console.log(`📊 Plan View: http://localhost:${PORT}/plan-view`);
  console.log(`🛠️ Admin Dashboard: http://localhost:${PORT}/admin`);
});