with open(r"C:\Contabil\forel19.pbd", "rb") as f:
    text16 = f.read().decode("utf-16le", errors="ignore")

# Find the start of the datawindow definition for dw_rel_linhas_extrator_irrf_dados_sistema
dw_name = "dw_rel_linhas_extrator_irrf_dados_sistema"
pos = text16.find(dw_name)
print(f"DataWindow {dw_name} at {pos}")

# In PB DataWindow export syntax, retrieve=" ... " or similar.
# Let's search after pos for SELECT
sel_pos = text16.find("SELECT", pos)
print("SELECT after DW at:", sel_pos)

# Also let's check where the query ends. It ends before arguments=(...) or next datawindow or table(...)
# Let's search for "arguments=("
arg_pos = text16.find("arguments=(", sel_pos)
print("arguments=( at:", arg_pos)

if arg_pos != -1:
    full_sql = text16[sel_pos:arg_pos]
else:
    full_sql = text16[sel_pos:sel_pos + 60000]

clean = "".join([c if (ord(c) < 128 and (c.isprintable() or c in "\r\n\t")) else (" " if ord(c) >= 128 else c) for c in full_sql])

with open("dw_dados_sistema_completo.sql", "w", encoding="utf-8") as out:
    out.write(clean)

print("Saved dw_dados_sistema_completo.sql, length:", len(clean))
