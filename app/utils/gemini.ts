import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export async function generateAIResponse(
  messages: Array<{ role: string; content: string; image?: string }>,
  options: GenerateOptions = {}
) {
  const {
    temperature = 0.7,
    maxTokens = 8192,
    model = 'gemini-2.0-flash-exp',
  } = options;

  try {
    const geminiModel = genAI.getGenerativeModel({ model });

    const history = messages.slice(0, -1).map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const lastMessage = messages[messages.length - 1];
    const chat = geminiModel.startChat({
      history,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    });

    let result;
    if (lastMessage.image) {
      const imageData = lastMessage.image.split(',')[1];
      result = await chat.sendMessage([
        { text: lastMessage.content },
        {
          inlineData: {
            data: imageData,
            mimeType: 'image/jpeg',
          },
        },
      ]);
    } else {
      result = await chat.sendMessage(lastMessage.content);
    }

    return result.response.text();
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error('Failed to generate AI response');
  }
}
