function generateSubmitFormHtml(sessionDate, mandatoryFilled, totalMandatory, optionalFilled, totalOptional, ganeshaCardHtml, otherDeitiesHtml, hanumanCard, isAdmin, showSuccess = false) {
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
    
    <div id="scheduler" class="tab-content active">
      <div class="progress-section">
        <div class="progress-label">
          <span><strong>Session Progress</strong></span>
          <span>${mandatoryFilled}/${totalMandatory} Mandatory | ${optionalFilled}/${totalOptional} Optional</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${totalMandatory > 0 ? (mandatoryFilled/totalMandatory)*100 : 100}%"></div>
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
              <input type="text" name="singer_name" id="singerName" required placeholder="Enter your full name" />
            </div>
            
            <div class="form-group">
              <label>Partner Name</label>
              <input type="text" name="partner_name" id="partnerName" placeholder="Optional" />
            </div>

            <div class="form-group">
              <label>Gender <span class="required">*</span></label>
              <select name="gender" id="gender" required>
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
          <h3 style="font-size:18px; color:#e65100; margin-bottom:15px; font-weight:700; border-bottom:1px solid rgba(0,0,0,0.1); padding-bottom:10px;">
            🎶 Details for <span id="deityDisplay">---</span>
          </h3>
          
          <div class="form-row">
            <div class="form-group" style="flex: 2;">
              <label>Bhajan Title <span class="required">*</span></label>
              <input list="bhajanList" name="title" id="bhajanTitleInput" required placeholder="Select Deity to search..." autocomplete="off" />
              <datalist id="bhajanList"></datalist>
              
              <div id="masterDataBadge" style="display:none; color:#28a745; font-size:12px; margin-top:4px; font-weight:600;">
                ✅ Master DB Synced <span id="badgeDetails"></span>
              </div>
              
              <div id="cooldownWarning" style="display:none; color:#d32f2f; background:#ffebee; padding:8px; border-radius:6px; font-size:12px; margin-top:8px; font-weight:500;"></div>
            </div>
            
            <div class="form-group" style="flex: 1;">
              <label>Speed / Tempo</label>
              <input type="text" name="speed" id="speedInput" readonly placeholder="Auto-filled..." style="background-color: #e9ecef; cursor: not-allowed; color: #495057; border: 1px solid #ced4da;" />
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group" style="flex: 1;">
               <label>🎵 Scale / Shruti</label>
               <input type="text" name="scale" id="scaleInput" placeholder="e.g., 1.5P or C#" />
            </div>
            <div class="form-group" style="flex: 1;">
               <label>🎼 Raag</label>
               <input type="text" name="raga" id="ragaInput" readonly placeholder="Auto-filled..." style="background-color: #e9ecef; cursor: not-allowed; color: #495057; border: 1px solid #ced4da;" />
            </div>
          </div>

          <input type="hidden" name="level" id="hiddenLevel" />
          <input type="hidden" name="language" id="hiddenLanguage" />
          
          <button type="button" id="preSubmitBtn" class="submit-btn">Submit Form</button>
        </div>
      </form>
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

  <div id="confirmSubmitModal" class="modal">
    <div class="modal-content">
      <div class="modal-header">
        <h3 style="color:#2f9e44;">Review Your Submission</h3>
        <button class="close-btn" onclick="closeConfirmModal()">&times;</button>
      </div>
      <div class="detail-row">
        <div class="detail-label">Singer(s)</div>
        <div class="detail-value" id="modSinger">---</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Deity</div>
        <div class="detail-value" id="modDeity">---</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Bhajan</div>
        <div class="detail-value" id="modTitle">---</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Scale/Shruti</div>
        <div class="detail-value" id="modScale">---</div>
      </div>
      <div style="display:flex; gap:12px; margin-top:24px; justify-content: flex-end;">
        <button type="button" id="editBtn" class="button secondary">Edit</button>
        <button type="button" id="confirmBtn" class="button" style="background:#28a745; border:none; color:white; padding:8px 24px; border-radius:8px; font-weight:600;">Confirm</button>
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
      <td data-label="Singer(s)"><strong>${s.singer_name}</strong>${s.partner_name ? `<br><small>& ${s.partner_name}</small>` : ''}</td>
      <td data-label="Gender">${s.gender || '-'}</td>
      <td data-label="Deity"><span class="deity-pill">${s.deity}</span></td>
      <td data-label="Title">${s.title}</td>
      <td data-label="Tempo">${s.speed || '-'}</td>
      <td data-label="Raag">${s.raga || '-'}</td>
      <td data-label="Scale">${s.scale || '-'}</td>
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
      <a href="/admin/rules?date=${date}" class="button secondary">⚙️ Session Rules</a>
      <a href="/plan-view" class="button secondary">📅 View Plans</a>
      <a href="/" class="button secondary">🏠 Home</a>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Singer(s)</th>
            <th>Gender</th>
            <th>Deity</th>
            <th>Title</th>
            <th>Tempo</th>
            <th>Raag</th>
            <th>Scale</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rows.length > 0 ? rows : '<tr><td colspan="8" style="padding:20px; text-align:center;">No records found for this date.</td></tr>'}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
}

function generateAdminCalendarHtml(year, month, eventCounts, permissionMap = {}, descriptionMap = {}, missingBhajans = []) {
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
      <a href="/admin/rules" class="button secondary">⚙️ Default Deity Rules</a>
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

    <!-- Missing Bhajan Catcher -->
    <div class="admin-section" style="margin-top: 40px; padding: 20px; background: #fff3cd; border-radius: 12px; border: 1px solid #ffe066;">
      <h2 style="color: #d9480f; margin-bottom: 15px;">🚨 Missing Bhajan Catcher</h2>
      <p style="font-size:14px; margin-bottom:15px; color:#555;">The following bhajans have been sung in sessions but are missing from the Master Database.</p>
      <ul style="list-style:none; padding:0; display:flex; flex-direction:column; gap:10px;">
        ${missingBhajans.length === 0 ? '<li style="color:#2b8a3e; font-weight:bold;">✅ All sung bhajans are safely in the Master Database!</li>' : 
          missingBhajans.map(b => `
          <li style="display:flex; justify-content:space-between; align-items:center; background:#fff; padding:10px 15px; border-radius:8px; border:1px solid #ffd43b;">
            <strong>${b}</strong>
            <button class="button" style="padding:6px 12px; font-size:12px; background:#4dabf7; border:none;" onclick="openMissingBhajanModal('${b.replace(/'/g, "\\'")}')">➕ Add to Master</button>
          </li>
        `).join('')}
      </ul>
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

  <!-- Missing Bhajan Catcher Modal -->
  <div id="missingBhajanModal" class="modal">
    <div class="modal-content" style="max-width: 400px; text-align:left;">
      <div class="modal-header">
        <h3>Add to Master Database</h3>
        <button class="close-btn" onclick="closeMissingBhajanModal()">&times;</button>
      </div>
      <div style="display:flex; flex-direction:column; gap:12px; margin-top:15px;">
        <div><label style="font-size:12px; font-weight:600; color:#495057;">Title</label>
          <input type="text" id="mbTitle" readonly style="width:100%; padding:8px; border:1px solid #ddd; background:#f5f5f5; border-radius:4px;"></div>
        <div><label style="font-size:12px; font-weight:600; color:#495057;">Deity</label>
          <select id="mbDeity" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
            <option value="Ganesha">Ganesha</option><option value="Guru">Guru</option><option value="Mata">Mata</option><option value="SarvaDharma">SarvaDharma</option><option value="Sai">Sai</option><option value="Shiva">Shiva</option><option value="Krishna">Krishna</option><option value="Rama">Rama</option><option value="Vitthala">Vitthala</option><option value="Hanuman">Hanuman</option>
          </select></div>
        <div><label style="font-size:12px; font-weight:600; color:#495057;">Tempo (Speed)</label>
          <select id="mbTempo" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
            <option value="Slow">Slow</option><option value="Medium">Medium</option><option value="Fast">Fast</option>
          </select></div>
        <div><label style="font-size:12px; font-weight:600; color:#495057;">Raga</label>
          <input type="text" id="mbRaga" placeholder="e.g., Yaman Kalyani" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;"></div>
        <div><label style="font-size:12px; font-weight:600; color:#495057;">Shruti (Scale)</label>
          <input type="text" id="mbShruti" placeholder="e.g., C#" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;"></div>
        <div><label style="font-size:12px; font-weight:600; color:#495057;">Level</label>
          <select id="mbLevel" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
            <option value="">Unknown</option><option value="Easy">Easy</option><option value="Medium">Medium</option><option value="Advanced">Advanced</option>
          </select></div>
        <button class="button" onclick="saveMissingBhajan()" style="margin-top:10px; background:#28a745; border:none;">Save to Master DB</button>
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
        <h2 class="hero-subtitle">Sri Sathya Sai Seva Organisations</h2>
        <h1 class="hero-title">Bhajan Planner</h1>
      </div>
      <div class="hero-img-container">
        <img src="/logo_birthday.png" alt="Logo" class="hero-image">
      </div>
    </div>

    <div class="sai-quote-card">
      <h3 class="quote-header" style="margin-bottom: 12px;">🕉️ The Spirit of Bhajan</h3>
      <p class="quote-text-para" style="margin-bottom: 8px; font-size: 14px;"><strong>BHARAT:</strong> The heart of singing lies in the union of Bha (Bhava/Feeling), Ra (Raga/Melody), and Ta (Taala/Rhythm). Remember: "A tune (raga) without feeling (bhava) is an infliction (roga)."</p>
      <p class="quote-text-para" style="margin-bottom: 8px; font-size: 14px;"><strong>Unity in Unison:</strong> We strive to merge our individual voices into a single wave of vibration. When we sing in one voice and one beat, we create a powerful demonstration of oneness.</p>
      <p class="quote-text-para" style="margin-bottom: 8px; font-size: 14px;"><strong>Global Purification:</strong> Sacred sound waves act as spiritual "antibiotics," destroying negative thoughts in the air and purifying the environment for the welfare of the world.</p>
      <p class="quote-text-para" style="margin-bottom: 20px; font-size: 14px;"><strong>Full-Throated Devotion:</strong> Sing with enthusiasm! Let your devotion resonate through full-throated participation.</p>
      
      <h3 class="quote-header" style="margin-bottom: 12px; border-top: 1px solid #ffe066; padding-top: 20px;">📋 Singer's Code of Conduct</h3>
      <div style="font-size: 14px; color: #555; margin-bottom: 16px;">
        <div style="margin-bottom: 8px;"><strong>⏳ Punctuality:</strong> Singers must be seated and ready before the Veda Recitation concludes.</div>
        <div style="margin-bottom: 8px;"><strong>🎹 Seating:</strong> All instrumentalists must sit together in the designated section to ensure perfect synchronization.</div>
        <div style="margin-bottom: 8px;"><strong>🎵 The Format:</strong>
          <ul style="margin: 4px 0 8px 24px; padding: 0;">
            <li>1st Speed: Sing each line twice.</li>
            <li>2nd Speed: Sing lines once; repeat the last line twice.</li>
            <li>3rd Speed: (If applicable) Sing with increased tempo.</li>
          </ul>
        </div>
        <div style="margin-bottom: 8px;"><strong>🔉 Pitch (Sruti):</strong> Select a pitch that is comfortable for your range. Avoid straining your voice on high or low notes to maintain sweetness.</div>
        <div style="margin-bottom: 8px;"><strong>👏 Hand Claps:</strong> Clap in rhythm! This act removes negative instincts from within and recharges us with divine energy.</div>
        <div style="margin-bottom: 8px;"><strong>🔕 Silence:</strong> Mobile phones must be on Silent Mode to maintain the sanctity of the atmosphere.</div>
      </div>
      <div class="quote-author" style="text-align: right; font-style: normal; font-weight: 700; color: #e65100; font-size: 14px;">- Bhagwan Sri Sathya Sai Baba</div>
    </div>

    <div class="menu-grid">
      <a href="/submit-form" class="menu-card card-pink">
        <div class="card-icon">🎤</div>
        <div class="card-content">
          <div class="card-title">Singer's zone</div>
          <div class="card-desc">Mark your Bhajans</div>
        </div>
      </a>

      <a href="/master-bank" class="menu-card card-blue">
        <div class="card-icon">📖</div>
        <div class="card-content">
          <div class="card-title">Bhajan Database</div>
          <div class="card-desc">Prashanthi Mandir Bhajans</div>
        </div>
      </a>
      
      <a href="/database" class="menu-card card-green">
        <div class="card-icon">🗃️</div>
        <div class="card-content">
          <div class="card-title">History</div>
          <div class="card-desc">Records - Gandhinagar Bhajan schedules</div>
        </div>
      </a>

      <a href="/admin-login" class="menu-card card-yellow">
        <div class="card-icon">🔐</div>
        <div class="card-content">
          <div class="card-title">Administration</div>
          <div class="card-desc">Schedular - Control Tower</div>
        </div>
      </a>
    </div>

    <div class="shanti-footer">
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; margin-bottom:12px; border-bottom:1px solid #ffe066; padding-bottom:16px; text-align:center;">
        <div class="motto" style="margin-bottom:4px; font-size:17px;">"Love All - Serve All"</div>
        <div style="font-size:14px; font-style:italic; color:#666; line-height:1.5; max-width: 600px;">
          "Bhajan must spread good-will, love, ecstasy; it must cleanse the polluted atmosphere; it must invite all to share in the joy and peace" - Baba
        </div>
      </div>
      <div class="prayer">Samastha Loka Sukhino Bhavantu</div>
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
            <th><input type="text" class="filter-input" onkeyup="filterTable()" placeholder="Singer..."></th>
            <th><input type="text" class="filter-input" onkeyup="filterTable()" placeholder="Partner..."></th>
            <th><input type="text" class="filter-input" onkeyup="filterTable()" placeholder="Date..."></th>
            <th><input type="text" class="filter-input" onkeyup="filterTable()" placeholder="Deity..."></th>
            <th><input type="text" class="filter-input" onkeyup="filterTable()" placeholder="Bhajan..."></th>
            <th><input type="text" class="filter-input" onkeyup="filterTable()" placeholder="Tempo..."></th>
            <th><input type="text" class="filter-input" onkeyup="filterTable()" placeholder="Scale..."></th>
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

function generateMasterBankHtml(bhajans, isAdmin = false) {
  const uniqueDeities = [...new Set(bhajans.map(b => b.deity).filter(Boolean))].sort();
  const uniqueTempos = [...new Set(bhajans.map(b => b.tempo).filter(Boolean))].sort();
  const uniqueRagas = [...new Set(bhajans.map(b => b.raga).filter(Boolean))].sort();

  const rows = bhajans.map(b => `
    <tr id="row-${b.id}">
      <td data-label="Title" class="edit-cell" data-field="title">${b.title}</td>
      <td data-label="Deity" class="edit-cell" data-field="deity">${b.deity || '-'}</td>
      <td data-label="Tempo" class="edit-cell" data-field="tempo">${b.tempo || '-'}</td>
      <td data-label="Raga" class="edit-cell" data-field="raga">${b.raga || '-'}</td>
      <td data-label="Scale" class="edit-cell" data-field="shruti">${b.shruti || '-'}</td>
      <td data-label="Level" class="edit-cell" data-field="level">${b.level || '-'}</td>
      ${isAdmin ? `<td data-label="Actions" class="action-cell">
        <button class="button" style="padding:6px 12px; font-size:12px; background:#4dabf7; border:none;" onclick="editMasterRow(${b.id})">✏️ Edit</button>
      </td>` : ''}
    </tr>
  `).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>Master Bhajan Bank</title><meta name="viewport" content="width=device-width, initial-scale=1" /><link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="/style.css"></head><body>
  <div class="container container-xl">
    <div class="header"><h1>📖 Master Bhajan Bank</h1><p>Search and Learn</p></div>
    <div style="margin-bottom: 20px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:10px;">
      <a href="${isAdmin ? '/admin' : '/'}" class="button secondary">⬅️ Back</a>
      ${isAdmin ? `<a href="/admin/export-master" class="button" style="background:#28a745; border:none; color:white;">⬇️ Download Clean JSON</a>` : ''}
    </div>
    
    <div style="display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap;">
      <select id="filterBankDeity" class="filter-input" onchange="filterMasterBank()"><option value="">All Deities</option>${uniqueDeities.map(d=>`<option value="${d}">${d}</option>`).join('')}</select>
      <select id="filterBankTempo" class="filter-input" onchange="filterMasterBank()"><option value="">All Tempos</option>${uniqueTempos.map(t=>`<option value="${t}">${t}</option>`).join('')}</select>
      <select id="filterBankRaga" class="filter-input" onchange="filterMasterBank()"><option value="">All Ragas</option>${uniqueRagas.map(r=>`<option value="${r}">${r}</option>`).join('')}</select>
      <input type="text" id="filterBankTitle" class="filter-input" onkeyup="filterMasterBank()" placeholder="Search by Title..." style="flex:1; min-width:200px;">
    </div>
    
    <div class="table-container">
      <table id="masterBankTable">
        <thead><tr><th>Title</th><th>Deity</th><th>Tempo</th><th>Raga</th><th>Scale (Shruti)</th><th>Level</th>${isAdmin ? '<th>Actions</th>' : ''}</tr></thead>
        <tbody>${rows.length > 0 ? rows : `<tr><td colspan="${isAdmin ? 7 : 6}" style="text-align:center;">No master bhajans found.</td></tr>`}</tbody>
      </table>
    </div></div><script src="/script.js"></script></body></html>`;
}

function generateAdminRulesHtml(rules, date) {
  const title = date === 'default' ? '⚙️ Default Deity Rules' : `⚙️ Rules for ${date}`;
  const subtitle = date === 'default' ? 'Set base limits for all future sessions' : 'Set custom limits for this specific session';
  
  const rows = rules.map(r => `
    <tr>
      <td>
        <strong>${r.deity_name}</strong>
        <input type="hidden" class="rule-deity" value="${r.deity_name}">
      </td>
      <td><input type="number" class="rule-min filter-input" value="${r.min_required}" min="0" max="9" style="width:80px; text-align:center;"></td>
      <td><input type="number" class="rule-max filter-input" value="${r.max_allowed}" min="0" max="99" style="width:80px; text-align:center;"></td>
    </tr>
  `).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>Manage Deity Rules</title><meta name="viewport" content="width=device-width, initial-scale=1" /><link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="/style.css"></head><body>
  <div class="container container-lg">
    <div class="header">
      <h1>${title}</h1>
      <p>${subtitle}</p>
    </div>
    <div style="margin-bottom: 20px;">
      <a href="${date === 'default' ? '/admin' : `/admin/date/${date}`}" class="button secondary">⬅️ Go Back</a>
    </div>
    <input type="hidden" id="ruleDate" value="${date}">
    <div class="table-container">
      <table id="rulesTable">
        <thead>
          <tr>
            <th>Deity</th>
            <th>Min Required</th>
            <th>Max Allowed <br><small style="font-weight:normal">(0 = Blocked)</small></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div style="margin-top:20px; text-align:right;">
      <button class="button" onclick="saveDeityRules()" style="background:#28a745; border:none;">💾 Save Rules</button>
    </div>
  </div><script src="/script.js"></script></body></html>`;
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
  generateMasterBankHtml,
  generateAdminLoginHtml,
  generateAdminRulesHtml
}