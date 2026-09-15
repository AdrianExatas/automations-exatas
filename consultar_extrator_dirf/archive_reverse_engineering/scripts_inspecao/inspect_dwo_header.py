with open(r"C:\Contabil\forel19.pbd", "rb") as f:
    text16 = f.read().decode("utf-16le", errors="ignore")

target = "dw_rel_linhas_extrator_irrf_dados_sistema.dwo"
idx = text16.find(target)
print(f"Found {target} at {idx}")

if idx != -1:
    # In PBD, the offset of the object might be right there
    snippet = text16[idx:idx + 5000]
    clean = "".join([c if c.isprintable() or c in "\r\n\t" else " " for c in snippet])
    with open("dw_dados_sistema_header.txt", "w", encoding="utf-8") as out:
        out.write(clean)
    print("Saved to dw_dados_sistema_header.txt")
