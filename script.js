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
  document.getElementById('modalSpeed').textContent = speed.charAt(0).toUpperCase() + speed.slice(1);
  document.getElementById('detailsModal').classList.add('show');
}

function closeModal() {
  document.getElementById('detailsModal').classList.remove('show');
}

document.addEventListener('DOMContentLoaded', function() {
  const adminInput = document.querySelector('input[name="admin"]');
  const isAdmin = adminInput && adminInput.value === 'true';

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
    if (event.target == modal) closeModal();
  }

  let selectedDeity = null;

  // Deity card selection
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

  // Form validation
  const form = document.getElementById('bhajanForm');
  if (form) {
    form.addEventListener('submit', function(e) {
      if (!selectedDeity) {
        e.preventDefault();
        alert('⚠️ Please select a deity first');
        return false;
      }
      // Save to browser only if not in admin mode
      if (!isAdmin) {
        const name = document.querySelector('input[name="singer_name"]').value;
        const gender = document.querySelector('select[name="gender"]').value;
        localStorage.setItem('bj_singer_name', name);
        localStorage.setItem('bj_gender', gender);
      }
    });
  }
});

function filterTable(colIndex) {
  const input = document.querySelectorAll('.filter-input')[colIndex];
  const filter = input.value.toUpperCase();
  const table = document.getElementById("dbTable");
  const tr = table.getElementsByTagName("tr");

  // Start from 2 because row 0 is inputs, row 1 is headers
  for (let i = 2; i < tr.length; i++) {
    const td = tr[i].getElementsByTagName("td")[colIndex];
    if (td) {
      const txtValue = td.textContent || td.innerText;
      if (txtValue.toUpperCase().indexOf(filter) > -1) {
        tr[i].style.display = "";
      } else {
        tr[i].style.display = "none";
      }
    }
  }
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