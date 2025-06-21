try {
  const db = firebase.firestore();

  // Tangani submit form
  document.getElementById('formPerkembangan').addEventListener('submit', async (e) => {
    e.preventDefault(); // Mencegah reload halaman

    // Ambil nilai dari form
    const namaAnak = document.getElementById('namaAnak').value.trim();
    const usiaAnak = parseInt(document.getElementById('usiaAnak').value);
    const beratBadan = parseFloat(document.getElementById('beratBadan').value);
    const tinggiBadan = parseFloat(document.getElementById('tinggiBadan').value);
    const tanggal = document.getElementById('tanggal').value;
    const jenisImunisasi = document.getElementById('jenisImunisasi').value;
    const kodeVaksin = document.getElementById('kodeVaksin').value.trim();
    const catatan = document.getElementById('catatan').value.trim();

    // Validasi input
    if (!namaAnak || isNaN(usiaAnak) || isNaN(beratBadan) || isNaN(tinggiBadan) || !tanggal || !jenisImunisasi || !kodeVaksin) {
      alert('Harap lengkapi semua field yang wajib diisi.');
      return;
    }

    // Konversi tanggal ke Firestore Timestamp
    const tanggalTimestamp = firebase.firestore.Timestamp.fromDate(new Date(tanggal));

    // Data untuk disimpan
    const data = {
      nama_anak: namaAnak,
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
    } catch (error) {
      console.error('Gagal menyimpan data ke Firestore:', error);
      alert('Gagal menyimpan data: ' + error.message);
    }
  });
} catch (error) {
  console.error('Gagal menginisialisasi Firestore:', error);
  alert('Gagal menginisialisasi Firestore: ' + error.message);
}