with open(r"C:\Contabil\forel19.pbd", "rb") as f:
    content = f.read()

text16 = content.decode("utf-16le", errors="ignore")

# Find datawindow names near 548121
idx = 548121
snippet = text16[max(0, idx - 4000):idx]
# Look for d_... or dw_...
import re
dws = re.findall(r"(?:d_|dw_|w_|r_)[a-zA-Z0-9_]+", snippet)
print("DataWindows / Objects before 548121:", set(dws))

snippet_after = text16[idx:idx + 35000]
dws_after = re.findall(r"(?:d_|dw_|w_|r_)[a-zA-Z0-9_]+", snippet_after)
print("DataWindows / Objects after 548121:", set(dws_after))
