function generateSubmitFormHtml(sessionDate, mandatoryFilled, optionalFilled, ganeshaCardHtml, otherDeitiesHtml, hanumanCard, isAdmin) {
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
    
    <div class="header">
      <h1>📋 Bhajan Scheduler</h1>
      <p>Sri Sathya Sai Seva Organisation - Gandhinagar</p>
    </div>
    
    <div class="tabs">
      <button class="tab active" onclick="switchTab('scheduler', this)">📋 Scheduler</button>
      <button class="tab" onclick="switchTab('history', this)">📚 History</button>
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
        <input type="hidden" name="admin" value="${isAdmin}" />
        <div class="form-group">
          <label>📅 Bhajan Session Date (Thursday)</label>
          <input type="date" name="session_date" value="${sessionDate}" required ${dateAttr} />
          <div style="font-size:12px; color:#868e96; margin-top:6px;">${dateMsg}</div>
        </div>
        
        <div class="bhajan-details" style="display:block; margin-top:0; background: #E1F5FE; border: 2px solid #81D4FA;">
          <div class="form-row cols-3">
            <div class="form-group">
              <label>Singer Name <span class="required">*</span></label>
              <input type="text" name="singer_name" required placeholder="Enter your full name" />
            </div>
            
            <div class="form-group">
              <label>Partner Name</label>
              <input type="text" name="partner_name" placeholder="Optional" />
            </div>

            <div class="form-group">
              <label>Gender <span class="required">*</span></label>
              <select name="gender" required>
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>
        
        <div style="font-size:17px; font-weight:700; color:#343a40; margin:24px 0 12px; display:flex; align-items:center; gap:8px;">
          ✨ Choose Deity <span class="required">*</span>
        </div>
        <div style="font-size:12px; color:#868e96; margin-bottom:16px; font-style:italic;">
          Tap available (grey) to select • Tap taken (green) to view details
        </div>
        
        <div class="deity-grid ganesha-row">
          ${ganeshaCardHtml}
        </div>
        
        <div class="deity-grid other-deities-grid">
          ${otherDeitiesHtml}
        </div>
        
        <div class="deity-grid ganesha-row">
          ${hanumanCard}
        </div>
        
        <input type="hidden" name="deity" id="selectedDeity" />
        
        <div class="bhajan-details" id="bhajanDetails">
          <h3 style="font-size:18px; color:#C2185B; margin-bottom:20px; font-weight:700;">
            📝 Bhajan Details for <strong id="deityDisplay">---</strong>
          </h3>
          
          <div class="form-group">
            <label>Bhajan Title <span class="required">*</span></label>
            <input type="text" name="title" required placeholder="Enter bhajan name" />
          </div>
          
          <div class="form-row">
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
              <select name="scale">
                <option value="">Select Scale (or leave blank)</option>
                <option value="C">C (White 1)</option>
                <option value="C#">C# (Black 1)</option>
                <option value="D">D (White 2)</option>
                <option value="D#">D# (Black 2)</option>
                <option value="E">E (White 3)</option>
                <option value="F">F (White 4)</option>
                <option value="F#">F# (Black 3)</option>
                <option value="G">G (White 5)</option>
                <option value="G#">G# (Black 4)</option>
                <option value="A">A (White 6)</option>
                <option value="A#">A# (Black 5)</option>
                <option value="B">B (White 7)</option>
              </select>
            </div>
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
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css">
  <style>
    @media print {
      .no-print { display: none !important; }
      .container { box-shadow: none; max-width: 100%; margin: 0; border-radius: 0; }
      body { background: white; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="container container-lg">
    <div class="header" style="border-radius: 16px 16px 0 0; margin: -20px -20px 20px -20px;">
      <h1>🕉️ Bhajan Plan</h1>
      <p>${sessionDate}</p>
    </div>

    <div class="no-print" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:20px; background:#fff; padding:16px; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
      <form method="get" action="/plan-view" style="display:flex; align-items:center; gap:10px; margin:0; flex-grow:1;">
        <label style="font-weight:600; color:#495057; white-space:nowrap;">📅 Date:</label>
        <input type="date" name="session_date" value="${sessionDate}" required style="padding:8px 12px; border:1px solid #dee2e6; border-radius:8px; font-family:inherit;" />
        <button type="submit" class="button" style="padding:8px 16px; font-size:14px;">Go</button>
      </form>
      <div style="display:flex; gap:8px;">
        <button onclick="window.print()" class="button secondary" style="padding:8px 16px; font-size:14px;">🖨️ Print</button>
        <a href="/" class="button secondary" style="padding:8px 16px; font-size:14px;">🏠 Home</a>
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th width="5%">#</th>
            <th width="20%">Singer</th>
            <th width="15%">Partner</th>
            <th width="25%">Bhajan</th>
            <th width="15%">Deity</th>
            <th width="10%">Scale</th>
            <th width="10%">Speed</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
    
    <div class="no-print" style="margin-top:30px; background:#f8f9fa; padding:20px; border-radius:12px; border:1px solid #e9ecef;">
      <h3 style="color:#343a40; margin-bottom:10px; display:flex; align-items:center; gap:8px;">
        <span style="font-size:24px;">📱</span> WhatsApp Share
      </h3>
      <p style="font-size:13px; color:#6c757d; margin-bottom:12px;">Copy the text below or click the button to share directly.</p>
      <textarea readonly style="width:100%; min-height:120px; padding:12px; border-radius:8px; border:1px solid #dee2e6; font-family:monospace; font-size:13px; resize:vertical;">${whatsappText}</textarea>
      <div style="margin-top:16px; text-align:right;">
        <a class="button" href="https://wa.me/?text=${whatsappEncoded}" target="_blank" style="background:#25D366; border:none; display:inline-flex; align-items:center; gap:8px;">
          <span>Share via WhatsApp</span>
        </a>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function generateErrorHtml(deity, existing, session_date) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>Slot Taken</title><meta name="viewport" content="width=device-width, initial-scale=1" /><link rel="stylesheet" href="/style.css"></head><body><div class="container" style="text-align:center; padding:32px;"><div class="error-icon">⚠️</div><h2 style="color:#e03131;">Slot Already Taken</h2><p>Sorry, the <strong>${deity}</strong> deity slot has already been taken.</p><div class="info-box"><strong>Taken by:</strong> ${existing.singer_name}<br><strong>Bhajan:</strong> ${existing.title}<br><strong>Time:</strong> ${new Date(existing.created_at).toLocaleTimeString()}</div><a class="button" href="/submit-form?session_date=${session_date}">← Go Back</a></div></body></html>`;
}

function generateSuccessHtml(singer_name, deity, title, speed, scale, session_date, isAdmin) {
  let actionButtons;
  if (isAdmin) {
    actionButtons = `
      <a class="button" href="/submit-form?admin=true&session_date=${session_date}">➕ Append New Bhajan</a>
      <a class="button secondary" href="/admin/date/${session_date}">⬅️ Back to List</a>
    `;
  } else {
    actionButtons = `
      <a class="button" href="/submit-form?session_date=${session_date}">View Updated Slots</a>
      <a class="button secondary" href="/plan-view?session_date=${session_date}">View Full Session Plan</a>
    `;
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>Success</title><meta name="viewport" content="width=device-width, initial-scale=1" /><link rel="stylesheet" href="/style.css"></head><body><div class="container" style="text-align:center; padding:32px;"><div class="success-icon">✅</div><h2 style="color:#2f9e44;">Bhajan Submitted!</h2><div style="font-size:20px; margin-bottom:24px;">🙏 Sai Ram, ${singer_name}!</div><div class="details-box" style="text-align:left;"><div><strong>Deity:</strong> ${deity}</div><div><strong>Bhajan:</strong> ${title}</div><div><strong>Speed:</strong> ${speed}</div><div><strong>Scale:</strong> ${scale || 'Not specified'}</div><div><strong>Session:</strong> ${session_date}</div></div><p>Your bhajan has been recorded.</p><div style="display:flex; flex-direction:column; gap:12px; margin-top:24px;">${actionButtons}</div></div></body></html>`;
}

function generateDatePickerHtml(today) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>Select Date</title><meta name="viewport" content="width=device-width, initial-scale=1" /><link rel="stylesheet" href="/style.css"></head><body style="justify-content: center;"><div class="container" style="max-width:480px; padding:24px;"><h2 style="text-align: center; margin-bottom: 16px;">🕉️ View Bhajan Plan</h2><form method="get" action="/plan-view"><label style="display:block; margin-bottom:8px;">Bhajan Date</label><input type="date" name="session_date" value="${today}" required style="width:100%; padding:12px; margin-bottom:16px;" /><button type="submit" class="button" style="width:100%;">Show Plan</button></form></div></body></html>`;
}

function generateAdminSessionViewHtml(date, submissions) {
  const rows = submissions.map(s => `
    <tr>
      <td data-label="Date">${s.session_date}</td>
      <td data-label="Deity"><span class="deity-pill">${s.deity}</span></td>
      <td data-label="Singer"><strong>${s.singer_name}</strong></td>
      <td data-label="Title">${s.title}</td>
      <td data-label="Actions">
        <div style="display:flex; gap:8px; justify-content:flex-end;">
          <a href="/admin/edit/${s.id}" class="button" style="padding:6px 12px; font-size:13px; text-decoration:none;">Edit</a>
          <form action="/admin/delete/${s.id}" method="POST" onsubmit="return confirm('Delete this entry?');" style="margin:0;">
            <button type="submit" class="button" style="padding:6px 12px; font-size:13px; background:#e03131; border:none; color:white; cursor:pointer;">Del</button>
          </form>
        </div>
      </td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Admin - Session Details</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div class="container container-xl">
    <div class="header">
      <h1>🛠️ Session Details</h1>
      <p>Date: ${date}</p>
    </div>
    
    <div style="margin-bottom: 24px; display:flex; gap:12px; flex-wrap:wrap; justify-content:center;">
      <a href="/admin" class="button secondary">⬅️ Back to Calendar</a>
      <a href="/submit-form?admin=true&session_date=${date}" class="button">➕ Add / Append to this Date</a>
      <a href="/plan-view" class="button secondary">📅 View Plans</a>
      <a href="/" class="button secondary">🏠 Home</a>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Deity</th>
            <th>Singer</th>
            <th>Title</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rows.length > 0 ? rows : '<tr><td colspan="5" style="padding:20px; text-align:center;">No records found for this date.</td></tr>'}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
}

function generateAdminCalendarHtml(year, month, eventCounts, permissionMap = {}, descriptionMap = {}) {
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentMonthName = monthNames[month - 1];
  
  // Calendar Logic
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayIndex = new Date(year, month - 1, 1).getDay(); // 0 = Sunday
  
  let calendarCells = "";
  
  // Empty cells for previous month
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells += `<div class="calendar-day empty"></div>`;
  }
  
  // Days
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && (today.getMonth() + 1) === month;
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const count = eventCounts[dateStr] || 0;
    const perm = permissionMap[dateStr];
    const desc = descriptionMap[dateStr] || '';
    
    // Determine Color Logic
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay(); // 0=Sun, 4=Thu
    const isToday = isCurrentMonth && today.getDate() === day;
    
    let colorClass = "day-none"; // Grey (Default)
    if (perm === 'special') {
      colorClass = "day-special";
    } else if (perm === 'festival') {
      colorClass = "day-festival-perm";
    } else if (count > 0) {
      if (dayOfWeek === 4) {
        colorClass = "day-thursday"; // Lilac
      } else {
        colorClass = "day-festival"; // Lime
      }
    }
    
    const dayClass = `calendar-day ${colorClass} ${isToday ? 'today' : ''}`;
    
    // Changed from <a> to <div onclick> for popup
    calendarCells += `
      <div class="${dayClass}" onclick="openAdminDateModal('${dateStr}', '${perm || ''}', '${desc.replace(/'/g, "&apos;")}')" style="cursor:pointer;">
        <div class="calendar-date-num">${day}</div>
        <div class="calendar-actions">
          ${count > 0 ? `<div class="event-pill">${count} Bhajans</div>` : ''}
          ${perm ? `<div class="perm-pill">${perm.toUpperCase()}</div>` : ''}
        </div>
      </div>
    `;
  }

  // Navigation
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Admin Calendar</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div class="container container-xl">
    <div class="header">
      <h1>🗓️ Admin Calendar</h1>
      <p>Manage Sessions</p>
    </div>
    
    <div style="margin-bottom: 20px; display:flex; gap:10px;">
      <a href="/" class="button secondary">🏠 Home</a>
      <a href="/submit-form?admin=true" class="button secondary">➕ New Entry (Any Date)</a>
    </div>

    <div class="calendar-header">
      <a href="/admin?month=${prevMonth}&year=${prevYear}" class="calendar-nav-btn">←</a>
      <div class="calendar-title">${currentMonthName} ${year}</div>
      <a href="/admin?month=${nextMonth}&year=${nextYear}" class="calendar-nav-btn">→</a>
    </div>

    <div class="calendar-legend">
      <div class="legend-item"><span class="legend-color day-none"></span> No Bhajans</div>
      <div class="legend-item"><span class="legend-color day-thursday"></span> Thursday</div>
      <div class="legend-item"><span class="legend-color day-special"></span> Special</div>
      <div class="legend-item"><span class="legend-color day-festival-perm"></span> Festival</div>
    </div>

    <div class="calendar-grid">
      <div class="calendar-day-header">Sun</div><div class="calendar-day-header">Mon</div><div class="calendar-day-header">Tue</div>
      <div class="calendar-day-header">Wed</div><div class="calendar-day-header">Thu</div><div class="calendar-day-header">Fri</div>
      <div class="calendar-day-header">Sat</div>
      ${calendarCells}
    </div>
  </div>

  <!-- Admin Date Modal -->
  <div id="adminDateModal" class="modal">
    <div class="modal-content" style="text-align:center; max-width:350px;">
      <div class="modal-header">
        <h3 id="adminModalDate">Manage Date</h3>
        <button class="close-btn" onclick="closeAdminModal()">&times;</button>
      </div>
      <div style="margin-bottom:15px; text-align:left;">
        <label style="display:block; margin-bottom:5px; font-size:12px; font-weight:600; color:#495057;">Description <span style="color:#e03131;">*</span></label>
        <input type="text" id="permDescription" placeholder="Reason (e.g. Mahashivratri)" maxlength="100" style="width:100%; padding:10px; border:1px solid #dee2e6; border-radius:8px; font-family:inherit;">
      </div>
      <div style="display:grid; gap:12px;">
        <button onclick="updatePermission('special')" class="button" style="background:#4dabf7; border:none;">✨ Add Special Bhajan</button>
        <button onclick="updatePermission('festival')" class="button" style="background:#ff922b; border:none;">🪔 Add Festival Bhajan</button>
        <button onclick="updatePermission('clear')" class="button secondary">❌ Clear Permission</button>
        <hr style="width:100%; border:0; border-top:1px solid #eee; margin:8px 0;">
        <button onclick="viewAdminDate()" class="button secondary">📅 View / Edit Plan</button>
      </div>
    </div>
  </div>
  <script src="/script.js"></script>
</body>
</html>`;
}

function generateEditFormHtml(s) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>Edit Bhajan</title><meta name="viewport" content="width=device-width, initial-scale=1" /><link rel="stylesheet" href="/style.css"></head><body>
  <div class="container">
    <h2>✏️ Edit Bhajan Entry</h2>
    <form method="post" action="/admin/edit/${s.id}">
      <div class="form-row">
        <div class="form-group"><label>Session Date</label><input type="date" name="session_date" value="${s.session_date}" required /></div>
        <div class="form-group"><label>Deity</label><input type="text" name="deity" value="${s.deity}" required /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Singer Name</label><input type="text" name="singer_name" value="${s.singer_name}" required /></div>
        <div class="form-group"><label>Partner</label><input type="text" name="partner_name" value="${s.partner_name || ''}" /></div>
      </div>
      <div class="form-group"><label>Title</label><input type="text" name="title" value="${s.title}" required /></div>
      <div class="form-row">
      <div class="form-group"><label>Scale</label><input type="text" name="scale" value="${s.scale || ''}" /></div>
      <div class="form-group"><label>Speed</label>
        <select name="speed" required>
          <option value="slow" ${s.speed === 'slow' ? 'selected' : ''}>Slow</option>
          <option value="medium" ${s.speed === 'medium' ? 'selected' : ''}>Medium</option>
          <option value="fast" ${s.speed === 'fast' ? 'selected' : ''}>Fast</option>
        </select>
      </div>
      </div>
      <div style="margin-top:20px; display:flex; gap:10px;"><button type="submit" class="button">Save Changes</button><a href="/admin" class="button secondary">Cancel</a></div>
    </form>
  </div></body></html>`;
}

function generateDashboardHtml() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Bhajan Planner - Gandhinagar</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div class="prasanthi-border"></div>

  <div class="container dashboard-container">
    
    <div class="hero-banner">
      <div class="hero-img-container">
        <img src="/logo.png" alt="Bhagwan Baba" class="hero-image" onerror="this.src='/logo.png'">
      </div>
      <div class="hero-text">
        <h2 class="hero-subtitle">Bhajan Scheduler</h2>
        <h1 class="hero-title">Bhajans - The Royal Highway to SAI</h1>
      </div>
      <div class="hero-img-container">
        <img src="/logo_birthday.png" alt="Logo" class="hero-image">
      </div>
    </div>

    <div class="sai-info-card" style="background: #fff9db; border-left: 4px solid #ff9933; border-radius: 8px; padding: 20px; margin-bottom: 40px; text-align: left; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
      <h3 style="color: #e65100; margin-bottom: 15px; text-align: center; font-family: 'Playfair Display', serif;">🕉️ The Spirit of Bhajan</h3>
      <p style="margin-bottom: 10px; font-size: 14px; color: #555;"><strong>BHARAT:</strong> The heart of singing lies in the union of Bha (Bhava/Feeling), Ra (Raga/Melody), and Ta (Taala/Rhythm). Remember: "A tune (raga) without feeling (bhava) is an infliction (roga)."</p>
      <p style="margin-bottom: 10px; font-size: 14px; color: #555;"><strong>Unity in Unison:</strong> We strive to merge our individual voices into a single wave of vibration. When we sing in one voice and one beat, we create a powerful demonstration of oneness.</p>
      <p style="margin-bottom: 10px; font-size: 14px; color: #555;"><strong>Global Purification:</strong> Sacred sound waves act as spiritual "antibiotics," destroying negative thoughts in the air and purifying the environment for the welfare of the world.</p>
      <p style="margin-bottom: 20px; font-size: 14px; color: #555;"><strong>Full-Throated Devotion:</strong> Sing with enthusiasm! Let your devotion resonate through full-throated participation.</p>
        <div class="quote-author" style="margin-top: 20px; text-align: right; font-weight: 700; color: #e65100; font-size: 13px;">- Bhagwan Sri Sathya Sai Baba</div>

      <h3 style="color: #e65100; margin-bottom: 15px; text-align: center; font-family: 'Playfair Display', serif;">📋 Singer's Code of Conduct</h3>
      <div style="font-size: 14px; color: #555;">
        <div style="margin-bottom: 8px;"><strong>⏳ Punctuality:</strong> Singers must be seated and ready before the Veda Recitation concludes.</div>
        <div style="margin-bottom: 8px;"><strong>🎹 Seating:</strong> All instrumentalists must sit together in the designated section to ensure perfect synchronization.</div>
        <div style="margin-bottom: 8px;"><strong>🎵 The Format:</strong>
          <ul style="margin: 4px 0 8px 20px; padding: 0;">
            <li>1st Speed: Sing each line twice.</li>
            <li>2nd Speed: Sing lines once; repeat the last line twice.</li>
            <li>3rd Speed: (If applicable) Sing with increased tempo.</li>
          </ul>
        </div>
        <div style="margin-bottom: 8px;"><strong>🔉 Pitch (Sruti):</strong> Select a pitch that is comfortable for your range. Avoid straining your voice on high or low notes to maintain sweetness.</div>
        <div style="margin-bottom: 8px;"><strong>👏 Hand Claps:</strong> Clap in rhythm! This act removes negative instincts from within and recharges us with divine energy.</div>
        <div style="margin-bottom: 8px;"><strong>🔕 Silence:</strong> Mobile phones must be on Silent Mode to maintain the sanctity of the atmosphere.</div>
      </div>
    </div>

    <div class="menu-grid">
      <a href="/submit-form" class="menu-card card-pink">
        <div class="card-icon">🎤</div>
        <div class="card-content">
          <div class="card-title">Singer Login</div>
          <div class="card-desc">Book your slot</div>
        </div>
      </a>

      <a href="/database" class="menu-card card-blue">
        <div class="card-icon">🗃️</div>
        <div class="card-content">
          <div class="card-title">Bhajan Bank</div>
          <div class="card-desc">View full records</div>
        </div>
      </a>

      <a href="/admin-login" class="menu-card card-yellow">
        <div class="card-icon">🔐</div>
        <div class="card-content">
          <div class="card-title">Office Bearer</div>
          <div class="card-desc">Admin controls</div>
        </div>
      </a>
    </div>

    <div class="shanti-footer">
      <div class="motto">"Love All - Serve All"</div>
      <div class="prayer">Samastha Lokah Sukhino Bhavantus</div>
    </div>

  </div>
</body>
</html>`;
}

function generateDatabaseHtml(submissions) {
  const rows = submissions.map(s => `
    <tr>
      <td>${s.singer_name}</td>
      <td>${s.partner_name || '-'}</td>
      <td>${s.session_date}</td>
      <td>${s.deity}</td>
      <td>${s.title}</td>
      <td>${s.speed}</td>
      <td>${s.scale || '-'}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Bhajan Database</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div class="container container-xl">
    <div class="header">
      <h1>🗃️ Bhajan Database</h1>
      <p>Full Records</p>
    </div>
    <div style="margin-bottom: 20px;"><a href="/" class="button secondary">🏠 Home</a></div>
    
    <div class="table-container">
      <table id="dbTable">
        <thead>
          <tr>
            <th><input type="text" class="filter-input" onkeyup="filterTable(0)" placeholder="Singer..."></th>
            <th><input type="text" class="filter-input" onkeyup="filterTable(1)" placeholder="Partner..."></th>
            <th><input type="text" class="filter-input" onkeyup="filterTable(2)" placeholder="Date..."></th>
            <th><input type="text" class="filter-input" onkeyup="filterTable(3)" placeholder="Deity..."></th>
            <th><input type="text" class="filter-input" onkeyup="filterTable(4)" placeholder="Bhajan..."></th>
            <th><input type="text" class="filter-input" onkeyup="filterTable(5)" placeholder="Tempo..."></th>
            <th><input type="text" class="filter-input" onkeyup="filterTable(6)" placeholder="Scale..."></th>
          </tr>
          <tr>
            <th>Singer</th><th>Partner</th><th>Date</th><th>Deity</th><th>Bhajan</th><th>Tempo</th><th>Scale</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>
  <script src="/script.js"></script>
</body>
</html>`;
}

function generateAdminLoginHtml(error = "") {
  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>Admin Login</title><meta name="viewport" content="width=device-width, initial-scale=1" /><link rel="stylesheet" href="/style.css"></head><body>
  <div class="container" style="max-width: 400px; padding: 40px;">
    <h2 style="text-align: center; color: #C2185B; margin-bottom: 24px;">🔐 Admin Login</h2>
    ${error ? `<div style="background:#ffe3e3; color:#c92a2a; padding:10px; border-radius:8px; margin-bottom:16px; text-align:center;">${error}</div>` : ''}
    <form method="post" action="/admin-login">
      <div class="form-group"><label>User ID</label><input type="text" name="username" required /></div>
      <div class="form-group"><label>Password</label><input type="password" name="password" required /></div>
      <button type="submit" class="submit-btn">Login</button>
    </form>
    <div style="text-align:center; margin-top:20px;"><a href="/" style="color:#868e96; text-decoration:none;">← Back to Home</a></div>
  </div></body></html>`;
}

module.exports = {
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
}