import re

with open(r"C:\Contabil\forel19.pbd", "rb") as f:
    text16 = f.read().decode("utf-16le", errors="ignore")

matches = [m.start() for m in re.finditer(r"ads_dados_sistema|d_dados_sistema|d_extrator_sistema", text16, re.IGNORECASE)]
print(f"Found {len(matches)} matches in forel19.pbd")

for i, idx in enumerate(matches):
    print(f"\n--- Match {i+1} at index {idx} ---")
    start = max(0, idx - 1500)
    end = min(len(text16), idx + 2500)
    snippet = text16[start:end]
    clean = "".join([c if c.isprintable() or c in "\r\n\t" else " " for c in snippet])
    with open(f"ads_sistema_match_{i+1}.txt", "w", encoding="utf-8") as out:
        out.write(clean)
    print(f"Written to ads_sistema_match_{i+1}.txt")
