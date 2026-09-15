with open(r"C:\Contabil\forel19.pbd", "rb") as f:
    text16 = f.read().decode("utf-16le", errors="ignore")

idx = text16.find("union refatoracao")
if idx == -1:
    idx = text16.find("TD_MOVTOSERV.VALOR_PREVIDENCIA_OFICIAL_MENSAL_FERIAS")

print("Found at", idx)
start = text16.rfind("SELECT", 0, idx + 100)
# Search forward for the end of query (usually followed by PowerBuilder binary or another datawindow definition)
# Let's extract 15000 characters
chunk = text16[start:start+25000]

with open("query_sistema_completa.sql", "w", encoding="utf-8") as out:
    clean = "".join([c if (ord(c) < 128 and (c.isprintable() or c in "\r\n\t")) else (" " if ord(c) >= 128 else c) for c in chunk])
    out.write(clean)

print("Saved to query_sistema_completa.sql")
