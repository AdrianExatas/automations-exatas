with open(r"C:\Contabil\forel19.pbd", "rb") as f:
    text16 = f.read().decode("utf-16le", errors="ignore")

idx = text16.find("TD_MOVTOSERV.VALOR_PREVIDENCIA_OFICIAL_MENSAL_FERIAS")
print("Target at:", idx)

# Find the start of this SQL query. It usually starts with SELECT or WITH
start_pos = text16.rfind("datawindow(", 0, idx)
if start_pos == -1:
    start_pos = text16.rfind("SELECT", 0, idx - 2000)

print("Start pos:", start_pos)

# Look for retrieve="
ret_pos = text16.find('retrieve="', start_pos)
print("retrieve pos:", ret_pos)

if ret_pos != -1 and ret_pos < idx:
    # SQL starts at ret_pos + 10
    end_quote = text16.find('~"\n', ret_pos)
    if end_quote == -1:
        end_quote = text16.find('arguments=', ret_pos)
    sql_text = text16[ret_pos + 10:end_quote]
else:
    # Just take 30,000 chars around idx
    sql_text = text16[idx - 8000:idx + 25000]

clean = "".join([c if (ord(c) < 128 and (c.isprintable() or c in "\r\n\t")) else (" " if ord(c) >= 128 else c) for c in sql_text])
with open("exact_sistema_query.sql", "w", encoding="utf-8") as out:
    out.write(clean)

print("Saved exact_sistema_query.sql, length:", len(clean))
