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
      setTimeout(() => alert.remove(), 10000) // Longer timeout for verification messages
    }
  }
  
  export { showAlert };
  