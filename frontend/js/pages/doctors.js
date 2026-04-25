// frontend/js/pages/doctors.js

async function renderDoctorsPage(container) {
  container.innerHTML = `
    <div class="page-header">
      <div><h1>Doctors</h1><p>Manage doctor profiles and specializations</p></div>
      <div class="flex" style="gap:10px">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" id="doctorSearch" placeholder="Search doctors…" />
        </div>
        <button class="btn btn-primary" onclick="openAddDoctorModal()">+ Add Doctor</button>
      </div>
    </div>
    <div class="card">
      <div class="table-wrapper" id="doctorTableWrapper">${spinner()}</div>
    </div>
  `;
  await loadDoctorsTable();
  filterTable('doctorSearch', 'doctorTable');
}

async function loadDoctorsTable() {
  const wrapper = document.getElementById('doctorTableWrapper');
  if (!wrapper) return;
  try {
    const doctors = await api.getDoctors();
    if (!doctors.length) { wrapper.innerHTML = emptyState('🩺', 'No doctors found.'); return; }
    wrapper.innerHTML = `
      <table id="doctorTable">
        <thead><tr><th>ID</th><th>Name</th><th>Specialization</th><th>Prescriptions</th><th>Actions</th></tr></thead>
        <tbody>
          ${doctors.map(d => `
            <tr>
              <td><span class="badge badge-pill">#${d.doctor_id}</span></td>
              <td><strong>${d.name}</strong></td>
              <td>${d.specialization}</td>
              <td><span class="badge badge-info">${d.prescription_count}</span></td>
              <td>
                <div class="flex" style="gap:6px">
                  <button class="btn btn-ghost btn-sm" onclick="openEditDoctorModal(${d.doctor_id},'${escQ(d.name)}','${escQ(d.specialization)}')">Edit</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteDoctorConfirm(${d.doctor_id},'${escQ(d.name)}')">Delete</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    wrapper.innerHTML = `<p class="text-danger">${err.message}</p>`;
  }
}

function openAddDoctorModal() {
  openModal('Add Doctor', doctorForm());
}
function openEditDoctorModal(id, name, spec) {
  openModal('Edit Doctor', doctorForm({ id, name, specialization: spec }));
}

function doctorForm(data = {}) {
  const { id, name = '', specialization = '' } = data;
  const specs = ['Cardiologist','General Physician','Neurologist','Endocrinologist','Pulmonologist','Orthopedist','Dermatologist','Psychiatrist','Oncologist','Nephrologist'];
  return `
    <div class="form-group">
      <label class="form-label">Full Name *</label>
      <input class="form-control" id="dName" value="${name}" placeholder="e.g. Dr. Anil Mehta" />
    </div>
    <div class="form-group">
      <label class="form-label">Specialization *</label>
      <input class="form-control" id="dSpec" value="${specialization}" placeholder="e.g. Cardiologist" list="specList" />
      <datalist id="specList">${specs.map(s=>`<option value="${s}"/>`).join('')}</datalist>
    </div>
    <div class="form-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveDoctor(${id||'null'})">${id ? 'Update' : 'Add'} Doctor</button>
    </div>
  `;
}

async function saveDoctor(id) {
  const name = document.getElementById('dName').value.trim();
  const spec = document.getElementById('dSpec').value.trim();
  if (!name || !spec) { toast('Name and specialization are required.', 'error'); return; }
  try {
    if (id) { await api.updateDoctor(id, { name, specialization: spec }); toast('Doctor updated.', 'success'); }
    else    { await api.createDoctor({ name, specialization: spec }); toast('Doctor added.', 'success'); }
    closeModal();
    await loadDoctorsTable();
    filterTable('doctorSearch', 'doctorTable');
  } catch (err) { toast(err.message, 'error'); }
}

function deleteDoctorConfirm(id, name) {
  confirmDelete(name, async () => {
    try {
      await api.deleteDoctor(id);
      toast(`${name} deleted.`, 'success');
      await loadDoctorsTable();
      filterTable('doctorSearch', 'doctorTable');
    } catch (err) { toast(err.message, 'error'); }
  });
}
