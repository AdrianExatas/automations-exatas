import pyodbc

# Defina o DSN (Data Source Name) ou use uma string de conexão ODBC
dsn = 'Contabil Oficial'  # O nome do DSN que você configurou
usuario = 'EXTERNO'
senha = 'externo'

# Termo que queremos localizar na base (como aparece na tela de Pagamentos)
TERMO_BUSCA = 'Tributos federais'

# Palavras-chave para identificar tabelas relacionadas ao módulo de Pagamentos/Folha
TABLE_KEYWORDS = [
    'pag',
    'pagto',
    'folha',
    'encarg',
    'tribut',
    'lancto',
    'pagtos',
    'conta',
    'banco',
]

# Criação da conexão
conn = pyodbc.connect(f'DSN={dsn};UID={usuario};PWD={senha}')

# Se você não usar DSN, pode usar a string de conexão diretamente:
# conn = pyodbc.connect(f'DRIVER={{SQL Server}};SERVER=seu_servidor;DATABASE={banco};UID={usuario};PWD={senha}')

# Criação de um cursor para executar comandos SQL
cursor = conn.cursor()

# Executando uma consulta para ver as colunas de hopgcont
cursor.execute("SELECT TOP 1 * FROM bethadba.hopgcont")

# Obtendo as descrições das colunas
columns = [desc[0] for desc in cursor.description]
print("Colunas da tabela HOPGCONT:", columns)

# Consultar alguns registros para ver os dados
cursor.execute("SELECT TOP 10 * FROM bethadba.hopgcont")

print("\nAmostra de dados da HOPGCONT:")
for row in cursor.fetchall():
    print(row)

# Fechar a conexão
cursor.close()
conn.close()