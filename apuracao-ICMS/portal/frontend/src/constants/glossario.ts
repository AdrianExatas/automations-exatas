// Glossário de termos técnicos usados no processo de apuração de ICMS.
// Definições curtas e em linguagem simples, para uso no componente `Term`/`Tooltip`.

export const GLOSSARIO: Record<string, string> = {
  CFOP: 'Código que identifica a natureza de uma operação, como compra, venda ou transferência de mercadorias.',
  CST: 'Código que classifica a situação tributária de um item em relação ao imposto (por exemplo, se é tributado, isento ou substituído).',
  NCM: 'Código que identifica o tipo de mercadoria, usado para definir a tributação e as regras aplicáveis a ela.',
  'ICMS-ST': 'Regime em que o imposto de toda a cadeia de venda é recolhido de uma só vez por um responsável, geralmente antes do produto chegar ao consumidor final.',
  DIFAL: 'Valor adicional de imposto cobrado quando uma venda é feita para outro estado, para equilibrar a diferença entre as alíquotas dos dois estados.',
  FCP: 'Valor extra de imposto, somado ao ICMS, destinado a um fundo estadual de combate à pobreza.',
  FECOEP: 'Valor extra de imposto semelhante ao FCP, destinado a um fundo estadual de combate e erradicação da pobreza.',
  CIAP: 'Registro que controla, mês a mês, quanto de imposto pago na compra de máquinas e equipamentos a empresa ainda pode usar como crédito.',
  EFD: 'Arquivo digital enviado ao governo com todos os lançamentos fiscais de compras, vendas e apuração de impostos do período.',
  XML: 'Arquivo eletrônico da nota ou conhecimento de transporte (NF-e, NFC-e, CT-e, CF-e) emitido ou recebido pela empresa.',
  'Bloco E': 'Parte do arquivo digital de impostos que reúne o cálculo final do ICMS e do IPI do período, mostrando o valor a pagar ou o saldo a favor da empresa.',
  Gate: 'Ponto de checagem do processo em que alguém responsável precisa aprovar formalmente antes de seguir para a etapa seguinte.',
  Achado: 'Observação, alerta ou inconsistência apontada automaticamente ao conferir os dados fiscais.',
  Cruzamento: 'Comparação automática entre duas informações diferentes (por exemplo, o que foi declarado e o que foi pago) para verificar se elas coincidem.',
  'Saldo credor': 'Valor de imposto que a empresa pagou a mais nas compras do que deve nas vendas, podendo ser usado para abater impostos de meses futuros.',
  LMC: 'Controle mensal das entradas e saídas de combustível, usado por postos e distribuidoras.',
  Apuração: 'Cálculo periódico de quanto de imposto a empresa deve pagar, considerando o que ela vendeu e o que ela comprou no período.',
  Competência: 'Mês ao qual pertencem as operações e obrigações fiscais que estão sendo apuradas (por exemplo, "competência 06/2026" trata dos fatos de junho de 2026).',
}

export type TermoGlossario = keyof typeof GLOSSARIO
