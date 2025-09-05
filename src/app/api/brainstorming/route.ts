import { NextRequest, NextResponse } from "next/server";
import genAI from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { question, context } = await req.json();

    if (!question || !context) {
      return NextResponse.json(
        { error: "Question and context are required." },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      Anda adalah seorang asisten analis data yang cerdas dan membantu.
      Tugas Anda adalah menjawab pertanyaan berdasarkan data yang telah diekstrak sebelumnya.

      Berikut adalah data yang diekstrak dari dokumen dalam format JSON:
      \`\`\`json
      ${JSON.stringify(context, null, 2)}
      \`\`\`

      Berdasarkan data di atas, jawablah pertanyaan pengguna berikut.
      Jawablah dengan singkat, jelas, dan hanya berdasarkan informasi yang tersedia dalam data. 
      Jika pertanyaan tidak bisa dijawab dari data yang ada, katakan bahwa informasinya tidak tersedia.

      Pertanyaan Pengguna: "${question}"
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    return NextResponse.json({ answer: responseText });
  } catch (error) {
    console.error("Error in brainstorming API:", error);
    return NextResponse.json(
      { error: "Internal server error during brainstorming." },
      { status: 500 }
    );
  }
}
