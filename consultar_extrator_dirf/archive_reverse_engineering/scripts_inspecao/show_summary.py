import openpyxl

wb = openpyxl.load_workbook('relatorios/Comparacao_Valor_Sistema_eSocial.xlsx', data_only=True)
ws = wb['Resumo Empresas']
rows = list(ws.iter_rows(values_only=True))
header = rows[0]
data = rows[1:]

print(f"Total de empresas avaliadas: {len(data)}")
print("\nTop 10 Empresas com mais divergencias:")
print(f"{'COD':<6} | {'EMPRESA':<45} | {'COLAB':<6} | {'DIVERG':<6} | {'DIF RENDTRIB':<17} | {'DIF PREV':<15} | SITUACAO")
print("-" * 115)
for r in data[:10]:
    cod, nome, colab, diverg, s_rt, e_rt, dif_rt, s_pv, e_pv, dif_pv, s_ir, e_ir, dif_ir, sit = r
    print(f"{cod:<6} | {str(nome)[:43]:<45} | {colab:<6} | {diverg:<6} | R$ {dif_rt:>14,.2f} | R$ {dif_pv:>12,.2f} | {sit}")

# Resumo global
tot_colab = sum(r[2] for r in data)
tot_div = sum(r[3] for r in data)
tot_dif_rt = sum(r[6] for r in data)
tot_dif_pv = sum(r[9] for r in data)
tot_dif_ir = sum(r[12] for r in data)

print("\n" + "=" * 115)
print(f"TOTAIS CONSOLIDADOS DO BANCO:")
print(f"  Colaboradores Únicos:          {tot_colab:,}")
print(f"  Ocorrências de Divergência:    {tot_div:,}")
print(f"  Diferença Rendimentos Trib:    R$ {tot_dif_rt:,.2f}")
print(f"  Diferença Previdência Oficial: R$ {tot_dif_pv:,.2f}")
print(f"  Diferença IRRF Retido:         R$ {tot_dif_ir:,.2f}")
print("=" * 115)
