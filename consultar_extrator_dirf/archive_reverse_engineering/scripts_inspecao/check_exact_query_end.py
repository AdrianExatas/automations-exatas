with open("exact_sistema_query.sql", "r", encoding="utf-8", errors="ignore") as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")
# Show lines 350 to end
for i in range(350, min(len(lines), 450)):
    print(f"{i+1}: {lines[i][:120]}")
