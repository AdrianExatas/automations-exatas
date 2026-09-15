"""
Teste de regressao do motor de conciliacao (auditar_e_gerar_relatorio_fidedigno.py).

Nao usa pytest (projeto nao tem essa dependencia) - roda como script simples:
    python tests/test_regressao_conciliacao.py

Consulta o banco de producao (somente leitura) e valida invariantes que devem
ser sempre verdadeiras, alem de 2 casos historicos conhecidos (competencias
ja fechadas de 2026, que nao devem mudar). O objetivo e pegar regressoes como
a que aconteceu quando Plano de Saude/Isentos foram silenciosamente removidos
do motor novo sem que ninguem percebesse.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from auditar_e_gerar_relatorio_fidedigno import extrair_e_auditar_dados

STATUS_VALIDOS = {
    "CONCILIADO 100%",
    "PENDÊNCIA eSOCIAL",
    "APENAS NO eSOCIAL",
    "DIVERGÊNCIA CRÍTICA: IRRF",
    "DIVERGÊNCIA: BASE DE CÁLCULO",
    "DIVERGÊNCIA: DEDUÇÕES (INSS/DEP)",
    "DIVERGÊNCIA: PLANO SAÚDE/ISENTOS",
}

falhas = []


def checar(condicao, mensagem):
    if condicao:
        print(f"  OK  - {mensagem}")
    else:
        print(f"  FALHA - {mensagem}")
        falhas.append(mensagem)


def main():
    print("Extraindo dados do motor (ano 2026)...")
    df = extrair_e_auditar_dados(ano=2026)
    checar(df is not None and len(df) > 0, "extracao retornou dados")
    if df is None or df.empty:
        print("\nAbortando: sem dados para validar.")
        sys.exit(1)

    print(f"\n{len(df):,} linhas extraidas. Rodando checagens...\n")

    print("--- Invariantes estruturais ---")
    status_encontrados = set(df['status_categoria'].unique())
    checar(status_encontrados.issubset(STATUS_VALIDOS),
           f"todos os status pertencem ao conjunto conhecido (encontrados: {status_encontrados})")

    for col in ['sistema_plano_saude', 'esocial_plano_saude', 'sistema_isentos_total', 'esocial_isentos_total']:
        checar(col in df.columns, f"coluna '{col}' existe (regressao: sumiu quando Plano Saude/Isentos foi removido)")
    checar((df['esocial_isentos_total'].abs().sum() > 0) if 'esocial_isentos_total' in df.columns else False,
           "esocial_isentos_total nao esta zerado para todas as linhas (regressao: coluna existir mas vir sempre 0)")
    checar((df['sistema_isentos_total'].abs().sum() > 0) if 'sistema_isentos_total' in df.columns else False,
           "sistema_isentos_total nao esta zerado para todas as linhas")

    amostra = df.sample(min(500, len(df)), random_state=42)
    erro_aritmetica = (
        (amostra['sistema_rendtrib_total'] - amostra['esocial_rendtrib_total'] - amostra['dif_rendtrib']).abs() > 0.02
    ).sum()
    checar(erro_aritmetica == 0, f"aritmetica sistema-esocial=diferenca correta em amostra de {len(amostra)} linhas ({erro_aritmetica} erros)")

    print("\n--- Casos historicos conhecidos (competencias fechadas, nao devem mudar) ---")
    caso1 = df[(df['codi_emp'] == 185) & (df['cpf'] == '39365115515') &
               (df['competencia_ref'].astype(str).str.startswith('2026-01'))]
    checar(not caso1.empty, "caso conhecido encontrado: empresa 185, CPF 393.651.155-15, competencia 01/2026")
    if not caso1.empty:
        r = caso1.iloc[0]
        checar(r['sistema_irrf_total'] > 20000, f"IRRF sistema > R$20.000 (valor: {r['sistema_irrf_total']:.2f})")
        checar(r['esocial_irrf_total'] == 0, f"IRRF eSocial == 0 (valor: {r['esocial_irrf_total']:.2f})")
        checar(r['status_categoria'] == "DIVERGÊNCIA CRÍTICA: IRRF", f"status = DIVERGÊNCIA CRÍTICA: IRRF (encontrado: {r['status_categoria']})")

    caso2 = df[(df['codi_emp'] == 259) & (df['cpf'] == '07142064587') &
               (df['competencia_ref'].astype(str).str.startswith('2026-01'))]
    checar(not caso2.empty, "caso conhecido encontrado: empresa 259, CPF 071.420.645-87, competencia 01/2026")
    if not caso2.empty:
        r = caso2.iloc[0]
        checar(abs(r['sistema_irrf_total'] - 7072.80) < 0.02, f"IRRF sistema ~= R$7.072,80 (valor: {r['sistema_irrf_total']:.2f})")
        checar(r['status_categoria'] == "DIVERGÊNCIA CRÍTICA: IRRF", f"status = DIVERGÊNCIA CRÍTICA: IRRF (encontrado: {r['status_categoria']})")

    print("\n" + "=" * 70)
    if falhas:
        print(f"RESULTADO: {len(falhas)} FALHA(S)")
        for f in falhas:
            print(f"  - {f}")
        sys.exit(1)
    else:
        print("RESULTADO: TODAS AS CHECAGENS PASSARAM")
        sys.exit(0)


if __name__ == "__main__":
    main()
