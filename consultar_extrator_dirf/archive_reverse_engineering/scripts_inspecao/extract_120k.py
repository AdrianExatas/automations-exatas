with open(r"C:\Contabil\forel19.pbd", "rb") as f:
    text16 = f.read().decode("utf-16le", errors="ignore")

idx = text16.find("TD_MOVTOSERV.VALOR_PREVIDENCIA_OFICIAL_MENSAL_FERIAS")
print("Target at:", idx)

# Find the start of the query
start = text16.rfind("SELECT", 0, idx - 500)
# Check if there is another SELECT before this one (like union or with)
p = text16.rfind("SELECT", 0, start - 50)
while p != -1 and start - p < 1000:
    start = p
    p = text16.rfind("SELECT", 0, start - 50)

print("Start at:", start)

# Let's extract 120,000 characters from start
chunk = text16[start:start+120000]

# Find where SQL ends (e.g. where the next table/datawindow or non-SQL block begins)
# Often there is a WHERE clause followed by ORDER BY, and then PowerBuilder properties
clean = "".join([c if (ord(c) < 128 and (c.isprintable() or c in "\r\n\t")) else (" " if ord(c) >= 128 else c) for c in chunk])

with open("exact_complete_sistema_query.sql", "w", encoding="utf-8") as out:
    out.write(clean)

print("Saved exact_complete_sistema_query.sql, length:", len(clean))
