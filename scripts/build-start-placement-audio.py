"""Build local MP3 listening recordings from the canonical item bank.
Requires Node.js and FFmpeg with libflite; slt is the built-in US English voice.
The utterance text is original DijiMedu content. No cloud TTS account is needed.
After rebuilding, refresh the corresponding media-rights-manifest hashes.
"""
import json, subprocess, tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
js="const fs=require('fs'),vm=require('vm'),c={};c.globalThis=c;vm.createContext(c);for(const f of ['placement-bank.js','start-placement-bank.js'])vm.runInContext(fs.readFileSync('ingilizce/'+f,'utf8'),c);process.stdout.write(JSON.stringify(c.DMStartPlacementBank.bank.filter(q=>q.skill==='listening')));"
items=json.loads(subprocess.check_output(['node','-e',js],cwd=ROOT))
out=ROOT/'ingilizce/start-placement-audio';out.mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(prefix='diji-placement-') as tmp:
    speech=Path(tmp)/'speech.txt'
    for item in items:
        speech.write_text(item['text'])
        subprocess.run(['ffmpeg','-v','error','-y','-f','lavfi','-i',f'flite=textfile={speech}:voice=slt','-af','atempo=0.9,apad=pad_dur=0.25','-ar','24000','-b:a','64k',str(out/(item['id']+'.mp3'))],check=True)
print(f'Built {len(items)} MP3 listening recordings')
