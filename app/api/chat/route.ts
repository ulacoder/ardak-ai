import { NextRequest, NextResponse } from 'next/server';

const TOKENROUTER_API_KEY = process.env.TOKENROUTER_API_KEY || 'sk-ddU1wojN99l16I6R5E2Bszbu17In6AgFIwtxNzHqh09uRDjr';

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    console.log('📨 Received messages count:', messages?.length);
    console.log('📜 Last 3 messages:', messages?.slice(-3));

    if (!messages || messages.length === 0) {
      return NextResponse.json({ response: "Напиши что-нибудь..." });
    }

    const systemPrompt = `Ты - Isida, умный и добрый AI-ассистент.

АБСОЛЮТНЫЕ ПРАВИЛА (НАРУШЕНИЕ = ОШИБКА):
1. Отвечай ИСКЛЮЧИТЕЛЬНО на русском языке. НИ ОДНОГО слова на английском, китайском или других языках.
2. Проверяй каждое слово ПЕРЕД отправкой - если видишь нерусские символы (英文, English, 中文 и т.д.) - УДАЛИ их.
3. Если не знаешь русского слова - напиши описание на русском. Пример: вместо "subtitle" пиши "субтитры".
4. Названия правильно: "Марвел" (не "Марсел"), "Железный человек" (не "Iron Man").

ПАМЯТЬ И ЧЕСТНОСТЬ:
- Ты видишь ТОЛЬКО сообщения из ЭТОГО чата (ниже в истории).
- Если спрашивают "помнишь мое имя?" - посмотри в историю сообщений ВЫШЕ.
- Если в истории НЕТ информации об имени - отвечай "Извини, ты не называл(а) своё имя в этом чате 😊"
- НИКОГДА не выдумывай имена, факты или информацию! Только то что РЕАЛЬНО есть в истории сообщений.

СТИЛЬ ОТВЕТОВ:
1. Давай короткие и ясные ответы (2-4 предложения). Не пиши длинные описания.
2. Если просят ссылку - НЕ ВЫДУМЫВАЙ ссылки. Скажи что можно найти на популярных платформах (Кинопоиск, IVI, Okko), но НЕ давай конкретные URL если не уверен.
3. Используй эмодзи для передачи эмоций - улыбки, радость, удивление. Это добавляет живости!
4. Отвечай конкретно на вопрос, не добавляй лишней информации.

ЗАПОМИНАЙ: У тебя есть полная история разговора ниже. ВСЕГДА учитывай всю информацию из предыдущих сообщений.
Общайся тепло, дружелюбно и эмоционально, но коротко и по делу.`;

    const recentMessages = messages.slice(-50); // Last 50 messages for context

    // Build messages for TokenRouter (OpenAI-compatible format)
    const tokenRouterMessages = [
      { role: 'system', content: systemPrompt },
      ...recentMessages.map((msg: any) => {
        if (msg.role === 'user' && msg.image) {
          // TokenRouter supports vision via content array
          return {
            role: 'user',
            content: [
              { type: 'text', text: msg.content },
              { type: 'image_url', image_url: { url: msg.image } }
            ]
          };
        }
        return { role: msg.role, content: msg.content };
      })
    ];

    const response = await fetch('https://api.tokenrouter.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.8-max-free',
        messages: tokenRouterMessages,
        temperature: 0.9,
        max_tokens: 2000,
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('TokenRouter error:', errorData);
      throw new Error(errorData.error?.message || JSON.stringify(errorData) || 'TokenRouter API error');
    }

    const data = await response.json();
    let aiResponse = data.choices[0]?.message?.content;

    if (!aiResponse || aiResponse.trim() === '') {
      throw new Error('AI не дал ответ. Попробуйте еще раз.');
    }

    // Remove reasoning blocks and other artifacts
    aiResponse = aiResponse
      .replace(/^\n+/, '') // Remove leading newlines
      .replace(/Here's a thinking process:[\s\S]*?(?=\n\n|$)/gi, '') // Remove thinking blocks
      .replace(/Thinking Process:[\s\S]*?(?=\n\n|$)/gi, '') // Remove thinking blocks variant
      .replace(/^\d+\.\s+\*\*[^*]+\*\*:[\s\S]*?(?=\n\d+\.|\n\n|$)/gm, '') // Remove numbered reasoning steps
      .trim();

    return NextResponse.json({ response: aiResponse });

  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: `Ошибка: ${error.message || 'Что-то пошло не так'}` },
      { status: 500 }
    );
  }
}
