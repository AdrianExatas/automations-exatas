import re

pbd_path = r"C:\Contabil\dirf.pbd"
with open(pbd_path, "rb") as f:
    data = f.read()

# Try ascii / latin1 decoding
text = data.decode("latin1", errors="ignore")

# Find occurrences of FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR
matches = [m.start() for m in re.finditer(r"FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR", text, re.IGNORECASE)]
print(f"Found {len(matches)} occurrences in dirf.pbd")

for idx in matches[:5]:
    start = max(0, idx - 400)
    end = min(len(text), idx + 800)
    snippet = text[start:end]
    # Clean non-printable chars
    clean_snippet = "".join([c if c.isprintable() or c in "\r\n\t" else " " for c in snippet])
    print("=" * 80)
    print(clean_snippet)
