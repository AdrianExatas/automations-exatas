import pyodbc

conn = pyodbc.connect('DSN=Contabil Oficial;UID=EXTERNO;PWD=externo')
cur = conn.cursor()

print('Searching geimposto for Tributos...')
cur.execute("SELECT * FROM bethadba.geimposto WHERE LOWER(COALESCE(nome, '')) LIKE '%tributos%' OR LOWER(COALESCE(nome, '')) LIKE '%tributo%' ")
rows = cur.fetchall()
print('Found:', len(rows))
for r in rows:
    print(r)

print('\n--- first 20 rows of geimposto ---')
cur.execute('SELECT TOP 20 * FROM bethadba.geimposto')
for r in cur.fetchall():
    print(r)

cur.close()
conn.close()