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

// Root endpoint
app.get('/', (req, res) => {
  res.render('dashboard');
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
      // 1. Manual Drag-and-Drop sequence overrides everything else
      if (a.list_order > 0 || b.list_order > 0) {
        if (a.list_order === 0) return 1; 
        if (b.list_order === 0) return -1;
        return a.list_order - b.list_order;
      }
      
      // 2. Default fallback sorting
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
      return res.send(`<!DOCTYPE html><html><head><title>Select Session</title><meta name="viewport" content="width=device-width, initial-scale=1" /><link rel="stylesheet" href="/css/style.css"></head><body><div class="container" style="text-align:center; padding:40px; max-width:500px;"><h2 style="color:#e65100; margin-bottom:20px;">🗓️ Select Session</h2><p style="color:#555; margin-bottom:20px;">${msg}</p><div style="background:#f8f9fa; padding:20px; border-radius:12px; border:1px solid #eee;"><div style="display:flex; flex-direction:column; gap:10px;">${optionsHtml}</div></div><div style="margin-top:25px;"><a href="/" class="button secondary">🏠 Return Home</a></div></div></body></html>`);
    };

    // If no date provided, check if we should show selection screen
    if (!sessionDate) {
      const availableDates = await getAvailableDates();
      if (availableDates.size > 1) {
        return renderSelectionScreen("Please select a session to submit your bhajan:");
      }
      sessionDate = getNextThursday();
    }

    const meta = await SessionMeta.findByPk(sessionDate);
    if (meta && meta.is_locked && !isAdmin) {
      return renderSelectionScreen(`Submissions for <strong>${sessionDate}</strong> have been locked by the coordinator.<br>Please select a different session:`);
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
        if (isSpecialOrFestival || status.count < status.maxAllowed) {
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
    
    if (!session_date || !singer_name || !deity || !title) {
      return res.status(400).send('<h1>Error</h1><p>Missing required fields.</p><a class="button" href="javascript:history.back()">Go Back</a>');
    }
    
    const meta = await SessionMeta.findByPk(session_date);
    if (meta && meta.is_locked && admin !== 'true') {
      return res.status(403).send('<h1>Locked</h1><p>This session has been locked by the admin.</p><a class="button" href="/">Go Home</a>');
    }

    // Fetch all submissions for this date to check rules
    const allSubmissions = await BhajanSubmission.findAll({ where: { session_date } });

    // Check if special/festival
    const permission = await SessionPermission.findByPk(session_date);
    const isSpecialOrFestival = !!permission;
    
    // Load rules specifically for this session
    let rules = await DeityRule.findAll({ where: { session_date } });
    if (rules.length === 0) rules = await DeityRule.findAll({ where: { session_date: 'default' } });
    
    const ruleForDeity = rules.find(r => r.deity_name === deity) || { max_allowed: 2 };
    const maxAllowed = ruleForDeity.max_allowed;

    if (maxAllowed === 0 && !isSpecialOrFestival && admin !== 'true') {
      return res.send(generateErrorHtml(deity, { singer_name: "Admin", title: "Blocked for this session", created_at: new Date() }, session_date));
    }
    
    if (!isSpecialOrFestival && admin !== 'true') {
      // Check existing count for requested deity
      const existingEntries = allSubmissions.filter(s => s.deity === deity);
      
      if (existingEntries.length > 0) {
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
      // 1. Manual Drag-and-Drop sequence overrides everything else
      if (a.list_order > 0 || b.list_order > 0) {
        if (a.list_order === 0) return 1; 
        if (b.list_order === 0) return -1;
        return a.list_order - b.list_order;
      }

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
            <td data-label="Singer"><strong>${escapeHtml(item.singer_name)}</strong></td>
            <td data-label="Partner">${escapeHtml(item.partner_name || "-")}</td>
            <td data-label="Bhajan">${escapeHtml(item.title)}</td>
            <td data-label="Deity"><span class="deity-pill">${escapeHtml(item.deity)}</span></td>
            <td data-label="Scale">${escapeHtml(item.scale || "-")}</td>
            <td data-label="Speed">${escapeHtml(item.speed)}</td>
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
  res.render('admin-login', { error: null });
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
    res.render('admin-login', { error: "Invalid ID or Password" });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

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
  try {
    const singers = await Singer.findAll({ order: [['name', 'ASC']] });
    res.json(singers);
  } catch (error) { res.status(500).json({ error: error.message }); }
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