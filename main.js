// ============================================================
// BHAJAN SCHEDULER - Node.js + Express + SQLite
// Sri Sathya Sai Seva Organisation - Gandhinagar
// ============================================================

const express = require('express');
const bodyParser = require('body-parser');
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const { 
  generateSubmitFormHtml, 
  generatePlanViewHtml, 
  generateErrorHtml, 
  generateSuccessHtml,
  generateDatePickerHtml
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
  indexes: [
    {
      unique: true,
      fields: ['session_date', 'deity']
    }
  ]
});

// Sync database
sequelize.sync();

// ============================================================
// EXPRESS APP SETUP
// ============================================================

const app = express();
const PORT = 8000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(__dirname));

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
  return nextThursday.toISOString().split('T')[0];
}

// ============================================================
// ROUTES
// ============================================================

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: "Sai Ram, Bhajan Scheduler API (Node.js) is running.",
    endpoints: {
      submit_form: "/submit-form",
      plan_view: "/plan-view",
      api_submit: "/submit",
      api_plan: "/plan/:session_date"
    }
  });
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
    const sessionDate = req.query.session_date || getNextThursday();
    const isAdmin = req.query.admin === 'true';
    
    // Fetch existing submissions
    const results = await BhajanSubmission.findAll({
      where: { session_date: sessionDate }
    });
    
    // Track deity status
    const deityStatus = {
      "Ganesha": { taken: false, by: "", bhajan: "", scale: "", speed: "", mandatory: true },
      "Guru": { taken: false, by: "", bhajan: "", scale: "", speed: "", mandatory: true },
      "Mata": { taken: false, by: "", bhajan: "", scale: "", speed: "", mandatory: true },
      "SarvaDharma": { taken: false, by: "", bhajan: "", scale: "", speed: "", mandatory: true },
      "Sai": { taken: false, by: "", bhajan: "", scale: "", speed: "", mandatory: true },
      "Shiva": { taken: false, by: "", bhajan: "", scale: "", speed: "", mandatory: true },
      "Krishna": { taken: false, by: "", bhajan: "", scale: "", speed: "", mandatory: true },
      "Rama": { taken: false, by: "", bhajan: "", scale: "", speed: "", mandatory: true },
      "Vitthala": { taken: false, by: "", bhajan: "", scale: "", speed: "", mandatory: true },
      "Hanuman": { taken: false, by: "", bhajan: "", scale: "", speed: "", mandatory: false }
    };
    
    results.forEach(bhajan => {
      if (deityStatus[bhajan.deity]) {
        deityStatus[bhajan.deity].taken = true;
        deityStatus[bhajan.deity].by = bhajan.singer_name;
        deityStatus[bhajan.deity].bhajan = bhajan.title;
        deityStatus[bhajan.deity].scale = bhajan.scale || "Not specified";
        deityStatus[bhajan.deity].speed = bhajan.speed;
      }
    });
    
    // Count filled slots
    const mandatoryFilled = Object.values(deityStatus)
      .filter(d => d.mandatory && d.taken).length;
    const optionalFilled = Object.values(deityStatus)
      .filter(d => !d.mandatory && d.taken).length;
    
    // Generate deity cards HTML
    const deityOrder = ["Ganesha", "Guru", "Mata", "SarvaDharma", "Sai", "Shiva", "Krishna", "Rama", "Vitthala"];
    let deityCardsHtml = "";
    
    deityOrder.forEach(deity => {
      const status = deityStatus[deity];
      let cardClass, statusBadge, singerInfo, onclick;
      
      if (status.taken) {
        cardClass = "deity-card taken";
        statusBadge = '<span class="badge badge-taken">✓ Taken</span>';
        singerInfo = `<div class="singer-name">${status.by}</div>`;
        onclick = `onclick="showDetails('${deity}', '${status.by}', '${status.bhajan}', '${status.scale}', '${status.speed}')" style="cursor:pointer;"`;
      } else {
        cardClass = "deity-card available";
        statusBadge = '<span class="badge badge-available">Available</span>';
        singerInfo = "";
        onclick = "";
      }
      
      deityCardsHtml += `
        <div class="${cardClass}" data-deity="${deity}" ${onclick}>
          <div class="deity-name">${deity}</div>
          ${statusBadge}
          ${singerInfo}
        </div>
      `;
    });
    
    // Hanuman card (with yellow background)
    const hanumanStatus = deityStatus["Hanuman"];
    let hanumanCard;
    
    if (hanumanStatus.taken) {
      hanumanCard = `
        <div class="deity-card taken hanuman-card" data-deity="Hanuman" 
             onclick="showDetails('Hanuman', '${hanumanStatus.by}', '${hanumanStatus.bhajan}', '${hanumanStatus.scale}', '${hanumanStatus.speed}')" 
             style="cursor:pointer;">
          <div class="deity-name">Hanuman <span style="font-size:12px;">(Optional)</span></div>
          <span class="badge badge-taken">✓ Taken</span>
          <div class="singer-name">${hanumanStatus.by}</div>
        </div>
      `;
    } else {
      hanumanCard = `
        <div class="deity-card available hanuman-card" data-deity="Hanuman">
          <div class="deity-name">Hanuman <span style="font-size:12px;">(Optional)</span></div>
          <span class="badge badge-optional">Optional</span>
        </div>
      `;
    }
    
    // Send HTML response
    res.send(generateSubmitFormHtml(sessionDate, mandatoryFilled, optionalFilled, deityCardsHtml, hanumanCard, isAdmin));
    
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
  }
});

// ============================================================
// WEB FORM: POST /submit-form
// ============================================================

app.post('/submit-form', async (req, res) => {
  try {
    const { session_date, singer_name, gender, partner_name, deity, title, speed, scale } = req.body;
    
    // Check if deity already taken
    const existing = await BhajanSubmission.findOne({
      where: { session_date, deity }
    });
    
    if (existing) {
      // Deity already taken - show error
      return res.send(generateErrorHtml(deity, existing, session_date));
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
    res.send(generateSuccessHtml(singer_name, deity, title, speed.charAt(0).toUpperCase() + speed.slice(1), scale, session_date));
    
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
       return res.send(generateErrorHtml(req.body.deity, { singer_name: "Another devotee" }, req.body.session_date));
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
            <td>${index + 1}</td>
            <td>${item.singer_name}</td>
            <td>${item.partner_name || ""}</td>
            <td>${item.title}</td>
            <td>${item.deity}</td>
            <td>${item.scale || "N/A"}</td>
            <td>${item.speed}</td>
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
// START SERVER
// ============================================================

app.listen(PORT, () => {
  console.log(`🕉️ Sai Ram! Bhajan Scheduler is running on http://localhost:${PORT}`);
  console.log(`📋 Submit Form: http://localhost:${PORT}/submit-form`);
  console.log(`📊 Plan View: http://localhost:${PORT}/plan-view`);
});