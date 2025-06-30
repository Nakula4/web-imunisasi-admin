function showPopup(title, message, type = 'success', options = {}) {
  const { showButtons = false, verifyCallback = null, passwordCallback = null, showPasswordInput = false } = options;

  const existingPopup = document.getElementById('customPopup');
  if (existingPopup) {
    existingPopup.remove();
  }

  const popup = document.createElement('div');
  popup.id = 'customPopup';
  popup.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center';
  popup.style.cssText = 'z-index: 9999; background: rgba(0,0,0,0.5);';

  const typeColors = {
    success: 'success',
    danger: 'danger',
    warning: 'warning',
    info: 'info',
  };

  const typeIcons = {
    success: 'fas fa-check-circle',
    danger: 'fas fa-times-circle',
    warning: 'fas fa-exclamation-triangle',
    info: 'fas fa-info-circle',
  };

  const passwordInputHtml = showPasswordInput ? `
    <div class="mb-3">
      <label for="passwordInput" class="form-label">Masukkan Password Saat Ini:</label>
      <div class="input-group">
        <input type="password" class="form-control" id="passwordInput" placeholder="Password saat ini" required>
        <button class="btn btn-outline-secondary" type="button" id="togglePasswordBtn" title="Tampilkan/Sembunyikan Password">
          <i class="fas fa-eye" id="passwordInputIcon"></i>
        </button>
      </div>
      <div class="invalid-feedback" id="passwordInputFeedback">Password harus diisi</div>
    </div>
  ` : '';

  const buttonsHtml = showButtons ? `
    <div class="mt-3 d-flex gap-2 justify-content-center">
      ${verifyCallback ? `
        <button type="button" class="btn btn-primary btn-sm" id="verifyEmailBtn">
          <i class="fas fa-paper-plane me-1"></i>Kirim Verifikasi
        </button>
      ` : ''}
      ${passwordCallback ? `
        <button type="button" class="btn btn-primary btn-sm" id="submitPasswordBtn">
          <i class="fas fa-check me-1"></i>Submit
        </button>
      ` : ''}
      <button type="button" class="btn btn-secondary btn-sm" id="closePopupBtn">
        <i class="fas fa-times me-1"></i>Tutup
      </button>
    </div>
  ` : `
    <div class="mt-3">
      <button type="button" class="btn btn-${typeColors[type]} btn-sm" id="closePopupBtn">
        <i class="fas fa-check me-1"></i>OK
      </button>
    </div>
  `;

  popup.innerHTML = `
    <div class="card shadow-lg" style="max-width: 500px; width: 90%;">
      <div class="card-header bg-${typeColors[type]} text-white text-center">
        <h5 class="mb-0">
          <i class="${typeIcons[type]} me-2"></i>${title}
        </h5>
      </div>
      <div class="card-body text-center">
        <div class="mb-3">${message}</div>
        ${passwordInputHtml}
        ${buttonsHtml}
      </div>
    </div>
  `;

  document.getElementById('alertContainer').appendChild(popup);

  // Attach event listeners programmatically
  const closeBtn = popup.querySelector('#closePopupBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', closePopup);
  }

  if (verifyCallback) {
    const verifyBtn = popup.querySelector('#verifyEmailBtn');
    if (verifyBtn) {
      verifyBtn.addEventListener('click', verifyCallback);
    }
  }

  if (passwordCallback) {
    const submitBtn = popup.querySelector('#submitPasswordBtn');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        const passwordInput = document.getElementById('passwordInput');
        if (passwordInput && !passwordInput.value) {
          passwordInput.classList.add('is-invalid');
          return;
        }
        passwordCallback(passwordInput ? passwordInput.value : '');
      });
    }
  }

  if (showPasswordInput) {
    const toggleBtn = popup.querySelector('#togglePasswordBtn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => togglePassword('passwordInput'));
    }
  }

  if (type === 'success' && !showButtons && !showPasswordInput) {
    setTimeout(() => {
      closePopup();
    }, 3000);
  }
}

function closePopup() {
  const popup = document.getElementById('customPopup');
  if (popup) {
    popup.remove();
  }
}

function togglePassword(inputId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(`${inputId}Icon`);
  if (input && icon) {
    if (input.type === 'password') {
      input.type = 'text';
      icon.className = 'fas fa-eye-slash';
    } else {
      input.type = 'password';
      icon.className = 'fas fa-eye';
    }
  }
}

export { showPopup, closePopup, togglePassword };