try {
  const db = firebase.firestore();

  // Fungsi untuk mengisi field nama_anak berdasarkan namaOrtu dari koleksi tb_anak
  async function populateNamaAnak(nama_ortu) {
    const namaAnakContainer = document.getElementById('namaAnakContainer');
    if (!namaAnakContainer) {
      console.warn('Elemen namaAnakContainer tidak ditemukan');
      return;
    }

    // Reset container ke default
    namaAnakContainer.innerHTML = '<input type="text" id="namaAnak" class="form-control" placeholder="Tidak ada data anak" required>';

    if (!nama_ortu) {
      console.log('Tidak ada nama orang tua dimasukkan');
      return;
    }

    try {
      console.log(`Mencari data anak untuk nama_ortu: ${nama_ortu}`);
      const anakSnapshot = await db.collection('tb_anak')
        .where('nama_ortu', '==', nama_ortu)
        .get(); // Ambil semua dokumen anak

      if (anakSnapshot.empty) {
        console.log(`Tidak ada data anak untuk namaOrtu ${nama_ortu} di tb_anak`);
        return;
      }

      const anakList = [];
      anakSnapshot.docs.forEach(doc => {
        const anakData = doc.data();
        if (anakData.nama) {
          anakList.push({
            id: doc.id,
            nama: anakData.nama,
            usia: anakData.usia || 0
          });
        }
      });

      console.log(`Data anak ditemukan:`, anakList);

      if (anakList.length === 0) {
        console.log('Tidak ada anak dengan nama yang valid');
        return;
      } else if (anakList.length === 1) {
        // Jika hanya satu anak, tampilkan sebagai input text
        namaAnakContainer.innerHTML = `<input type="text" id="namaAnak" class="form-control" value="${anakList[0].nama}" readonly required>`;
      } else {
        // Jika lebih dari satu anak, tampilkan sebagai dropdown
        let selectHTML = '<select id="namaAnak" class="form-select" required>';
        selectHTML += '<option value="">-- Pilih Nama Anak --</option>';
        anakList.forEach(anak => {
          selectHTML += `<option value="${anak.nama}" data-usia="${anak.usia}">${anak.nama}</option>`;
        });
        selectHTML += '</select>';
        namaAnakContainer.innerHTML = selectHTML;

        // Tambahkan event listener untuk mengisi usia otomatis
        const namaAnakSelect = document.getElementById('namaAnak');
        namaAnakSelect.addEventListener('change', function() {
          const selectedOption = this.options[this.selectedIndex];
          const usia = selectedOption.getAttribute('data-usia');
          const usiaInput = document.getElementById('usiaAnak');
          if (usia && usiaInput) {
            usiaInput.value = usia;
          }
        });
      }
    } catch (error) {
      console.error('Gagal mengambil data nama anak dari tb_anak:', error);
      alert('Gagal memuat data nama anak: ' + error.message);
    }
  }

  // Fungsi untuk menginisialisasi form
  function initializePerkembanganForm() {
    const form = document.getElementById('formPerkembangan');
    const namaOrtuInput = document.getElementById('nama_ortu');
    if (!form || !namaOrtuInput) {
      console.warn('Form perkembangan atau namaOrtu input tidak ditemukan');
      return;
    }

    // Tambahkan event listener untuk perubahan namaOrtu
    namaOrtuInput.removeEventListener('input', handleNamaOrtuChange);
    namaOrtuInput.addEventListener('input', handleNamaOrtuChange);

    // Tambahkan event listener untuk submit form
    form.removeEventListener('submit', handleFormSubmit);
    form.addEventListener('submit', handleFormSubmit);
  }

  // Handler untuk perubahan namaOrtu
  function handleNamaOrtuChange(e) {
    const nama_ortu = e.target.value.trim();
    populateNamaAnak(nama_ortu);
  }

  // Fungsi untuk menangani submit form
  async function handleFormSubmit(e) {
    e.preventDefault(); // Mencegah reload halaman

    // Ambil nilai dari form
    const nama_ortu = document.getElementById('nama_ortu').value.trim();
    const namaAnakElement = document.getElementById('namaAnak');
    const namaAnak = namaAnakElement ? namaAnakElement.value.trim() : '';
    const usiaAnak = parseInt(document.getElementById('usiaAnak').value);
    const beratBadan = parseFloat(document.getElementById('beratBadan').value);
    const tinggiBadan = parseFloat(document.getElementById('tinggiBadan').value);
    const tanggal = document.getElementById('tanggal').value;
    const jenisImunisasi = document.getElementById('jenisImunisasi').value;
    const kodeVaksin = document.getElementById('kodeVaksin').value.trim();
    const catatan = document.getElementById('catatan').value.trim();

    // Validasi input
    if (!nama_ortu || !namaAnak || isNaN(usiaAnak) || isNaN(beratBadan) || isNaN(tinggiBadan) || !tanggal || !jenisImunisasi || !kodeVaksin) {
      alert('Harap lengkapi semua field yang wajib diisi.');
      return false;
    }

    // Ambil userId berdasarkan namaOrtu
    let userId = null;
    try {
      console.log(`Mencari userId untuk namaOrtu: ${nama_ortu}`);
      const userSnapshot = await db.collection('users')
        .where('nama_ortu', '==', nama_ortu)
        .limit(1)
        .get();
      if (userSnapshot.empty) {
        console.error(`Nama orang tua ${nama_ortu} tidak ditemukan di koleksi users`);
        alert('Nama orang tua tidak ditemukan di database.');
        return false;
      }
      const userDoc = userSnapshot.docs[0];
      if (!userDoc.data().nama_ortu) {
        console.error(`Dokumen user ${userDoc.id} tidak memiliki field namaOrtu`);
        alert('Data pengguna tidak valid: nama orang tua tidak ditemukan.');
        return false;
      }
      userId = userDoc.id; // Gunakan ID dokumen sebagai userId
      console.log(`userId ditemukan: ${userId}`);
    } catch (error) {
      console.error('Gagal mencari userId:', error);
      alert('Gagal mencari userId: ' + error.message);
      return false;
    }

    // Konversi tanggal ke Firestore Timestamp
    const tanggalTimestamp = firebase.firestore.Timestamp.fromDate(new Date(tanggal));

    // Data untuk disimpan
    const data = {
      userId: userId,
      nama_anak: namaAnak,
      nama_ortu: nama_ortu,
      usia_anak: usiaAnak,
      berat_badan: beratBadan,
      tinggi_badan: tinggiBadan,
      tanggal_pemeriksaan: tanggalTimestamp,
      jenis_imunisasi: jenisImunisasi,
      kode_vaksin: kodeVaksin,
      catatan: catatan || null,
      created_at: firebase.firestore.Timestamp.now()
    };

    console.log('Menyimpan data ke koleksi laporan:', data);

    // Simpan ke Firestore
    try {
      await db.collection('laporan').add(data);
      console.log('Data berhasil disimpan ke koleksi laporan');
      alert('Data perkembangan anak berhasil disimpan!');
      // Reset form
      document.getElementById('formPerkembangan').reset();
      // Reset nama_anak container
      const namaAnakContainer = document.getElementById('namaAnakContainer');
      if (namaAnakContainer) {
        namaAnakContainer.innerHTML = '<input type="text" id="namaAnak" class="form-control" placeholder="Tidak ada data anak" required>';
      }
    } catch (error) {
      console.error('Gagal menyimpan data ke Firestore:', error);
      alert('Gagal menyimpan data: ' + error.message);
    }
  }

  // Ekspor fungsi untuk dipanggil dari dashboard
  window.initializePerkembanganForm = initializePerkembanganForm;
} catch (error) {
  console.error('Gagal menginisialisasi Firestore:', error);
  alert('Gagal menginisialisasi Firestore: ' + error.message);
}