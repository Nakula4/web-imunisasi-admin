import { showAlert } from "./alertHelper.js"; // Declare the showAlert variable

// Fungsi untuk cek status verifikasi email secara real-time
async function checkEmailVerificationStatus(user, maxAttempts = 30) {
  return new Promise((resolve, reject) => {
    let attempts = 0

    const checkInterval = setInterval(async () => {
      try {
        attempts++
        console.log(`Checking email verification... attempt ${attempts}`)

        // Refresh user data
        await user.reload()

        if (user.emailVerified) {
          clearInterval(checkInterval)
          console.log("✅ Email verified!")
          resolve(true)
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval)
          reject(new Error("VERIFICATION_TIMEOUT"))
        }

        // Update UI dengan progress
        const alertContainer = document.getElementById("alertContainer")
        if (alertContainer) {
          // Update existing alert atau buat baru
          let progressAlert = document.getElementById("verificationProgress")
          if (!progressAlert) {
            progressAlert = document.createElement("div")
            progressAlert.id = "verificationProgress"
            progressAlert.className = "alert alert-info"
            alertContainer.appendChild(progressAlert)
          }

          progressAlert.innerHTML = `
            <div class="d-flex align-items-center">
              <div class="spinner-border spinner-border-sm me-2" role="status"></div>
              <div>
                <strong>Menunggu verifikasi email...</strong><br>
                <small>Pengecekan ke-${attempts} dari ${maxAttempts} (setiap 5 detik)</small>
              </div>
            </div>
          `
        }
      } catch (error) {
        clearInterval(checkInterval)
        reject(error)
      }
    }, 5000) // Check setiap 5 detik
  })
}

// Fungsi untuk mengirim ulang email verifikasi
async function resendEmailVerification(user) {
  try {
    await user.sendEmailVerification()
    console.log("Email verification resent")

    showAlert(
      `📧 <strong>Email verifikasi dikirim ulang!</strong><br>
      📬 Periksa inbox: <strong>${user.email}</strong><br>
      🔍 Jangan lupa cek folder spam/junk`,
      "info",
    )

    return true
  } catch (error) {
    console.error("Error resending verification:", error)
    throw error
  }
}

// Fungsi untuk membuat tombol verifikasi manual
function createVerificationButtons(user) {
  const alertContainer = document.getElementById("alertContainer")
  if (!alertContainer) return

  // Hapus tombol lama jika ada
  const existingButtons = document.getElementById("verificationButtons")
  if (existingButtons) existingButtons.remove()

  const buttonContainer = document.createElement("div")
  buttonContainer.id = "verificationButtons"
  buttonContainer.className = "alert alert-light border"
  buttonContainer.innerHTML = `
    <div class="text-center">
      <h6><i class="fas fa-tools me-2"></i>Bantuan Verifikasi Email</h6>
      <div class="btn-group" role="group">
        <button type="button" class="btn btn-primary btn-sm" onclick="resendVerification()">
          <i class="fas fa-paper-plane me-1"></i>Kirim Ulang Verifikasi
        </button>
        <button type="button" class="btn btn-success btn-sm" onclick="checkVerificationManual()">
          <i class="fas fa-sync me-1"></i>Cek Status Verifikasi
        </button>
        <button type="button" class="btn btn-info btn-sm" onclick="refreshPage()">
          <i class="fas fa-refresh me-1"></i>Refresh Halaman
        </button>
      </div>
      <small class="d-block mt-2 text-muted">
        💡 Gunakan tombol di atas jika email verifikasi tidak diterima
      </small>
    </div>
  `

  alertContainer.appendChild(buttonContainer)

  // Tambahkan event listeners
  window.resendVerification = async () => {
    try {
      await resendEmailVerification(user)
    } catch (error) {
      showAlert("Gagal mengirim ulang verifikasi: " + error.message, "danger")
    }
  }

  window.checkVerificationManual = async () => {
    try {
      await user.reload()
      if (user.emailVerified) {
        showAlert("✅ Email sudah diverifikasi! Silakan coba ubah email lagi.", "success")
        buttonContainer.remove()
      } else {
        showAlert("❌ Email belum diverifikasi. Silakan cek inbox Anda.", "warning")
      }
    } catch (error) {
      showAlert("Gagal cek verifikasi: " + error.message, "danger")
    }
  }

  window.refreshPage = () => {
    window.location.reload()
  }
}

// Export functions
export { checkEmailVerificationStatus, resendEmailVerification, createVerificationButtons }
