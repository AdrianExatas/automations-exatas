import re

with open(r"C:\Contabil\forel19.pbd", "rb") as f:
    text16 = f.read().decode("utf-16le", errors="ignore")

matches = [m.start() for m in re.finditer(r"valor_rend_trib_mensal_ferias", text16, re.IGNORECASE)]
print(f"Found {len(matches)} matches")

with open("dw_dados_sistema_snippets.txt", "w", encoding="utf-8") as out:
    for i, idx in enumerate(matches):
        snippet = text16[max(0, idx - 800):min(len(text16), idx + 2500)]
        clean = "".join([c if (ord(c) < 128 and (c.isprintable() or c in "\r\n\t")) else (" " if ord(c) >= 128 else c) for c in snippet])
        out.write(f"\n\n{'='*40} MATCH {i+1} {'='*40}\n")
        out.write(clean)

print("Saved to dw_dados_sistema_snippets.txt")
