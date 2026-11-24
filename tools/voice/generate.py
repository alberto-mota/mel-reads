"""Records Sparkle's voice clips with Kokoro, an open neural voice (Apache-2.0), into src/voice/<name>/.

Usage: python tools/voice/generate.py texts.json
Only new lines are recorded; clips for lines that no longer exist are removed. index.json lists the clips the app may play.
Env: VOICE (Kokoro voice id, default af_heart), SAMPLES=1 also records a short sample of a few voices to compare.
"""
import json, os, pathlib, subprocess, sys, tempfile

import numpy as np
import soundfile as sf
from kokoro import KPipeline

VOICE = os.environ.get('VOICE', 'af_heart')
ROOT = pathlib.Path(__file__).resolve().parents[2] / 'src' / 'voice'
OUT = ROOT / VOICE.split('_', 1)[1]
WORD_SPEED, LINE_SPEED = 0.8, 0.92  # single words a little slower, so every sound is clear
# Words the voice would otherwise say differently from how we teach them (misaki phoneme syntax).
PRONOUNCE = {'a': '[a](/ə/)', 'A': '[A](/ə/)'}
SAMPLE_VOICES = ['af_heart', 'af_bella', 'bf_emma', 'af_nicole']
SAMPLE_TEXT = "Hi Mel! Let's read so I can have my treats! cat. ship. The fish is in the dish."

pipes = {}
def pipe(voice):
    lang = voice[0]
    if lang not in pipes: pipes[lang] = KPipeline(lang_code=lang)
    return pipes[lang]

def record(text, voice, speed, mp3):
    chunks = [np.asarray(r.audio) for r in pipe(voice)(text, voice=voice, speed=speed) if r.audio is not None]
    with tempfile.NamedTemporaryFile(suffix='.wav') as wav:
        sf.write(wav.name, np.concatenate(chunks), 24000)
        # a hair of silence on both ends, even loudness, small mono mp3
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', wav.name,
                        '-af', 'adelay=30,apad=pad_dur=0.06,loudnorm=I=-16:TP=-1.5:LRA=11',
                        '-ac', '1', '-ar', '24000', '-b:a', '48k', str(mp3)], check=True)

def main():
    items = json.load(open(sys.argv[1]))
    OUT.mkdir(parents=True, exist_ok=True)
    keep = {x['id'] for x in items}
    for f in OUT.glob('*.mp3'):
        if f.stem not in keep: f.unlink()
    todo = [x for x in items if not (OUT / f"{x['id']}.mp3").exists()]
    for n, x in enumerate(todo, 1):
        text = x['text']; single = ' ' not in text
        spoken = PRONOUNCE.get(text, text)
        if single and (spoken[-1].isalnum() or spoken.endswith(')')): spoken += '.'  # falling tone, like reading a word card
        record(spoken, VOICE, WORD_SPEED if single else LINE_SPEED, OUT / f"{x['id']}.mp3")
        print(f'{n}/{len(todo)} {text}', flush=True)
    (OUT / 'index.json').write_text(json.dumps({'voice': VOICE, 'clips': sorted(keep)}) + '\n')
    if os.environ.get('SAMPLES'):
        (ROOT / 'samples').mkdir(exist_ok=True)
        for v in SAMPLE_VOICES: record(SAMPLE_TEXT, v, LINE_SPEED, ROOT / 'samples' / f'{v}.mp3')

if __name__ == '__main__':
    main()
