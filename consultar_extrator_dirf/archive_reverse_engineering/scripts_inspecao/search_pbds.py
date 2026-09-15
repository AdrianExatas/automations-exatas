import os
import re

contabil_dir = r"C:\Contabil"
pbds = [os.path.join(contabil_dir, f) for f in os.listdir(contabil_dir) if f.lower().endswith(".pbd")]
print(f"Found {len(pbds)} PBD files.")

target_str = "FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR"
target_utf16 = target_str.encode("utf-16le")

for p in pbds:
    try:
        with open(p, "rb") as f:
            content = f.read()
            if target_utf16.lower() in content.lower() or target_str.lower().encode('ascii') in content.lower():
                print(f"Found in: {p}")
                # decode utf-16le
                text = content.decode("utf-16le", errors="ignore")
                for m in re.finditer(r"FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR", text, re.IGNORECASE):
                    idx = m.start()
                    snippet = text[max(0, idx - 500):min(len(text), idx + 800)]
                    clean = "".join([c if c.isprintable() or c in "\r\n\t" else " " for c in snippet])
                    print("--- Snippet ---")
                    print(clean)
    except Exception as e:
        pass
