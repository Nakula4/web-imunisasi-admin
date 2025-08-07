try {
  const db = firebase.firestore();
  let chartInstance = null;

  // Tutup sidebar overlay dari dashboard
  function closeDashboardOverlay() {
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    if (sidebarOverlay) {
      sidebarOverlay.classList.remove('show');
      sidebarOverlay.style.display = 'none';
      sidebarOverlay.style.opacity = '0';
      console.log('Sidebar overlay ditutup dari laporan.js, display: none, opacity: 0');
    } else {
      console.log('Elemen sidebarOverlay tidak ditemukan di laporan.js');
    }
  }

  // Bersihkan backdrop modal ganda
  function cleanupModalBackdrops() {
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach((backdrop) => {
      backdrop.remove();
      console.log('Backdrop modal dihapus dari laporan.js');
    });
    document.body.classList.remove('modal-open');
    document.body.style.overflow = 'auto';
    console.log('Kelas modal-open dihapus dari body di laporan.js');
  }

  // Load Data Laporan
  function loadDataLaporan(filter = 'semuanya') {
    // Pengecekan elemen UI dengan retry untuk pemuatan dinamis
    const maxRetries = 5;
    let retryCount = 0;

    function tryLoadData() {
      const tabelBody = document.getElementById('tabelLaporan');
      const totalImunisasiEl = document.getElementById('totalImunisasiLaporan');
      const bulanIniEl = document.getElementById('bulanIni');
      const keluhanTercatatEl = document.getElementById('keluhanTercatat');
      const filterLaporan = document.getElementById('filterLaporan');

      if (!tabelBody || !totalImunisasiEl || !bulanIniEl || !keluhanTercatatEl || !filterLaporan) {
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`Elemen UI belum ditemukan, mencoba ulang (${retryCount}/${maxRetries})...`);
          setTimeout(tryLoadData, 500);
          return;
        } else {
          console.error('Elemen UI tidak ditemukan setelah maksimum retry:', { tabelBody, totalImunisasiEl, bulanIniEl, keluhanTercatatEl, filterLaporan });
          return;
        }
      }

      tabelBody.innerHTML = '<tr><td colspan="3"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Memuat...</span></div></td></tr>';
      totalImunisasiEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memuat...';
      bulanIniEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memuat...';
      keluhanTercatatEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memuat...';

      console.log(`Mengambil data dari koleksi 'laporan' dengan filter: ${filter}...`);
      let query = db.collection('laporan').orderBy('tanggal_pemeriksaan', 'asc');

      // Filter berdasarkan pilihan
      const currentDate = new Date(); // Tanggal saat ini
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

      if (filter === 'hari-ini') {
        const startOfDay = new Date(currentDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(currentDate);
        endOfDay.setHours(23, 59, 59, 999);
        query = query
          .where('tanggal_pemeriksaan', '>=', firebase.firestore.Timestamp.fromDate(startOfDay))
          .where('tanggal_pemeriksaan', '<=', firebase.firestore.Timestamp.fromDate(endOfDay));
      } else if (filter === 'bulan-ini') {
        const startOfMonth = new Date(currentYear, currentMonth, 1);
        const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
        query = query
          .where('tanggal_pemeriksaan', '>=', firebase.firestore.Timestamp.fromDate(startOfMonth))
          .where('tanggal_pemeriksaan', '<=', firebase.firestore.Timestamp.fromDate(endOfMonth));
      } else if (filter === 'bulan-kemarin') {
        const startOfLastMonth = new Date(lastMonthYear, lastMonth, 1);
        const endOfLastMonth = new Date(lastMonthYear, lastMonth + 1, 0, 23, 59, 59, 999);
        query = query
          .where('tanggal_pemeriksaan', '>=', firebase.firestore.Timestamp.fromDate(startOfLastMonth))
          .where('tanggal_pemeriksaan', '<=', firebase.firestore.Timestamp.fromDate(endOfLastMonth));
      }

      query.get()
        .then((querySnapshot) => {
          console.log('Jumlah dokumen laporan ditemukan:', querySnapshot.size);
          tabelBody.innerHTML = '';
          if (querySnapshot.empty) {
            console.log(`Tidak ada data di koleksi 'laporan' untuk filter: ${filter}`);
            tabelBody.innerHTML = '<tr><td colspan="3">Tidak ada data laporan.</td></tr>';
            totalImunisasiEl.textContent = '0 Anak';
            bulanIniEl.textContent = '0 Anak';
            keluhanTercatatEl.textContent = '0 Kasus';
            initChart([]);
            return;
          }

          let totalImunisasi = 0;
          let bulanIniImunisasi = 0;
          let totalKeluhan = 0;
          const monthlyData = {};
          const monthNames = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
          ];

          querySnapshot.forEach((doc) => {
            const data = doc.data();
            console.log('Data dokumen laporan:', doc.id, data);

            // Validasi data
            if (!data.tanggal_pemeriksaan || !data.nama_anak || typeof data.jenis_imunisasi !== 'string') {
              console.warn('Data tidak lengkap untuk dokumen:', doc.id);
              return;
            }

            const docDate = data.tanggal_pemeriksaan.toDate();
            const month = docDate.getMonth();
            const year = docDate.getFullYear();
            const monthKey = `${monthNames[month]} ${year}`;

            // Hitung total imunisasi
            totalImunisasi++;

            // Hitung imunisasi berdasarkan filter yang dipilih
            if (filter === 'hari-ini') {
              // Untuk filter hari ini, hitung semua data yang sudah difilter
              bulanIniImunisasi++;
            } else if (filter === 'bulan-ini') {
              // Untuk filter bulan ini, hitung semua data yang sudah difilter
              bulanIniImunisasi++;
            } else if (filter === 'bulan-kemarin') {
              // Untuk filter bulan kemarin, hitung semua data yang sudah difilter
              bulanIniImunisasi++;
            } else {
              // Untuk filter 'semuanya', hitung hanya bulan ini
              if (month === currentMonth && year === currentYear) {
                bulanIniImunisasi++;
              }
            }

            // Hitung keluhan (catatan != "tidak ada")
            const hasKeluhan = data.catatan && data.catatan.toLowerCase() !== 'tidak ada';
            if (hasKeluhan) {
              totalKeluhan++;
            }

            // Agregasi data per bulan
            if (!monthlyData[monthKey]) {
              monthlyData[monthKey] = {
                bulan: monthNames[month],
                jumlah_imunisasi: 0,
                keluhan: 0,
                year: year,
                monthIndex: month
              };
            }
            monthlyData[monthKey].jumlah_imunisasi++;
            if (hasKeluhan) {
              monthlyData[monthKey].keluhan++;
            }
          });

          // Konversi monthlyData ke array untuk tabel dan grafik
          let chartData = Object.values(monthlyData)
            .sort((a, b) => a.year === b.year ? a.monthIndex - b.monthIndex : a.year - b.year);

          // Filter data untuk grafik dan tabel berdasarkan tahun 2025 untuk konsistensi
          if (filter !== 'semuanya') {
            chartData = chartData.filter(data => data.year === currentYear);
          }

          // Isi tabel
          if (chartData.length === 0) {
            tabelBody.innerHTML = '<tr><td colspan="3">Tidak ada data untuk periode ini.</td></tr>';
          } else {
            chartData.forEach(data => {
              const row = `
                <tr>
                  <td>${data.bulan}${filter === 'semuanya' ? ` ${data.year}` : ''}</td>
                  <td>${data.jumlah_imunisasi}</td>
                  <td>${data.keluhan}</td>
                </tr>
              `;
              tabelBody.insertAdjacentHTML('beforeend', row);
            });
          }

          // Update kartu statistik
          console.log('Mengupdate totalImunisasiEl dengan nilai:', totalImunisasi);
          console.log('Element totalImunisasiEl ditemukan:', !!totalImunisasiEl);
          if (totalImunisasiEl) {
            totalImunisasiEl.textContent = `${totalImunisasi} Anak`;
            console.log('totalImunisasiEl berhasil diupdate ke:', totalImunisasiEl.textContent);
          } else {
            console.error('Element totalImunisasiEl tidak ditemukan!');
          }
          
          // Update label card kedua berdasarkan filter
          const bulanIniCardTitle = document.querySelector('.col-md-4:nth-child(2) .card-body h5');
          if (bulanIniCardTitle) {
            if (filter === 'hari-ini') {
              bulanIniCardTitle.innerHTML = '<i class="fas fa-calendar-day me-2"></i>Hari Ini';
            } else if (filter === 'bulan-ini') {
              bulanIniCardTitle.innerHTML = '<i class="fas fa-calendar-month me-2"></i>Bulan Ini';
            } else if (filter === 'bulan-kemarin') {
              bulanIniCardTitle.innerHTML = '<i class="fas fa-calendar-alt me-2"></i>Bulan Kemarin';
            } else {
              bulanIniCardTitle.innerHTML = '<i class="fas fa-calendar-month me-2"></i>Bulan Ini';
            }
          }
          
          console.log('Mengupdate bulanIniEl dengan nilai:', bulanIniImunisasi);
          if (bulanIniEl) {
            bulanIniEl.textContent = `${bulanIniImunisasi} Anak`;
            console.log('bulanIniEl berhasil diupdate ke:', bulanIniEl.textContent);
          }
          
          console.log('Mengupdate keluhanTercatatEl dengan nilai:', totalKeluhan);
          if (keluhanTercatatEl) {
            keluhanTercatatEl.textContent = `${totalKeluhan} Kasus`;
            console.log('keluhanTercatatEl berhasil diupdate ke:', keluhanTercatatEl.textContent);
          }

          // Inisialisasi grafik
          initChart(chartData);
        })
        .catch((error) => {
          console.error('Gagal mengambil data laporan:', error);
          tabelBody.innerHTML = `<tr><td colspan="3">Gagal memuat data: ${error.message}</td></tr>`;
          totalImunisasiEl.textContent = 'Gagal Memuat';
          bulanIniEl.textContent = 'Gagal Memuat';
          keluhanTercatatEl.textContent = 'Gagal Memuat';
          initChart([]);
        });
    }

    tryLoadData();
  }

  // Inisialisasi Grafik
  function initChart(data) {
    const ctx = document.getElementById('imunisasiChart')?.getContext('2d');
    if (!ctx) {
      console.error('Elemen imunisasiChart tidak ditemukan.');
      return;
    }

    // Hancurkan grafik sebelumnya jika ada
    if (chartInstance) {
      chartInstance.destroy();
      console.log('Grafik sebelumnya dihancurkan');
    }

    chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(item => item.bulan + (item.year !== 2025 ? ` ${item.year}` : '')),
        datasets: [
          {
            label: 'Jumlah Imunisasi',
            data: data.map(item => item.jumlah_imunisasi),
            backgroundColor: 'rgba(0, 123, 255, 0.6)',
            borderColor: 'rgba(0, 123, 255, 1)',
            borderWidth: 1
          },
          {
            label: 'Keluhan Tercatat',
            data: data.map(item => item.keluhan),
            backgroundColor: 'rgba(255, 193, 7, 0.6)',
            borderColor: 'rgba(255, 193, 7, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              font: { size: 14 },
              color: '#333'
            }
          },
          title: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Jumlah',
              font: { size: 14 }
            },
            ticks: { color: '#333' }
          },
          x: {
            title: {
              display: true,
              text: 'Bulan',
              font: { size: 14 }
            },
            ticks: { color: '#333' }
          }
        }
      }
    });
    console.log('Grafik berhasil diinisialisasi dengan data:', data);
  }

  // Inisialisasi saat halaman dimuat
  document.addEventListener('DOMContentLoaded', () => {
    console.log('Halaman laporan dimuat dari laporan.js');
    closeDashboardOverlay();
    cleanupModalBackdrops();

    // Pengecekan elemen filterLaporan dengan retry
    const maxRetries = 5;
    let retryCount = 0;

    function tryInitFilter() {
      const filterLaporan = document.getElementById('filterLaporan');
      if (!filterLaporan) {
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`Elemen filterLaporan belum ditemukan, mencoba ulang (${retryCount}/${maxRetries})...`);
          setTimeout(tryInitFilter, 500);
          return;
        } else {
          console.error('Elemen filterLaporan tidak ditemukan setelah maksimum retry.');
          return;
        }
      }

      // Tambahkan event listener untuk filter
      filterLaporan.addEventListener('change', (e) => {
        console.log('Filter diubah:', e.target.value);
        loadDataLaporan(e.target.value);
      });

      // Load data awal
      loadDataLaporan();
    }

    tryInitFilter();
  });

  // Ekspor fungsi untuk dipanggil dari dashboard
  window.loadDataLaporan = function(filter = 'semuanya') {
    console.log('loadDataLaporan dipanggil dari dashboard dengan filter:', filter);
    loadDataLaporan(filter);
  };

  // Fungsi alternatif untuk inisialisasi dari dashboard
  window.initializeLaporanForDashboard = function() {
    console.log('initializeLaporanForDashboard dipanggil');
    closeDashboardOverlay();
    cleanupModalBackdrops();
    
    // Tunggu lebih lama untuk memastikan DOM sudah siap dan tidak ada race condition
    setTimeout(() => {
      console.log('Memulai loadDataLaporan setelah delay...');
      
      // Inisialisasi filter untuk dashboard
      initializeFilterForDashboard();
      
      // Load data awal
      loadDataLaporan('semuanya');
    }, 800);
  };

  // Fungsi untuk inisialisasi filter khusus dashboard
  function initializeFilterForDashboard() {
    console.log('Menginisialisasi filter untuk dashboard...');
    const maxRetries = 5;
    let retryCount = 0;

    function tryInitFilter() {
      const filterLaporan = document.getElementById('filterLaporan');
      if (!filterLaporan) {
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`Elemen filterLaporan belum ditemukan di dashboard, mencoba ulang (${retryCount}/${maxRetries})...`);
          setTimeout(tryInitFilter, 300);
          return;
        } else {
          console.error('Elemen filterLaporan tidak ditemukan setelah maksimum retry di dashboard.');
          return;
        }
      }

      console.log('Filter laporan ditemukan di dashboard, menambahkan event listener...');
      console.log('Filter element:', filterLaporan);
      console.log('Filter current value:', filterLaporan.value);
      
      // Hapus event listener lama jika ada
      filterLaporan.removeEventListener('change', handleFilterChange);
      console.log('Event listener lama dihapus');
      
      // Tambahkan multiple event listeners untuk memastikan filter berfungsi
      filterLaporan.addEventListener('change', handleFilterChange);
      filterLaporan.addEventListener('input', handleFilterChange);
      filterLaporan.addEventListener('blur', handleFilterChange);
      console.log('Event listener baru ditambahkan (change, input, blur)');
      
      // Test event listener dengan menambahkan click listener juga
      filterLaporan.addEventListener('click', function() {
        console.log('Filter dropdown diklik');
      });
      
      // Tambahkan event listener untuk option selection
      const options = filterLaporan.querySelectorAll('option');
      options.forEach(option => {
        option.addEventListener('click', function() {
          console.log('Option diklik:', this.value);
          setTimeout(() => {
            if (filterLaporan.value !== 'semuanya') {
              console.log('Memaksa trigger change event untuk:', filterLaporan.value);
              handleFilterChange({ target: filterLaporan });
            }
          }, 100);
        });
      });
      
      console.log('Event listener filter berhasil ditambahkan untuk dashboard');
    }

    tryInitFilter();
  }

  // Handler untuk perubahan filter
  function handleFilterChange(e) {
    console.log('Filter diubah di dashboard:', e.target.value);
    console.log('Event target:', e.target);
    console.log('Event type:', e.type);
    loadDataLaporan(e.target.value);
  }

} catch (error) {
  console.error('Gagal menginisialisasi Firestore di laporan.js:', error);
  const tabelBody = document.getElementById('tabelLaporan');
  const totalImunisasiEl = document.getElementById('totalImunisasiLaporan');
  const bulanIniEl = document.getElementById('bulanIni');
  const keluhanTercatatEl = document.getElementById('keluhanTercatat');
  if (tabelBody) {
    tabelBody.innerHTML = `<tr><td colspan="3">Gagal menginisialisasi: ${error.message}</td></tr>`;
  }
  if (totalImunisasiEl) totalImunisasiEl.textContent = 'Gagal Memuat';
  if (bulanIniEl) bulanIniEl.textContent = 'Gagal Memuat';
  if (keluhanTercatatEl) keluhanTercatatEl.textContent = 'Gagal Memuat';
}