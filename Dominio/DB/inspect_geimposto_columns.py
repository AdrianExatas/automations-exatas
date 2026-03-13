import pyodbc

conn = pyodbc.connect('DSN=Contabil Oficial;UID=EXTERNO;PWD=externo')
cur = conn.cursor()

cur.execute('SELECT TOP 1 * FROM bethadba.geimposto')
cols = [d[0] for d in cur.description]
print('geimposto columns:', cols)

cur.close()
conn.close()