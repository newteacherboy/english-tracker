"""Reproducible Diji-Medu artwork and audio. No samples or source images used."""
from pathlib import Path
import math, wave, struct, subprocess

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'ingilizce/ozgun'
ART.mkdir(exist_ok=True)

def svg(name, title, body, width=640, height=420):
    text = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title"><title id="title">{title}</title><rect width="100%" height="100%" rx="28" fill="#effaf7"/>{body}</svg>'
    (ART / (name + '.svg')).write_text(text)

svg('diji-robot', 'Diji: kelime keşif robotu', '<ellipse cx="320" cy="382" rx="130" ry="15" fill="#d5e9e5"/><path d="M260 280v78m120-78v78" stroke="#315c70" stroke-width="35" stroke-linecap="round"/><rect x="216" y="173" width="208" height="137" rx="44" fill="#53b4be"/><rect x="208" y="74" width="224" height="132" rx="42" fill="#386276"/><rect x="231" y="96" width="178" height="80" rx="24" fill="#cff7ed"/><circle cx="274" cy="132" r="12" fill="#386276"/><circle cx="366" cy="132" r="12" fill="#386276"/><path d="M298 151q22 17 44 0M320 75V42" stroke="#386276" stroke-width="8" fill="none" stroke-linecap="round"/><circle cx="320" cy="35" r="15" fill="#e9ab44"/><path d="M210 207l-55 48m276-48l48-37" stroke="#53b4be" stroke-width="30" stroke-linecap="round"/><text x="320" y="260" text-anchor="middle" fill="white" font-family="sans-serif" font-size="35" font-weight="bold">DIJI</text>')
svg('rota-gezgin', 'Rota: meraklı gezgin', '<ellipse cx="320" cy="384" rx="120" ry="14" fill="#d5e9e5"/><path d="M289 285l-18 76m76-76l20 76" stroke="#486d81" stroke-width="32" stroke-linecap="round"/><path d="M254 203q64-49 130 0v98H254Z" fill="#e9aa54"/><path d="M250 220l-46 50m185-50l45-31" stroke="#bd8256" stroke-width="23" stroke-linecap="round"/><circle cx="320" cy="129" r="60" fill="#bd8256"/><path d="M260 127q-5-76 59-77q68 0 62 69l-44-33-22 18-54 16" fill="#344953"/><circle cx="299" cy="133" r="5" fill="#243d46"/><circle cx="345" cy="133" r="5" fill="#243d46"/><path d="M302 159q17 16 34 0" stroke="#6a4338" stroke-width="5" fill="none"/><path d="M254 213l128 78" stroke="#668f89" stroke-width="12"/><rect x="210" y="257" width="68" height="52" rx="14" fill="#668f89"/><text x="320" y="242" text-anchor="middle" fill="#344953" font-family="sans-serif" font-size="24" font-weight="bold">ROTA</text>')
svg('lina-botanik', 'Lina: bitki araştırmacısı', '<ellipse cx="320" cy="384" rx="120" ry="14" fill="#d5e9e5"/><path d="M286 285v75m70-75v75" stroke="#667ba0" stroke-width="31" stroke-linecap="round"/><path d="M255 192q65-45 130 0v116H255Z" fill="#84baa2"/><path d="M259 213l-35 55m159-55l40 39" stroke="#db9b76" stroke-width="23" stroke-linecap="round"/><path d="M257 153q-11-103 61-103q83 0 71 135l-46-19" fill="#674b3f"/><circle cx="320" cy="128" r="56" fill="#db9b76"/><path d="M265 114q8-71 81-54l35 54-60-31-56 31" fill="#674b3f"/><circle cx="300" cy="133" r="5" fill="#344953"/><circle cx="342" cy="133" r="5" fill="#344953"/><path d="M306 159q14 13 28 0" stroke="#785043" stroke-width="5" fill="none"/><rect x="401" y="242" width="56" height="58" rx="8" fill="#cb9070"/><path d="M429 244v-52" stroke="#478464" stroke-width="6"/><path d="M429 217q-46-9-28-31q25 0 28 31m0-13q38-38 46-6q-19 19-46 6" fill="#77b899"/><text x="320" y="245" text-anchor="middle" fill="#315645" font-family="sans-serif" font-size="24" font-weight="bold">LINA</text>')
for n, points in {1:[(160,160)],2:[(95,95),(225,225)],3:[(95,95),(160,160),(225,225)],4:[(95,95),(225,95),(95,225),(225,225)],5:[(95,95),(225,95),(160,160),(95,225),(225,225)],6:[(95,85),(225,85),(95,160),(225,160),(95,235),(225,235)]}.items():
    svg('sayi-'+str(n), str(n)+' nokta', '<rect x="35" y="35" width="250" height="250" rx="42" fill="#fff" stroke="#548c91" stroke-width="9"/>'+''.join(f'<circle cx="{x}" cy="{y}" r="18" fill="#548c91"/>' for x,y in points), 320,320)
svg('calisma-masasi', 'Bilgisayarda çalışan kişi', '<rect x="45" y="50" width="170" height="180" rx="14" fill="#d0edf4"/><path d="M130 50v180M45 138h170" stroke="#fff" stroke-width="8"/><rect x="205" y="271" width="340" height="18" rx="6" fill="#ba906d"/><path d="M227 290v96m295-96v96" stroke="#ba906d" stroke-width="14"/><path d="M294 250v113h64V243" fill="#5d83a6"/><path d="M256 179q59-31 97 10l23 65H251Z" fill="#bb7caa"/><circle cx="302" cy="130" r="40" fill="#cd926e"/><path d="M262 132q-13-71 56-48q38 15 24 55l-48-30" fill="#494650"/><path d="M337 210l56 40" stroke="#cd926e" stroke-width="17" stroke-linecap="round"/><path d="M394 249l-10-81h107l-12 81Z" fill="#39707b"/><rect x="376" y="249" width="120" height="8" rx="3" fill="#39707b"/>')
svg('ucus-panosi', 'Örnek uçuş kalkış panosu', '<rect x="50" y="50" width="540" height="320" rx="20" fill="#29475b"/><text x="85" y="105" font-family="sans-serif" font-size="27" fill="#f4d88a">DEPARTURES</text><g fill="#ecf6f5" font-family="monospace" font-size="22"><text x="85" y="165">09:10  LONDON     A3</text><text x="85" y="220">09:35  BERLIN     B2</text><text x="85" y="275">10:05  MADRID     C1</text><text x="85" y="330">10:40  ROME       A1</text></g>')
svg('hiz-siniri', 'Azami hız 60 trafik işareti', '<path d="M0 340Q160 130 260 250T640 290V420H0Z" fill="#9ecba4"/><path d="M240 420Q570 230 440 200" stroke="#67808a" stroke-width="130" fill="none"/><path d="M240 420Q570 230 440 200" stroke="#f9ecd3" stroke-width="5" stroke-dasharray="25 20" fill="none"/><path d="M128 174v184" stroke="#597a7d" stroke-width="12"/><circle cx="128" cy="112" r="65" fill="#fff" stroke="#d77173" stroke-width="12"/><text x="128" y="130" text-anchor="middle" font-family="sans-serif" font-size="51" fill="#29475b" font-weight="bold">60</text>')
svg('ders-atolyesi', 'Diji-Medu öğrenme atölyesi', '<circle cx="507" cy="110" r="47" fill="#e9c57a"/><path d="M115 300V142q100-60 205 0q105-60 205 0v158q-105-48-205 0q-105-48-205 0" fill="#fff" stroke="#63a4a9" stroke-width="10" stroke-linejoin="round"/><path d="M320 143v158" stroke="#63a4a9" stroke-width="8"/><path d="M150 184h112m-112 42h103m-103 42h91m117-84h113m-113 42h94m-94 42h104" stroke="#bacdd1" stroke-width="8" stroke-linecap="round"/><circle cx="125" cy="325" r="28" fill="#9fceb3"/><path d="M460 344l45-82" stroke="#e4aa62" stroke-width="22" stroke-linecap="round"/>')

# Four gentle, deterministic note arrangements composed for this project.
# Frequencies/oscillators only: no recordings, samples, or existing tune imported.
notes = [[60,67,64,71,62,69,65,72,64,69,60,67,65,71,62,69], [57,64,69,60,65,72,62,67,59,66,71,64,60,69,65,62], [55,62,67,59,64,71,57,65,60,67,62,69,64,72,59,66], [60,64,69,62,67,71,65,72,59,66,69,64,57,62,67,60]]
for idx, melody in enumerate(notes,1):
    rate=22050; beat=.55; length=round(rate*beat*len(melody)); data=[0.0]*length
    for j,n in enumerate(melody):
        start=round(j*beat*rate); duration=round(.49*rate); freq=440*2**((n-69)/12)
        for k in range(min(duration,length-start)):
            t=k/rate; envelope=min(1,t/.045)*max(0,1-t/.49)**2
            data[start+k]+=.19*envelope*(math.sin(2*math.pi*freq*t)+.17*math.sin(2*math.pi*freq*2*t))
    wavefile=ART/f'tema-{idx}.wav'
    with wave.open(str(wavefile),'wb') as f:
        f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate);f.writeframes(b''.join(struct.pack('<h',round(max(-1,min(1,x))*32767)) for x in data))
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(wavefile),'-codec:a','libmp3lame','-q:a','6',str(ART/f'tema-{idx}.mp3')],check=True)
    wavefile.unlink()
print('Created 13 original SVG illustrations and 4 sample-free audio arrangements.')
