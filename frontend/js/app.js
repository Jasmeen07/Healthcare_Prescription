// frontend/js/app.js
// SPA router — renders pages into #content

const pages = {
  'home':            renderHomePage,
  'patients':        renderPatientsPage,
  'prescriptions':   renderPrescriptionsPage,
  'alerts':          renderAlertsPage,
  'analytics':       renderAnalyticsPage,
  'new-prescription':renderNewPrescriptionPage,
  'drug-checker':    renderDrugCheckerPage,
  'doctors':         renderDoctorsPage,
  'medicines':       renderMedicinesPage,
  'interactions-db': renderInteractionsDbPage,
};

const pageTitles = {
  'home':            'Healthcare Prescription Interaction Checker',
  'patients':        'Patient Dashboard',
  'prescriptions':   'Prescription History',
  'alerts':          'Interaction Alerts',
  'analytics':       'Analytics',
  'new-prescription':'New Prescription',
  'drug-checker':    'Drug Interaction Checker',
  'doctors':         'Doctors',
  'medicines':       'Medicines',
  'interactions-db': 'Interaction Database',
};

let currentPage = 'home';

function navigateTo(page) {
  if (!pages[page]) return;
  currentPage = page;

  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  // Update topbar title
  document.getElementById('topbarTitle').textContent = pageTitles[page] || page;

  // Render page
  const content = document.getElementById('content');
  content.innerHTML = spinner();
  pages[page](content);
}

// Wire up nav links
document.querySelectorAll('.nav-item[data-page]').forEach(el => {
  el.addEventListener('click', e => {
    e.preventDefault();
    navigateTo(el.dataset.page);
  });
});

// Sidebar collapse toggle
document.getElementById('sidebarToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('collapsed');
  document.querySelector('.main-wrapper').classList.toggle('expanded');
});

// Update alert badge count
async function refreshAlertBadge() {
  try {
    const alerts = await api.getAlerts();
    const badge = document.getElementById('alertBadge');
    badge.textContent = alerts.length;
    badge.style.display = alerts.length > 0 ? '' : 'none';
  } catch (e) {}
}

// Boot
refreshAlertBadge();
navigateTo('home');
