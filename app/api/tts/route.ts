import { NextRequest, NextResponse } from 'next/server';

const FISH_AUDIO_API_KEY = process.env.FISH_AUDIO_API_KEY;
const FISH_AUDIO_VOICE_ID = process.env.FISH_AUDIO_VOICE_ID;

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    console.log('Fish Audio TTS Request:', { text });

    const response = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FISH_AUDIO_API_KEY}`,
        'Content-Type': 'application/json',
        'model': 's2.1-pro-free',
      },
      body: JSON.stringify({
        text: text,
        reference_id: FISH_AUDIO_VOICE_ID,
        format: 'mp3',
        normalize: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Fish Audio API error:', response.status, errorText);
      throw new Error(`Fish Audio API error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    console.log('Fish Audio TTS Success: Generated audio', audioBuffer.byteLength, 'bytes');

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('Fish Audio TTS error:', error);
    return NextResponse.json(
      { error: 'Ошибка генерации голоса' },
      { status: 500 }
    );
  }
}
