import { showPopup } from './popupUtils.js';

// Fungsi untuk menunggu Firebase siap
function waitForFirebase() {
  return new Promise((resolve) => {
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
      resolve();
    } else {
      const checkFirebase = () => {
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
          resolve();
        } else {
          setTimeout(checkFirebase, 100);
        }
      };
      checkFirebase();
    }
  });
}

// Fungsi untuk menampilkan spinner
function showLoadingSpinner() {
  const tableBody = document.getElementById('tabelRiwayat');
  const loadingSpinner = document.getElementById('loadingSpinner');
  if (tableBody) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="10">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Memuat...</span>
          </div>
        </td>
      </tr>
    `;
  }
  if (loadingSpinner) loadingSpinner.style.display = 'none';
}

// Fungsi untuk menampilkan pesan error
function showError(message) {
  const errorMessage = document.getElementById('errorMessage');
  const tableBody = document.getElementById('tabelRiwayat');
  if (errorMessage) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
  }
  if (tableBody) tableBody.innerHTML = '';
  if (document.getElementById('loadingSpinner')) {
    document.getElementById('loadingSpinner').style.display = 'none';
  }
}

// Fungsi untuk memuat data riwayat dari Firestore
async function loadDataRiwayat(searchQuery = '', page = 1) {
  try {
    await waitForFirebase();
    const db = firebase.firestore();
    const tableBody = document.getElementById('tabelRiwayat');
    const paginationContainer = document.getElementById('pagination');

    if (!tableBody) {
      console.error("Elemen tabelRiwayat tidak ditemukan.");
      return;
    }

    showLoadingSpinner();

    console.log("Mengambil data dari koleksi 'laporan'...");
    const querySnapshot = await db.collection("laporan")
      .orderBy('tanggal_pemeriksaan', 'desc')
      .get();
    
    console.log("Jumlah dokumen laporan ditemukan:", querySnapshot.size);
    tableBody.innerHTML = '';

    let riwayatData = [];
    querySnapshot.forEach((doc) => {
      riwayatData.push({ id: doc.id, ...doc.data() });
    });

    // Filter berdasarkan nama anak (case-insensitive)
    if (searchQuery) {
      riwayatData = riwayatData.filter(data =>
        data.nama_anak?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Pagination
    const itemsPerPage = 10;
    const totalPages = Math.ceil(riwayatData.length / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const paginatedData = riwayatData.slice(startIndex, startIndex + itemsPerPage);

    if (paginatedData.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="10">Tidak ada data riwayat imunisasi.</td></tr>';
      if (paginationContainer) paginationContainer.innerHTML = '';
      return;
    }

    paginatedData.forEach((data) => {
      const formattedDate = data.tanggal_pemeriksaan
        ? new Date(data.tanggal_pemeriksaan.toDate()).toLocaleDateString('id-ID', { dateStyle: 'medium' })
        : '-';
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
          <td class="table-actions">
            <button class="btn btn-sm btn-warning me-1" onclick="openEditModal('${data.id}')">
              <i class="fas fa-edit"></i> Ubah
            </button>
            <button class="btn btn-sm btn-danger" onclick="hapusDataRiwayat('${data.id}')">
              <i class="fas fa-trash"></i> Hapus
            </button>
          </td>
        </tr>
      `;
      tableBody.insertAdjacentHTML('beforeend', row);
    });

    // Render pagination
    if (paginationContainer) {
      paginationContainer.innerHTML = '';
      for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === page ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
        li.addEventListener('click', (e) => {
          e.preventDefault();
          loadDataRiwayat(searchQuery, i);
        });
        paginationContainer.appendChild(li);
      }
    }

    document.getElementById('loadingSpinner').style.display = 'none';
  } catch (error) {
    console.error("Gagal mengambil data laporan:", error);
    showError('Gagal memuat data riwayat: ' + error.message);
  }
}

// Fungsi untuk membuka modal edit
async function openEditModal(id) {
  try {
    await waitForFirebase();
    const db = firebase.firestore();
    
    // Ambil data dari Firestore
    const doc = await db.collection("laporan").doc(id).get();
    if (!doc.exists) {
      showPopup('Error', 'Data tidak ditemukan', 'error');
      return;
    }
    
    const data = doc.data();
    
    // Isi form dengan data yang ada
    document.getElementById('editRiwayatId').value = id;
    document.getElementById('editNamaAnak').value = data.nama_anak || '';
    document.getElementById('editNamaOrtu').value = data.nama_ortu || '';
    document.getElementById('editUsiaAnak').value = data.usia_anak || '';
    document.getElementById('editBeratBadan').value = data.berat_badan || '';
    document.getElementById('editTinggiBadan').value = data.tinggi_badan || '';
    document.getElementById('editJenisImunisasi').value = data.jenis_imunisasi || '';
    document.getElementById('editKodeVaksin').value = data.kode_vaksin || '';
    document.getElementById('editCatatan').value = data.catatan || '';
    
    // Format tanggal untuk input date
    if (data.tanggal_pemeriksaan) {
      const date = data.tanggal_pemeriksaan.toDate();
      const formattedDate = date.toISOString().split('T')[0];
      document.getElementById('editTanggalPemeriksaan').value = formattedDate;
    }
    
    // Reinisialisasi event listener setiap kali modal dibuka
    reinitializeModalListeners();
    
    // Tampilkan modal
    const modal = new bootstrap.Modal(document.getElementById('editRiwayatModal'));
    modal.show();
    
  } catch (error) {
    console.error("Error loading data for edit:", error);
    showPopup('Error', 'Gagal memuat data: ' + error.message, 'error');
  }
}

// Fungsi untuk menyimpan perubahan data riwayat
async function saveEditRiwayat(event) {
  event.preventDefault();
  
  try {
    await waitForFirebase();
    const db = firebase.firestore();
    
    // Ambil data dari form
    const id = document.getElementById('editRiwayatId').value;
    const namaAnak = document.getElementById('editNamaAnak').value.trim();
    const namaOrtu = document.getElementById('editNamaOrtu').value.trim();
    const usiaAnak = parseInt(document.getElementById('editUsiaAnak').value);
    const beratBadan = parseFloat(document.getElementById('editBeratBadan').value);
    const tinggiBadan = parseFloat(document.getElementById('editTinggiBadan').value);
    const jenisImunisasi = document.getElementById('editJenisImunisasi').value;
    const kodeVaksin = document.getElementById('editKodeVaksin').value.trim();
    const catatan = document.getElementById('editCatatan').value.trim();
    const tanggalPemeriksaan = document.getElementById('editTanggalPemeriksaan').value;
    
    console.log('Data yang akan disimpan:', {
      id, namaAnak, namaOrtu, usiaAnak, beratBadan, tinggiBadan,
      jenisImunisasi, kodeVaksin, catatan, tanggalPemeriksaan
    });
    
    // Validasi
    if (!namaAnak || !namaOrtu || isNaN(usiaAnak) || isNaN(beratBadan) || isNaN(tinggiBadan) ||
        !jenisImunisasi || !kodeVaksin || !tanggalPemeriksaan) {
      showPopup('Validasi Error', 'Semua field yang bertanda * harus diisi dengan benar', 'warning');
      return;
    }
    
    if (usiaAnak < 0 || usiaAnak > 60) {
      showPopup('Validasi Error', 'Usia anak harus antara 0-60 bulan', 'warning');
      return;
    }
    
    if (beratBadan <= 0 || tinggiBadan <= 0) {
      showPopup('Validasi Error', 'Berat dan tinggi badan harus lebih dari 0', 'warning');
      return;
    }
    
    // Siapkan data untuk update
    const updateData = {
      nama_anak: namaAnak,
      nama_ortu: namaOrtu,
      usia_anak: usiaAnak,
      berat_badan: beratBadan,
      tinggi_badan: tinggiBadan,
      jenis_imunisasi: jenisImunisasi,
      kode_vaksin: kodeVaksin,
      catatan: catatan,
      tanggal_pemeriksaan: firebase.firestore.Timestamp.fromDate(new Date(tanggalPemeriksaan)),
      updated_at: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    console.log('Memperbarui dokumen dengan ID:', id);
    console.log('Data update:', updateData);
    
    // Update data di Firestore
    await db.collection("laporan").doc(id).update(updateData);
    
    console.log('Data berhasil diperbarui di Firestore');
    
    // Tutup modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('editRiwayatModal'));
    if (modal) {
      modal.hide();
    }
    
    // Tampilkan pesan sukses dan reload data
    showPopup('Berhasil', 'Data riwayat berhasil diperbarui', 'success');
    
    // Reload data setelah delay singkat untuk memastikan Firestore sudah update
    setTimeout(() => {
      loadDataRiwayat();
    }, 500);
    
  } catch (error) {
    console.error("Error updating data:", error);
    showPopup('Error', 'Gagal memperbarui data: ' + error.message, 'error');
  }
}

// Fungsi untuk menghapus data riwayat
function hapusDataRiwayat(id) {
  if (confirm('Apakah Anda yakin ingin menghapus data riwayat ini?')) {
    firebase.firestore().collection("laporan").doc(id).delete()
      .then(() => {
        showPopup('Berhasil', 'Data riwayat berhasil dihapus', 'success');
        loadDataRiwayat();
      })
      .catch((error) => {
        console.error("Gagal menghapus data riwayat:", error);
        showPopup('Error', 'Gagal menghapus data riwayat: ' + error.message, 'error');
      });
  }
}

// Fungsi untuk menginisialisasi halaman
function initializeRiwayat() {
  console.log('Menginisialisasi riwayat...');
  showLoadingSpinner();

  const auth = firebase.auth();
  auth.onAuthStateChanged((user) => {
    if (user) {
      console.log('User logged in:', user.email);
      loadDataRiwayat();

      // Tambahkan event listener untuk pencarian
      setupSearchListener();
      
      // Tambahkan event listener untuk form edit
      setupFormListener();
      
    } else {
      console.log('Pengguna belum login, mengarahkan ke index.html');
      if (confirm('Silakan login terlebih dahulu untuk mengakses riwayat imunisasi!')) {
        window.location.href = 'index.html?redirected=true';
      }
    }
  });
}

// Fungsi terpisah untuk setup search listener
function setupSearchListener() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadDataRiwayat(searchInput.value.trim(), 1);
      }, 300);
    });
    console.log('Event listener untuk pencarian berhasil ditambahkan');
  } else {
    console.error("Elemen searchInput tidak ditemukan.");
  }
}

// Fungsi terpisah untuk setup form listener
function setupFormListener() {
  // Gunakan setTimeout untuk memastikan DOM sudah siap
  setTimeout(() => {
    const editForm = document.getElementById('editRiwayatForm');
    if (editForm) {
      // Hapus event listener lama jika ada
      editForm.removeEventListener('submit', saveEditRiwayat);
      // Tambahkan event listener baru
      editForm.addEventListener('submit', saveEditRiwayat);
      console.log('Event listener untuk form edit berhasil ditambahkan');
    } else {
      console.error("Elemen editRiwayatForm tidak ditemukan.");
    }

    // Tambahkan event listener untuk tombol simpan sebagai backup
    const saveButton = document.getElementById('saveEditButton');
    if (saveButton) {
      saveButton.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Tombol simpan diklik');
        const form = document.getElementById('editRiwayatForm');
        if (form) {
          // Langsung panggil fungsi saveEditRiwayat
          const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
          saveEditRiwayat(submitEvent);
        }
      });
      console.log('Event listener untuk tombol simpan berhasil ditambahkan');
    } else {
      console.error("Elemen saveEditButton tidak ditemukan.");
    }
  }, 100);
}

// Fungsi untuk reinisialisasi event listener ketika modal dibuka
function reinitializeModalListeners() {
  console.log('Reinisialisasi event listener modal...');
  setupFormListener();
}

// Fungsi khusus untuk inisialisasi di dashboard
function initializeRiwayatForDashboard() {
  console.log('Menginisialisasi riwayat untuk dashboard...');
  
  waitForFirebase().then(() => {
    const auth = firebase.auth();
    const user = auth.currentUser;
    
    if (user) {
      console.log('User sudah login di dashboard:', user.email);
      loadDataRiwayat();
      
      // Setup event listeners
      setupSearchListener();
      setupFormListener();
    } else {
      console.log('User belum login di dashboard');
      // Jangan redirect karena sudah di dashboard
    }
  }).catch(error => {
    console.error('Error inisialisasi riwayat di dashboard:', error);
  });
}

// Ekspor fungsi untuk dipanggil dari dashboard
window.loadDataRiwayat = loadDataRiwayat;
window.openEditModal = openEditModal;
window.hapusDataRiwayat = hapusDataRiwayat;
window.initializeRiwayatForDashboard = initializeRiwayatForDashboard;

// Inisialisasi halaman (hanya untuk standalone riwayat.html)
if (window.location.pathname.includes('riwayat.html')) {
  window.addEventListener('load', initializeRiwayat);
} else {
  // Jika dimuat di dashboard, tunggu sampai DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeRiwayatForDashboard);
  } else {
    initializeRiwayatForDashboard();
  }
}