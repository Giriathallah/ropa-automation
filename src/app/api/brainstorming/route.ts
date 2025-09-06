import { NextRequest, NextResponse } from "next/server";
import genAI from "@/lib/gemini";

// Helper untuk menyederhanakan data state sebelum dikirim ke AI
const simplifyContext = (context: any[]) => {
  return context.map((row) => {
    const simplifiedRow: { [key: string]: any } = { fileName: row.fileName };
    for (const key in row) {
      if (key !== "fileName" && key !== "saran_ai" && row[key]?.value) {
        simplifiedRow[key] = row[key].value;
      }
    }
    return simplifiedRow;
  });
};

export async function POST(req: NextRequest) {
  try {
    const { question, context } = await req.json();

    if (!question || !context) {
      return NextResponse.json(
        { error: "Question and context are required." },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const simplifiedData = simplifyContext(context);

    const prompt = `
      Anda adalah asisten analis data yang sangat teliti dan membantu.
      Tugas Anda adalah menjawab pertanyaan pengguna atau memodifikasi data berdasarkan konteks yang diberikan.
      Konteks adalah array dari objek JSON, di mana setiap objek merepresentasikan satu baris data dari file yang berbeda, diidentifikasi oleh "fileName".

      ## Aturan Penting:
      1.  **Jika Pengguna Hanya Bertanya**: Jawab pertanyaan berdasarkan data yang ada. Kembalikan HANYA properti "answer" berisi jawaban Anda.
      2.  **Jika Pengguna Meminta Modifikasi** (misal: "ubah", "ganti", "isi kolom X untuk file Y"):
          - Identifikasi **fileName** target, **field** yang akan diubah, dan **nilai barunya**.
          - Kembalikan properti "answer" berisi konfirmasi Anda (misal: "Baik, sudah saya ubah.").
          - Kembalikan properti "updatedData", yaitu sebuah ARRAY berisi objek perubahan. Setiap objek harus memiliki format: { "fileName": "nama_file.pdf", "field": "nama_kolom", "value": "nilai_baru" }.
      3.  Selalu gunakan key JSON yang sama persis seperti di konteks (contoh: 'no_aktivitas', 'unit_kerja').
      4.  Jika pengguna meminta untuk mengubah sesuatu di semua file, buat objek perubahan untuk setiap file dalam array "updatedData".

      ## Konteks Data Saat Ini:
      \`\`\`json
      ${JSON.stringify(simplifiedData, null, 2)}
      \`\`\`

      ## Pertanyaan Pengguna:
      "${question}"

      ## Contoh Respons untuk Modifikasi:
      {
        "answer": "Ok, saya telah mengubah Penanggung Jawab untuk file 'memo.pdf' menjadi 'Direktur IT'.",
        "updatedData": [
          {
            "fileName": "memo.pdf",
            "field": "penanggung_jawab",
            "value": "Direktur IT"
          }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const jsonResponse = JSON.parse(
      responseText.replace(/```json|```/g, "").trim()
    );

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("Error in brainstorming API:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
