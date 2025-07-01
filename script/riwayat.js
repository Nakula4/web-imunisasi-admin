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
            <a href="edit-laporan.html?id=${data.id}" class="btn btn-sm btn-warning me-1">
              <i class="fas fa-edit"></i> Ubah
            </a>
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

// Fungsi untuk menghapus data riwayat
function hapusDataRiwayat(id) {
  showPopup(
    'Konfirmasi Hapus',
    'Apakah Anda yakin ingin menghapus data riwayat ini?',
    'warning',
    {
      okCallback: async () => {
        try {
          const db = firebase.firestore();
          console.log("Menghapus dokumen laporan dengan ID:", id);
          await db.collection("laporan").doc(id).delete();
          showPopup('Berhasil', 'Data riwayat berhasil dihapus', 'success');
          loadDataRiwayat();
        } catch (error) {
          console.error("Gagal menghapus data riwayat:", error);
          showPopup('Error', 'Gagal menghapus data riwayat: ' + error.message, 'error');
        }
      },
    }
  );
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
      const searchInput = document.getElementById('searchInput');
      if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            loadDataRiwayat(searchInput.value.trim(), 1);
          }, 300);
        });
      } else {
        console.error("Elemen searchInput tidak ditemukan.");
      }
    } else {
      console.log('Pengguna belum login, mengarahkan ke index.html');
      showPopup(
        'Diperlukan Login',
        'Silakan login terlebih dahulu untuk mengakses riwayat imunisasi!',
        'warning',
        {
          okCallback: () => {
            window.location.href = 'index.html?redirected=true';
          },
        }
      );
    }
  });
}

// Ekspor fungsi untuk dipanggil dari dashboard
window.loadDataRiwayat = loadDataRiwayat;

// Inisialisasi halaman
window.addEventListener('load', initializeRiwayat);