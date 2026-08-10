from fastapi import FastAPI
from fastapi.responses import FileResponse
from gtts import gTTS
import uuid
import os

app = FastAPI()

@app.get("/speak")
def speak(text: str):
    filename = f"/tmp/{uuid.uuid4()}.mp3"
    tts = gTTS(text=text, lang="ru")
    tts.save(filename)
    return FileResponse(filename, media_type="audio/mpeg")
