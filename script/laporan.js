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
      const totalImunisasiEl = document.getElementById('totalImunisasi');
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
      const currentDate = new Date('2025-06-21'); // Tanggal saat ini: 21 Juni 2025
      const currentMonth = currentDate.getMonth(); // 5 (Juni)
      const currentYear = currentDate.getFullYear(); // 2025
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

      if (filter === 'hari-ini') {
        const startOfDay = new Date(currentDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(currentDate.setHours(23, 59, 59, 999));
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

            // Hitung imunisasi bulan ini (hanya untuk filter 'semuanya' atau 'bulan-ini')
            if (month === currentMonth && year === currentYear) {
              bulanIniImunisasi++;
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
          totalImunisasiEl.textContent = `${totalImunisasi} Anak`;
          bulanIniEl.textContent = `${bulanIniImunisasi} Anak`;
          keluhanTercatatEl.textContent = `${totalKeluhan} Kasus`;

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
} catch (error) {
  console.error('Gagal menginisialisasi Firestore di laporan.js:', error);
  const tabelBody = document.getElementById('tabelLaporan');
  const totalImunisasiEl = document.getElementById('totalImunisasi');
  const bulanIniEl = document.getElementById('bulanIni');
  const keluhanTercatatEl = document.getElementById('keluhanTercatat');
  if (tabelBody) {
    tabelBody.innerHTML = `<tr><td colspan="3">Gagal menginisialisasi: ${error.message}</td></tr>`;
  }
  if (totalImunisasiEl) totalImunisasiEl.textContent = 'Gagal Memuat';
  if (bulanIniEl) bulanIniEl.textContent = 'Gagal Memuat';
  if (keluhanTercatatEl) keluhanTercatatEl.textContent = 'Gagal Memuat';
}