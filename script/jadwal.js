try {
  const db = firebase.firestore();
  let jadwalData = [];

  // Tutup sidebar overlay dari dashboard
  function closeDashboardOverlay() {
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    if (sidebarOverlay) {
      sidebarOverlay.classList.remove('show');
      sidebarOverlay.style.display = 'none';
      sidebarOverlay.style.opacity = '0';
      console.log('Sidebar overlay ditutup, display: none, opacity: 0');
    } else {
      console.log('Elemen sidebarOverlay tidak ditemukan');
    }
  }

  // Bersihkan backdrop modal ganda
  function cleanupModalBackdrops() {
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach((backdrop, index) => {
      if (index > 0 || !document.querySelector('.modal.show')) {
        backdrop.remove();
        console.log('Backdrop modal dihapus');
      }
    });
    // Pastikan body tidak memiliki kelas modal-open
    document.body.classList.remove('modal-open');
    document.body.style.overflow = 'auto';
    console.log('Kelas modal-open dihapus dari body');
  }

  // Load Data Bidan
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
              <td><span class="badge ${data.status === 'Tersedia' ? 'bg-success' : 'bg-danger'}">${data.status || '-'}</span></td>
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

  // Hapus Data Bidan
  function hapusDataBidan(id) {
    if (confirm("Apakah Anda yakin ingin menghapus data bidan ini?")) {
      console.log("Menghapus dokumen bidan dengan ID:", id);
      db.collection("bidan").doc(id).delete()
        .then(() => {
          console.log("Dokumen bidan berhasil dihapus:", id);
          alert("Data bidan berhasil dihapus");
          loadDataBidan();
          loadBidanOptions();
        })
        .catch((error) => {
          console.error("Gagal menghapus data bidan:", error);
          alert("Gagal menghapus data bidan: " + error.message);
        });
    }
  }

  // Tambah Data Bidan
  document.getElementById('formTambahBidan')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Form tambah bidan disubmit');
    closeDashboardOverlay();
    cleanupModalBackdrops();
    const nama = document.getElementById('namaBidan').value.trim();
    const noHp = document.getElementById('noHpBidan').value.trim();
    const status = document.getElementById('statusBidan').value;

    if (!nama || !noHp || !status) {
      alert('Harap lengkapi semua field.');
      return;
    }

    const data = {
      nama,
      no_hp: noHp,
      status,
      created_at: firebase.firestore.Timestamp.now()
    };

    console.log('Menyimpan data bidan:', data);
    try {
      await db.collection('bidan').add(data);
      console.log('Data bidan berhasil disimpan');
      alert('Data bidan berhasil disimpan!');
      document.getElementById('formTambahBidan').reset();
      bootstrap.Modal.getInstance(document.getElementById('modalTambahBidan')).hide();
      loadDataBidan();
      loadBidanOptions();
    } catch (error) {
      console.error('Gagal menyimpan data bidan:', error);
      alert('Gagal menyimpan data: ' + error.message);
    }
  });

  // Load Data Jadwal Klinik
  function loadDataJadwalKlinik() {
    const tableBody = document.getElementById('tabelJadwalKlinik');
    if (!tableBody) {
      console.error("Elemen tabelJadwalKlinik tidak ditemukan.");
      return;
    }

    tableBody.innerHTML = '<tr><td colspan="4"><div class="spinner-border text-info" role="status"><span class="visually-hidden">Memuat...</span></div></td></tr>';

    console.log("Mengambil data dari koleksi 'jadwal_klinik'...");
    db.collection("jadwal_klinik").get()
      .then((querySnapshot) => {
        console.log("Jumlah dokumen jadwal klinik ditemukan:", querySnapshot.size);
        tableBody.innerHTML = "";
        if (querySnapshot.empty) {
          console.log("Tidak ada data di koleksi 'jadwal_klinik'.");
          tableBody.innerHTML = '<tr><td colspan="4">Tidak ada data jadwal klinik.</td></tr>';
          return;
        }
        querySnapshot.forEach((doc) => {
          console.log("Data dokumen jadwal klinik:", doc.id, doc.data());
          const data = doc.data();
          const formattedDate = data.tanggal_waktu ? new Date(data.tanggal_waktu.toDate()).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-';
          const row = `
            <tr>
              <td>${formattedDate}</td>
              <td>${data.klinik || '-'}</td>
              <td>${data.nama_bidan || '-'}</td>
              <td>
                <a href="edit-jadwal-klinik.html?id=${doc.id}" class="btn btn-warning btn-sm me-1"><i class="fas fa-edit"></i> Edit</a>
                <button class="btn btn-danger btn-sm" onclick="hapusDataJadwalKlinik('${doc.id}')"><i class="fas fa-trash"></i> Hapus</button>
              </td>
            </tr>
          `;
          tableBody.insertAdjacentHTML('beforeend', row);
        });
      })
      .catch((error) => {
        console.error("Gagal mengambil data jadwal klinik: ", error);
        tableBody.innerHTML = '<tr><td colspan="4">Gagal memuat data jadwal klinik: ' + error.message + '</td></tr>';
      });
  }

  // Hapus Data Jadwal Klinik
  function hapusDataJadwalKlinik(id) {
    if (confirm("Apakah Anda yakin ingin menghapus data jadwal klinik ini?")) {
      console.log("Menghapus dokumen jadwal klinik dengan ID:", id);
      db.collection("jadwal_klinik").doc(id).delete()
        .then(() => {
          console.log("Dokumen jadwal klinik berhasil dihapus:", id);
          alert("Data jadwal klinik berhasil dihapus");
          loadDataJadwalKlinik();
        })
        .catch((error) => {
          console.error("Gagal menghapus data jadwal klinik:", error);
          alert("Gagal menghapus data jadwal klinik: " + error.message);
        });
    }
  }

  // Load Opsi Nama Bidan (Hanya Aktif)
  function loadBidanOptions() {
    const selectBidan = document.getElementById('namaBidanKlinik');
    if (!selectBidan) {
      console.error("Elemen namaBidanKlinik tidak ditemukan.");
      return;
    }

    selectBidan.innerHTML = '<option value="">-- Pilih Bidan --</option>';

    console.log("Mengambil data bidan aktif...");
    db.collection("bidan").where("status", "==", "Tersedia").get()
      .then((querySnapshot) => {
        console.log("Jumlah bidan aktif ditemukan:", querySnapshot.size);
        if (querySnapshot.empty) {
          selectBidan.innerHTML += '<option value="" disabled>Tidak ada bidan aktif</option>';
        }
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const option = `<option value="${data.nama}">${data.nama}</option>`;
          selectBidan.insertAdjacentHTML('beforeend', option);
        });
      })
      .catch((error) => {
        console.error("Gagal mengambil data bidan aktif: ", error);
        selectBidan.innerHTML += '<option value="" disabled>Gagal memuat bidan</option>';
      });
  }

  // Tambah Data Jadwal Klinik
  document.getElementById('formTambahJadwalKlinik')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Form tambah jadwal klinik disubmit');
    closeDashboardOverlay();
    cleanupModalBackdrops();
    const tanggalWaktu = document.getElementById('tanggalWaktuKlinik').value;
    const klinik = document.getElementById('klinik').value.trim();
    const namaBidan = document.getElementById('namaBidanKlinik').value;

    if (!tanggalWaktu || !klinik || !namaBidan) {
      alert('Harap lengkapi semua field.');
      return;
    }

    const tanggalTimestamp = firebase.firestore.Timestamp.fromDate(new Date(tanggalWaktu));
    const data = {
      tanggal_waktu: tanggalTimestamp,
      klinik,
      nama_bidan: namaBidan,
      created_at: firebase.firestore.Timestamp.now()
    };

    console.log('Menyimpan data jadwal klinik:', data);
    try {
      await db.collection('jadwal_klinik').add(data);
      console.log('Data jadwal klinik berhasil disimpan');
      alert('Data jadwal klinik berhasil disimpan!');
      document.getElementById('formTambahJadwalKlinik').reset();
      bootstrap.Modal.getInstance(document.getElementById('modalTambahJadwalKlinik')).hide();
      loadDataJadwalKlinik();
    } catch (error) {
      console.error('Gagal menyimpan data jadwal klinik:', error);
      alert('Gagal menyimpan data: ' + error.message);
    }
  });

  // Load Data Jadwal Imunisasi
  function loadDataJadwalImunisasi() {
    const tableBody = document.getElementById('tabelJadwalImunisasi');
    if (!tableBody) {
      console.error("Elemen tabelJadwalImunisasi tidak ditemukan.");
      return;
    }

    tableBody.innerHTML = '<tr><td colspan="8"><div class="spinner-border text-success" role="status"><span class="visually-hidden">Memuat...</span></div></td></tr>';

    console.log("Mengambil data dari koleksi 'tambah_jadwal'...");
    db.collection("tambah_jadwal").get()
      .then((querySnapshot) => {
        console.log("Jumlah dokumen jadwal ditemukan:", querySnapshot.size);
        jadwalData = [];
        if (querySnapshot.empty) {
          console.log("Tidak ada data di koleksi 'tambah_jadwal'.");
          tableBody.innerHTML = '<tr><td colspan="8">Tidak ada data jadwal imunisasi.</td></tr>';
          return;
        }
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          data.id = doc.id;
          jadwalData.push(data);
        });
        filterDataJadwal();
      })
      .catch((error) => {
        console.error("Gagal mengambil data jadwal: ", error);
        tableBody.innerHTML = '<tr><td colspan="8">Gagal memuat data jadwal: ' + error.message + '</td></tr>';
      });
  }

  // Filter Data Jadwal Imunisasi
  function filterDataJadwal() {
    const tableBody = document.getElementById('tabelJadwalImunisasi');
    const filter = document.getElementById('filterJadwal').value;
    tableBody.innerHTML = '';

    const today = new Date(2025, 5, 21); // 21 Juni 2025
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
      filteredData = jadwalData;
    }

    if (filteredData.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="8">Tidak ada data untuk filter "${filter === 'hari-ini' ? 'Hari Ini' : filter === 'kemarin' ? 'Kemarin' : 'Bulan Ini'}"</td></tr>`;
      return;
    }

    filteredData.forEach(data => {
      console.log("Data dokumen jadwal:", data.id, data);
      const formattedDate = data.tanggal_waktu ? new Date(data.tanggal_waktu.toDate()).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-';
      const row = `
        <tr>
          <td>${data.nama || '-'}</td>
          <td>${data.jenis_kelamin || '-'}</td>
          <td>${data.dokter || '-'}</td>
          <td>${data.jenis_vaksin || '-'}</td>
          <td>${data.kode_vaksin || '-'}</td>
          <td>${data.keluhan || '-'}</td>
          <td>${data.klinik || '-'}</td>
          <td>${formattedDate}</td>
        </tr>
      `;
      tableBody.insertAdjacentHTML('beforeend', row);
    });
  }

  // Inisialisasi saat halaman dimuat
  document.addEventListener('DOMContentLoaded', () => {
    console.log('Halaman jadwal dimuat');
    closeDashboardOverlay();
    cleanupModalBackdrops();
    // Pastikan modal aktif
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('shown.bs.modal', () => {
        console.log('Modal ditampilkan:', modal.id);
        closeDashboardOverlay();
        cleanupModalBackdrops();
      });
      modal.addEventListener('hidden.bs.modal', () => {
        console.log('Modal ditutup:', modal.id);
        cleanupModalBackdrops();
      });
    });
  });

  // Event listener untuk tombol modal
  document.querySelectorAll('[data-bs-toggle="modal"]').forEach(button => {
    button.addEventListener('click', () => {
      console.log('Tombol modal diklik:', button.getAttribute('data-bs-target'));
      closeDashboardOverlay();
      cleanupModalBackdrops();
    });
  });

  // Panggil fungsi saat halaman dimuat
  loadDataBidan();
  loadDataJadwalKlinik();
  loadBidanOptions();
  loadDataJadwalImunisasi();
} catch (error) {
  console.error("Gagal menginisialisasi Firestore:", error);
  const tabelBidan = document.getElementById('tabelBidan');
  const tabelJadwalKlinik = document.getElementById('tabelJadwalKlinik');
  const tabelJadwal = document.getElementById('tabelJadwalImunisasi');
  if (tabelBidan) tabelBidan.innerHTML = '<tr><td colspan="4">Gagal menginisialisasi Firestore: ' + error.message + '</td></tr>';
  if (tabelJadwalKlinik) tabelJadwalKlinik.innerHTML = '<tr><td colspan="4">Gagal menginisialisasi Firestore: ' + error.message + '</td></tr>';
  if (tabelJadwal) tabelJadwal.innerHTML = '<tr><td colspan="8">Gagal menginisialisasi Firestore: ' + error.message + '</td></tr>';
}