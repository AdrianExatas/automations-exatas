import re

with open(r"C:\Contabil\forel19.pbd", "rb") as f:
    text16 = f.read().decode("utf-16le", errors="ignore")

# Search for dw_rel... or d_rel...
dws = set(re.findall(r"(?:d_|dw_)[a-zA-Z0-9_]*extrator[a-zA-Z0-9_]*", text16, re.IGNORECASE))
print(f"Found {len(dws)} extrator DataWindows:")
for d in sorted(dws):
    print(" -", d)

# Also check for SQL in these datawindows
for dw in sorted(dws):
    idx = text16.find(dw)
    if idx != -1:
        # Search around idx for "select "
        snippet = text16[max(0, idx - 500):min(len(text16), idx + 2000)]
        clean = "".join([c if c.isprintable() or c in "\r\n\t" else " " for c in snippet])
        if "select " in clean.lower():
            print(f"\n=== SQL found near {dw} ===")
            print(clean[:800])
