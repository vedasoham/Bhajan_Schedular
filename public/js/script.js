function switchTab(tabName, element) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  document.getElementById(tabName).classList.add('active');
  
  // Highlight clicked tab
  if (element) {
    element.classList.add('active');
  } else if (window.event && window.event.currentTarget) {
    window.event.currentTarget.classList.add('active');
  }
}

function showDetails(deity, singer, bhajan, scale, speed) {
  document.getElementById('modalDeityName').textContent = deity + ' Bhajan';
  document.getElementById('modalSinger').textContent = singer;
  document.getElementById('modalBhajan').textContent = bhajan;
  document.getElementById('modalScale').textContent = scale || 'Not specified';
  const formattedSpeed = speed ? speed.charAt(0).toUpperCase() + speed.slice(1) : '';
  document.getElementById('modalSpeed').textContent = formattedSpeed;
  document.getElementById('detailsModal').classList.add('show');
}

function closeModal() {
  document.getElementById('detailsModal').classList.remove('show');
}

function closeConfirmModal() {
  const modal = document.getElementById('confirmSubmitModal');
  if(modal) modal.classList.remove('show');
}

document.addEventListener('DOMContentLoaded', function() {
  const adminInput = document.querySelector('input[name="admin"]');
  const isAdmin = adminInput && adminInput.value === 'true';

  // Fetch Singer Dictionary for Autocomplete
  const singerList = document.getElementById('singerList');
  if (singerList) {
    fetch('/api/singers')
      .then(res => res.json())
      .then(data => {
        data.forEach(singer => {
          const option = document.createElement('option');
          option.value = singer.name;
          singerList.appendChild(option);
        });
      }).catch(err => console.error('Failed to load singer dictionary'));
  }

  // 1. Load saved details only if not in admin mode
  if (!isAdmin) {
    const savedName = localStorage.getItem('bj_singer_name');
    const savedGender = localStorage.getItem('bj_gender');

    if (savedName) {
      const nameInput = document.querySelector('input[name="singer_name"]');
      if (nameInput) nameInput.value = savedName;
    }
    if (savedGender) {
      const genderSelect = document.querySelector('select[name="gender"]');
      if (genderSelect) genderSelect.value = savedGender;
    }
  }

  // Modal close on outside click
  window.onclick = function(event) {
    const modal = document.getElementById('detailsModal');
    const confirmModal = document.getElementById('confirmSubmitModal');
    if (event.target == modal) closeModal();
    if (confirmModal && event.target == confirmModal) closeConfirmModal();
  }

  let selectedDeity = null;
  let currentMasterBhajans = []; // Array to hold the API data

  // Deity card selection
  document.querySelectorAll('.deity-card.available').forEach(card => {
    card.addEventListener('click', function() {
      document.querySelectorAll('.deity-card').forEach(c => c.classList.remove('selected'));
      this.classList.add('selected');
      selectedDeity = this.dataset.deity;
      
      document.getElementById('selectedDeity').value = selectedDeity;
      document.getElementById('deityDisplay').textContent = selectedDeity;
      document.getElementById('bhajanDetails').classList.add('show');
      
      const datalist = document.getElementById('bhajanList');
      const titleInput = document.getElementById('bhajanTitleInput');
      
      // Reset fields
      datalist.innerHTML = '';
      titleInput.value = '';
      titleInput.placeholder = `Loading ${selectedDeity} bhajans...`;
      document.getElementById('masterDataBadge').style.display = 'none';

      // Fetch Master Bhajans
      fetch(`/api/master-bhajans/${selectedDeity}`)
        .then(response => response.json())
        .then(data => {
          currentMasterBhajans = data; // Save data globally for this session
          data.forEach(bhajan => {
            const option = document.createElement('option');
            option.value = bhajan.title;
            datalist.appendChild(option);
          });
          titleInput.placeholder = `Search ${data.length} ${selectedDeity} bhajans...`;
        })
        .catch(err => titleInput.placeholder = "Type bhajan name here...");
        
      setTimeout(() => {
        document.getElementById('bhajanDetails').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    });
  });

  // MAGIC AUTO-FILL LOGIC: Listen for when they select a title
  let searchTimeout;
  document.getElementById('bhajanTitleInput').addEventListener('input', function(e) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const selectedTitle = e.target.value;
    
    // Find the bhajan in our downloaded master list
    const matchedBhajan = currentMasterBhajans.find(b => b.title === selectedTitle);
    
    // Helper to catch empty strings or #N/A from the excel file
    const cleanValue = (val) => (val && val !== '#N/A' && String(val).trim() !== '') ? val : 'Not specified';

    const warningDiv = document.getElementById('cooldownWarning');
    if (selectedTitle.trim().length > 0) {
      fetch('/api/check-cooldown?title=' + encodeURIComponent(selectedTitle))
        .then(res => res.json())
        .then(data => {
          if (data && warningDiv) {
            warningDiv.innerHTML = `⚠️ <strong>Cool-down warning:</strong> This bhajan was last sung by <strong>${data.singer_name}</strong> on <strong>${data.session_date}</strong>.`;
            warningDiv.style.display = 'block';
          } else if (warningDiv) {
            warningDiv.style.display = 'none';
          }
        });
    } else if (warningDiv) { warningDiv.style.display = 'none'; }

    if (matchedBhajan) {
      // 1. Auto-fill visible inputs
      const genderSelect = document.getElementById('gender');
      const gender = genderSelect ? genderSelect.value : '';
      let scaleToUse = '';
      if (gender === 'Female' && matchedBhajan.shruti_female && matchedBhajan.shruti_female !== '#N/A') {
        scaleToUse = matchedBhajan.shruti_female;
      } else if (matchedBhajan.shruti && matchedBhajan.shruti !== '#N/A') {
        scaleToUse = matchedBhajan.shruti;
      }
      document.getElementById('scaleInput').value = scaleToUse;
      document.getElementById('speedInput').value = cleanValue(matchedBhajan.tempo);
      
      // 2. Auto-fill other inputs to send to database
      document.getElementById('ragaInput').value = cleanValue(matchedBhajan.raga);
      document.getElementById('hiddenLevel').value = matchedBhajan.level || '';
      document.getElementById('hiddenLanguage').value = matchedBhajan.language || '';
      
      // 3. Show a nice green success message to the singer
      const badge = document.getElementById('masterDataBadge');
      let badgeText = "";
      const cleanRaag = cleanValue(matchedBhajan.raga);
      if (cleanRaag !== 'Not specified') badgeText += `(Raag: ${cleanRaag})`;
      
      document.getElementById('badgeDetails').textContent = badgeText;
      badge.style.display = 'block';
    } else {
      // If they type a custom bhajan not in the list, hide the badge
      document.getElementById('masterDataBadge').style.display = 'none';
      document.getElementById('speedInput').value = 'Not specified';
      document.getElementById('ragaInput').value = 'Not specified';
      document.getElementById('hiddenLevel').value = '';
      document.getElementById('hiddenLanguage').value = '';
    }
    }, 300);
  });
  
  // Instantly swap scale if they change gender AFTER picking a bhajan
  document.getElementById('gender')?.addEventListener('change', function(e) {
    const selectedTitle = document.getElementById('bhajanTitleInput').value;
    if (selectedTitle && currentMasterBhajans) {
      const matchedBhajan = currentMasterBhajans.find(b => b.title === selectedTitle);
      if (matchedBhajan) {
        const gender = e.target.value;
        let scaleToUse = '';
        if (gender === 'Female' && matchedBhajan.shruti_female && matchedBhajan.shruti_female !== '#N/A') {
          scaleToUse = matchedBhajan.shruti_female;
        } else if (matchedBhajan.shruti && matchedBhajan.shruti !== '#N/A') {
          scaleToUse = matchedBhajan.shruti;
        }
        document.getElementById('scaleInput').value = scaleToUse;
      }
    }
  });

  // POPUP LOGIC & Form validation
  const preSubmitBtn = document.getElementById('preSubmitBtn');
  const confirmSubmitModal = document.getElementById('confirmSubmitModal');
  const editBtn = document.getElementById('editBtn');
  const confirmBtn = document.getElementById('confirmBtn');
  const form = document.getElementById('bhajanForm');

  if (preSubmitBtn) {
    preSubmitBtn.addEventListener('click', function() {
      // Check standard HTML5 validation
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      if (!document.getElementById('selectedDeity').value) {
        alert('⚠️ Please select a deity first');
        return;
      }

      // Populate Modal
      const singer = document.getElementById('singerName').value;
      const partner = document.getElementById('partnerName').value;
      document.getElementById('modSinger').textContent = singer + (partner ? ` (& ${partner})` : '');
      
      document.getElementById('modDeity').textContent = document.getElementById('selectedDeity').value;
      document.getElementById('modTitle').textContent = document.getElementById('bhajanTitleInput').value;
      document.getElementById('modScale').textContent = document.getElementById('scaleInput').value || 'Not specified';

      // Show Modal
      confirmSubmitModal.classList.add('show');
    });
  }

  if (editBtn) {
    editBtn.addEventListener('click', closeConfirmModal);
  }

  if (confirmBtn) {
    confirmBtn.addEventListener('click', function() {
      if (!isAdmin) {
        const name = document.querySelector('input[name="singer_name"]').value;
        const gender = document.querySelector('select[name="gender"]').value;
        localStorage.setItem('bj_singer_name', name);
        localStorage.setItem('bj_gender', gender);
      }
      form.submit();
    });
  }

  if (form) {
    form.addEventListener('submit', function(e) {
      // If the modal isn't open yet, prevent native submit and trigger the pre-submit flow
      if (confirmSubmitModal && !confirmSubmitModal.classList.contains('show')) {
        e.preventDefault();
        if (preSubmitBtn) preSubmitBtn.click();
      }
    });
  }
});

let filterTableTimeout;
function filterTable() {
  clearTimeout(filterTableTimeout);
  filterTableTimeout = setTimeout(() => {
    const inputs = document.querySelectorAll('#dbTable .filter-input');
    const table = document.getElementById("dbTable");
    if (!table) return;
    const tr = table.getElementsByTagName("tr");

    // Start from 2 because row 0 is inputs, row 1 is headers
    for (let i = 2; i < tr.length; i++) {
      let rowVisible = true;
      for (let j = 0; j < inputs.length; j++) {
        const filter = inputs[j].value.toUpperCase();
        const td = tr[i].getElementsByTagName("td")[j];
        if (td) {
          const txtValue = td.textContent || td.innerText;
          if (txtValue.toUpperCase().indexOf(filter) === -1) {
            rowVisible = false;
            break;
          }
        }
      }
      tr[i].style.display = rowVisible ? "" : "none";
    }
  }, 250);
}

let filterMasterBankTimeout;
function filterMasterBank() {
  clearTimeout(filterMasterBankTimeout);
  filterMasterBankTimeout = setTimeout(() => {
    const titleFilter = (document.getElementById('filterBankTitle')?.value || '').toUpperCase();
    const deityFilter = (document.getElementById('filterBankDeity')?.value || '').toUpperCase();
    const tempoFilter = (document.getElementById('filterBankTempo')?.value || '').toUpperCase();
    const ragaFilter = (document.getElementById('filterBankRaga')?.value || '').toUpperCase();
    
    const table = document.getElementById('masterBankTable');
    if (!table) return;
    const tr = table.getElementsByTagName('tr');
    
    for (let i = 1; i < tr.length; i++) { // Skip header
      const tds = tr[i].getElementsByTagName('td');
      if (tds.length > 3) {
        const txtTitle = (tds[0].textContent || tds[0].innerText).toUpperCase();
        const txtDeity = (tds[1].textContent || tds[1].innerText).toUpperCase();
        const txtTempo = (tds[2].textContent || tds[2].innerText).toUpperCase();
        const txtRaga = (tds[3].textContent || tds[3].innerText).toUpperCase();
        
        const matchTitle = txtTitle.indexOf(titleFilter) > -1;
        const matchDeity = deityFilter === "" || txtDeity === deityFilter;
        const matchTempo = tempoFilter === "" || txtTempo === tempoFilter;
        const matchRaga = ragaFilter === "" || txtRaga === ragaFilter;
        
        tr[i].style.display = (matchTitle && matchDeity && matchTempo && matchRaga) ? "" : "none";
      }
    }
  }, 250);
}

// Admin Calendar Modal Logic
let currentAdminDate = null;

function openAdminDateModal(date, type, description) {
  currentAdminDate = date;
  document.getElementById('adminModalDate').textContent = 'Manage ' + date;
  document.getElementById('permDescription').value = description || '';
  document.getElementById('adminDateModal').classList.add('show');
}

function closeAdminModal() {
  document.getElementById('adminDateModal').classList.remove('show');
}

function viewAdminDate() {
  if(currentAdminDate) window.location.href = '/admin/date/' + currentAdminDate;
}

function updatePermission(type) {
  if(!currentAdminDate) return;
  
  const description = document.getElementById('permDescription').value.trim();

  if (type !== 'clear' && !description) {
    alert('⚠️ Description is mandatory for Special/Festival sessions.');
    return;
  }

  fetch('/admin/permission', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: currentAdminDate, type: type, description: description })
  })
  .then(res => res.json())
  .then(data => {
    if(data.success) location.reload();
    else alert('Error updating permission');
  });
}

// Missing Bhajan Catcher Modals
function openMissingBhajanModal(title) {
  document.getElementById('mbTitle').value = title;
  document.getElementById('mbDeity').value = 'Sai';
  document.getElementById('mbTempo').value = 'Medium';
  document.getElementById('mbRaga').value = '';
  document.getElementById('mbShruti').value = '';
  document.getElementById('mbShrutiFemale').value = '';
  document.getElementById('mbLevel').value = '';
  document.getElementById('missingBhajanModal').classList.add('show');
}
function closeMissingBhajanModal() {
  document.getElementById('missingBhajanModal').classList.remove('show');
}
function saveMissingBhajan() {
  const data = {
    title: document.getElementById('mbTitle').value,
    deity: document.getElementById('mbDeity').value,
    tempo: document.getElementById('mbTempo').value,
    raga: document.getElementById('mbRaga').value,
    shruti: document.getElementById('mbShruti').value,
    shruti_female: document.getElementById('mbShrutiFemale').value,
    level: document.getElementById('mbLevel').value
  };
  fetch('/api/add-master-bhajan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  .then(res => res.json())
  .then(result => {
    if (result.success) { alert('✅ Successfully added to Master Database!'); location.reload(); }
    else { alert('Error adding to Master DB: ' + result.error); }
  });
}

// Deity Rules Management
function saveDeityRules() {
  const table = document.getElementById('rulesTable');
  const date = document.getElementById('ruleDate').value;
  if (!table) return;
  
  const rules = [];
  const trs = table.getElementsByTagName('tbody')[0].getElementsByTagName('tr');
  
  for(let tr of trs) {
    const deity = tr.querySelector('.rule-deity').value;
    const min = parseInt(tr.querySelector('.rule-min').value, 10);
    const max = parseInt(tr.querySelector('.rule-max').value, 10);
    rules.push({ deity_name: deity, min_required: min, max_allowed: max });
  }
  
  fetch('/admin/update-rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules, date })
  })
  .then(res => res.json())
  .then(data => {
    if(data.success) { alert('✅ ' + data.message); window.location.href = date === 'default' ? '/admin' : '/admin/date/' + date; }
    else { alert('Error: ' + data.error); }
  });
}

function getWesternScale(indianScale) {
  if (!indianScale || indianScale === '-' || indianScale === 'Not specified') return '-';
  const match = indianScale.toString().trim().match(/^([\d\.]+)\s*([PMpm])?.*$/);
  if (!match) return '-';
  const numMap = {'1':0, '1.5':1, '2':2, '2.5':3, '3':4, '4':5, '4.5':6, '5':7, '5.5':8, '6':9, '6.5':10, '7':11};
  if (numMap[match[1]] === undefined) return '-';
  let index = numMap[match[1]];
  if ((match[2] || '').toUpperCase() === 'M') index = (index + 5) % 12;
  return ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"][index];
}

// Master Bhajan Inline Edit
function editMasterRow(id) {
  const row = document.getElementById(`row-${id}`);
  if (!row) return;
  const cells = row.querySelectorAll('.edit-cell');
  
  cells.forEach(cell => {
    const currentValue = cell.textContent === '-' ? '' : cell.textContent;
    const fieldName = cell.getAttribute('data-field');
    const safeValue = currentValue.replace(/"/g, '&quot;');
    cell.innerHTML = `<input type="text" id="input-${id}-${fieldName}" value="${safeValue}" class="filter-input" style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 4px;">`;
  });

  const actionCell = row.querySelector('.action-cell');
  if (actionCell) {
    actionCell.innerHTML = `<button class="button" style="padding:6px 12px; font-size:12px; background:#28a745; border:none;" onclick="saveMasterRow(${id})">💾 Save</button>`;
  }
}

function saveMasterRow(id) {
  const updatedData = {
    title: document.getElementById(`input-${id}-title`)?.value.trim() || '',
    deity: document.getElementById(`input-${id}-deity`)?.value.trim() || '',
    tempo: document.getElementById(`input-${id}-tempo`)?.value.trim() || '',
    raga: document.getElementById(`input-${id}-raga`)?.value.trim() || '',
    shruti: document.getElementById(`input-${id}-shruti`)?.value.trim() || '',
    shruti_female: document.getElementById(`input-${id}-shruti_female`)?.value.trim() || '',
    level: document.getElementById(`input-${id}-level`)?.value.trim() || ''
  };

  fetch(`/api/admin/update-master-bhajan/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedData)
  })
  .then(res => res.json())
  .then(response => {
    if(response.success) {
      const row = document.getElementById(`row-${id}`);
      const cells = row.querySelectorAll('.edit-cell');
      cells.forEach(cell => {
        const fieldName = cell.getAttribute('data-field');
        cell.textContent = updatedData[fieldName] || '-';
      });
      
      // Update western scale display dynamically
      const westM = document.getElementById(`west-m-${id}`);
      const westF = document.getElementById(`west-f-${id}`);
      if (westM) westM.textContent = getWesternScale(updatedData.shruti);
      if (westF) westF.textContent = getWesternScale(updatedData.shruti_female);

      const actionCell = row.querySelector('.action-cell');
      if (actionCell) {
        actionCell.innerHTML = `<button class="button" style="padding:6px 12px; font-size:12px; background:#4dabf7; border:none; margin-right:4px;" onclick="editMasterRow(${id})">✏️ Edit</button><button class="button" style="padding:6px 12px; font-size:12px; background:#e03131; border:none;" onclick="deleteMasterRow(${id})">❌ Del</button>`;
      }
    } else {
      alert('Error: ' + response.error);
    }
  })
  .catch(err => { alert('Failed to save changes.'); console.error(err); });
}

function deleteMasterRow(id) {
  if (!confirm('🚨 Are you sure you want to permanently delete this bhajan from the Master Database?')) return;
  fetch(`/api/admin/delete-master-bhajan/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })
  .then(res => res.json())
  .then(response => {
    if(response.success) {
      const row = document.getElementById(`row-${id}`);
      if (row) row.remove();
    } else {
      alert('Error: ' + response.error);
    }
  })
  .catch(err => { alert('Failed to delete.'); console.error(err); });
}

function sortTable(n, tableId) {
  const table = document.getElementById(tableId);
  if (!table) return;
  // Target the tbody to avoid sorting table headers
  const tbody = table.getElementsByTagName("TBODY")[0] || table;
  let rows, switching, i, x, y, shouldSwitch, dir, switchcount = 0;
  switching = true;
  dir = "asc"; 
  
  while (switching) {
    switching = false;
    rows = tbody.getElementsByTagName("TR");
    
    for (i = 0; i < (rows.length - 1); i++) {
      shouldSwitch = false;
      x = rows[i].getElementsByTagName("TD")[n];
      y = rows[i + 1].getElementsByTagName("TD")[n];
      if (!x || !y) continue;

      // Use data-sort attribute if present (for accurate Date sorting), else text
      let valX = x.getAttribute("data-sort") || x.innerHTML.replace(/(<([^>]+)>)/gi, "").trim();
      let valY = y.getAttribute("data-sort") || y.innerHTML.replace(/(<([^>]+)>)/gi, "").trim();

      valX = valX.toLowerCase();
      valY = valY.toLowerCase();

      if (dir === "asc") {
        if (valX > valY) {
          shouldSwitch = true;
          break;
        }
      } else if (dir === "desc") {
        if (valX < valY) {
          shouldSwitch = true;
          break;
        }
      }
    }
    if (shouldSwitch) {
      rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
      switching = true;
      switchcount++;      
    } else {
      if (switchcount === 0 && dir === "asc") {
        dir = "desc";
        switching = true;
      }
    }
  }
}

// ==========================================
// Drag & Drop Sequence Reordering
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const sortableBody = document.getElementById('sortable-body');
  if (!sortableBody) return;

  let draggedRow = null;
  
  sortableBody.addEventListener('dragstart', (e) => {
    draggedRow = e.target.closest('tr');
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => draggedRow.style.opacity = '0.5', 0);
  });

  sortableBody.addEventListener('dragover', (e) => {
    e.preventDefault();
    const targetRow = e.target.closest('tr');
    if (targetRow && targetRow !== draggedRow) {
      const rect = targetRow.getBoundingClientRect();
      const next = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
      sortableBody.insertBefore(draggedRow, next ? targetRow.nextSibling : targetRow);
      document.getElementById('saveOrderBtn').style.display = 'block';
    }
  });

  sortableBody.addEventListener('dragend', () => {
    if(draggedRow) draggedRow.style.opacity = '1';
  });
});

function saveReorderSequence() {
  const rows = document.querySelectorAll('#sortable-body tr[data-id]');
  const orderData = Array.from(rows).map((row, index) => ({
    id: parseInt(row.getAttribute('data-id')),
    order: index + 1
  }));
  
  fetch('/api/admin/reorder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderData })
  }).then(res => res.json()).then(data => {
    if(data.success) location.reload();
    else alert('Error saving sequence');
  });
}

function toggleSessionLock(date, isLocked) {
  fetch('/api/admin/toggle-lock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, is_locked: isLocked })
  }).then(res => res.json()).then(data => {
    if(data.success) location.reload();
  });
}

// ==========================================
// Edit Singer Dictionary
// ==========================================
function editSinger(id, currentName) {
  const newName = prompt("Edit Singer Name:", currentName);
  if (newName !== null && newName.trim() !== "" && newName !== currentName) {
    document.getElementById('edit-input-' + id).value = newName.trim();
    document.getElementById('edit-form-' + id).submit();
  }
}