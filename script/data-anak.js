const db = firebase.firestore();

function loadDataAnak() {
  const tableBody = document.getElementById('anakTableBody');
  if (!tableBody) return;

  db.collection("tb_anak").get()
    .then((querySnapshot) => {
      tableBody.innerHTML = "";
      if (querySnapshot.empty) {
        tableBody.innerHTML = '<tr><td colspan="7">Tidak ada data anak.</td></tr>';
        return;
      }
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const row = `
          <tr>
            <td>${data.nama || '-'}</td>
            <td>${data.tglLahir || '-'}</td>
            <td>${data.jenis_kelamin || '-'}</td>
            <td>${data.berat || '-'}</td>
            <td>${data.tinggi || '-'}</td>
            <td>
              <a href="edit-anak.html?id=${doc.id}" class="btn btn-warning btn-sm">Edit</a>
              <button class="btn btn-danger btn-sm" onclick="hapusData('${doc.id}')">Hapus</button>
            </td>
          </tr>
        `;
        tableBody.insertAdjacentHTML('beforeend', row);
      });
    })
    .catch((error) => {
      console.error("Gagal mengambil data: ", error);
      tableBody.innerHTML = '<tr><td colspan="7">Gagal memuat data anak.</td></tr>';
    });
}

function hapusData(id) {
  if (confirm("Apakah Anda yakin ingin menghapus data ini?")) {
    db.collection("tb_anak").doc(id).delete()
      .then(() => {
        alert("Data berhasil dihapus");
        loadDataAnak();
      })
      .catch((error) => {
        alert("Gagal menghapus data: " + error.message);
      });
  }
}
