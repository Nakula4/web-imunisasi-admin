// Pastikan Firebase sudah diinisialisasi di firebase-init.js sebelum file ini dipanggil
const auth = firebase.auth();

document.querySelector("form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim(); // ganti id ke 'email' jika form-nya diubah
  const password = document.getElementById("password").value;

  try {
    // Login dengan Firebase Auth
    await auth.signInWithEmailAndPassword(email, password);

    // Redirect jika sukses
    window.location.href = "dashboard-admin.html";
  } catch (err) {
    console.error("Login error:", err);
    alert("Gagal login: " + err.message);
  }
});
