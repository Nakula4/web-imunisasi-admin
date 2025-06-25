try {
  const db = firebase.firestore();

  function loadDataRiwayat() {
    const tableBody = document.getElementById('tabelRiwayat');
    if (!tableBody) {
      console.error("Elemen tabelRiwayat tidak ditemukan.");
      return;
    }

    tableBody.innerHTML = '<tr><td colspan="11"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Memuat...</span></div></td></tr>';

    console.log("Mengambil data dari koleksi 'laporan'...");
    db.collection("laporan")
      .orderBy('tanggal_pemeriksaan', 'desc')
      .get()
      .then((querySnapshot) => {
        console.log("Jumlah dokumen laporan ditemukan:", querySnapshot.size);
        tableBody.innerHTML = "";
        if (querySnapshot.empty) {
          console.log("Tidak ada data di koleksi 'laporan'.");
          tableBody.innerHTML = '<tr><td colspan="11">Tidak ada data riwayat imunisasi.</td></tr>';
          return;
        }
        querySnapshot.forEach((doc) => {
          console.log("Data dokumen laporan:", doc.id, doc.data());
          const data = doc.data();
          const formattedDate = data.tanggal_pemeriksaan ? new Date(data.tanggal_pemeriksaan.toDate()).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-';
          const row = `
            <tr>
              <td>${data.nama_anak || '-'}</td>
              <td>${data.nama_ortu || '-'}</td>
              <td>${data.usia_anak || '-'}</td>
              <td>${data.berat_badan || '-'}</td>
              <td>${data.tinggi_badan || '-'}</td>
              <td><span class="badge bg-info">${data.jenis_imunisasi || '-'}</span></td>
              <td>${data.kode_vaksin || '-'}</td>
              <td>${data.catatan || '-'}</td>
              <td>${formattedDate}</td>
              <td>
                <a href="edit-laporan.html?id=${doc.id}" class="btn btn-warning btn-sm me-1"><i class="fas fa-edit"></i> Ubah</a>
                <button class="btn btn-danger btn-sm" onclick="hapusDataRiwayat('${doc.id}')"><i class="fas fa-trash"></i> Hapus</button>
              </td>
            </tr>
          `;
          tableBody.insertAdjacentHTML('beforeend', row);
        });
      })
      .catch((error) => {
        console.error("Gagal mengambil data laporan: ", error);
        tableBody.innerHTML = '<tr><td colspan="11">Gagal memuat data riwayat: ' + error.message + '</td></tr>';
      });
  }

  function hapusDataRiwayat(id) {
    if (confirm("Apakah Anda yakin ingin menghapus data riwayat ini?")) {
      console.log("Menghapus dokumen laporan dengan ID:", id);
      db.collection("laporan").doc(id).delete()
        .then(() => {
          console.log("Dokumen laporan berhasil dihapus:", id);
          alert("Data riwayat berhasil dihapus");
          loadDataRiwayat();
        })
        .catch((error) => {
          console.error("Gagal menghapus data riwayat:", error);
          alert("Gagal menghapus data riwayat: " + error.message);
        });
    }
  }

  // Ekspor fungsi untuk dipanggil dari dashboard
  window.loadDataRiwayat = loadDataRiwayat;

  // Panggil fungsi saat halaman dimuat
  document.addEventListener('DOMContentLoaded', loadDataRiwayat);
} catch (error) {
  console.error("Gagal menginisialisasi Firestore:", error);
  const tabelRiwayat = document.getElementById('tabelRiwayat');
  if (tabelRiwayat) tabelRiwayat.innerHTML = '<tr><td colspan="11">Gagal menginisialisasi Firestore: ' + error.message + '</td></tr>';
}