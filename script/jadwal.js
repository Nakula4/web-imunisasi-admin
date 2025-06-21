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
                <button class="btn btn-warning btn-sm me-1" onclick="editDataBidan('${doc.id}')" data-bs-toggle="modal" data-bs-target="#modalEditBidan"><i class="fas fa-edit"></i> Edit</button>
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

  // Edit Data Bidan
  function editDataBidan(id) {
    console.log('Mengambil data bidan untuk edit, ID:', id);
    db.collection("bidan").doc(id).get()
      .then((doc) => {
        if (doc.exists) {
          const data = doc.data();
          console.log('Data bidan untuk edit:', data);
          document.getElementById('editBidanId').value = id;
          document.getElementById('editNamaBidan').value = data.nama || '';
          document.getElementById('editNoHpBidan').value = data.no_hp || '';
          document.getElementById('editStatusBidan').value = data.status || '';
          closeDashboardOverlay();
          cleanupModalBackdrops();
        } else {
          console.error('Dokumen bidan tidak ditemukan:', id);
          alert('Data bidan tidak ditemukan.');
        }
      })
      .catch((error) => {
        console.error('Gagal mengambil data bidan untuk edit:', error);
        alert('Gagal mengambil data bidan: ' + error.message);
      });
  }

  // Simpan Perubahan Data Bidan
  document.getElementById('formEditBidan')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Form edit bidan disubmit');
    closeDashboardOverlay();
    cleanupModalBackdrops();
    const id = document.getElementById('editBidanId').value;
    const nama = document.getElementById('editNamaBidan').value.trim();
    const noHp = document.getElementById('editNoHpBidan').value.trim();
    const status = document.getElementById('editStatusBidan').value;

    if (!id || !nama || !noHp || !status) {
      alert('Harap lengkapi semua field.');
      return;
    }

    const data = {
      nama,
      no_hp: noHp,
      status,
      updated_at: firebase.firestore.Timestamp.now()
    };

    console.log('Menyimpan perubahan data bidan:', data);
    try {
      await db.collection('bidan').doc(id).update(data);
      console.log('Data bidan berhasil diperbarui, ID:', id);
      alert('Data bidan berhasil diperbarui!');
      document.getElementById('formEditBidan').reset();
      bootstrap.Modal.getInstance(document.getElementById('modalEditBidan')).hide();
      loadDataBidan();
      loadBidanOptions();
    } catch (error) {
      console.error('Gagal menyimpan perubahan data bidan:', error);
      alert('Gagal menyimpan perubahan: ' + error.message);
    }
  });

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
                <button class="btn btn-warning btn-sm me-1" onclick="editDataJadwalKlinik('${doc.id}')" data-bs-toggle="modal" data-bs-target="#modalEditJadwalKlinik"><i class="fas fa-edit"></i> Edit</button>
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

  // Edit Data Jadwal Klinik
  function editDataJadwalKlinik(id) {
    console.log('Mengambil data jadwal klinik untuk edit, ID:', id);
    db.collection("jadwal_klinik").doc(id).get()
      .then((doc) => {
        if (doc.exists) {
          const data = doc.data();
          console.log('Data jadwal klinik untuk edit:', data);
          document.getElementById('editJadwalKlinikId').value = id;
          document.getElementById('editTanggalWaktuKlinik').value = data.tanggal_waktu ? data.tanggal_waktu.toDate().toISOString().slice(0, 16) : '';
          document.getElementById('editKlinik').value = data.klinik || '';
          document.getElementById('editNamaBidanKlinik').value = data.nama_bidan || '';
          loadBidanOptionsForEdit();
          closeDashboardOverlay();
          cleanupModalBackdrops();
        } else {
          console.error('Dokumen jadwal klinik tidak ditemukan:', id);
          alert('Data jadwal klinik tidak ditemukan.');
        }
      })
      .catch((error) => {
        console.error('Gagal mengambil data jadwal klinik untuk edit:', error);
        alert('Gagal mengambil data jadwal klinik: ' + error.message);
      });
  }

  // Simpan Perubahan Jadwal Klinik
  document.getElementById('formEditJadwalKlinik')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Form edit jadwal klinik disubmit');
    closeDashboardOverlay();
    cleanupModalBackdrops();
    const id = document.getElementById('editJadwalKlinikId').value;
    const tanggalWaktu = document.getElementById('editTanggalWaktuKlinik').value;
    const klinik = document.getElementById('editKlinik').value.trim();
    const namaBidan = document.getElementById('editNamaBidanKlinik').value;

    if (!id || !tanggalWaktu || !klinik || !namaBidan) {
      alert('Harap lengkapi semua field.');
      return;
    }

    const tanggalTimestamp = firebase.firestore.Timestamp.fromDate(new Date(tanggalWaktu));
    const data = {
      tanggal_waktu: tanggalTimestamp,
      klinik,
      nama_bidan: namaBidan,
      updated_at: firebase.firestore.Timestamp.now()
    };

    console.log('Menyimpan perubahan data jadwal klinik:', data);
    try {
      await db.collection('jadwal_klinik').doc(id).update(data);
      console.log('Data jadwal klinik berhasil diperbarui, ID:', id);
      alert('Data jadwal klinik berhasil diperbarui!');
      document.getElementById('formEditJadwalKlinik').reset();
      bootstrap.Modal.getInstance(document.getElementById('modalEditJadwalKlinik')).hide();
      loadDataJadwalKlinik();
    } catch (error) {
      console.error('Gagal menyimpan perubahan data jadwal klinik:', error);
      alert('Gagal menyimpan perubahan: ' + error.message);
    }
  });

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

    console.log("Mengambil data bidan tersedia...");
    db.collection("bidan").where("status", "==", "Tersedia").get()
      .then((querySnapshot) => {
        console.log("Jumlah bidan Tersedia ditemukan:", querySnapshot.size);
        if (querySnapshot.empty) {
          selectBidan.innerHTML += '<option value="" disabled>Tidak ada bidan Tersedia</option>';
        }
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const option = `<option value="${data.nama}">${data.nama}</option>`;
          selectBidan.insertAdjacentHTML('beforeend', option);
        });
      })
      .catch((error) => {
        console.error("Gagal mengambil data bidan Terseida: ", error);
        selectBidan.innerHTML += '<option value="" disabled>Gagal memuat bidan</option>';
      });
  }

  // Load Opsi Nama Bidan untuk Edit Jadwal Klinik
  function loadBidanOptionsForEdit() {
    const selectBidan = document.getElementById('editNamaBidanKlinik');
    if (!selectBidan) {
      console.error("Elemen editNamaBidanKlinik tidak ditemukan.");
      return;
    }

    selectBidan.innerHTML = '<option value="">-- Pilih Bidan --</option>';

    console.log("Mengambil data bidan Tersedia untuk edit...");
    db.collection("bidan").where("status", "==", "Tersedia").get()
      .then((querySnapshot) => {
        console.log("Jumlah bidan Tersedia ditemukan untuk edit:", querySnapshot.size);
        if (querySnapshot.empty) {
          selectBidan.innerHTML += '<option value="" disabled>Tidak ada bidan Tersedia</option>';
        }
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const option = `<option value="${data.nama}">${data.nama}</option>`;
          selectBidan.insertAdjacentHTML('beforeend', option);
        });
      })
      .catch((error) => {
        console.error("Gagal mengambil data bidan Tersedia untuk edit: ", error);
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

    const today = new Date(); // Gunakan tanggal saat ini untuk produksi
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
          <td>${data.bidan || '-'}</td>
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