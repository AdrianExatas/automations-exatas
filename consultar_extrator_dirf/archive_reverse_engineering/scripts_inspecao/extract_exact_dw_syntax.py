import re

with open(r"C:\Contabil\forel19.pbd", "rb") as f:
    text16 = f.read().decode("utf-16le", errors="ignore")

target = "dw_rel_linhas_extrator_irrf_dados_sistema"
pos = text16.find(target)
print(f"Target {target} at pos {pos}")

if pos != -1:
    # Find retrieve=" ... "
    ret_pos = text16.find('retrieve="', pos)
    if ret_pos == -1 or ret_pos - pos > 10000:
        ret_pos = text16.rfind('retrieve="', 0, pos)
    
    print(f"retrieve= found at {ret_pos}")
    if ret_pos != -1:
        end_quote = text16.find('"', ret_pos + 10)
        # Handle escaped quotes ~"
        while text16[end_quote - 1] == '~':
            end_quote = text16.find('"', end_quote + 1)
        sql_text = text16[ret_pos + 10:end_quote]
        clean_sql = "".join([c if c.isprintable() or c in "\r\n\t" else " " for c in sql_text])
        with open("dados_sistema_retrieve.sql", "w", encoding="utf-8") as f:
            f.write(clean_sql)
        print(f"Saved retrieve SQL ({len(clean_sql)} chars)")
