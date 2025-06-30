// IMPLEMENTASI LENGKAP: Update Email dengan Verifikasi yang Proper
// Import Firebase dan helper functions
import { checkEmailVerificationStatus, createVerificationButtons } from "./email-verification-helper"

// Pastikan Firebase sudah diinisialisasi
let db, auth

// Fungsi untuk menunggu Firebase ready
function waitForFirebase() {
  return new Promise((resolve, reject) => {
    const checkFirebase = () => {
      if (typeof firebase !== "undefined" && firebase.apps.length > 0) {
        db = firebase.firestore()
        auth = firebase.auth()
        console.log("Firebase initialized in pengaturan.js")
        resolve()
      } else {
        setTimeout(checkFirebase, 100)
      }
    }
    checkFirebase()
  })
}

// Show/hide loading overlay
function showLoading(show) {
  const overlay = document.getElementById("loadingOverlay")
  if (overlay) {
    overlay.style.display = show ? "flex" : "none"
  }
}

// Show alert message
function showAlert(message, type = "success") {
  const alertContainer = document.getElementById("alertContainer")
  if (alertContainer) {
    const alert = document.createElement("div")
    alert.className = `alert alert-${type} alert-dismissible fade show`
    alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `
    alertContainer.appendChild(alert)
    setTimeout(() => alert.remove(), 12000) // Longer timeout
  }
}

// FUNGSI UTAMA: Update Email dengan Verifikasi yang Benar
async function updateEmailComplete(newEmail, currentPassword) {
  const user = auth.currentUser
  if (!user) {
    throw new Error("User not authenticated")
  }

  console.log("Starting comprehensive email update process...")

  try {
    // Step 1: Re-authenticate
    console.log("Step 1: Re-authenticating user...")
    const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword)
    await user.reauthenticateWithCredential(credential)
    console.log("✅ Re-authentication successful")

    // Step 2: Cek verifikasi email saat ini
    await user.reload()
    console.log("Step 2: Checking current email verification...")
    console.log("Email verified status:", user.emailVerified)

    if (!user.emailVerified) {
      console.log("Step 2a: Current email not verified, handling verification...")

      // Kirim verifikasi ke email saat ini
      await user.sendEmailVerification()

      showAlert(
        `📧 <strong>Email saat ini belum diverifikasi!</strong><br>
        🔍 <strong>Email verifikasi telah dikirim ke: ${user.email}</strong><br>
        📬 Silakan buka email dan klik link verifikasi<br><br>
        <div class="alert alert-info mt-2">
          <strong>🔄 Proses Otomatis:</strong><br>
          Sistem akan otomatis cek verifikasi setiap 5 detik<br>
          Setelah Anda klik link verifikasi, proses akan berlanjut otomatis
        </div>`,
        "warning",
      )

      // Buat tombol bantuan
      createVerificationButtons(user)

      // Tunggu verifikasi dengan auto-check
      console.log("Waiting for email verification...")
      await checkEmailVerificationStatus(user, 60) // 60 attempts = 5 menit

      // Hapus tombol bantuan setelah verifikasi berhasil
      const verificationButtons = document.getElementById("verificationButtons")
      if (verificationButtons) verificationButtons.remove()

      const progressAlert = document.getElementById("verificationProgress")
      if (progressAlert) progressAlert.remove()

      showAlert("✅ Email saat ini berhasil diverifikasi! Melanjutkan proses...", "success")
    }

    // Step 3: Update ke email baru
    console.log("Step 3: Updating to new email...")
    await user.updateEmail(newEmail)
    console.log("✅ Email updated successfully")

    // Step 4: Kirim verifikasi ke email baru
    console.log("Step 4: Sending verification to new email...")
    await user.sendEmailVerification()
    console.log("✅ Verification sent to new email")

    showAlert(
      `🎉 <strong>Email berhasil diubah!</strong><br>
      📧 <strong>Email baru:</strong> ${newEmail}<br>
      📬 <strong>Email verifikasi telah dikirim ke email baru</strong><br>
      🔑 Anda sudah bisa login dengan email baru ini<br>
      🔍 Jangan lupa verifikasi email baru juga`,
      "success",
    )

    return true
  } catch (error) {
    console.error("Comprehensive email update error:", error)

    // Hapus progress indicators jika ada error
    const progressAlert = document.getElementById("verificationProgress")
    if (progressAlert) progressAlert.remove()

    throw error
  }
}

// Export untuk penggunaan global
window.updateEmailComplete = updateEmailComplete
window.showAlert = showAlert
window.showLoading = showLoading

// Sisanya sama seperti file pengaturan.js sebelumnya...
