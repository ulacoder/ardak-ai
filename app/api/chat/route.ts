import { NextRequest, NextResponse } from 'next/server';

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || 'sk-ws-H.DMEIHME.CVOh.MEUCICMcX0z2RAlfZ_H8QyVNq6hsSYG9b9vNEQbIVzMT0zzzAiEAjEwtQ_Y5cCVPTE2gTu4WzohG56ixRjuUUtPRxeUStTE';
const BASE_URL = 'https://ws-3z8ma1etfmntvskr.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1';
const ISIDA_PASSWORD = process.env.ISIDA_PASSWORD || 'OTVkOWQxODktZjQ5Ni00YmNl';

// Simple in-memory usage tracking
const dailyUsage = new Map<string, number>();

// Detect if user question needs web search
function needsWebSearch(message: string): boolean {
  const lowerMsg = message.toLowerCase();

  // Keywords that indicate need for current information
  const searchTriggers = [
    'сейчас', 'сегодня', 'вчера', 'завтра', 'текущий', 'актуальн',
    'курс', 'цена', 'стоимость', 'стоит', 'погода', 'новости',
    'последн', 'свежи', 'когда выйд', 'дата выхода', 'расписание',
    'где купить', 'найди', 'поищи', 'погугли', 'в интернете'
  ];

  return searchTriggers.some(trigger => lowerMsg.includes(trigger));
}

export async function POST(req: NextRequest) {
  try {
    const { messages, password } = await req.json();

    // 1. Check password
    if (password !== ISIDA_PASSWORD) {
      console.log('❌ Invalid password attempt');
      return NextResponse.json(
        { error: 'Неверный пароль для доступа к Исиде' },
        { status: 401 }
      );
    }

    // 2. Rate limiting (150 messages per day)
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const currentUsage = dailyUsage.get(today) || 0;

    if (currentUsage >= 150) {
      console.log('⚠️ Daily limit reached:', currentUsage);
      return NextResponse.json(
        { error: 'Дневной лимит сообщений достигнут (150/день). Попробуй завтра!' },
        { status: 429 }
      );
    }

    console.log('📨 Received messages count:', messages?.length);
    console.log('📊 Usage today:', currentUsage + 1, '/ 150');
    console.log('📜 Last 3 messages:', messages?.slice(-3));

    if (!messages || messages.length === 0) {
      return NextResponse.json({ response: "Напиши что-нибудь..." });
    }

    const systemPrompt = `Ты - Исида, умный и добрый AI-ассистент.

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

    const recentMessages = messages.slice(-50);

    // Check if last user message needs web search
    const lastUserMessage = recentMessages.filter((m: any) => m.role === 'user').pop();
    const enableWebSearch = lastUserMessage && needsWebSearch(lastUserMessage.content);

    console.log('🌐 Web search enabled:', enableWebSearch);

    // Build messages for Alibaba Model Studio
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...recentMessages.map((msg: any) => {
        if (msg.role === 'user' && msg.image) {
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

    const requestBody: any = {
      model: 'qwen3.5-flash',
      messages: apiMessages,
      temperature: 0.9,
      max_tokens: 2000,
      stream: false
    };

    // Enable web_search only when needed
    if (enableWebSearch) {
      requestBody.extra_body = {
        tools: [{ type: 'web_search' }]
      };
    }

    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Alibaba Model Studio error:', errorData);
      throw new Error(errorData.error?.message || JSON.stringify(errorData) || 'Alibaba API error');
    }

    const data = await response.json();
    let aiResponse = data.choices[0]?.message?.content;

    if (!aiResponse || aiResponse.trim() === '') {
      throw new Error('AI не дал ответ. Попробуйте еще раз.');
    }

    // Remove reasoning blocks and other artifacts
    aiResponse = aiResponse
      .replace(/^\n+/, '')
      .replace(/Here's a thinking process:[\s\S]*?(?=\n\n|$)/gi, '')
      .replace(/Thinking Process:[\s\S]*?(?=\n\n|$)/gi, '')
      .replace(/^\d+\.\s+\*\*[^*]+\*\*:[\s\S]*?(?=\n\d+\.|\n\n|$)/gm, '')
      .trim();

    // 3. Update usage counter AFTER successful response
    dailyUsage.set(today, currentUsage + 1);

    return NextResponse.json({ response: aiResponse });

  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: `Ошибка: ${error.message || 'Что-то пошло не так'}` },
      { status: 500 }
    );
  }
}
