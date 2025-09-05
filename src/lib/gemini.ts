import { GoogleGenerativeAI } from "@google/generative-ai";

// Pastikan Anda sudah mengatur GEMINI_API_KEY di file .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export default genAI;
