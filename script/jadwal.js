try {
  const db = firebase.firestore();
  let jadwalData = []; // Menyimpan semua data jadwal untuk filtering

  function loadDataBidan() {
    const tableBody = document.getElementById('tabelBidan');
    if (!tableBody) {
      console.error("Elemen tabelBidan tidak ditemukan.");
      return;
    }

    tableBody.innerHTML = '<tr><td colspan="4"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Memuat...</span></div></td></tr>';

    console.log("Mengambil data dari koleksi 'bidan'...");
    db.collection("bidan").get()
      .then((querySnapshot) => {
        console.log("Jumlah dokumen bidan ditemukan:", querySnapshot.size);
        tableBody.innerHTML = "";
        if (querySnapshot.empty) {
          console.log("Tidak ada data di koleksi 'bidan'.");
          tableBody.innerHTML = '<tr><td colspan="4">Tidak ada data bidan.</td></tr>';
          return;
        }
        querySnapshot.forEach((doc) => {
          console.log("Data dokumen bidan:", doc.id, doc.data());
          const data = doc.data();
          const row = `
            <tr>
              <td>${data.nama || '-'}</td>
              <td>${data.no_hp || '-'}</td>
              <td><span class="badge ${data.status === 'Aktif' ? 'bg-danger' : 'bg-success'}">${data.status || '-'}</span></td>
              <td>
                <a href="edit-bidan.html?id=${doc.id}" class="btn btn-warning btn-sm me-1"><i class="fas fa-edit"></i> Edit</a>
                <button class="btn btn-danger btn-sm" onclick="hapusDataBidan('${doc.id}')"><i class="fas fa-trash"></i> Hapus</button>
              </td>
            </tr>
          `;
          tableBody.insertAdjacentHTML('beforeend', row);
        });
      })
      .catch((error) => {
        console.error("Gagal mengambil data bidan: ", error);
        tableBody.innerHTML = '<tr><td colspan="4">Gagal memuat data bidan: ' + error.message + '</td></tr>';
      });
  }

  function hapusDataBidan(id) {
    if (confirm("Apakah Anda yakin ingin menghapus data bidan ini?")) {
      console.log("Menghapus dokumen bidan dengan ID:", id);
      db.collection("bidan").doc(id).delete()
        .then(() => {
          console.log("Dokumen bidan berhasil dihapus:", id);
          alert("Data bidan berhasil dihapus");
          loadDataBidan();
        })
        .catch((error) => {
          console.error("Gagal menghapus data bidan:", error);
          alert("Gagal menghapus data bidan: " + error.message);
        });
    }
  }

  function loadDataJadwalImunisasi() {
    const tableBody = document.getElementById('tabelJadwalImunisasi');
    if (!tableBody) {
      console.error("Elemen tabelJadwalImunisasi tidak ditemukan.");
      return;
    }

    tableBody.innerHTML = '<tr><td colspan="7"><div class="spinner-border text-success" role="status"><span class="visually-hidden">Memuat...</span></div></td></tr>';

    console.log("Mengambil data dari koleksi 'tambah_jadwal'...");
    db.collection("tambah_jadwal").get()
      .then((querySnapshot) => {
        console.log("Jumlah dokumen jadwal ditemukan:", querySnapshot.size);
        jadwalData = []; // Reset data
        if (querySnapshot.empty) {
          console.log("Tidak ada data di koleksi 'tambah_jadwal'.");
          tableBody.innerHTML = '<tr><td colspan="7">Tidak ada data jadwal imunisasi.</td></tr>';
          return;
        }
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          data.id = doc.id; // Simpan ID dokumen
          jadwalData.push(data);
        });
        filterDataJadwal(); // Tampilkan data sesuai filter saat ini
      })
      .catch((error) => {
        console.error("Gagal mengambil data jadwal: ", error);
        tableBody.innerHTML = '<tr><td colspan="7">Gagal memuat data jadwal: ' + error.message + '</td></tr>';
      });
  }

  function filterDataJadwal() {
    const tableBody = document.getElementById('tabelJadwalImunisasi');
    const filter = document.getElementById('filterJadwal').value;
    tableBody.innerHTML = '';

    // Tanggal saat ini (20 Juni 2025)
    const today = new Date(2025, 5, 20); // Bulan di JavaScript dimulai dari 0
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    let filteredData = [];
    if (filter === 'hari-ini') {
      filteredData = jadwalData.filter(data => {
        if (!data.tanggal_waktu) return false;
        const date = data.tanggal_waktu.toDate();
        return date.toDateString() === today.toDateString();
      });
    } else if (filter === 'kemarin') {
      filteredData = jadwalData.filter(data => {
        if (!data.tanggal_waktu) return false;
        const date = data.tanggal_waktu.toDate();
        return date.toDateString() === yesterday.toDateString();
      });
    } else if (filter === 'bulan-ini') {
      filteredData = jadwalData.filter(data => {
        if (!data.tanggal_waktu) return false;
        const date = data.tanggal_waktu.toDate();
        return date >= startOfMonth && date <= endOfMonth;
      });
    } else {
      filteredData = jadwalData; // Semua data
    }

    if (filteredData.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7">Tidak ada data untuk filter "${filter === 'hari-ini' ? 'Hari Ini' : filter === 'kemarin' ? 'Kemarin' : 'Bulan Ini'}"</td></tr>`;
      return;
    }

    filteredData.forEach(data => {
      console.log("Data dokumen jadwal:", data.id, data);
      const formattedDate = data.tanggal_waktu ? new Date(data.tanggal_waktu.toDate()).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-';
      const row = `
        <tr>
          <td>${data.nama || '-'}</td>
          <td>${data.jenis_kelamin || '-'}</td>
          <td>${data.bidan || '-'}</td>
          <td>${data.jenis_vaksin || '-'}</td>
          <td>${data.keluhan || '-'}</td>
          <td>${data.klinik || '-'}</td>
          <td>${formattedDate}</td>
        </tr>
      `;
      tableBody.insertAdjacentHTML('beforeend', row);
    });
  }

  // Panggil kedua fungsi saat halaman dimuat
  loadDataBidan();
  loadDataJadwalImunisasi();
} catch (error) {
  console.error("Gagal menginisialisasi Firestore:", error);
  const tabelBidan = document.getElementById('tabelBidan');
  const tabelJadwal = document.getElementById('tabelJadwalImunisasi');
  if (tabelBidan) tabelBidan.innerHTML = '<tr><td colspan="4">Gagal menginisialisasi Firestore: ' + error.message + '</td></tr>';
  if (tabelJadwal) tabelJadwal.innerHTML = '<tr><td colspan="7">Gagal menginisialisasi Firestore: ' + error.message + '</td></tr>';
}