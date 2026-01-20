function generateSubmitFormHtml(sessionDate, mandatoryFilled, optionalFilled, deityCardsHtml, hanumanCard, isAdmin) {
  const dateAttr = isAdmin ? '' : 'readonly style="cursor:not-allowed; background:#f8f9fa;"';
  const dateMsg = isAdmin ? '<span style="color:#e03131; font-weight:bold;">Admin Mode: Select any date</span>' : 'This form is for the upcoming Thursday session';
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Bhajan Scheduler - Sai Centre Gandhinagar</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css">
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
        <div class="form-group">
          <label>📅 Bhajan Session Date (Thursday)</label>
          <input type="date" name="session_date" value="${sessionDate}" required ${dateAttr} />
          <div style="font-size:12px; color:#868e96; margin-top:6px;">${dateMsg}</div>
        </div>
        
        <div class="bhajan-details" style="display:block; margin-top:0; border:2px solid #dee2e6; background:linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);">
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
        
        <div style="font-size:17px; font-weight:700; color:#343a40; margin:24px 0 12px; display:flex; align-items:center; gap:8px;">
          ✨ Choose Deity <span class="required">*</span>
        </div>
        <div style="font-size:12px; color:#868e96; margin-bottom:16px; font-style:italic;">
          Tap available (grey) to select • Tap taken (green) to view details
        </div>
        
        <div class="deity-grid">
          ${deityCardsHtml}
        </div>
        
        ${hanumanCard}
        
        <input type="hidden" name="deity" id="selectedDeity" required />
        
        <div class="bhajan-details" id="bhajanDetails">
          <h3 style="font-size:18px; color:#e65100; margin-bottom:20px; font-weight:700;">
            📝 Bhajan Details for <strong id="deityDisplay">---</strong>
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
            <select name="scale" style="width: 100%; padding: 12px 16px; border: 2px solid #dee2e6; border-radius: 12px; font-family: 'Poppins', sans-serif;">
              <option value="">Select Scale (or leave blank)</option>
              <optgroup label="Common Male">
                <option value="C">C (White 1)</option>
                <option value="C#">C# (Black 1)</option>
                <option value="D">D (White 2)</option>
                <option value="D#">D# (Black 2)</option>
                <option value="E">E (White 3)</option>
              </optgroup>
              <optgroup label="Common Female">
                <option value="G">G (White 5)</option>
                <option value="G#">G# (Black 4)</option>
                <option value="A">A (White 6)</option>
                <option value="A#">A# (Black 5)</option>
                <option value="B">B (White 7)</option>
              </optgroup>
            </select>
          </div>
          
          <button type="submit" class="submit-btn">Submit Bhajan 🙏</button>
        </div>
      </form>
    </div>
    
    <div id="history" class="tab-content">
      <div style="text-align:center; padding:80px 20px; color:#adb5bd;">
        <div style="font-size:80px; margin-bottom:20px;">📚</div>
        <h3 style="font-size:22px; margin-bottom:10px; color:#6c757d;">History Coming Soon</h3>
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
  
  <script src="/script.js"></script>
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
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div class="container" style="max-width:800px;">
    <h2 style="color:#343a40; margin-bottom:20px;">🕉️ Bhajan Plan for ${sessionDate}</h2>
    <form style="margin-bottom:16px;" method="get" action="/plan-view">
      <label>Change date:
        <input type="date" name="session_date" value="${sessionDate}" required style="width:auto; display:inline-block;" />
      </label>
      <button type="submit" class="button" style="padding:8px 16px;">Show</button>
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
    
    <div style="margin-top:24px;">
      <h3>WhatsApp Text</h3>
      <p style="font-size:13px; color:#555;">Copy this and paste in your group, or tap the button on mobile.</p>
      <textarea readonly style="width:100%; min-height:140px; padding:12px; border-radius:8px; border:1px solid #ccc;">${whatsappText}</textarea>
      <br />
      <a class="button" href="https://wa.me/?text=${whatsappEncoded}" target="_blank" style="background:#25D366; margin-top:12px;">
        Share via WhatsApp
      </a>
    </div>
  </div>
</body>
</html>`;
}

function generateErrorHtml(deity, existing, session_date) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>Slot Taken</title><meta name="viewport" content="width=device-width, initial-scale=1" /><link rel="stylesheet" href="/style.css"></head><body><div class="container" style="text-align:center; padding:32px;"><div class="error-icon">⚠️</div><h2 style="color:#e03131;">Slot Already Taken</h2><p>Sorry, the <strong>${deity}</strong> deity slot has already been taken.</p><div class="info-box"><strong>Taken by:</strong> ${existing.singer_name}<br><strong>Bhajan:</strong> ${existing.title}<br><strong>Time:</strong> ${new Date(existing.created_at).toLocaleTimeString()}</div><a class="button" href="/submit-form?session_date=${session_date}">← Go Back</a></div></body></html>`;
}

function generateSuccessHtml(singer_name, deity, title, speed, scale, session_date) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>Success</title><meta name="viewport" content="width=device-width, initial-scale=1" /><link rel="stylesheet" href="/style.css"></head><body><div class="container" style="text-align:center; padding:32px;"><div class="success-icon">✅</div><h2 style="color:#2f9e44;">Bhajan Submitted!</h2><div style="font-size:20px; margin-bottom:24px;">🙏 Sai Ram, ${singer_name}!</div><div class="details-box" style="text-align:left;"><div><strong>Deity:</strong> ${deity}</div><div><strong>Bhajan:</strong> ${title}</div><div><strong>Speed:</strong> ${speed}</div><div><strong>Scale:</strong> ${scale || 'Not specified'}</div><div><strong>Session:</strong> ${session_date}</div></div><p>Your bhajan has been recorded.</p><div style="display:flex; flex-direction:column; gap:12px; margin-top:24px;"><a class="button" href="/submit-form?session_date=${session_date}">View Updated Slots</a><a class="button secondary" href="/plan-view?session_date=${session_date}">View Full Session Plan</a></div></div></body></html>`;
}

function generateDatePickerHtml(today) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>Select Date</title><meta name="viewport" content="width=device-width, initial-scale=1" /><link rel="stylesheet" href="/style.css"></head><body><div class="container" style="max-width:480px; padding:24px;"><h2>🕉️ View Bhajan Plan</h2><form method="get" action="/plan-view"><label style="display:block; margin-bottom:8px;">Bhajan Date</label><input type="date" name="session_date" value="${today}" required style="width:100%; padding:12px; margin-bottom:16px;" /><button type="submit" class="button" style="width:100%;">Show Plan</button></form></div></body></html>`;
}

module.exports = {
  generateSubmitFormHtml,
  generatePlanViewHtml,
  generateErrorHtml,
  generateSuccessHtml,
  generateDatePickerHtml
};