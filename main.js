// ============================================================
// BHAJAN SCHEDULER - Node.js + Express + SQLite
// Sri Sathya Sai Seva Organisation - Gandhinagar
// ============================================================

const express = require('express');
const bodyParser = require('body-parser');
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

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
  timestamps: false
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
    res.send(generateSubmitFormHtml(sessionDate, mandatoryFilled, optionalFilled, deityCardsHtml, hanumanCard));
    
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
      const errorHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Slot Already Taken</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body {
      font-family: 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #fef5e7 0%, #fdebd0 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 480px;
      background: white;
      padding: 32px;
      border-radius: 16px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.08);
      text-align: center;
    }
    .error-icon { font-size: 64px; margin-bottom: 16px; }
    h2 { color: #e03131; margin-bottom: 12px; }
    p { color: #495057; line-height: 1.6; margin-bottom: 24px; }
    .info-box {
      background: #fff5f5;
      border: 2px solid #ffc9c9;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
      text-align: left;
    }
    .info-box strong { color: #c92a2a; }
    a.button {
      display: inline-block;
      padding: 12px 24px;
      background: linear-gradient(135deg, #ff9933 0%, #ff7700 100%);
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      transition: transform 0.3s;
    }
    a.button:hover { transform: translateY(-2px); }
  </style>
</head>
<body>
  <div class="container">
    <div class="error-icon">⚠️</div>
    <h2>Slot Already Taken</h2>
    <p>Sorry, the <strong>${deity}</strong> deity slot has already been taken for this session.</p>
    <div class="info-box">
      <strong>Taken by:</strong> ${existing.singer_name}<br>
      <strong>Bhajan:</strong> ${existing.title}<br>
      <strong>Time:</strong> ${new Date(existing.created_at).toLocaleTimeString()}
    </div>
    <p>Please go back and select a different deity.</p>
    <a class="button" href="/submit-form?session_date=${session_date}">← Go Back</a>
  </div>
</body>
</html>`;
      return res.send(errorHtml);
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
    const successHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Bhajan Submitted Successfully</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body {
      font-family: 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #fef5e7 0%, #fdebd0 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 480px;
      background: white;
      padding: 32px;
      border-radius: 16px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.08);
      text-align: center;
    }
    .success-icon {
      font-size: 64px;
      margin-bottom: 16px;
      animation: bounce 0.6s;
    }
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-20px); }
    }
    h2 { color: #2f9e44; margin-bottom: 8px; }
    .greeting { font-size: 20px; color: #495057; margin-bottom: 24px; }
    .details-box {
      background: #d3f9d8;
      border: 2px solid #8ce99a;
      border-radius: 12px;
      padding: 20px;
      margin: 24px 0;
      text-align: left;
    }
    .details-box div { margin: 8px 0; color: #2b8a3e; }
    .details-box strong { color: #1864ab; }
    .button-group { display: flex; flex-direction: column; gap: 12px; margin-top: 24px; }
    a.button {
      display: block;
      padding: 12px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      transition: transform 0.3s;
    }
    a.button:hover { transform: translateY(-2px); }
    .primary {
      background: linear-gradient(135deg, #ff9933 0%, #ff7700 100%);
      color: white;
    }
    .secondary {
      background: #f1f3f5;
      color: #495057;
      border: 2px solid #dee2e6;
    }
    .note { font-size: 13px; color: #868e96; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="success-icon">✅</div>
    <h2>Bhajan Submitted Successfully!</h2>
    <div class="greeting">🙏 Sai Ram, ${singer_name}!</div>
    
    <div class="details-box">
      <div><strong>Deity:</strong> ${deity}</div>
      <div><strong>Bhajan:</strong> ${title}</div>
      <div><strong>Speed:</strong> ${speed.charAt(0).toUpperCase() + speed.slice(1)}</div>
      <div><strong>Scale:</strong> ${scale || 'Not specified'}</div>
      <div><strong>Session:</strong> ${session_date}</div>
    </div>
    
    <p style="color:#495057;">Your bhajan has been recorded. The ${deity} slot is now marked as taken.</p>
    
    <div class="button-group">
      <a class="button primary" href="/submit-form?session_date=${session_date}">View Updated Slots</a>
      <a class="button secondary" href="/plan-view?session_date=${session_date}">View Full Session Plan</a>
    </div>
    
    <div class="note">
      ⚠️ Note: Submissions cannot be changed after submitting.<br>
      Please contact the convenor if you made a mistake.
    </div>
  </div>
</body>
</html>`;
    
    res.send(successHtml);
    
  } catch (error) {
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
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Bhajan Plan - Select Date</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body {
      font-family: 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #fef5e7 0%, #fdebd0 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      max-width: 480px;
      background: white;
      padding: 24px;
      border-radius: 16px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.08);
    }
    h2 { color: #343a40; margin-bottom: 20px; }
    label { display: block; font-size: 14px; font-weight: 500; color: #495057; margin-bottom: 8px; }
    input {
      width: 100%;
      padding: 12px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      font-size: 15px;
      margin-bottom: 16px;
      box-sizing: border-box;
    }
    button {
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, #ff9933 0%, #ff7700 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>🕉️ View Bhajan Plan</h2>
    <form method="get" action="/plan-view">
      <label>Bhajan Date</label>
      <input type="date" name="session_date" value="${today}" required />
      <button type="submit">Show Plan</button>
    </form>
  </div>
</body>
</html>`;
      return res.send(html);
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
// HTML TEMPLATE FUNCTIONS
// ============================================================

function generateSubmitFormHtml(sessionDate, mandatoryFilled, optionalFilled, deityCardsHtml, hanumanCard) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Bhajan Scheduler - Sai Centre Gandhinagar</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { 
      margin: 0; 
      padding: 0; 
      box-sizing: border-box; 
    }
    
    body {
      font-family: 'Poppins', 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #fff5e6 0%, #ffe8cc 50%, #ffd9a3 100%);
      min-height: 100vh;
      padding: 20px;
      position: relative;
      overflow-x: hidden;
    }
    
    /* Decorative background elements */
    body::before {
      content: '';
      position: fixed;
      top: -50%;
      right: -50%;
      width: 100%;
      height: 100%;
      background: radial-gradient(circle, rgba(255,153,51,0.1) 0%, transparent 70%);
      z-index: 0;
      animation: float 20s ease-in-out infinite;
    }
    
    body::after {
      content: '';
      position: fixed;
      bottom: -50%;
      left: -50%;
      width: 100%;
      height: 100%;
      background: radial-gradient(circle, rgba(255,119,0,0.08) 0%, transparent 70%);
      z-index: 0;
      animation: float 25s ease-in-out infinite reverse;
    }
    
    @keyframes float {
      0%, 100% { transform: translate(0, 0) rotate(0deg); }
      33% { transform: translate(30px, -30px) rotate(5deg); }
      66% { transform: translate(-20px, 20px) rotate(-5deg); }
    }
    
    .container {
      max-width: 650px;
      margin: 0 auto;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 24px;
      box-shadow: 0 20px 60px rgba(255, 119, 0, 0.15), 
                  0 10px 30px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      position: relative;
      z-index: 1;
      animation: slideUp 0.6s ease-out;
    }
    
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    /* Sairam Header with Om symbol */
    .sairam-header {
      background: linear-gradient(135deg, #ffd93d 0%, #ffc107 50%, #ffb300 100%);
      color: #8b4513;
      text-align: center;
      padding: 16px;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 2px;
      text-shadow: 2px 2px 4px rgba(255,255,255,0.5);
      position: relative;
      overflow: hidden;
    }
    
    .sairam-header::before {
      content: '🕉️';
      position: absolute;
      font-size: 120px;
      opacity: 0.1;
      left: -20px;
      top: -30px;
      animation: pulse 3s ease-in-out infinite;
    }
    
    .sairam-header::after {
      content: '🕉️';
      position: absolute;
      font-size: 120px;
      opacity: 0.1;
      right: -20px;
      top: -30px;
      animation: pulse 3s ease-in-out infinite 1.5s;
    }
    
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 0.1; }
      50% { transform: scale(1.1); opacity: 0.15; }
    }
    
    /* Main Header with gradient */
    .header {
      background: linear-gradient(135deg, #ff9933 0%, #ff7700 50%, #ff6600 100%);
      color: white;
      padding: 32px 24px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    
    .header::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      animation: shimmer 3s infinite;
    }
    
    @keyframes shimmer {
      0% { left: -100%; }
      100% { left: 100%; }
    }
    
    .header h1 { 
      font-size: 26px; 
      font-weight: 700; 
      margin-bottom: 6px;
      position: relative;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }
    
    .header p { 
      font-size: 14px; 
      opacity: 0.95;
      font-weight: 300;
      letter-spacing: 0.5px;
    }
    
    /* Beautiful Tabs */
    .tabs {
      display: flex;
      background: linear-gradient(to bottom, #ffffff, #f8f9fa);
      border-bottom: 3px solid #ffe8cc;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    
    .tab {
      flex: 1;
      padding: 18px;
      text-align: center;
      font-size: 15px;
      font-weight: 600;
      color: #868e96;
      cursor: pointer;
      border: none;
      background: none;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
    }
    
    .tab::before {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%) scaleX(0);
      width: 80%;
      height: 3px;
      background: linear-gradient(90deg, #ff9933, #ff7700);
      border-radius: 3px 3px 0 0;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .tab.active {
      color: #ff7700;
      background: white;
    }
    
    .tab.active::before {
      transform: translateX(-50%) scaleX(1);
    }
    
    .tab:hover:not(.active) { 
      background: #fef5e7;
      color: #ff9933;
    }
    
    /* Tab Content */
    .tab-content { 
      display: none; 
      padding: 32px 28px;
      animation: fadeIn 0.5s ease-out;
    }
    
    .tab-content.active { 
      display: block; 
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    /* Coming Soon - Enhanced */
    .coming-soon {
      text-align: center;
      padding: 80px 20px;
      color: #adb5bd;
    }
    
    .coming-soon-icon { 
      font-size: 80px; 
      margin-bottom: 20px;
      animation: bounce 2s ease-in-out infinite;
    }
    
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    
    .coming-soon h3 { 
      font-size: 22px; 
      margin-bottom: 10px; 
      color: #6c757d;
      font-weight: 600;
    }
    
    .coming-soon p {
      color: #adb5bd;
      font-size: 14px;
    }
    
    /* Beautiful Progress Bar */
    .progress-section {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      padding: 20px;
      border-radius: 16px;
      margin-bottom: 28px;
      border: 2px solid #e9ecef;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    
    .progress-label {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: #495057;
      margin-bottom: 12px;
      font-weight: 500;
    }
    
    .progress-bar {
      height: 12px;
      background: #e9ecef;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
      position: relative;
    }
    
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #51cf66 0%, #40c057 50%, #37b24d 100%);
      border-radius: 20px;
      transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }
    
    .progress-fill::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
      animation: progressShimmer 2s infinite;
    }
    
    @keyframes progressShimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    
    /* Date Section */
    .date-section { 
      margin-bottom: 28px; 
    }
    
    .date-section label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: #495057;
      margin-bottom: 10px;
    }
    
    .date-section input {
      width: 100%;
      padding: 14px 16px;
      border: 2px solid #e9ecef;
      border-radius: 12px;
      font-size: 15px;
      background: #f8f9fa;
      transition: all 0.3s;
      font-family: 'Poppins', sans-serif;
    }
    
    /* Section Titles */
    .section-title {
      font-size: 17px;
      font-weight: 700;
      color: #343a40;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .section-title::before {
      content: '✨';
      font-size: 20px;
    }
    
    /* Beautiful Deity Grid */
    .deity-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
      margin-bottom: 20px;
    }
    
    .deity-card {
      background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
      border: 2px solid #dee2e6;
      border-radius: 16px;
      padding: 18px 14px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }
    
    .deity-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: radial-gradient(circle at center, rgba(255,255,255,0.8), transparent);
      opacity: 0;
      transition: opacity 0.3s;
    }
    
    .deity-card:hover::before {
      opacity: 1;
    }
    
    /* Available Cards */
    .deity-card.available {
      background: linear-gradient(135deg, #ffffff 0%, #f1f3f5 100%);
      border-color: #ced4da;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    
    .deity-card.available:hover {
      border-color: #ff9933;
      transform: translateY(-4px) scale(1.02);
      box-shadow: 0 8px 24px rgba(255, 153, 51, 0.25);
    }
    
    /* Taken Cards - Green Gradient */
    .deity-card.taken {
      background: linear-gradient(135deg, #d3f9d8 0%, #b2f2bb 100%);
      border-color: #8ce99a;
      box-shadow: 0 2px 8px rgba(81, 207, 102, 0.2);
      cursor: pointer;
    }
    
    .deity-card.taken:hover {
      border-color: #51cf66;
      transform: translateY(-4px) scale(1.02);
      box-shadow: 0 8px 24px rgba(81, 207, 102, 0.35);
    }
    
    /* Selected Card - Blue */
    .deity-card.selected {
      background: linear-gradient(135deg, #e7f5ff 0%, #d0ebff 100%);
      border-color: #4dabf7;
      border-width: 3px;
      box-shadow: 0 8px 24px rgba(77, 171, 247, 0.4);
      transform: scale(1.05);
    }
    
    .deity-card.optional { 
      grid-column: 2; 
    }
    
    /* Hanuman Card - Beautiful Yellow Gradient */
    .hanuman-card {
      background: linear-gradient(135deg, #fff9db 0%, #fff3bf 50%, #ffec99 100%) !important;
      border-color: #ffd43b !important;
      box-shadow: 0 2px 8px rgba(255, 212, 59, 0.3) !important;
    }
    
    .hanuman-card.taken {
      background: linear-gradient(135deg, #fff9db 0%, #fff3bf 50%, #ffec99 100%) !important;
      border-color: #ffd43b !important;
    }
    
    .hanuman-card.available {
      background: linear-gradient(135deg, #fffbeb 0%, #fff9db 100%) !important;
      border-color: #ffe066 !important;
    }
    
    .hanuman-card:hover {
      box-shadow: 0 8px 24px rgba(255, 212, 59, 0.4) !important;
    }
    
    .deity-name {
      font-size: 14px;
      font-weight: 700;
      color: #343a40;
      margin-bottom: 10px;
      position: relative;
      z-index: 1;
    }
    
    /* Beautiful Badges */
    .badge {
      display: inline-block;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      position: relative;
      z-index: 1;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    }
    
    .badge-available { 
      background: linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%);
      color: #6c757d; 
    }
    
    .badge-taken { 
      background: linear-gradient(135deg, #51cf66 0%, #40c057 100%);
      color: white; 
    }
    
    .badge-optional { 
      background: linear-gradient(135deg, #ffe066 0%, #ffd43b 100%);
      color: #7a5f0c; 
    }
    
    .singer-name {
      font-size: 11px;
      color: #495057;
      margin-top: 8px;
      font-weight: 500;
      position: relative;
      z-index: 1;
    }
    
    /* Beautiful Modal */
    .modal {
      display: none;
      position: fixed;
      z-index: 1000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      animation: fadeIn 0.3s;
    }
    
    .modal.show {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .modal-content {
      background: white;
      padding: 28px;
      border-radius: 20px;
      max-width: 420px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: modalSlideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    @keyframes modalSlideUp {
      from {
        transform: translateY(50px) scale(0.9);
        opacity: 0;
      }
      to {
        transform: translateY(0) scale(1);
        opacity: 1;
      }
    }
    
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #f1f3f5;
    }
    
    .modal-header h3 { 
      font-size: 20px; 
      color: #343a40; 
      margin: 0;
      font-weight: 700;
    }
    
    .close-btn {
      background: #f8f9fa;
      border: none;
      font-size: 28px;
      color: #adb5bd;
      cursor: pointer;
      line-height: 1;
      padding: 4px 12px;
      border-radius: 8px;
      transition: all 0.3s;
    }
    
    .close-btn:hover { 
      background: #ff6b6b;
      color: white;
      transform: rotate(90deg);
    }
    
    .detail-row {
      margin: 14px 0;
      padding: 14px;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border-radius: 12px;
      border-left: 4px solid #ff9933;
    }
    
    .detail-label {
      font-size: 11px;
      color: #868e96;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 6px;
      font-weight: 600;
    }
    
    .detail-value {
      font-size: 16px;
      color: #343a40;
      font-weight: 600;
    }
    
    /* Singer Details Form */
    .singer-details {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      padding: 24px;
      border-radius: 16px;
      margin-bottom: 28px;
      border: 2px solid #dee2e6;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    
    .form-group { 
      margin-bottom: 18px; 
    }
    
    .form-group label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: #495057;
      margin-bottom: 8px;
    }
    
    .required { 
      color: #ff6b6b;
      font-size: 16px;
    }
    
    .form-group input,
    .form-group select {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #dee2e6;
      border-radius: 12px;
      font-size: 14px;
      transition: all 0.3s;
      background: white;
      font-family: 'Poppins', sans-serif;
    }
    
    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: #ff9933;
      box-shadow: 0 0 0 4px rgba(255, 153, 51, 0.1);
      transform: translateY(-2px);
    }
    
    /* Bhajan Details Section */
    .bhajan-details {
      display: none;
      background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
      border: 3px solid #ffb74d;
      border-radius: 16px;
      padding: 24px;
      margin-top: 28px;
      animation: slideDown 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 8px 24px rgba(255, 183, 77, 0.2);
    }
    
    .bhajan-details.show { 
      display: block; 
    }
    
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .bhajan-details h3 {
      font-size: 18px;
      color: #e65100;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 700;
    }
    
    /* Beautiful Submit Button */
    .submit-btn {
      width: 100%;
      padding: 16px;
      background: linear-gradient(135deg, #ff9933 0%, #ff7700 50%, #ff6600 100%);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 17px;
      font-weight: 700;
      cursor: pointer;
      margin-top: 24px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 16px rgba(255, 119, 0, 0.3);
      position: relative;
      overflow: hidden;
    }
    
    .submit-btn::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
      transition: left 0.5s;
    }
    
    .submit-btn:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 28px rgba(255, 119, 0, 0.4);
    }
    
    .submit-btn:hover::before {
      left: 100%;
    }
    
    .submit-btn:active {
      transform: translateY(-1px);
    }
    
    .helper-text {
      font-size: 12px;
      color: #868e96;
      margin-top: 6px;
      font-style: italic;
    }
    
    /* Responsive Design */
    @media (max-width: 480px) {
      .deity-grid { 
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }
      
      .deity-card.optional { 
        grid-column: span 2; 
      }
      
      .header h1 {
        font-size: 22px;
      }
      
      .container {
        border-radius: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="sairam-header">🕉️ AUM SHRI SAIRAM 🕉️</div>
    
    <div class="header">
      <h1>📋 Bhajan Scheduler</h1>
      <p>Sri Sathya Sai Seva Organisation - Gandhinagar</p>
    </div>
    
    <div class="tabs">
      <button class="tab active" onclick="switchTab('scheduler')">📋 Scheduler</button>
      <button class="tab" onclick="switchTab('history')">📚 History</button>
    </div>
    
    <div id="scheduler" class="tab-content active">
      <div class="progress-section">
        <div class="progress-label">
          <span><strong>Session Progress</strong></span>
          <span>${mandatoryFilled}/9 Mandatory | ${optionalFilled}/1 Optional</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${(mandatoryFilled/9)*100}%"></div>
        </div>
      </div>
      
      <form method="post" action="/submit-form" id="bhajanForm">
        <div class="date-section">
          <label>📅 Bhajan Session Date (Thursday)</label>
          <input type="date" name="session_date" value="${sessionDate}" required readonly 
                 style="cursor:not-allowed;" />
          <div class="helper-text">This form is for the upcoming Thursday session</div>
        </div>
        
        <div class="singer-details">
          <div class="form-group">
            <label>Singer Name <span class="required">*</span></label>
            <input type="text" name="singer_name" required placeholder="Enter your full name" />
          </div>
          
          <div class="form-group">
            <label>Gender <span class="required">*</span></label>
            <select name="gender" required>
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Partner / Harmonium Player (optional)</label>
            <input type="text" name="partner_name" placeholder="Leave blank if singing solo" />
          </div>
        </div>
        
        <div class="section-title">Choose Deity <span class="required">*</span></div>
        <div class="helper-text" style="margin-bottom:16px;">
          Tap available (grey) to select • Tap taken (green) to view details
        </div>
        
        <div class="deity-grid">
          ${deityCardsHtml}
        </div>
        
        ${hanumanCard}
        
        <input type="hidden" name="deity" id="selectedDeity" required />
        
        <div class="bhajan-details" id="bhajanDetails">
          <h3>
            <span>📝</span>
            <span>Bhajan Details for <strong id="deityDisplay">---</strong></span>
          </h3>
          
          <div class="form-group">
            <label>Bhajan Title <span class="required">*</span></label>
            <input type="text" name="title" required placeholder="Enter bhajan name" />
          </div>
          
          <div class="form-group">
            <label>Speed <span class="required">*</span></label>
            <select name="speed" required>
              <option value="">Select speed</option>
              <option value="slow">Slow (Vilambit)</option>
              <option value="medium">Medium (Madhya)</option>
              <option value="fast">Fast (Drut)</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Scale / Sa (optional)</label>
            <input type="text" name="scale" placeholder="e.g. C, C#, D, D#, E" />
            <div class="helper-text">Leave blank if you're not sure</div>
          </div>
          
          <button type="submit" class="submit-btn">Submit Bhajan 🙏</button>
        </div>
      </form>
    </div>
    
    <div id="history" class="tab-content">
      <div class="coming-soon">
        <div class="coming-soon-icon">📚</div>
        <h3>History Coming Soon</h3>
        <p>View past bhajan sessions and your singing history</p>
      </div>
    </div>
  </div>
  
  <div id="detailsModal" class="modal">
    <div class="modal-content">
      <div class="modal-header">
        <h3 id="modalDeityName">Deity Details</h3>
        <button class="close-btn" onclick="closeModal()">&times;</button>
      </div>
      <div class="detail-row">
        <div class="detail-label">Singer</div>
        <div class="detail-value" id="modalSinger">---</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Bhajan Title</div>
        <div class="detail-value" id="modalBhajan">---</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Scale</div>
        <div class="detail-value" id="modalScale">---</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Speed</div>
        <div class="detail-value" id="modalSpeed">---</div>
      </div>
    </div>
  </div>
  
  <script>
    function switchTab(tabName) {
      document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
      document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
      document.getElementById(tabName).classList.add('active');
      event.target.classList.add('active');
    }
    
    function showDetails(deity, singer, bhajan, scale, speed) {
      document.getElementById('modalDeityName').textContent = deity + ' Bhajan';
      document.getElementById('modalSinger').textContent = singer;
      document.getElementById('modalBhajan').textContent = bhajan;
      document.getElementById('modalScale').textContent = scale || 'Not specified';
      document.getElementById('modalSpeed').textContent = speed.charAt(0).toUpperCase() + speed.slice(1);
      document.getElementById('detailsModal').classList.add('show');
    }
    
    function closeModal() {
      document.getElementById('detailsModal').classList.remove('show');
    }
    
    window.onclick = function(event) {
      const modal = document.getElementById('detailsModal');
      if (event.target == modal) closeModal();
    }
    
    let selectedDeity = null;
    
    document.querySelectorAll('.deity-card.available').forEach(card => {
      card.addEventListener('click', function() {
        document.querySelectorAll('.deity-card').forEach(c => c.classList.remove('selected'));
        this.classList.add('selected');
        selectedDeity = this.dataset.deity;
        document.getElementById('selectedDeity').value = selectedDeity;
        document.getElementById('deityDisplay').textContent = selectedDeity;
        document.getElementById('bhajanDetails').classList.add('show');
        setTimeout(() => {
          document.getElementById('bhajanDetails').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      });
    });
    
    document.getElementById('bhajanForm').addEventListener('submit', function(e) {
      if (!selectedDeity) {
        e.preventDefault();
        alert('⚠️ Please select a deity first');
        return false;
      }
    });
  </script>
</body>
</html>`;
}

function generatePlanViewHtml(sessionDate, rowsHtml, whatsappText, whatsappEncoded) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Bhajan Plan - ${sessionDate}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body {
      font-family: 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #fef5e7 0%, #fdebd0 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 24px;
      border-radius: 16px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.08);
    }
    h2 { color: #343a40; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border: 1px solid #ddd; padding: 8px; font-size: 14px; }
    th { background: #eee; }
    .top-form { margin-bottom: 16px; }
    input, button {
      padding: 8px;
      border-radius: 4px;
      border: 1px solid #ccc;
      margin-right: 8px;
    }
    button {
      background: linear-gradient(135deg, #ff9933 0%, #ff7700 100%);
      color: white;
      font-weight: 600;
      border: none;
      cursor: pointer;
    }
    .wa-section { margin-top: 24px; }
    textarea {
      width: 100%;
      min-height: 140px;
      padding: 12px;
      border-radius: 8px;
      border: 1px solid #ccc;
      font-size: 13px;
      box-sizing: border-box;
    }
    .wa-button {
      display: inline-block;
      margin-top: 12px;
      padding: 10px 16px;
      background: #25D366;
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>🕉️ Bhajan Plan for ${sessionDate}</h2>
    <form class="top-form" method="get" action="/plan-view">
      <label>Change date:
        <input type="date" name="session_date" value="${sessionDate}" required />
      </label>
      <button type="submit">Show</button>
    </form>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Singer</th>
          <th>Partner</th>
          <th>Bhajan</th>
          <th>Deity</th>
          <th>Scale</th>
          <th>Speed</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
    
    <div class="wa-section">
      <h3>WhatsApp Text</h3>
      <p style="font-size:13px; color:#555;">Copy this and paste in your group, or tap the button on mobile.</p>
      <textarea readonly>${whatsappText}</textarea>
      <br />
      <a class="wa-button" href="https://wa.me/?text=${whatsappEncoded}" target="_blank">
        Share via WhatsApp
      </a>
    </div>
  </div>
</body>
</html>`;
}

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
  console.log(`🕉️ Sai Ram! Bhajan Scheduler is running on http://localhost:${PORT}`);
  console.log(`📋 Submit Form: http://localhost:${PORT}/submit-form`);
  console.log(`📊 Plan View: http://localhost:${PORT}/plan-view`);
});