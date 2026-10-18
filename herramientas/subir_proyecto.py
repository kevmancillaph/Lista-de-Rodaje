#!/usr/bin/env python3
"""Cifra un proyecto de Lista de Rodaje y lo agrega a proyectos/.

Uso (desde la raiz del repo):
    RODAJE_KEY=<clave> python3 herramientas/subir_proyecto.py proyecto.json

proyecto.json: {"title": "...", "speakers": [{"name": "X"}], "items": [{"type": "accion"|"dialogo", "speaker": "X", "text": "..."}]}
La clave es base64url de 32 bytes. Genera una con: python3 herramientas/subir_proyecto.py --nueva-clave
"""
import base64, json, os, secrets, sys, datetime
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

def b64u(b): return base64.urlsafe_b64encode(b).decode().rstrip("=")
def unb64u(s): return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))

def main():
    if len(sys.argv) == 2 and sys.argv[1] == "--nueva-clave":
        print(b64u(secrets.token_bytes(32))); return
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    key = os.environ.get("RODAJE_KEY", "")
    if not key:
        sys.exit("Falta RODAJE_KEY")
    kb = unb64u(key)
    if len(kb) != 32:
        sys.exit("La clave debe ser de 32 bytes (base64url)")

    data = json.load(open(sys.argv[1], encoding="utf-8"))
    if not data.get("items"):
        sys.exit("El proyecto no tiene items")
    data.setdefault("createdAt", datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"))

    iv = secrets.token_bytes(12)
    ct = AESGCM(kb).encrypt(iv, json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode("utf-8"), None)
    name = "p_" + secrets.token_hex(6) + ".json"

    os.makedirs("proyectos", exist_ok=True)
    json.dump({"v": 1, "iv": b64u(iv), "ct": b64u(ct)}, open(os.path.join("proyectos", name), "w"), separators=(",", ":"))

    idx_path = os.path.join("proyectos", "index.json")
    idx = json.load(open(idx_path)) if os.path.exists(idx_path) else {"v": 1, "files": []}
    idx["files"].append(name)
    json.dump(idx, open(idx_path, "w"), indent=1)
    print(name)

main()
