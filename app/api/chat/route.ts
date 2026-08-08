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
    const conversationHistory = recentMessages
      .map((msg: any) => `${msg.role === 'user' ? 'Пользователь' : 'Ардак'}: ${msg.content}`)
      .join('\n');

    const lastMessage = recentMessages[recentMessages.length - 1].content;

    const fullPrompt = `${systemPrompt}

История разговора:
${conversationHistory}

Текущий вопрос: ${lastMessage}

Ответь как Ардак:`;

    const result = await model.generateContent(fullPrompt);
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
