"""Generate Digital Asset Links after Play Console issues the app signing SHA-256."""
import argparse, json, re
from pathlib import Path
p = argparse.ArgumentParser()
p.add_argument('--sha256', required=True, help='Play Console > App integrity > App signing certificate SHA-256')
p.add_argument('--output', required=True)
a = p.parse_args()
fingerprint = a.sha256.strip().upper()
if not re.fullmatch(r'(?:[0-9A-F]{2}:){31}[0-9A-F]{2}', fingerprint):
    p.error('Supply the actual SHA-256 certificate fingerprint (32 colon-separated bytes).')
payload = [{'relation': ['delegate_permission/common.handle_all_urls'], 'target': {
    'namespace': 'android_app', 'package_name': 'com.ogretmencocuk.dijimedu',
    'sha256_cert_fingerprints': [fingerprint]}}]
output = Path(a.output)
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(payload, indent=2) + '\n')
print(output)
