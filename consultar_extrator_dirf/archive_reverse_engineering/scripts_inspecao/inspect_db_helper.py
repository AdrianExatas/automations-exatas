import pyodbc
from test_conn import dsn, user, pwd

def get_conn():
    return pyodbc.connect(f"DSN={dsn};UID={user};PWD={pwd}")

if __name__ == "__main__":
    conn = get_conn()
    cur = conn.cursor()
    
    cur.execute("SELECT table_name, remarks FROM sys.systable WHERE table_type='BASE' AND LOWER(table_name) LIKE 'forend%'")
    print("forend*:", cur.fetchall())
    
    cur.execute("SELECT table_name, remarks FROM sys.systable WHERE table_type='BASE' AND LOWER(table_name) LIKE 'focomp%'")
    print("focomp*:", cur.fetchall())
    
    cur.execute("SELECT table_name, remarks FROM sys.systable WHERE table_type='BASE' AND LOWER(table_name) LIKE 'foinfo%'")
    print("foinfo*:", cur.fetchall())
    
    conn.close()
