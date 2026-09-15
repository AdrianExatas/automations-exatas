import re

with open("forel_snippets.txt", "w", encoding="utf-8") as out:
    for fname in [r"C:\Contabil\forel19.pbd", r"C:\Contabil\forel20.pbd"]:
        with open(fname, "rb") as f:
            content = f.read()
        out.write(f"\n\n{'='*80}\n=== {fname} ===\n{'='*80}\n")
        
        text16 = content.decode("utf-16le", errors="ignore")
        text1 = content.decode("latin1", errors="ignore")
        
        for text, enc in [(text16, "utf-16le"), (text1, "latin1")]:
            for m in re.finditer(r"FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR", text, re.IGNORECASE):
                idx = m.start()
                snippet = text[max(0, idx - 800):min(len(text), idx + 2000)]
                clean = "".join([c if c.isprintable() or c in "\r\n\t" else " " for c in snippet])
                out.write(f"\n--- [{enc}] Index {idx} ---\n")
                out.write(clean)
                out.write("\n" + "-" * 60 + "\n")

print("Snippets written to forel_snippets.txt")
