import struct

with open(r"C:\Contabil\forel19.pbd", "rb") as f:
    raw = f.read()

target = "dw_rel_linhas_extrator_irrf_dados_sistema.dwo".encode("utf-16le")
pos = raw.find(target)

# After target + 2 (null terminator), there is ENT*0600 (8 bytes)
# Then offset (4 bytes) and length (4 bytes)
hdr_pos = pos + len(target)
# Search for offset and length
offset, length = struct.unpack("<II", raw[hdr_pos + 16:hdr_pos + 24])
print(f"Offset: {offset} (0x{offset:x}), Length: {length} (0x{length:x})")

data = raw[offset:offset+length]
text16 = data.decode("utf-16le", errors="ignore")
text8 = data.decode("latin1", errors="ignore")

with open("dados_sistema_exact.txt", "w", encoding="utf-8") as out:
    out.write("=== UTF-16LE ===\n")
    out.write("".join([c if c.isprintable() or c in "\r\n\t" else " " for c in text16]))
    out.write("\n\n=== LATIN1 ===\n")
    out.write("".join([c if c.isprintable() or c in "\r\n\t" else " " for c in text8]))

print("Saved to dados_sistema_exact.txt")
