import pyodbc
from test_conn import dsn, user, pwd

conn = pyodbc.connect(f"DSN={dsn};UID={user};PWD={pwd}")
cursor = conn.cursor()

print("Searching for 67.54 or 443.11 or 7762.06 in folha tables for empresa 45...")

# Check common folha tables: FOMOVTO, FOCALCULOS, FORESCISOES, etc.
tables_to_check = [
    'fomovto', 'fomovtofer', 'fomovtores', 'fomovtoserv', 'focalcirrf', 'foguiairrf',
    'fopagto', 'fopagtoparcial', 'forendimentos', 'focomprovante'
]

# Let's find existing tables starting with fo
cursor.execute("""
    SELECT table_name 
    FROM sys.systable 
    WHERE table_type = 'BASE' AND LOWER(table_name) LIKE 'fo%'
    ORDER BY table_name
""")
all_fo_tables = [r[0].lower() for r in cursor.fetchall()]

# Filter those that have codi_emp column
candidate_tables = []
for t in all_fo_tables:
    cursor.execute(f"SELECT count(*) FROM sys.syscolumn c JOIN sys.systable t ON t.table_id = c.table_id WHERE LOWER(t.table_name) = '{t}' AND LOWER(c.column_name) = 'codi_emp'")
    if cursor.fetchone()[0] > 0:
        candidate_tables.append(t)

print(f"Total candidate FO tables: {len(candidate_tables)}")

# Search for 67.54 or 443.11 or 7829.60 or 7762.06 in numeric/decimal columns of these candidate tables for codi_emp = 45
matches = []
for t in candidate_tables:
    cursor.execute(f"""
        SELECT c.column_name, c.width, c.scale 
        FROM sys.syscolumn c 
        JOIN sys.systable t ON t.table_id = c.table_id 
        WHERE LOWER(t.table_name) = '{t}' 
          AND c.domain_id IN (3, 4, 11, 28, 29) -- numeric/decimal/money types
    """)
    num_cols = [r[0] for r in cursor.fetchall()]
    if not num_cols:
        continue
    
    col_conditions = " OR ".join([f"abs({c} - 67.54) < 0.01 OR abs({c} - 443.11) < 0.01 OR abs({c} - 7762.06) < 0.01" for c in num_cols])
    try:
        query = f"SELECT count(*) FROM bethadba.{t} WHERE codi_emp = 45 AND ({col_conditions})"
        cursor.execute(query)
        cnt = cursor.fetchone()[0]
        if cnt > 0:
            print(f"Match in {t}! Count: {cnt}")
            matches.append(t)
    except Exception as e:
        pass

print("Finished candidate search.")
conn.close()
