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
    const file = formData.get("datanya") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File not found." }, { status: 400 });
    }

    // const allowedMimeTypes = ["image/png", "image/jpeg", "application/pdf"];
    // if (!allowedMimeTypes.includes(file.type)) {
    //   return NextResponse.json(
    //     { error: `Unsupported file type: ${file.type}.` },
    //     { status: 400 }
    //   );
    // }

    const fileBuffer = await streamToBuffer(file.stream());
    const imagePart = fileToGenerativePart(fileBuffer, file.type);

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      Anda adalah asisten AI yang ahli dalam analisis dokumen untuk kepatuhan privasi data (RoPA).
      
      Tugas Anda adalah menganalisis secara teliti gambar dokumen yang diberikan dan mengekstrak informasi berikut:
      - "unit_kerja": Nama Unit Kerja atau Divisi.
      - "departemen": Nama Departemen atau Sub-Departemen.
      - "penanggung_jawab": Nama orang atau jabatan yang bertanggung jawab atas proses bisnis.

      ATURAN PENTING:
      1.  **Analisis Mendalam**: Baca seluruh teks yang ada di dalam gambar untuk menemukan informasi yang paling relevan.
      2.  **Penanganan Data Hilang**: Jika salah satu dari tiga informasi di atas TIDAK DAPAT DITEMUKAN secara eksplisit di dalam dokumen, isi nilainya dengan 'null'.
      3.  **Berikan Saran (Brainstorming)**: Buat properti baru bernama "saran_ai". Jika ada nilai yang 'null', berikan saran yang paling logis berdasarkan konteks dokumen yang ada. Jika tidak ada konteks untuk memberikan saran, berikan string kosong.
      4.  **Format Output**: Kembalikan hasilnya HANYA dalam format JSON yang valid. Jangan tambahkan penjelasan atau teks lain di luar JSON.

      Contoh Output 1 (semua data ditemukan):
      {
        "unit_kerja": "Divisi Pemasaran",
        "departemen": "Pemasaran Digital",
        "penanggung_jawab": "Budi Santoso",
        "saran_ai": ""
      }

      Contoh Output 2 (penanggung jawab tidak ditemukan):
      {
        "unit_kerja": "Divisi Teknologi",
        "departemen": "Infrastruktur IT",
        "penanggung_jawab": null,
        "saran_ai": "Saran: Penanggung jawab proses kemungkinan adalah 'Kepala Infrastruktur IT' atau 'Manajer IT'."
      }
    `;

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();

    const jsonResponse = JSON.parse(
      responseText.replace(/```json|```/g, "").trim()
    );

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("Error processing file:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
