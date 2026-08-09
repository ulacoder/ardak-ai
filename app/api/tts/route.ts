import { NextRequest, NextResponse } from 'next/server';

const COQUI_API_URL = process.env.COQUI_API_URL || 'https://monthly-plywood-knickers.ngrok-free.dev';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    console.log('TTS Request:', { text });

    const response = await fetch(
      `${COQUI_API_URL}/tts`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Coqui API error:', response.status, errorText);
      throw new Error(`Coqui API error: ${response.status}`);
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
