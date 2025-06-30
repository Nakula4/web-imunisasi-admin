import { showPopup, closePopup, togglePassword } from './popupUtils.js';

// Pastikan Firebase sudah diinisialisasi
let db, auth;

// Fungsi untuk menunggu Firebase ready
function waitForFirebase() {
  return new Promise((resolve, reject) => {
    const checkFirebase = () => {
      if (typeof firebase !== '/pokemon' && firebase.apps.length > 0) {
        db = firebase.firestore();
        auth = firebase.auth();
        console.log('Firebase initialized in pengaturan.js');
        resolve();
      } else {
        setTimeout(checkFirebase, 100);
      }
    };
    checkFirebase();
  });
}

// Show/hide loading overlay
function showLoading(show) {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.style.display = show ? 'flex' : 'none';
  }
}

// Toggle debug info visibility
window.globalFunctions = window.globalFunctions || {};
window.globalFunctions.toggleDebug = () => {
  const debugCard = document.getElementById('debugCard');
  const toggleBtn = document.querySelector('button[onclick="globalFunctions.toggleDebug()"]');
  if (debugCard && toggleBtn) {
    debugCard.style.display = debugCard.style.display === 'none' ? 'block' : 'none';
    toggleBtn.innerHTML =
      debugCard.style.display === 'none'
        ? '<i class="fas fa-bug me-1"></i>Show Debug Info'
        : '<i class="fas fa-bug me-1"></i>Hide Debug Info';
  }
};

// Update debug info
function updateDebugInfo() {
  const debugInfo = document.getElementById('debugInfo');
  if (debugInfo) {
    const user = auth?.currentUser;
    const debugData = {
      timestamp: new Date().toISOString(),
      userStatus: user ? 'Authenticated' : 'Not Authenticated',
      userEmail: user ? user.email : '-',
      emailVerified: user ? user.emailVerified : '-',
      adminDocStatus: document.getElementById('adminDocStatus')?.textContent || '-',
      dataLoadStatus: document.getElementById('dataLoadStatus')?.textContent || '-',
    };

    debugInfo.innerHTML = `
      <p><strong>Timestamp:</strong> ${debugData.timestamp}</p>
      <p><strong>User Status:</strong> ${debugData.userStatus}</p>
      <p><strong>User Email:</strong> ${debugData.userEmail}</p>
      <p><strong>Email Verified:</strong> ${debugData.emailVerified}</p>
      <p><strong>Admin Doc Found:</strong> ${debugData.adminDocStatus}</p>
      <p><strong>Data Loaded:</strong> ${debugData.dataLoadStatus}</p>
    `;
  }
}

// Update email info display with verification status
function updateEmailInfo(currentEmail, displayEmail, emailVerified = false) {
  const loginEmailDisplay = document.getElementById('loginEmailDisplay');
  const displayEmailDisplay = document.getElementById('displayEmailDisplay');

  if (loginEmailDisplay) {
    loginEmailDisplay.textContent = currentEmail || 'Loading...';
  }

  if (displayEmailDisplay) {
    displayEmailDisplay.textContent = displayEmail || 'Loading...';
  }

  const emailInfoAlert = document.getElementById('emailInfoAlert');
  if (emailInfoAlert) {
    const existingVerifyBtn = emailInfoAlert.querySelector('.verify-email-btn');
    if (existingVerifyBtn) {
      existingVerifyBtn.remove();
    }

    if (!emailVerified && currentEmail) {
      const verifyButton = document.createElement('div');
      verifyButton.className = 'verify-email-btn mt-3';
      verifyButton.innerHTML = `
        <div class="alert alert-warning mb-0">
          <div class="d-flex align-items-center justify-content-between">
            <div>
              <i class="fas fa-exclamation-triangle me-2"></i>
              <strong>Email belum diverifikasi</strong>
            </div>
            <button type="button" class="btn btn-warning btn-sm" id="verifyEmailBtn">
              <i class="fas fa-paper-plane me-1"></i>Verifikasi Email
            </button>
          </div>
        </div>
      `;
      emailInfoAlert.appendChild(verifyButton);
      emailInfoAlert.style.background = 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)';
      emailInfoAlert.style.borderColor = '#ffc107';

      const verifyBtn = verifyButton.querySelector('#verifyEmailBtn');
      if (verifyBtn) {
        verifyBtn.addEventListener('click', handleVerifyEmail);
      }
    } else {
      emailInfoAlert.style.background = 'linear-gradient(135deg, #e8f5e8 0%, #f0f8f0 100%)';
      emailInfoAlert.style.borderColor = '#28a745';
    }
  }

  console.log('Email info updated:', { currentEmail, displayEmail, emailVerified });
}

// Handle email verification
async function handleVerifyEmail() {
  try {
    const user = auth.currentUser;
    if (user) {
      console.log('Mengirim email verifikasi ke:', user.email);
      await user.sendEmailVerification({
        url: window.location.href,
        handleCodeInApp: true,
      });
      console.log('✅ Email verifikasi berhasil dikirim');
      showPopup(
        'Email Verifikasi Dikirim',
        `📧 Email verifikasi telah dikirim ke: <strong>${user.email}</strong><br><br>
        🔍 Silakan buka email Anda dan klik link verifikasi<br>
        🔄 Setelah verifikasi, refresh halaman ini`,
        'info'
      );
    } else {
      throw new Error('Tidak ada pengguna yang terautentikasi');
    }
  } catch (error) {
    console.error('Gagal mengirim email verifikasi:', error);
    showPopup('Error', `Gagal mengirim email verifikasi: ${error.message}`, 'danger');
  }
}

// Validate phone number format
function isValidPhoneNumber(phone) {
  const phoneRegex = /^(\+62|0)[1-9][0-9]{8,12}$/;
  return phone ? phoneRegex.test(phone) : true;
}

// Validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Update email with verification
async function updateEmailComplete(newEmail, currentPassword) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Pengguna tidak terautentikasi');
  }

  console.log('Memulai proses pembaruan email untuk:', newEmail);

  try {
    // Langkah 1: Otentikasi ulang
    console.log('Langkah 1: Mengotentikasi ulang pengguna...');
    const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
    await user.reauthenticateWithCredential(credential);
    console.log('✅ Otentikasi ulang berhasil');

    // Langkah 2: Periksa verifikasi email saat ini
    await user.reload();
    console.log('Langkah 2: Memeriksa verifikasi email saat ini...');
    if (!user.emailVerified) {
      console.log('Email saat ini belum diverifikasi:', user.email);
      return { success: false, reason: 'EMAIL_NOT_VERIFIED', email: user.email };
    }

    // Langkah 3: Perbarui email
    console.log('Langkah 3: Memperbarui ke email baru:', newEmail);
    await user.updateEmail(newEmail);
    console.log('✅ Email berhasil diperbarui');

    // Langkah 4: Kirim email verifikasi ke email baru
    console.log('Langkah 4: Mengirim email verifikasi ke email baru:', newEmail);
    try {
      await user.sendEmailVerification({
        url: window.location.href,
        handleCodeInApp: true,
      });
      console.log('✅ Email verifikasi berhasil dikirim ke email baru');
      return { success: true, newEmail };
    } catch (verifyError) {
      console.error('Gagal mengirim email verifikasi:', verifyError);
      throw new Error(`Email berhasil diperbarui, tetapi gagal mengirim email verifikasi: ${verifyError.message}`);
    }
  } catch (error) {
    console.error('Kesalahan pembaruan email:', error);
    throw error;
  }
}

// Load admin profile data
async function loadProfileData() {
  console.log('Memuat data profil...');
  showLoading(true);

  try {
    await waitForFirebase();
    const user = auth.currentUser;
    console.log('Pengguna saat ini:', user);

    const userStatusEl = document.getElementById('userStatus');
    const userEmailEl = document.getElementById('userEmail');
    const emailVerifiedEl = document.getElementById('emailVerified');
    const adminDocStatusEl = document.getElementById('adminDocStatus');
    const dataLoadStatusEl = document.getElementById('dataLoadStatus');

    if (userStatusEl) userStatusEl.textContent = user ? 'Authenticated' : 'Not Authenticated';
    if (userEmailEl) userEmailEl.textContent = user ? user.email : '-';
    if (emailVerifiedEl) emailVerifiedEl.textContent = user ? user.emailVerified : '-';

    if (user) {
      console.log('Pengguna terautentikasi, mengambil data admin...');
      await user.reload();
      const currentEmail = user.email;
      const emailVerified = user.emailVerified;
      updateEmailInfo(currentEmail, 'Loading...', emailVerified);

      try {
        const adminDoc = await db.collection('admins').doc(user.uid).get();
        console.log('Dokumen admin ditemukan:', adminDoc.exists);

        if (adminDocStatusEl) adminDocStatusEl.textContent = adminDoc.exists ? 'Found' : 'Not Found';

        if (adminDoc.exists) {
          const data = adminDoc.data();
          console.log('Memuat data ke field formulir...');

          const adminNama = document.getElementById('adminNama');
          const adminEmail = document.getElementById('adminEmail');
          const adminNoHp = document.getElementById('adminNoHp');
          const adminUsername = document.getElementById('adminUsername');

          if (adminNama) adminNama.value = data.nama || '';
          if (adminEmail) adminEmail.value = data.email || user.email;
          if (adminNoHp) adminNoHp.value = data.no_hp || '';
          if (adminUsername) adminUsername.value = data.username || '';

          const displayEmail = data.email || user.email;
          updateEmailInfo(currentEmail, displayEmail, emailVerified);

          if (data.preferences) {
            const language = document.getElementById('language');
            const timezone = document.getElementById('timezone');
            const dateFormat = document.getElementById('dateFormat');
            const recordsPerPage = document.getElementById('recordsPerPage');
            const emailNotifications = document.getElementById('emailNotifications');
            const systemNotifications = document.getElementById('systemNotifications');
            const reportNotifications = document.getElementById('reportNotifications');

            if (language) language.value = data.preferences.language || 'id';
            if (timezone) timezone.value = data.preferences.timezone || 'Asia/Jakarta';
            if (dateFormat) dateFormat.value = data.preferences.dateFormat || 'dd/mm/yyyy';
            if (recordsPerPage) recordsPerPage.value = data.preferences.recordsPerPage || '25';
            if (emailNotifications) emailNotifications.checked = data.preferences.notifications?.email || false;
            if (systemNotifications) systemNotifications.checked = data.preferences.notifications?.system || false;
            if (reportNotifications) reportNotifications.checked = data.preferences.notifications?.report || false;
          }

          const autoBackup = document.getElementById('autoBackup');
          const manualBackupBtn = document.getElementById('manualBackupBtn');
          const exportExcelBtn = document.getElementById('exportExcelBtn');
          const exportCsvBtn = document.getElementById('exportCsvBtn');

          if (autoBackup) autoBackup.checked = data.autoBackup || false;
          if (manualBackupBtn) {
            manualBackupBtn.textContent = data.lastBackup
              ? `Backup terakhir: ${new Date(data.lastBackup.toDate()).toLocaleString('id-ID')}`
              : 'Lakukan Backup Sekarang';
          }
          if (exportExcelBtn) exportExcelBtn.disabled = !data.lastBackup;
          if (exportCsvBtn) exportCsvBtn.disabled = !data.lastBackup;

          const profileLoading = document.getElementById('profileLoading');
          const profileContent = document.getElementById('profileContent');

          if (profileLoading) profileLoading.style.display = 'none';
          if (profileContent) profileContent.style.display = 'block';
          if (dataLoadStatusEl) dataLoadStatusEl.textContent = 'Success';

          console.log('Data profil berhasil dimuat');
          updateDebugInfo();
        } else {
          console.log('Dokumen admin tidak ditemukan, membuat default...');
          await createDefaultAdminDoc(user);
          if (dataLoadStatusEl) dataLoadStatusEl.textContent = 'Created Default';
        }
      } catch (firestoreError) {
        console.error('Kesalahan Firestore:', firestoreError);
        showPopup('Kesalahan Database', 'Gagal mengakses database: ' + firestoreError.message, 'danger');
        if (dataLoadStatusEl) dataLoadStatusEl.textContent = 'Firestore Error: ' + firestoreError.message;
      }
    } else {
      console.log('Pengguna tidak terautentikasi');
      showPopup('Diperlukan Autentikasi', 'Anda harus login untuk mengakses pengaturan!', 'warning');
      if (dataLoadStatusEl) dataLoadStatusEl.textContent = 'Not Authenticated';
    }
  } catch (error) {
    console.error('Kesalahan memuat profil:', error);
    showPopup('Kesalahan Memuat', 'Gagal memuat data profil: ' + error.message, 'danger');
    const dataLoadStatusEl = document.getElementById('dataLoadStatus');
    if (dataLoadStatusEl) dataLoadStatusEl.textContent = 'Error: ' + error.message;
  } finally {
    showLoading(false);
    updateDebugInfo();
  }
}

// Create default admin document
async function createDefaultAdminDoc(user) {
  try {
    const defaultData = {
      nama: '',
      email: user.email,
      no_hp: '',
      username: '',
      preferences: {
        language: 'id',
        timezone: 'Asia/Jakarta',
        dateFormat: 'dd/mm/yyyy',
        recordsPerPage: 25,
        notifications: {
          email: true,
          system: true,
          report: false,
        },
      },
      autoBackup: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('admins').doc(user.uid).set(defaultData);
    console.log('Dokumen admin default dibuat');
    showPopup('Setup Selesai', 'Dokumen admin default telah dibuat. Silakan lengkapi profil Anda.', 'info');

    updateEmailInfo(user.email, user.email, user.emailVerified);
    setTimeout(() => loadProfileData(), 1000);
  } catch (error) {
    console.error('Kesalahan membuat dokumen admin default:', error);
    showPopup('Kesalahan Setup', 'Gagal membuat dokumen admin: ' + error.message, 'danger');
  }
}

// Handle profile form submission
function setupProfileForm() {
  const profileForm = document.getElementById('profileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nama = document.getElementById('adminNama').value.trim();
      const email = document.getElementById('adminEmail').value.trim();
      const noHp = document.getElementById('adminNoHp').value.trim();
      const username = document.getElementById('adminUsername').value.trim();

      let isValid = true;
      const adminNamaEl = document.getElementById('adminNama');
      const adminEmailEl = document.getElementById('adminEmail');
      const adminNoHpEl = document.getElementById('adminNoHp');
      const adminUsernameEl = document.getElementById('adminUsername');

      if (!nama) {
        adminNamaEl.classList.add('is-invalid');
        isValid = false;
      } else {
        adminNamaEl.classList.remove('is-invalid');
      }

      if (!isValidEmail(email)) {
        adminEmailEl.classList.add('is-invalid');
        isValid = false;
      } else {
        adminEmailEl.classList.remove('is-invalid');
      }

      if (!isValidPhoneNumber(noHp)) {
        adminNoHpEl.classList.add('is-invalid');
        isValid = false;
      } else {
        adminNoHpEl.classList.remove('is-invalid');
      }

      if (!username) {
        adminUsernameEl.classList.add('is-invalid');
        isValid = false;
      } else {
        adminUsernameEl.classList.remove('is-invalid');
      }

      if (!isValid) {
        showPopup('Kesalahan Validasi', 'Harap isi semua field dengan benar!', 'warning');
        return;
      }

      const user = auth.currentUser;
      const emailChanged = user && email !== user.email;

      if (emailChanged) {
        showPopup(
          'Konfirmasi Perubahan Email',
          `Email akan diubah dari: <strong>${user.email}</strong><br>
          ke: <strong>${email}</strong>`,
          'warning',
          {
            showPasswordInput: true,
            passwordCallback: async (currentPassword) => {
              showLoading(true);
              try {
                console.log('Perubahan email terdeteksi, memulai proses pembaruan...');
                const result = await updateEmailComplete(email, currentPassword);

                if (result.success) {
                  // Perbarui Firestore setelah email berhasil diubah
                  await db.collection('admins').doc(user.uid).set(
                    {
                      nama,
                      email,
                      no_hp: noHp,
                      username,
                      emailUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    },
                    { merge: true }
                  );
                  console.log('✅ Firestore berhasil diperbarui dengan email baru:', email);

                  updateEmailInfo(email, email, false);
                  showPopup(
                    'Email Berhasil Diperbarui',
                    `🎉 Email berhasil diubah ke: <strong>${email}</strong><br><br>
                    📧 Email verifikasi telah dikirim ke email baru<br>
                    🔑 Anda sudah bisa login dengan email baru setelah verifikasi<br><br>
                    <small>Halaman akan refresh dalam 5 detik...</small>`,
                    'success',
                    { showButtons: true, verifyCallback: handleVerifyEmail } // Tambahkan tombol untuk mengirim ulang verifikasi
                  );

                  console.log('Proses pembaruan email selesai dengan sukses');
                  updateDebugInfo();

                  // Tunda refresh untuk memastikan email dikirim
                  setTimeout(() => {
                    window.location.reload();
                  }, 5000);
                } else if (result.reason === 'EMAIL_NOT_VERIFIED') {
                  showPopup(
                    'Diperlukan Verifikasi Email',
                    `📧 Email saat ini belum diverifikasi: <strong>${result.email}</strong><br><br>
                    🔍 Silakan verifikasi email saat ini terlebih dahulu<br>
                    📬 Setelah verifikasi, coba ubah email lagi`,
                    'warning',
                    { showButtons: true, verifyCallback: handleVerifyEmail }
                  );
                }
              } catch (error) {
                console.error('Kesalahan dalam pembaruan email:', error);
                let errorMessage = 'Gagal mengubah email: ';
                if (error.code === 'auth/wrong-password') {
                  errorMessage = 'Kata sandi salah! Silakan periksa kembali.';
                } else if (error.code === 'auth/email-already-in-use') {
                  errorMessage = 'Email sudah digunakan oleh akun lain!';
                } else if (error.code === 'auth/invalid-email') {
                  errorMessage = 'Format email tidak valid!';
                } else if (error.code === 'auth/requires-recent-login') {
                  errorMessage = 'Sesi Anda sudah kadaluarsa. Silakan logout dan login kembali.';
                } else if (error.code === 'auth/too-many-requests') {
                  errorMessage = 'Terlalu banyak percobaan. Silakan tunggu beberapa menit.';
                } else {
                  errorMessage += error.message;
                }
                showPopup('Gagal Memperbarui Email', errorMessage, 'danger');
              } finally {
                showLoading(false);
                closePopup();
              }
            },
          }
        );
      } else {
        showLoading(true);
        try {
          await db.collection('admins').doc(user.uid).set(
            {
              nama,
              email,
              no_hp: noHp,
              username,
              updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );

          showPopup('Profil Diperbarui', 'Profil berhasil diperbarui!', 'success');
          console.log('Profil berhasil diperbarui (tanpa perubahan email)');
          updateDebugInfo();
        } catch (error) {
          console.error('Kesalahan memperbarui profil:', error);
          showPopup('Kesalahan Pembaruan', 'Gagal memperbarui profil: ' + error.message, 'danger');
        } finally {
          showLoading(false);
        }
      }
    });
  }
}

// Setup security form
function setupSecurityForm() {
  const securityForm = document.getElementById('securityForm');
  if (securityForm) {
    securityForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const currentPassword = document.getElementById('currentPassword').value;
      const newPassword = document.getElementById('newPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      console.log('Percobaan pembaruan kata sandi dimulai...');

      let isValid = true;
      document.getElementById('currentPassword').classList.remove('is-invalid');
      document.getElementById('newPassword').classList.remove('is-invalid');
      document.getElementById('confirmPassword').classList.remove('is-invalid');

      if (!currentPassword) {
        document.getElementById('currentPassword').classList.add('is-invalid');
        isValid = false;
      }

      if (!newPassword || newPassword.length < 8) {
        document.getElementById('newPassword').classList.add('is-invalid');
        isValid = false;
      }

      if (newPassword !== confirmPassword) {
        document.getElementById('confirmPassword').classList.add('is-invalid');
        isValid = false;
      }

      if (!isValid) {
        showPopup('Kesalahan Validasi', 'Harap isi semua field dengan benar!', 'warning');
        return;
      }

      showLoading(true);
      try {
        const user = auth.currentUser;
        if (!user) {
          throw new Error('Pengguna tidak terautentikasi');
        }

        console.log('Langkah 1: Mengotentikasi ulang pengguna...');
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
        await user.reauthenticateWithCredential(credential);
        console.log('✅ Otentikasi ulang berhasil');

        console.log('Langkah 2: Memperbarui kata sandi...');
        await user.updatePassword(newPassword);
        console.log('✅ Pembaruan kata sandi berhasil');

        console.log('Langkah 3: Memperbarui Firestore...');
        const twoFactorAuth = document.getElementById('twoFactorAuth').checked;
        await db.collection('admins').doc(user.uid).set(
          {
            twoFactorEnabled: twoFactorAuth,
            passwordLastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        console.log('✅ Pembaruan Firestore berhasil');

        showPopup('Keamanan Diperbarui', 'Kata sandi dan pengaturan keamanan berhasil diperbarui!', 'success');
        securityForm.reset();
        updateDebugInfo();

        console.log('🎉 Pembaruan kata sandi selesai dengan sukses!');
      } catch (error) {
        console.error('❌ Kesalahan memperbarui kata sandi:', error);
        let errorMessage = 'Gagal memperbarui kata sandi: ';
        if (error.code === 'auth/wrong-password') {
          errorMessage = 'Kata sandi saat ini salah! Silakan periksa kembali.';
          document.getElementById('currentPassword').classList.add('is-invalid');
          document.getElementById('currentPassword').focus();
        } else if (error.code === 'auth/weak-password') {
          errorMessage = 'Kata sandi baru terlalu lemah! Gunakan kombinasi huruf, angka, dan simbol.';
          document.getElementById('newPassword').classList.add('is-invalid');
          document.getElementById('newPassword').focus();
        } else if (error.code === 'auth/requires-recent-login') {
          errorMessage = 'Sesi Anda sudah kadaluarsa. Silakan logout dan login kembali.';
        } else if (error.code === 'auth/too-many-requests') {
          errorMessage = 'Terlalu banyak percobaan. Silakan tunggu beberapa menit.';
        } else {
          errorMessage += error.message;
        }
        showPopup('Gagal Memperbarui Kata Sandi', errorMessage, 'danger');
      } finally {
        showLoading(false);
      }
    });
  }
}

// Setup preferences form
function setupPreferencesForm() {
  const preferencesForm = document.getElementById('preferencesForm');
  if (preferencesForm) {
    preferencesForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      showLoading(true);
      try {
        const user = auth.currentUser;
        if (user) {
          const preferences = {
            language: document.getElementById('language').value,
            timezone: document.getElementById('timezone').value,
            dateFormat: document.getElementById('dateFormat').value,
            recordsPerPage: Number.parseInt(document.getElementById('recordsPerPage').value),
            notifications: {
              email: document.getElementById('emailNotifications').checked,
              system: document.getElementById('systemNotifications').checked,
              report: document.getElementById('reportNotifications').checked,
            },
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          };

          await db.collection('admins').doc(user.uid).set(
            {
              preferences,
            },
            { merge: true }
          );

          showPopup('Preferensi Diperbarui', 'Preferensi sistem berhasil diperbarui!', 'success');
          updateDebugInfo();
        }
      } catch (error) {
        console.error('Kesalahan memperbarui preferensi:', error);
        showPopup('Kesalahan Pembaruan', 'Gagal memperbarui preferensi: ' + error.message, 'danger');
      } finally {
        showLoading(false);
      }
    });
  }
}

// Handle backup settings
async function handleBackupSettings() {
  const autoBackup = document.getElementById('autoBackup');
  const manualBackupBtn = document.getElementById('manualBackupBtn');
  const exportExcelBtn = document.getElementById('exportExcelBtn');
  const exportCsvBtn = document.getElementById('exportCsvBtn');

  if (autoBackup) {
    autoBackup.addEventListener('change', async () => {
      showLoading(true);
      try {
        const user = auth.currentUser;
        if (user) {
          await db.collection('admins').doc(user.uid).set(
            {
              autoBackup: autoBackup.checked,
              updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
          showPopup(
            'Pengaturan Backup Diperbarui',
            `Backup otomatis ${autoBackup.checked ? 'diaktifkan' : 'dinonaktifkan'}!`,
            'success'
          );
          updateDebugInfo();
        }
      } catch (error) {
        console.error('Kesalahan memperbarui pengaturan backup:', error);
        showPopup('Kesalahan Pembaruan', 'Gagal memperbarui pengaturan backup: ' + error.message, 'danger');
      } finally {
        showLoading(false);
      }
    });
  }

  if (manualBackupBtn) {
    manualBackupBtn.addEventListener('click', async () => {
      showLoading(true);
      try {
        const user = auth.currentUser;
        if (user) {
          await db.collection('admins').doc(user.uid).set(
            {
              lastBackup: firebase.firestore.FieldValue.serverTimestamp(),
              updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
          showPopup('Backup Selesai', 'Backup manual berhasil dilakukan!', 'success');
          document.getElementById('lastBackupInfo').textContent =
            `Backup terakhir: ${new Date().toLocaleString('id-ID')}`;
          updateDebugInfo();
        }
      } catch (error) {
        console.error('Kesalahan melakukan backup manual:', error);
        showPopup('Kesalahan Backup', 'Gagal melakukan backup manual: ' + error.message, 'danger');
      } finally {
        showLoading(false);
      }
    });
  }

  if (exportExcelBtn) {
    exportExcelBtn.addEventListener('click', async () => {
      showPopup('Fitur Tidak Tersedia', 'Fitur export Excel belum diimplementasikan!', 'info');
    });
  }

  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', async () => {
      showPopup('Fitur Tidak Tersedia', 'Fitur export CSV belum diimplementasikan!', 'info');
    });
  }
}

// Main initialization function
async function initializePengaturan() {
  console.log('Menginisialisasi pengaturan...');

  try {
    await waitForFirebase();
    setupProfileForm();
    setupSecurityForm();
    setupPreferencesForm();

    auth.onAuthStateChanged(async (user) => {
      console.log('Status autentikasi berubah:', user ? user.email : 'Tidak ada pengguna');
      if (user) {
        await user.reload();
        loadProfileData();
        handleBackupSettings();
      } else {
        showPopup('Diperlukan Autentikasi', 'Anda harus login untuk mengakses pengaturan!', 'warning');
      }
    });
  } catch (error) {
    console.error('Kesalahan menginisialisasi pengaturan:', error);
    showPopup('Kesalahan Inisialisasi', 'Gagal menginisialisasi pengaturan: ' + error.message, 'danger');
  }
}

// Export functions for global access
window.initializePengaturan = initializePengaturan;
window.togglePassword = togglePassword;

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePengaturan);
} else {
  initializePengaturan();
}