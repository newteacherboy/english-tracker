"""Check provenance records and hashes; this is not a legal clearance opinion."""
import hashlib,json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
manifest=json.loads((root/'docs/media-rights-manifest.json').read_text())
records={r['path']:r for r in manifest['assets']}
files=[p for p in root.iterdir() if p.is_file()]+list((root/'ingilizce').rglob('*'))
media={p.relative_to(root).as_posix():p for p in files if p.is_file() and p.suffix.lower() in {'.png','.svg','.webp','.mp3','.wav','.ogg'}}
errors=[]
for name in sorted(set(media)|set(records)):
 r=records.get(name);p=media.get(name)
 if not r or not p:errors.append('Missing file or record: '+name);continue
 if not r.get('source') or not r.get('status'):errors.append('Missing provenance: '+name)
 if hashlib.sha256(p.read_bytes()).hexdigest()!=r['sha256']:errors.append('Changed asset: '+name)
if errors:raise SystemExit('\n'.join(errors))
print(f'PASS: {len(media)} media assets have matching provenance records')
