import { NextRequest, NextResponse } from 'next/server';

const TTS_API_URL = process.env.TTS_API_URL || 'https://isida-ai-backend.onrender.com';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    console.log('TTS Request:', { text });

    const response = await fetch(
      `${TTS_API_URL}/speak?text=${encodeURIComponent(text)}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('TTS API error:', response.status, errorText);
      throw new Error(`TTS API error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    console.log('TTS Success: Generated audio', audioBuffer.byteLength, 'bytes');

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('TTS API error:', error);
    return NextResponse.json(
      { error: 'Ошибка генерации голоса' },
      { status: 500 }
    );
  }
}
