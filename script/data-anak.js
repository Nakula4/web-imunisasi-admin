try {
  const db = firebase.firestore();

  function cleanupModalBackdrops() {
    setTimeout(() => {
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach((backdrop, index) => {
        if (index > 0 || !document.querySelector('.modal.show')) {
          backdrop.remove();
          console.log('Backdrop modal dihapus');
        }
      });
      if (!document.querySelector('.modal.show')) {
        document.body.classList.remove('modal-open');
        document.body.style.overflow = 'auto';
        console.log('Kelas modal-open dihapus dari body');
      }
    }, 200); // Penundaan ditingkatkan menjadi 200ms untuk memastikan rendering Bootstrap selesai
  }

  function loadDataAnak() {
    const tableBody = document.getElementById('anakTableBody');
    if (!tableBody) {
      console.error("Elemen anakTableBody tidak ditemukan.");
      return;
    }

    tableBody.innerHTML = '<tr><td colspan="6"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Memuat...</span></div></td></tr>';

    console.log("Mengambil data dari koleksi 'tb_anak'...");
    db.collection("tb_anak")
      .get()
      .then((querySnapshot) => {
        console.log("Jumlah dokumen anak ditemukan:", querySnapshot.size);
        tableBody.innerHTML = "";
        if (querySnapshot.empty) {
          console.log("Tidak ada data di koleksi 'tb_anak'.");
          tableBody.innerHTML = '<tr><td colspan="6">Tidak ada data anak.</td></tr>';
          return;
        }
        querySnapshot.forEach((doc) => {
          console.log("Data dokumen anak:", doc.id, doc.data());
          const data = doc.data();
          const formattedDate = data.tglLahir || '-';
          const row = `
            <tr>
              <td>${data.nama || '-'}</td>
              <td>${formattedDate}</td>
              <td>${data.jenis_kelamin || '-'}</td>
              <td>${data.berat || '-'}</td>
              <td>${data.tinggi || '-'}</td>
              <td class="action-btns">
                <button class="btn btn-warning btn-sm me-1" onclick="editDataAnak('${doc.id}')" data-bs-toggle="modal" data-bs-target="#modalEditAnak"><i class="fas fa-edit"></i> Edit</button>
                <button class="btn btn-danger btn-sm" onclick="hapusData('${doc.id}')"><i class="fas fa-trash"></i> Hapus</button>
              </td>
            </tr>
          `;
          tableBody.insertAdjacentHTML('beforeend', row);
        });
      })
      .catch((error) => {
        console.error("Gagal mengambil data anak: ", error);
        tableBody.innerHTML = '<tr><td colspan="6">Gagal memuat data anak: ' + error.message + '</td></tr>';
      });
  }

  function editDataAnak(id) {
    console.log('Mengambil data anak untuk edit, ID:', id);
    db.collection("tb_anak")
      .doc(id)
      .get()
      .then((doc) => {
        if (doc.exists) {
          const data = doc.data();
          console.log('Data anak untuk edit:', data);
          document.getElementById('editAnakId').value = id;
          document.getElementById('editNamaAnak').value = data.nama || '';
          document.getElementById('editTanggalLahir').value = data.tglLahir
            ? data.tglLahir.split('/').reverse().join('-')
            : '';
          document.getElementById('editJenisKelamin').value = data.jenis_kelamin || '';
          document.getElementById('editBerat').value = data.berat || '';
          document.getElementById('editTinggi').value = data.tinggi || '';
          cleanupModalBackdrops();
        } else {
          console.error('Dokumen anak tidak ditemukan:', id);
          alert('Data anak tidak ditemukan.');
        }
      })
      .catch((error) => {
        console.error('Gagal mengambil data anak untuk edit:', error);
        alert('Gagal mengambil data anak: ' + error.message);
      });
  }

  document.getElementById('formTambahAnak')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Form tambah anak disubmit');
    cleanupModalBackdrops();

    const nama = document.getElementById('namaAnak').value.trim();
    const tanggalLahir = document.getElementById('tanggalLahir').value;
    const jenisKelamin = document.getElementById('jenisKelamin').value;
    const berat = parseInt(document.getElementById('berat').value);
    const tinggi = parseInt(document.getElementById('tinggi').value);

    if (!nama || !tanggalLahir || !jenisKelamin || !berat || !tinggi) {
      alert('Harap lengkapi semua field.');
      return;
    }

    const formattedTanggalLahir = tanggalLahir.split('-').reverse().join('/');

    const data = {
      nama,
      tglLahir: formattedTanggalLahir,
      jenis_kelamin: jenisKelamin,
      berat,
      tinggi,
      created_at: firebase.firestore.Timestamp.now(),
    };

    console.log('Menambahkan data anak:', data);
    try {
      await db.collection('tb_anak').add(data);
      console.log('Data anak berhasil ditambahkan');
      alert('Data anak berhasil ditambahkan!');
      document.getElementById('formTambahAnak').reset();
      bootstrap.Modal.getInstance(document.getElementById('modalTambahAnak')).hide();
      loadDataAnak();
    } catch (error) {
      console.error('Gagal menambahkan data anak:', error);
      alert('Gagal menambahkan data: ' + error.message);
    }
  });

  document.getElementById('formEditAnak')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Form edit anak disubmit');
    cleanupModalBackdrops();
    const id = document.getElementById('editAnakId').value;
    const nama = document.getElementById('editNamaAnak').value.trim();
    const tanggalLahir = document.getElementById('editTanggalLahir').value;
    const jenisKelamin = document.getElementById('editJenisKelamin').value;
    const berat = parseInt(document.getElementById('editBerat').value);
    const tinggi = parseInt(document.getElementById('editTinggi').value);

    if (!id || !nama || !tanggalLahir || !jenisKelamin || !berat || !tinggi) {
      alert('Harap lengkapi semua field.');
      return;
    }

    const formattedTanggalLahir = tanggalLahir.split('-').reverse().join('/');

    const data = {
      nama,
      tglLahir: formattedTanggalLahir,
      jenis_kelamin: jenisKelamin,
      berat,
      tinggi,
      updated_at: firebase.firestore.Timestamp.now(),
    };

    console.log('Menyimpan perubahan data anak:', data);
    try {
      await db.collection('tb_anak').doc(id).update(data);
      console.log('Data anak berhasil diperbarui, ID:', id);
      alert('Data anak berhasil diperbarui!');
      document.getElementById('formEditAnak').reset();
      bootstrap.Modal.getInstance(document.getElementById('modalEditAnak')).hide();
      loadDataAnak();
    } catch (error) {
      console.error('Gagal menyimpan perubahan data anak:', error);
      alert('Gagal menyimpan perubahan: ' + error.message);
    }
  });

  function hapusData(id) {
    if (confirm('Apakah Anda yakin ingin menghapus data ini?')) {
      console.log('Menghapus dokumen anak dengan ID:', id);
      db.collection('tb_anak')
        .doc(id)
        .delete()
        .then(() => {
          console.log('Dokumen anak berhasil dihapus:', id);
          alert('Data berhasil dihapus');
          loadDataAnak();
        })
        .catch((error) => {
          console.error('Gagal menghapus data anak:', error);
          alert('Gagal menghapus data: ' + error.message);
        });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    console.log('Halaman data-anak dimuat');
    cleanupModalBackdrops();
    document.querySelectorAll('.modal').forEach((modal) => {
      modal.addEventListener('hidden.bs.modal', () => {
        console.log('Modal ditutup:', modal.id);
        cleanupModalBackdrops();
      });
      modal.addEventListener('shown.bs.modal', () => {
        console.log('Modal ditampilkan:', modal.id);
        cleanupModalBackdrops();
      });
    });
    loadDataAnak();
  });
} catch (error) {
  console.error('Gagal menginisialisasi Firestore:', error);
  const tableBody = document.getElementById('anakTableBody');
  if (tableBody) {
    tableBody.innerHTML = '<tr><td colspan="6">Gagal menginisialisasi Firestore: ' + error.message + '</td></tr>';
  }
}