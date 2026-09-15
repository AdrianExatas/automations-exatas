with open(r"C:\Contabil\forel19.pbd", "rb") as f:
    content = f.read()

text16 = content.decode("utf-16le", errors="ignore")

# Find the start of the WITH clause or SELECT clause around 548121
idx = 548121
# Look back up to 10000 characters for "WITH "
start_idx = text16.rfind("WITH ", 0, idx)
if start_idx == -1:
    start_idx = text16.rfind("SELECT ", 0, idx - 2000)

# Look forward up to 30000 characters
end_idx = text16.find("PBSELECT(", idx)
if end_idx == -1:
    end_idx = idx + 25000

query_text = text16[start_idx:end_idx]
# Clean non-printable
clean_query = "".join([c if c.isprintable() or c in "\r\n\t" else " " for c in query_text])

with open("full_report_query.sql", "w", encoding="utf-8") as f:
    f.write(clean_query)

print(f"Full query extracted ({len(clean_query)} chars) to full_report_query.sql")
