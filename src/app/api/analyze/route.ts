import { NextRequest, NextResponse } from "next/server";
import genAI from "@/lib/gemini";

// convert file stream to a Buffer
async function streamToBuffer(
  stream: ReadableStream<Uint8Array>
): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks);
}

// convert Buffer to GoogleGenerativeAI
function fileToGenerativePart(buffer: Buffer, mimeType: string) {
  return {
    inlineData: {
      data: buffer.toString("base64"),
      mimeType,
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("datanya") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "File not found." }, { status: 400 });
    }

    // Mengubah semua file menjadi format yang bisa dibaca Gemini secara paralel
    // const imageParts = await Promise.all(
    //   files.map(async (file) => {
    //     const allowedMimeTypes = ["image/png", "image/jpeg", "application/pdf"];
    //     if (!allowedMimeTypes.includes(file.type)) {
    //       // Melemparkan error jika ada file yang tidak didukung
    //       throw new Error(`Unsupported file type: ${file.type}`);
    //     }
    //     const buffer = await streamToBuffer(file.stream());
    //     return fileToGenerativePart(buffer, file.type);
    //   })
    // );

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      Anda adalah asisten AI super canggih yang bertugas sebagai spesialis Kepatuhan Privasi Data.
      Tugas Anda adalah membaca dokumen yang diberikan dan mengisi template Record of Processing Activities (RoPA) secara lengkap dan akurat berdasarkan definisi kolom berikut.

      --- DEFINISI KOLOM ROPA ---
      - "No Aktivitas": Nomor aktivitas/pemrosesan.
      - "Unit Kerja / Divisi": Nama unit/divisi yang terlibat.
      - "Departemen / Sub-Departemen": Nama departemen/sub-departemen.
      - "Penanggungjawab Proses": Penanggung jawab pemrosesan Data Pribadi (contoh: jabatan, divisi).
      - "Kedudukan Pemilik Proses": Peran pemilik proses (Pengendali / Prosesor / Pengendali Bersama).
      - "Nama Aktivitas": Nama aktivitas pemrosesan Data Pribadi.
      - "Deskripsi dan Tujuan Pemrosesan": Tujuan pemrosesan, misal "untuk kebutuhan rekrutmen".
      - "Kebijakan/SOP/IK/Dokumen Rujukan": Nama dokumen rujukan (SOP, IK, kebijakan).
      - "Bentuk Data Pribadi": Jenis artefak (Elektronik, Non-Elektronik, Lainnya).
      - "Subjek Data Pribadi": Profil subjek (Nasabah, Karyawan, Calon Karyawan, dll).
      - "Jenis Data Pribadi": Jenis data yang diproses (umum/spesifik).
      - "Data Pribadi Spesifik (Ya/Tidak)": Apakah ada data spesifik? (contoh: medis, keuangan).
      - "Sumber Pemerolehan Data Pribadi": Dari mana data diperoleh (subjek langsung, pihak ketiga, sistem).
      - "Akurasi dan Kelengkapan Data Pribadi": Bagaimana data diperbarui dan dijaga akurasinya.
      - "Penyimpanan Data Pribadi": Metode penyimpanan (hardcopy, aplikasi, keduanya).
      - "Metode Pemrosesan Data Pribadi": Cara pemrosesan (manual, aplikasi, keduanya).
      - "Pengambilan Keputusan Terotomasi": Jelaskan jika ada mekanisme automated decision/profiling.
      - "Dasar Pemrosesan": Landasan hukum (Consent, Contractual, Legal Obligation, Vital Interest, Legitimate Interest).
      - "Masa Retensi Data Pribadi": Periode penyimpanan data.
      - "Kewajiban Hukum untuk menyimpan Data Pribadi": Aturan hukum yang mewajibkan penyimpanan.
      - "Langkah Teknis (Technical) Pengamanan Data Pribadi": Pengamanan teknis.
      - "Langkah Organisasi (Organisational) Pengamanan Data Pribadi": Pengamanan organisasi/kebijakan.
      - "Kategori dan Jenis Penerima Data Pribadi": Penerima data (internal/eksternal).
      - "Profil Penerima Data Pribadi": Profil detail penerima (divisi, vendor, pemerintah).
      - "Pengendali / Prosesor / Pengendali Bersama": Peran penerima data jika eksternal.
      - "Kontak Pengendali / Prosesor": Kontak/PIC penerima data eksternal.
      - "Tujuan Pengiriman / Pemrosesan / Berbagi / Akses": Tujuan transfer data.
      - "Jenis Data Pribadi yang Dikirim": Jenis data pribadi yang diproses/dikirim.
      - "Perjanjian Kontraktual dengan penerima Data Pribadi": Apakah ada perjanjian (Ya/Tidak).
      - "Negara lain sebagai penerima Transfer Data Pribadi": Negara penerima jika ada transfer lintas negara.
      - "Bentuk Dokumen Pengiriman": Bentuk dokumen transfer (Elektronik/Non-Elektronik).
      - "Mekanisme Transfer": Metode pertukaran (Email, FTP, manual, dll).
      - "Hak Subjek Data Pribadi yang Berlaku": Hak-hak Subjek Data Pribadi dapat dipernuhi / diakomodir:
      1. Hak Mendapatkan Informasi Pemrosesan Data Pribadi (Pasal 5)
      2. Hak Memutakhirkan Data Pribadinya (Pasal 6)
      3. Hak Akses dan Mendapatkan Salinan (Pasal 7)
      4. Hak Mengakhiri Pemroseaan Data Pribadinya (Pasal 8)
      5. Hak Menarik Persetujuan (Pasal 9)
      6. Hak Keberatan akan Pemrosesan Otomatis (Automated Decision Making) (Pasal 10)
      7. Hak Menunda atau Membatasi Pemrosesan Data Pribadi (Pasal 11)
      8. Hak atas Gugatan Ganti Rugi (Pasal 12)
      9. Hak Interoperabilitas (Pasal 13)
      - "Asesmen Risiko": Hasil analisis kategori Risiko Tinggi sesuai Pasal 34 ayat (2) UU PDP dan/atau referensi ke pembahasan risiko di Risk Register, diantaranya meliputi:
      a. pengambilan keputusan secara otomatis yang memiliki akibat hukum atau dampak yang signifikan terhadap Subjek Data Pribadi; 
      b. pemrosesan atas Data Pribadi yang bersifat spesifik; 
      c. pemrosesan Data Pribadi dalam skala besar  (contohnya pemrosesan data pribadi Nasabah dalam skala besar);
      d. pemrosesan Data Pribadi untuk kegiatan evaluasi, penskoran, atau pemantauan yang sistematis terhadap Subjek Data Pribadi; 
      e. pemrosesan Data Pribadi untuk kegiatan pencocokan atau penggabungan sekelompok data; 
      f. penggunaan teknologi baru dalam pemrosesan Data Pribadi; dan/atau
      g. pemrosesan Data Pribadi yang membatasi pelaksanaan hak Subjek Data Pribadi.
      - "Proses / Kegiatan Sebelumnya": Aktivitas sebelumnya.
      - "Proses / Kegiatan Setelahnya": Aktivitas setelahnya.
      - "Keterangan / Catatan Tambahan": Catatan tambahan.

      --- TUGAS ANDA ---
      Analisis dokumen yang diberikan dan ekstrak informasi untuk mengisi kolom-kolom di atas.

      --- ATURAN PENTING ---
      1.  **Analisis Holistik**: Baca dan pahami seluruh dokumen untuk menemukan informasi relevan, bahkan jika tidak disebutkan secara eksplisit.
      2.  **Penanganan Data Hilang**: Jika informasi untuk kolom mana pun TIDAK DAPAT DITEMUKAN, isi nilainya dengan 'null'.
      3.  **Berikan Saran Cerdas**: Buat properti bernama "saran_ai". Jika ada nilai yang 'null', berikan saran yang paling logis berdasarkan konteks. Jika tidak ada konteks untuk memberikan saran, berikan string kosong.
      4.  **Format Output**: Kembalikan hasilnya HANYA dalam format JSON tunggal yang valid tanpa teks tambahan.

       --- ATURAN PENTING UNTUK 'saran_ai' ---
      Setelah mengekstrak semua data, Anda HARUS membuat properti "saran_ai". Properti ini memiliki DUA tujuan:

      1.  **REKOMENDASI NILAI KOSONG**:
          - Untuk setiap field yang nilainya 'null', berikan rekomendasi pengisian yang logis.
          - Gunakan format: "- [Nama Kolom]: Rekomendasi Anda."
          - Contoh: "- Masa Retensi: Tidak ditemukan, sarankan untuk diisi 'Sesuai Kebijakan Perusahaan'."

      2.  **VALIDASI DATA TIDAK COCOK**:
          - Periksa setiap data yang berhasil diekstrak. Apakah nilainya masuk akal untuk kolom tersebut berdasarkan definisinya?
          - Jika Anda menemukan kejanggalan (misalnya, nama orang di kolom 'Unit Kerja', atau tujuan proses di kolom 'Nama Aktivitas'), laporkan.
          - Gunakan format: "- Validasi [Nama Kolom]: Nilai '[Nilai yang Ditemukan]' terlihat tidak cocok karena [alasan Anda]."
          - Contoh: "- Validasi Unit Kerja: Nilai 'Budi Santoso' terlihat tidak cocok karena ini adalah nama orang, bukan nama divisi."


      --- CONTOH OUTPUT JSON YANG DIHARAPKAN ---
      {
        "no_aktivitas": "HR/REC/2025/001",
        "unit_kerja_divisi": "Divisi Sumber Daya Manusia",
        "departemen_sub_departemen": "Budi Santoso",
        "penanggungjawab_proses": "Manajer Rekrutmen",
        "kedudukan_pemilik_proses": "Pengendali",
        "nama_aktivitas": "Proses Rekrutmen Karyawan Baru",
        "deskripsi_dan_tujuan_pemrosesan": "Untuk kebutuhan proses rekrutmen karyawan, mulai dari seleksi awal, wawancara, hingga penawaran kerja.",
        "kebijakan_sop_ik_dokumen_rujukan": "SOP Rekrutmen Karyawan No. 112/HR/2024",
        "bentuk_data_pribadi": "Elektronik",
        "subjek_data_pribadi": "Calon Karyawan",
        "jenis_data_pribadi": "Data Pribadi umum (nama, alamat, email, telepon, riwayat pendidikan), Data Pribadi spesifik (data keuangan dari slip gaji sebelumnya).",
        "data_pribadi_spesifik_ya_tidak": "Ya",
        "sumber_pemerolehan_data_pribadi": "Subyek Data Pribadi (secara langsung melalui portal karir)",
        "akurasi_dan_kelengkapan_data_pribadi": null,
        "penyimpanan_data_pribadi": "Sistem Aplikasi 'HRIS TalentLink'",
        "metode_pemrosesan_data_pribadi": "Kombinasi sistem aplikasi 'HRIS TalentLink' dan manual (wawancara)",
        "pengambilan_keputusan_terotomasi": "Tidak ada pengambilan keputusan otomatis yang berdampak signifikan pada subjek data.",
        "dasar_pemrosesan": "Persetujuan (Consent) dari calon karyawan saat melamar.",
        "masa_retensi_data_pribadi": null,
        "kewajiban_hukum_untuk_menyimpan_data_pribadi": null,
        "langkah_teknis_pengamanan_data_pribadi": "Enkripsi database, akses terbatas berbasis peran (role-based access).",
        "langkah_organisasi_pengamanan_data_pribadi": "Perjanjian Kerahasiaan (NDA) dengan tim rekrutmen, pelatihan PDP reguler.",
        "kategori_dan_jenis_penerima_data_pribadi": "Internal",
        "profil_penerima_data_pribadi": "Divisi Sumber Daya Manusia, Manajer Perekrutan di divisi terkait.",
        "pengendali_prosesor_pengendali_bersama": null,
        "kontak_pengendali_prosesor": null,
        "tujuan_pengiriman_pemrosesan_berbagi_akses": null,
        "jenis_data_pribadi_yang_dikirim": null,
        "perjanjian_kontraktual_dengan_penerima_data_pribadi": null,
        "negara_lain_sebagai_penerima_transfer_data_pribadi": "Tidak ada",
        "bentuk_dokumen_pengiriman": null,
        "mekanisme_transfer": null,
        "hak_subjek_data_pribadi_yang_berlaku": "Hak Mendapatkan Informasi, Hak Memutakhirkan Data, Hak Akses, Hak Mengakhiri Pemrosesan, Hak Menarik Persetujuan.",
        "asesmen_risiko": "Tinggi (karena memproses data keuangan yang bersifat spesifik)",
        "proses_kegiatan_sebelumnya": "Publikasi lowongan pekerjaan.",
        "proses_kegiatan_setelahnya": "Onboarding karyawan baru.",
        "keterangan_catatan_tambahan": "Proses ini mencakup pemeriksaan latar belakang oleh pihak ketiga.",
        "saran_ai": "REKOMENDASI & VALIDASI:\n- Akurasi dan Kelengkapan Data Pribadi: Tidak ditemukan, sarankan untuk menjelaskan proses verifikasi data saat wawancara atau referensi.\n- Masa Retensi Data Pribadi: Tidak ditemukan, sarankan untuk diisi '1 Tahun untuk kandidat yang tidak lolos' sesuai praktik umum.\n- Kewajiban Hukum untuk menyimpan Data Pribadi: Tidak ditemukan, sarankan untuk diisi 'Tidak Ada' jika tidak ada peraturan spesifik yang mewajibkan.\n- [Beberapa kolom penerima data]: Tidak ada transfer data eksternal, sehingga wajar jika kolom terkait penerima eksternal bernilai null.\n- Validasi Departemen / Sub-Departemen: Nilai 'Budi Santoso' terlihat tidak cocok karena ini adalah nama orang, bukan nama departemen. Seharusnya berisi nama departemen seperti 'Perekrutan & Seleksi'."
      }
    `;

    const promises = files.map(async (file) => {
      const allowedMimeTypes = ["image/png", "image/jpeg", "application/pdf"];
      if (!allowedMimeTypes.includes(file.type)) {
        throw new Error(
          `Unsupported file type: ${file.type} for file ${file.name}`
        );
      }

      const buffer = await streamToBuffer(file.stream());
      const imagePart = fileToGenerativePart(buffer, file.type);

      // Panggil AI untuk SETIAP file secara terpisah
      const result = await model.generateContent([prompt, imagePart]);
      const responseText = result.response.text();

      // Parsing JSON untuk setiap hasil
      return JSON.parse(responseText.replace(/```json|```/g, "").trim());
    });

    // Tunggu semua proses selesai
    const allJsonResults = await Promise.all(promises);

    // Kembalikan ARRAY berisi semua hasil JSON
    return NextResponse.json(allJsonResults);
  } catch (error) {
    console.error("Error processing file:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
