import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json({ response: "Напиши что-нибудь..." });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.9,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      },
    });

    const systemPrompt = `Ты - Ардак, умный AI-ассистент. Общайся четко, по делу, но по-человечески.
Отвечай на вопросы полно и понятно. Не обрывай ответы.
Запоминай информацию о пользователе и используй её.
Отвечай 2-3 предложения. Без лишних эмоций и "как дела?".`;

    const recentMessages = messages.slice(-10);

    // Build content parts for Gemini vision
    const contentParts: any[] = [];

    // Add system prompt
    contentParts.push({ text: systemPrompt + "\n\nИстория разговора:\n" });

    // Add conversation history
    for (const msg of recentMessages) {
      const role = msg.role === 'user' ? 'Пользователь' : 'Ардак';
      contentParts.push({ text: `${role}: ${msg.content}\n` });

      // If user message has an image, include it
      if (msg.role === 'user' && msg.image) {
        const base64Data = msg.image.split(',')[1];
        const mimeType = msg.image.split(':')[1].split(';')[0];
        contentParts.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        });
      }
    }

    contentParts.push({ text: "\nОтветь как Ардак:" });

    const result = await model.generateContent(contentParts);
    const aiResponse = result.response.text();

    return NextResponse.json({ response: aiResponse });

  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: `Ошибка: ${error.message || 'Что-то пошло не так'}` },
      { status: 500 }
    );
  }
}
