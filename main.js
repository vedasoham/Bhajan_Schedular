// ============================================================
// BHAJAN SCHEDULER - Node.js + Express + SQLite
// Sri Sathya Sai Seva Organisation - Gandhinagar
// ============================================================

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
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
  generateAdminLoginHtml
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
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'bhajan_submissions',
  timestamps: false,
  indexes: []
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

// Sync database
sequelize.sync({ alter: true });

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

const ALLOWED_REPEAT = ["Sai", "Krishna", "SarvaDharma", "Shiva", "Rama", "Vitthala", "Mata", "Guru", "Hanuman"];

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
      
      const speedCompare = (SPEED_ORDER[a.speed.toLowerCase()] || 1) - 
                           (SPEED_ORDER[b.speed.toLowerCase()] || 1);
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
// WEB FORM: GET /submit-form
// ============================================================

app.get('/submit-form', async (req, res) => {
  try {
    const isAdmin = req.query.admin === 'true';
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
    
    // Fetch existing submissions
    const results = await BhajanSubmission.findAll({
      where: { session_date: sessionDate }
    });
    
    // Track deity status
    const deityStatus = {
      "Ganesha": { taken: false, count: 0, by: "", bhajan: "", scale: "", speed: "", mandatory: true },
      "Guru": { taken: false, count: 0, by: "", bhajan: "", scale: "", speed: "", mandatory: true },
      "Mata": { taken: false, count: 0, by: "", bhajan: "", scale: "", speed: "", mandatory: true },
      "SarvaDharma": { taken: false, count: 0, by: "", bhajan: "", scale: "", speed: "", mandatory: true },
      "Sai": { taken: false, count: 0, by: "", bhajan: "", scale: "", speed: "", mandatory: true },
      "Shiva": { taken: false, count: 0, by: "", bhajan: "", scale: "", speed: "", mandatory: true },
      "Krishna": { taken: false, count: 0, by: "", bhajan: "", scale: "", speed: "", mandatory: true },
      "Rama": { taken: false, count: 0, by: "", bhajan: "", scale: "", speed: "", mandatory: true },
      "Vitthala": { taken: false, count: 0, by: "", bhajan: "", scale: "", speed: "", mandatory: true },
      "Hanuman": { taken: false, count: 0, by: "", bhajan: "", scale: "", speed: "", mandatory: false }
    };
    
    results.forEach(bhajan => {
      if (deityStatus[bhajan.deity]) {
        deityStatus[bhajan.deity].taken = true;
        deityStatus[bhajan.deity].by = bhajan.singer_name;
        deityStatus[bhajan.deity].bhajan = bhajan.title;
        deityStatus[bhajan.deity].scale = bhajan.scale || "Not specified";
        deityStatus[bhajan.deity].speed = bhajan.speed;
        deityStatus[bhajan.deity].count = (deityStatus[bhajan.deity].count || 0) + 1;
      }
    });
    
    // Count filled slots
    const mandatoryFilled = Object.values(deityStatus)
      .filter(d => d.mandatory && d.taken).length;
    const optionalFilled = Object.values(deityStatus)
      .filter(d => !d.mandatory && d.taken).length;
      
    const isMandatoryComplete = mandatoryFilled === 9;
    
    // Generate deity cards HTML
    const generateCardHtml = (deity) => {
      const status = deityStatus[deity];
      let cardClass, statusBadge, singerInfo, onclick;
      
      if (status.taken) {
        // Check if we can add a second bhajan
        if (isSpecialOrFestival) {
          cardClass = "deity-card available"; 
          statusBadge = `<span class="badge badge-available">Add (${status.count})</span>`;
          singerInfo = `<div class="singer-name">Latest: ${status.by}</div>`;
          onclick = ""; 
        } else if (isMandatoryComplete && ALLOWED_REPEAT.includes(deity) && status.count < 2) {
          cardClass = "deity-card available"; // Make it selectable
          statusBadge = '<span class="badge badge-available">Add 2nd</span>';
          singerInfo = `<div class="singer-name">1st: ${status.by}</div>`;
          onclick = ""; // Let script.js handle selection
        } else {
          cardClass = "deity-card taken";
          statusBadge = '<span class="badge badge-taken">✓ Taken</span>';
          singerInfo = `<div class="singer-name">${status.by}</div>`;
          onclick = `onclick="showDetails('${deity}', '${status.by}', '${status.bhajan}', '${status.scale}', '${status.speed}')" style="cursor:pointer;"`;
        }
      } else {
        cardClass = "deity-card available";
        statusBadge = '<span class="badge badge-available">Available</span>';
        singerInfo = "";
        onclick = "";
      }
      
      return `
        <div class="${cardClass}" data-deity="${deity}" ${onclick}>
          <div class="deity-name">${deity}</div>
          ${statusBadge}
          ${singerInfo}
        </div>
      `;
    };

    const ganeshaCardHtml = generateCardHtml("Ganesha");
    const otherDeities = ["Guru", "Mata", "SarvaDharma", "Sai", "Shiva", "Krishna", "Rama", "Vitthala"];
    let otherDeitiesHtml = "";
    otherDeities.forEach(d => otherDeitiesHtml += generateCardHtml(d));
    
    // Hanuman card (with yellow background)
    const hanumanStatus = deityStatus["Hanuman"];
    let hanumanCard;
    
    if (hanumanStatus.taken) {
      if (isSpecialOrFestival) {
        hanumanCard = `
          <div class="deity-card available hanuman-card" data-deity="Hanuman">
            <div class="deity-name">Hanuman <span style="font-size:12px;">(Optional)</span></div>
            <span class="badge badge-available">Add (${hanumanStatus.count})</span>
            <div class="singer-name">Latest: ${hanumanStatus.by}</div>
          </div>
        `;
      } else if (isMandatoryComplete && ALLOWED_REPEAT.includes("Hanuman") && hanumanStatus.count < 2) {
        hanumanCard = `
          <div class="deity-card available hanuman-card" data-deity="Hanuman">
            <div class="deity-name">Hanuman <span style="font-size:12px;">(Optional)</span></div>
            <span class="badge badge-available">Add 2nd</span>
            <div class="singer-name">1st: ${hanumanStatus.by}</div>
          </div>
        `;
      } else {
        hanumanCard = `
          <div class="deity-card taken hanuman-card" data-deity="Hanuman" 
               onclick="showDetails('Hanuman', '${hanumanStatus.by}', '${hanumanStatus.bhajan}', '${hanumanStatus.scale}', '${hanumanStatus.speed}')" 
               style="cursor:pointer;">
            <div class="deity-name">Hanuman <span style="font-size:12px;">(Optional)</span></div>
            <span class="badge badge-taken">✓ Taken</span>
            <div class="singer-name">${hanumanStatus.by}</div>
          </div>
        `;
      }
    } else {
      hanumanCard = `
        <div class="deity-card available hanuman-card" data-deity="Hanuman">
          <div class="deity-name">Hanuman <span style="font-size:12px;">(Optional)</span></div>
          <span class="badge badge-optional">Optional</span>
        </div>
      `;
    }
    
    // Send HTML response
    res.send(generateSubmitFormHtml(sessionDate, mandatoryFilled, optionalFilled, ganeshaCardHtml, otherDeitiesHtml, hanumanCard, isAdmin));
    
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
  }
});

// ============================================================
// WEB FORM: POST /submit-form
// ============================================================

app.post('/submit-form', async (req, res) => {
  try {
    const { session_date, singer_name, gender, partner_name, deity, title, speed, scale, admin } = req.body;
    
    // Fetch all submissions for this date to check rules
    const allSubmissions = await BhajanSubmission.findAll({ where: { session_date } });

    // Check if special/festival
    const permission = await SessionPermission.findByPk(session_date);
    const isSpecialOrFestival = !!permission;
    
    if (!isSpecialOrFestival) {
      // Check mandatory completeness
      const takenDeities = new Set(allSubmissions.map(s => s.deity));
      const MANDATORY_DEITIES = ["Ganesha", "Guru", "Mata", "SarvaDharma", "Sai", "Shiva", "Krishna", "Rama", "Vitthala"];
      const isMandatoryComplete = MANDATORY_DEITIES.every(d => takenDeities.has(d));
      
      // Check existing count for requested deity
      const existingEntries = allSubmissions.filter(s => s.deity === deity);
      
      if (existingEntries.length > 0) {
        // If mandatory set is NOT complete, no repeats allowed
        if (!isMandatoryComplete) {
          return res.send(generateErrorHtml(deity, existingEntries[0], session_date));
        }
        
        // If mandatory complete, check if this deity is allowed to repeat
        if (!ALLOWED_REPEAT.includes(deity)) {
          return res.send(generateErrorHtml(deity, existingEntries[0], session_date));
        }
        
        // Check max limit (allow max 2)
        if (existingEntries.length >= 2) {
          return res.send(generateErrorHtml(deity, existingEntries[1], session_date));
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
      speed
    });
    
    // Success response
    res.send(generateSuccessHtml(singer_name, deity, title, speed.charAt(0).toUpperCase() + speed.slice(1), scale, session_date, admin === 'true'));
    
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
      
      const speedCompare = (SPEED_ORDER[a.speed.toLowerCase()] || 1) - 
                           (SPEED_ORDER[b.speed.toLowerCase()] || 1);
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
        line += ` – [${item.deity}] ${item.title} – Scale: ${item.scale || "N/A"}, Speed: ${item.speed.charAt(0).toUpperCase() + item.speed.slice(1)}`;
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
  
  const adminUser = process.env.ADMIN_USER || 'admin';
  const adminPass = process.env.ADMIN_PASS || 'sairam';

  if (username === adminUser && password === adminPass) {
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

    res.send(generateAdminCalendarHtml(year, month, eventCounts, permissionMap, descriptionMap));
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

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
  console.log(`🕉️ Sai Ram! Bhajan Scheduler is running on http://localhost:${PORT}`);
  console.log(`📋 Submit Form: http://localhost:${PORT}/submit-form`);
  console.log(`📊 Plan View: http://localhost:${PORT}/plan-view`);
  console.log(`🛠️ Admin Dashboard: http://localhost:${PORT}/admin`);
});