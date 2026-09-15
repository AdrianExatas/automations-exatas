with open("dw_search_results.txt", "w", encoding="utf-8") as out:
    for fname in [r"C:\Contabil\forel19.pbd", r"C:\Contabil\forel20.pbd"]:
        with open(fname, "rb") as f:
            text16 = f.read().decode("utf-16le", errors="ignore")
        
        target = "dw_rel_linhas_extrator_irrf_dados_sistema"
        import re
        matches = [m.start() for m in re.finditer(re.escape(target), text16, re.IGNORECASE)]
        out.write(f"File {fname}: matches {matches}\n")
        for m in matches:
            snippet = text16[max(0, m - 500):m + 5000]
            clean = "".join([c if c.isprintable() or c in "\r\n\t" else " " for c in snippet])
            out.write("=" * 60 + "\n")
            out.write(clean + "\n")

print("Written to dw_search_results.txt")
