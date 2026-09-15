with open(r"C:\Contabil\forel19.pbd", "rb") as f:
    text16 = f.read().decode("utf-16le", errors="ignore")

dws = [
    "dw_rel_linhas_extrator_irrf_dados_sistema",
    "dw_rel_linhas_extrator_irrf_dados_retorno",
    "dw_rel_linhas_extrator_irrf_dados_retorno_por_cpf",
    "dw_rel_linhas_extrator_irrf",
    "dw_rel_linhas_extrator_dirf_recolhimento"
]

for dw in dws:
    idx = 0
    match_count = 0
    while True:
        idx = text16.find(dw, idx)
        if idx == -1:
            break
        match_count += 1
        # Extract surrounding 10000 characters
        snippet = text16[max(0, idx - 1000):min(len(text16), idx + 15000)]
        clean = "".join([c if c.isprintable() or c in "\r\n\t" else " " for c in snippet])
        
        # Check if there is a SELECT statement in snippet
        sel_pos = clean.lower().find("select ")
        if sel_pos != -1:
            out_name = f"sql_{dw}_{match_count}.sql"
            with open(out_name, "w", encoding="utf-8") as out:
                out.write(clean[sel_pos:])
            print(f"Saved {out_name}")
        idx += len(dw)

print("Done extracting DW SQLs.")
