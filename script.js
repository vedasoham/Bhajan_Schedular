function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  document.getElementById(tabName).classList.add('active');
  
  // Highlight clicked tab
  if (window.event && window.event.currentTarget) {
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
  // 1. Load saved details
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
      // Save to browser
      const name = document.querySelector('input[name="singer_name"]').value;
      const gender = document.querySelector('select[name="gender"]').value;
      localStorage.setItem('bj_singer_name', name);
      localStorage.setItem('bj_gender', gender);
    });
  }
});