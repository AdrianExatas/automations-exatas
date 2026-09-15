import re

with open(r"C:\Contabil\forel19.pbd", "rb") as f:
    text16 = f.read().decode("utf-16le", errors="ignore")

# Let's search for "Folha Mensal + Férias"
matches = [m.start() for m in re.finditer(r"Folha Mensal \+ F[eé]rias", text16, re.IGNORECASE)]
print(f"Found {len(matches)} matches for 'Folha Mensal + Férias' in forel19.pbd")

for i, idx in enumerate(matches):
    print(f"\n--- Match {i+1} at index {idx} ---")
    start = max(0, idx - 1500)
    end = min(len(text16), idx + 2500)
    snippet = text16[start:end]
    clean = "".join([c if c.isprintable() or c in "\r\n\t" else " " for c in snippet])
    with open(f"query_match_{i+1}.sql", "w", encoding="utf-8") as out:
        out.write(clean)
    print(f"Written to query_match_{i+1}.sql")
