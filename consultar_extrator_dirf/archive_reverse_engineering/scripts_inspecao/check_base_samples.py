import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from validar_regras_2026 import m
import pandas as pd

div_base = m[m['classificacao'] == 'DIVERGÊNCIA: BASE DE CÁLCULO']
print(f"Total casos base de calculo: {len(div_base)}")
print("\nTop 5 empresas com divergência de base:")
print(div_base.groupby(['codi_emp', 'nome_emp']).size().sort_values(ascending=False).head(5))

print("\nAmostra de 5 casos de base divergente:")
for idx, r in div_base.head(5).iterrows():
    print(f"Empresa {r['codi_emp']} - {r['nome_emp']} | Comp: {r['competencia_ref']} | CPF: {r['cpf']} ({r['nome_colaborador']})")
    print(f"  Sistema RendTrib: R$ {r['sistema_rendtrib_total']:,.2f} (Mensal: {r['sistema_rendtrib_mensal']:,.2f}, 13: {r['sistema_rendtrib_13']:,.2f})")
    print(f"  eSocial RendTrib: R$ {r['esocial_rendtrib_total']:,.2f} (Mensal: {r['esocial_rendtrib_mensal']:,.2f}, 13: {r['esocial_rendtrib_13']:,.2f})")
    print(f"  Diferença:        R$ {r['dif_rendtrib']:,.2f}")
    print(f"  IRRF Sistema: R$ {r['sistema_irrf_total']:,.2f} | IRRF eSocial: R$ {r['esocial_irrf_total']:,.2f}")
    print("-" * 70)
