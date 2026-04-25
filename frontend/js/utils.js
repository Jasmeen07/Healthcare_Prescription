// frontend/js/utils.js

// ── Toast Notifications ───────────────────────────────────────────────────────
function toast(msg, type = 'default', duration = 3000) {
  const container = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icons = { success: '✓', error: '✕', warning: '⚠', default: 'ℹ' };
  t.innerHTML = `<span>${icons[type] || icons.default}</span><span>${msg}</span>`;
  container.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(20px)'; t.style.transition = '.3s'; setTimeout(() => t.remove(), 350); }, duration);
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function openModal(title, bodyHTML) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHTML;
  document.getElementById('modalOverlay').classList.add('open');
}
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.getElementById('modalBody').innerHTML = '';
}
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
});

// ── Spinner ───────────────────────────────────────────────────────────────────
function spinner() {
  return `<div class="loading-center"><div class="spinner"></div></div>`;
}

// ── Risk badge HTML ───────────────────────────────────────────────────────────
function riskBadge(score) {
  if (score >= 3) return `<span class="badge badge-high">🔴 HIGH (${score})</span>`;
  if (score === 2) return `<span class="badge badge-moderate">🟠 MODERATE (${score})</span>`;
  if (score === 1) return `<span class="badge badge-low">🟡 LOW (${score})</span>`;
  return `<span class="badge badge-none">✅ Safe (${score})</span>`;
}

// ── Severity badge ────────────────────────────────────────────────────────────
function severityBadge(sev) {
  const map = {
    HIGH:     `<span class="badge badge-high">HIGH</span>`,
    MODERATE: `<span class="badge badge-moderate">MODERATE</span>`,
    LOW:      `<span class="badge badge-low">LOW</span>`,
    NONE:     `<span class="badge badge-none">SAFE</span>`,
  };
  return map[sev] || `<span class="badge badge-pill">${sev}</span>`;
}

// ── Gender label ──────────────────────────────────────────────────────────────
function genderLabel(g) { return { M: 'Male', F: 'Female', O: 'Other' }[g] || g; }

// ── Format date ───────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Table search filter ───────────────────────────────────────────────────────
function filterTable(inputId, tableId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase();
    const rows = document.querySelectorAll(`#${tableId} tbody tr`);
    rows.forEach(r => {
      r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });
}

// ── Confirm delete helper ─────────────────────────────────────────────────────
function confirmDelete(label, onConfirm) {
  openModal('Confirm Deletion', `
    <p style="margin-bottom:20px;font-size:14px;color:var(--text-secondary)">
      Are you sure you want to delete <strong>${label}</strong>?
      This action cannot be undone.
    </p>
    <div class="form-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger" id="confirmDeleteBtn">Delete</button>
    </div>
  `);
  document.getElementById('confirmDeleteBtn').onclick = async () => {
    closeModal();
    await onConfirm();
  };
}

// ── Empty state ───────────────────────────────────────────────────────────────
function emptyState(icon, msg) {
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><p>${msg}</p></div>`;
}
