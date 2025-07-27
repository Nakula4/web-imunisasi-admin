// Ensure Firebase is available
if (typeof firebase === 'undefined') {
    console.error('Firebase is not defined. Ensure firebase-ini.js is loaded correctly.');
    throw new Error('Firebase is not defined');
}

// Initialize Firestore
const db = window.db || firebase.firestore();
console.log('Initializing kelola-users.js, Firestore:', db);

// Import popup utilities for enhanced edit functionality
import { showPopup, closePopup } from './popupUtils.js';

// DOM elements will be initialized in loadKelolaUsers function
let userTableBody, searchInput, pagination, loadingSpinner, errorMessage, alertContainer, addUserForm, editUserForm;

let users = [];
let currentPage = 1;
const usersPerPage = 10;

// Phone number validation regex (e.g., +62 or numbers, 9-15 digits)
const phoneRegex = /^\+?[1-9]\d{8,14}$/;

// Show loading spinner
function showLoading() {
    if (loadingSpinner) {
        loadingSpinner.style.display = 'block';
        errorMessage.style.display = 'none';
    }
}

// Hide loading spinner
function hideLoading() {
    if (loadingSpinner) {
        loadingSpinner.style.display = 'none';
    }
}

// Show error message
function showError(message) {
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        hideLoading();
    }
}

// Show alert
function showAlert(message, type = 'success') {
    if (alertContainer) {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.role = 'alert';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        alertContainer.appendChild(alert);
        setTimeout(() => alert.remove(), 5000);
    }
}

// Fetch users and their children from Firestore
async function fetchUsers() {
    console.log('Fetching users...');
    showLoading();
    try {
        const userSnapshot = await db.collection('users').get();
        users = [];
        for (const doc of userSnapshot.docs) {
            const userData = {
                id: doc.id,
                ...doc.data()
            };
            const childSnapshot = await db.collection('tb_anak')
                .where('userId', '==', doc.id)
                .limit(1)
                .get();
            userData.childName = childSnapshot.empty ? '-' : childSnapshot.docs[0].data().nama;
            users.push(userData);
        }
        console.log('Users fetched:', users);
        renderUsers();
    } catch (error) {
        console.error('Error fetching users:', error);
        showError('Gagal memuat data pengguna: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Render users to table
function renderUsers(searchTerm = '') {
    if (!userTableBody) {
        console.error('userTableBody not found');
        return;
    }
    userTableBody.innerHTML = '';
    const filteredUsers = users.filter(user => 
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const start = (currentPage - 1) * usersPerPage;
    const end = start + usersPerPage;
    const paginatedUsers = filteredUsers.slice(start, end);

    paginatedUsers.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.username || '-'}</td>
            <td>${user.email || '-'}</td>
            <td>${user.childName || '-'}</td>
            <td>${user.phone || '-'}</td>
            <td class="table-actions">
                <button class="btn btn-sm btn-warning edit-btn" data-id="${user.id}">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-sm btn-danger delete-btn" data-id="${user.id}">
                    <i class="fas fa-trash"></i> Hapus
                </button>
            </td>
        `;
        userTableBody.appendChild(row);
    });

    setupPagination(filteredUsers.length);
    setupActionButtons();
}

// Setup pagination
function setupPagination(totalUsers) {
    if (!pagination) {
        console.error('pagination not found');
        return;
    }
    const pageCount = Math.ceil(totalUsers / usersPerPage);
    pagination.innerHTML = '';
    
    for (let i = 1; i <= pageCount; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === currentPage ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
        li.addEventListener('click', (e) => {
            e.preventDefault();
            currentPage = i;
            renderUsers(searchInput?.value || '');
        });
        pagination.appendChild(li);
    }
}

// Setup action buttons
function setupActionButtons() {
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const userId = btn.getAttribute('data-id');
            const user = users.find(u => u.id === userId);
            openEditModal(user);
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const userId = btn.getAttribute('data-id');
            if (confirm('Apakah Anda yakin ingin menghapus pengguna ini?')) {
                deleteUser(userId);
            }
        });
    });
}

// Search functionality
function setupSearch() {
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            currentPage = 1;
            renderUsers(searchInput.value);
        });
    } else {
        console.error('searchInput not found');
    }
}

// Show custom edit popup similar to riwayat.html style
function showEditPopup(user) {
    const existingPopup = document.getElementById('customEditPopup');
    if (existingPopup) {
        existingPopup.remove();
    }

    const popup = document.createElement('div');
    popup.id = 'customEditPopup';
    popup.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center';
    popup.style.cssText = 'z-index: 9999; background: rgba(0,0,0,0.5);';

    popup.innerHTML = `
        <div class="card shadow-lg" style="max-width: 600px; width: 90%;">
            <div class="card-header bg-warning text-white text-center">
                <h5 class="mb-0">
                    <i class="fas fa-user-edit me-2"></i>Edit Data Pengguna
                </h5>
            </div>
            <div class="card-body">
                <form id="editPopupForm">
                    <input type="hidden" id="editPopupUserId" value="${user.id}">
                    
                    <div class="mb-3">
                        <label for="editPopupNama" class="form-label">
                            <i class="fas fa-user me-1"></i>Nama Lengkap *
                        </label>
                        <input type="text" class="form-control" id="editPopupNama" value="${user.username || ''}" required>
                        <div class="invalid-feedback">Nama lengkap harus diisi</div>
                    </div>
                    
                    <div class="mb-3">
                        <label for="editPopupEmail" class="form-label">
                            <i class="fas fa-envelope me-1"></i>Email *
                        </label>
                        <input type="email" class="form-control" id="editPopupEmail" value="${user.email || ''}" required>
                        <div class="invalid-feedback">Email harus diisi dengan format yang benar</div>
                    </div>
                    
                    <div class="mb-3">
                        <label for="editPopupNamaAnak" class="form-label">
                            <i class="fas fa-child me-1"></i>Nama Anak
                        </label>
                        <input type="text" class="form-control" id="editPopupNamaAnak" value="${user.childName || ''}" readonly>
                        <div class="form-text">
                            <i class="fas fa-info-circle me-1"></i>Nama anak tidak dapat diubah dari halaman ini
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label for="editPopupPhone" class="form-label">
                            <i class="fas fa-phone me-1"></i>Nomor Telepon *
                        </label>
                        <input type="text" class="form-control" id="editPopupPhone" value="${user.phone || ''}" required>
                        <div class="invalid-feedback">Nomor HP harus diisi dengan format yang benar</div>
                        <div class="form-text">Format: +62xxx atau 08xxx (9-15 digit)</div>
                    </div>
                    
                    <div class="d-flex gap-2 justify-content-center mt-4">
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save me-1"></i>Simpan Perubahan
                        </button>
                        <button type="button" class="btn btn-secondary" id="closeEditPopupBtn">
                            <i class="fas fa-times me-1"></i>Batal
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('alertContainer').appendChild(popup);

    // Setup event listeners
    const closeBtn = popup.querySelector('#closeEditPopupBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeEditPopup);
    }

    const form = popup.querySelector('#editPopupForm');
    if (form) {
        form.addEventListener('submit', handleEditSubmit);
    }

    // Add click outside to close
    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            closeEditPopup();
        }
    });
}

// Close edit popup
function closeEditPopup() {
    const popup = document.getElementById('customEditPopup');
    if (popup) {
        popup.remove();
    }
}

// Handle edit form submission
async function handleEditSubmit(e) {
    e.preventDefault();
    
    const userId = document.getElementById('editPopupUserId').value;
    const nama = document.getElementById('editPopupNama').value.trim();
    const email = document.getElementById('editPopupEmail').value.trim();
    const phone = document.getElementById('editPopupPhone').value.trim();

    // Validation
    let isValid = true;
    
    // Reset previous validation states
    document.querySelectorAll('#customEditPopup .form-control').forEach(input => {
        input.classList.remove('is-invalid');
    });

    if (!nama) {
        document.getElementById('editPopupNama').classList.add('is-invalid');
        isValid = false;
    }

    if (!email || !email.includes('@')) {
        document.getElementById('editPopupEmail').classList.add('is-invalid');
        isValid = false;
    }

    if (!phone || !phone.match(phoneRegex)) {
        document.getElementById('editPopupPhone').classList.add('is-invalid');
        isValid = false;
    }

    if (!isValid) {
        showPopup('Validasi Error', 'Mohon periksa kembali data yang dimasukkan', 'danger');
        return;
    }

    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Menyimpan...';
    submitBtn.disabled = true;

    try {
        await db.collection('users').doc(userId).update({
            username: nama,
            email: email,
            phone: phone,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        closeEditPopup();
        showPopup('Berhasil', 'Data pengguna berhasil diperbarui', 'success');
        fetchUsers(); // Refresh the user list
    } catch (error) {
        console.error('Error updating user:', error);
        showPopup('Error', 'Gagal memperbarui data pengguna: ' + error.message, 'danger');
        
        // Restore button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Open edit modal (updated to use popup)
function openEditModal(user) {
    showEditPopup(user);
}

// Add user
function setupAddUserForm() {
    if (!addUserForm) {
        console.error('addUserForm not found');
        return;
    }
    addUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nama = document.getElementById('addNama').value;
        const email = document.getElementById('addEmail').value;
        const password = document.getElementById('addPassword').value;
        const phone = document.getElementById('addPhone').value;

        if (password.length < 8) {
            showError('Password harus minimal 8 karakter');
            return;
        }

        if (!phone.match(phoneRegex)) {
            showError('Nomor HP tidak valid (harus 9-15 angka, boleh diawali +)');
            return;
        }

        showLoading();
        try {
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
            const userId = userCredential.user.uid;

            await db.collection('users').doc(userId).set({
                username: nama,
                email: email,
                phone: phone,
                createAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            showAlert('Pengguna berhasil ditambahkan');
            addUserForm.reset();
            bootstrap.Modal.getInstance(document.getElementById('addUserModal')).hide();
            fetchUsers();
        } catch (error) {
            console.error('Error adding user:', error);
            showError('Gagal menambah pengguna: ' + error.message);
        } finally {
            hideLoading();
        }
    });
}

// Edit user
function setupEditUserForm() {
    if (!editUserForm) {
        console.error('editUserForm not found');
        return;
    }
    editUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = document.getElementById('editUserId').value;
        const nama = document.getElementById('editNama').value;
        const email = document.getElementById('editEmail').value;
        const phone = document.getElementById('editPhone').value;

        if (!phone.match(phoneRegex)) {
            showError('Nomor HP tidak valid (harus 9-15 angka, boleh diawali +)');
            return;
        }

        showLoading();
        try {
            await db.collection('users').doc(userId).update({
                username: nama,
                email: email,
                phone: phone
            });

            showAlert('Pengguna berhasil diperbarui');
            bootstrap.Modal.getInstance(document.getElementById('editUserModal')).hide();
            fetchUsers();
        } catch (error) {
            console.error('Error updating user:', error);
            showError('Gagal memperbarui pengguna: ' + error.message);
        } finally {
            hideLoading();
        }
    });
}

// Delete user
async function deleteUser(userId) {
    showLoading();
    try {
        await db.collection('users').doc(userId).delete();
        showAlert('Pengguna berhasil dihapus');
        fetchUsers();
    } catch (error) {
        console.error('Error deleting user:', error);
        showError('Gagal menghapus pengguna: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Toggle password visibility
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(inputId + 'Icon');
    if (input && icon) {
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }
}

// Initialize Kelola Users
function loadKelolaUsers() {
    console.log('loadKelolaUsers called');
    
    // Initialize DOM elements
    userTableBody = document.getElementById('userTableBody');
    searchInput = document.getElementById('searchInput');
    pagination = document.getElementById('pagination');
    loadingSpinner = document.getElementById('loadingSpinner');
    errorMessage = document.getElementById('errorMessage');
    alertContainer = document.getElementById('alertContainer');
    addUserForm = document.getElementById('addUserForm');
    editUserForm = document.getElementById('editUserForm');
    
    // Check if essential elements are available
    if (!userTableBody) {
        console.error('userTableBody not found - DOM might not be ready');
        setTimeout(loadKelolaUsers, 100); // Retry after 100ms
        return;
    }
    
    if (!db) {
        showError('Firestore tidak tersedia. Pastikan firebase-ini.js diatur dengan benar.');
        return;
    }
    
    fetchUsers();
    setupSearch();
    setupAddUserForm();
    setupEditUserForm();
}

// Expose loadKelolaUsers to global scope
window.loadKelolaUsers = loadKelolaUsers;
