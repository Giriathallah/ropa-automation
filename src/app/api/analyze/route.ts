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
      - No: Nomor unik untuk aktivitas pemrosesan.
      - Unit Kerja / Divisi: Nama Unit Kerja/Divisi yang bertanggung jawab.
      - Departemen / Sub-Departemen: Nama Department/Sub-Department pelaksana.
      - Penanggungjawab Proses: Nama bagian/jabatan dari PIC yang menjalankan proses bisnis.
      - Kedudukan Pemilik Proses: Peran pemilik proses (Pengendali, Prosesor, atau Pengendali Bersama).
      - Nama Aktivitas: Nama resmi dari proses atau aktivitas pemrosesan Data Pribadi.
      - Deskripsi dan Tujuan Pemrosesan: Tujuan dari pemrosesan Data Pribadi.
      - Kebijakan/SOP/IK/Dokumen Rujukan: Nama dokumen rujukan formal yang ada.
      - Bentuk Data Pribadi: Bentuk/jenis artefak data (Elektronik, Non-Elektronik, Lainnya).
      - Subjek Data Pribadi: Profil subjek data (Nasabah, Karyawan, Calon Karyawan, dll).
      - Jenis Data Pribadi: Rincian jenis Data Pribadi yang diproses (umum atau spesifik).
      - Data Pribadi Spesifik (Ya/Tidak): Isi "Ya" jika ada data spesifik (medis, keuangan, dll), jika tidak isi "Tidak".
      - Sumber Pemerolehan Data Pribadi: Dari mana data diperoleh (Subyek Data, Pihak Ketiga, Sistem, dll).
      - Akurasi dan Kelengkapan Data Pribadi: Bagaimana dan kapan data dimutakhirkan.
      - Penyimpanan Data Pribadi: Metode penyimpanan (sistem aplikasi, hardcopy, dll).
      - Metode Pemrosesan Data Pribadi: Metode pemrosesan (manual, sistem aplikasi, dll).
      - Pengambilan Keputusan Terotomasi: Penjelasan jika ada pengambilan keputusan otomatis yang berdampak pada subjek data.
      - Dasar Pemrosesan: Landasan hukum pemrosesan (Persetujuan, Kontraktual, Kewajiban Hukum, dll).
      - Masa Retensi Data Pribadi: Periode penyimpanan data.
      - Kewajiban Hukum untuk menyimpan Data Pribadi: Peraturan yang mewajibkan penyimpanan data.
      - Langkah Teknis Pengamanan Data Pribadi: Pengamanan dari sisi teknis.
      - Langkah Organisasi Pengamanan Data Pribadi: Pengamanan dari sisi kebijakan internal.
      - Kategori dan Jenis Penerima Data Pribadi: Profil penerima (Internal, Eksternal).
      - Profil Penerima Data Pribadi: Rincian penerima (Divisi/Departemen, Nama Vendor, Instansi Pemerintah).
      - Tujuan Pengiriman / Akses Data Pribadi: Tujuan data dibagikan kepada penerima.
      - Mekanisme Transfer / Akses: Cara data dibagikan (email, FTP, API, manual, dll).
      - Hak Subjek Data Pribadi yang Berlaku: Hak-hak subjek data yang dapat diakomodir.
      - Asesmen Risiko: Analisis kategori risiko (Tinggi, Sedang, Rendah).
      - Proses / Kegiatan Sebelumnya: Proses yang terjadi sebelum aktivitas ini.
      - Proses / Kegiatan Setelahnya: Proses yang terjadi setelah aktivitas ini.
      - Keterangan / Catatan Tambahan: Informasi tambahan lainnya.

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
        "nama_aktivitas": "Proses Rekrutmen Karyawan Baru",
        "unit_kerja": "Divisi Sumber Daya Manusia",
        "departemen": "Budi Santoso",
        "penanggung_jawab": "Manajer Rekrutmen",
        "kedudukan_pemilik_proses": "Pengendali",
        "tujuan_pemrosesan": "Untuk kebutuhan proses rekrutmen karyawan, mulai dari seleksi awal, wawancara, hingga penawaran kerja.",
        "kebijakan_rujukan": "SOP Rekrutmen Karyawan No. 112/HR/2024",
        "bentuk_data_pribadi": "Elektronik",
        "subjek_data_pribadi": "Calon Karyawan",
        "jenis_data_pribadi": "Data Pribadi umum (nama, alamat, email, telepon, riwayat pendidikan), Data Pribadi spesifik (data keuangan dari slip gaji sebelumnya).",
        "data_pribadi_spesifik": "Ya",
        "sumber_data": "Subyek Data Pribadi (secara langsung melalui portal karir)",
        "penyimpanan_data": "Sistem Aplikasi 'HRIS TalentLink'",
        "metode_pemrosesan": "Kombinasi sistem aplikasi 'HRIS TalentLink' dan manual (wawancara)",
        "dasar_pemrosesan": "Persetujuan (Consent) dari calon karyawan saat melamar.",
        "masa_retensi": null,
        "langkah_teknis_pengamanan": "Enkripsi database, akses terbatas berbasis peran (role-based access).",
        "langkah_organisasi_pengamanan": "Perjanjian Kerahasiaan (NDA) dengan tim rekrutmen, pelatihan PDP reguler.",
        "kategori_penerima": "Internal",
        "profil_penerima": "Divisi Sumber Daya Manusia, Manajer Perekrutan di divisi terkait.",
        "asesmen_risiko": null,
        "proses_sebelumnya": "Publikasi lowongan pekerjaan.",
        "proses_setelahnya": "Onboarding karyawan baru.",
        "keterangan_tambahan": "Proses ini mencakup pemeriksaan latar belakang oleh pihak ketiga.",
        "saran_ai": "REKOMENDASI & VALIDASI:\n- Masa Retensi: Tidak ditemukan, sarankan untuk diisi '1 Tahun untuk kandidat gagal' sesuai praktik umum.\n- Validasi Departemen: Nilai 'Budi Santoso' terlihat tidak cocok karena ini adalah nama orang, bukan nama departemen."
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
