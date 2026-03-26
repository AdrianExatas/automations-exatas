"""
Teste rápido dos formatos de requisição da API SIEG /BaixarXml
Para descobrir qual formato a API aceita.
"""
import requests
import json
import urllib.parse

API_KEY = 'oecN20qEJJ0D8l6IFq7Nvg=='
CHAVE = '27240102556423000118550010003160881002276752'
BASE_URL = f'https://api.sieg.com/BaixarXml?xmlType=1&api_key={urllib.parse.quote(API_KEY)}'

print(f"URL: {BASE_URL}")
print(f"Chave: {CHAVE}")
print("=" * 70)

# Formato 1: text/plain com body raw (formato antigo)
print("\n[FORMATO 1] text/plain + body raw")
try:
    r = requests.post(
        BASE_URL,
        headers={'Content-Type': 'text/plain', 'Accept': '*/*'},
        data=CHAVE.encode('utf-8'),
        timeout=30
    )
    print(f"  Status: {r.status_code}")
    preview = r.text[:300] if r.text else '(vazio)'
    print(f"  Resposta: {preview}")
except Exception as e:
    print(f"  ERRO: {e}")

# Formato 2: application/json com {"xmlKey": "..."}
print("\n[FORMATO 2] application/json + {{\"xmlKey\": \"...\"}}")
try:
    r = requests.post(
        BASE_URL,
        headers={'Content-Type': 'application/json', 'Accept': '*/*'},
        json={'xmlKey': CHAVE},
        timeout=30
    )
    print(f"  Status: {r.status_code}")
    preview = r.text[:300] if r.text else '(vazio)'
    print(f"  Resposta: {preview}")
except Exception as e:
    print(f"  ERRO: {e}")

# Formato 3: application/json com string JSON pura ("chave")
print("\n[FORMATO 3] application/json + string JSON pura")
try:
    r = requests.post(
        BASE_URL,
        headers={'Content-Type': 'application/json', 'Accept': '*/*'},
        data=json.dumps(CHAVE),
        timeout=30
    )
    print(f"  Status: {r.status_code}")
    preview = r.text[:300] if r.text else '(vazio)'
    print(f"  Resposta: {preview}")
except Exception as e:
    print(f"  ERRO: {e}")

# Formato 4: text/json com string JSON pura
print("\n[FORMATO 4] text/json + string JSON pura")
try:
    r = requests.post(
        BASE_URL,
        headers={'Content-Type': 'text/json', 'Accept': '*/*'},
        data=json.dumps(CHAVE),
        timeout=30
    )
    print(f"  Status: {r.status_code}")
    preview = r.text[:300] if r.text else '(vazio)'
    print(f"  Resposta: {preview}")
except Exception as e:
    print(f"  ERRO: {e}")

print("\n" + "=" * 70)
print("Teste concluido.")
