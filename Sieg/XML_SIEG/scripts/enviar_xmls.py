"""
Script CLI para enviar XMLs para a API SIEG
"""
import sys
import os
import argparse
from typing import List

# Adicionar src ao path para importar módulos
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from sieg_xml.services.upload_service import UploadService
from sieg_xml.utils.ui_utils import selecionar_arquivos_xml, selecionar_pasta_xmls
from sieg_xml.utils.file_utils import buscar_xmls_recursivo
from sieg_xml.core.xml_parser import extrair_chave_acesso
from sieg_xml.config import NUM_THREADS_PADRAO, PASTA_PADRAO_XMLS

# Flag de debug
DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'

# Nome do arquivo padrão para salvar erros
ARQUIVO_ERROS_PADRAO = 'arquivos_reprocessar.txt'


def processar_envio_interativo():
    """Processa envio em modo interativo"""
    print("="*60)
    print("Sistema de Envio de XMLs - API SIEG")
    print("="*60)
    
    # Selecionar arquivos XML
    print("\n" + "="*60)
    print("Seleção de Arquivos XML")
    print("="*60)
    print("\nOpções:")
    print("  [1] Selecionar arquivos XML específicos")
    print("  [2] Selecionar pasta com XMLs (busca recursiva)")
    print("  [q] Cancelar")
    
    escolha = input("\nEscolha uma opção (1/2/q): ").strip().lower()
    
    arquivos_xml = []
    if escolha == '1':
        arquivos_xml = selecionar_arquivos_xml()
    elif escolha == '2':
        arquivos_xml = selecionar_pasta_xmls()
    elif escolha == 'q':
        print("Operação cancelada.")
        return
    else:
        print("Opção inválida.")
        return
    
    if not arquivos_xml:
        print("\nNenhum arquivo XML selecionado.")
        return
    
    # Perguntar se deseja verificar XMLs existentes
    print(f"\n{'='*60}")
    print("Verificação de XMLs Existentes")
    print(f"{'='*60}")
    print("\nDeseja verificar se os XMLs já existem no SIEG antes de enviar?")
    print("  - Isso evita envios duplicados")
    print("  - Pode aumentar o tempo de processamento")
    verificar_existentes = input("\nVerificar XMLs existentes antes de enviar? (s/n, padrão: s): ").strip().lower()
    verificar_existentes = verificar_existentes != 'n'
    
    # Validar XMLs
    service = UploadService()
    xmls_validos, tipos_identificados = service.validar_xmls(arquivos_xml)
    
    if not xmls_validos:
        print("\nNenhum XML válido encontrado para enviar.")
        return
    
    # Verificar existência se solicitado
    xmls_para_enviar = xmls_validos
    xmls_ja_existentes = []
    
    if verificar_existentes:
        xmls_para_enviar, xmls_ja_existentes = service.verificar_xmls_existentes(xmls_validos)
    
    # Resumo antes de enviar
    print(f"\n{'='*60}")
    print("RESUMO ANTES DO ENVIO")
    print(f"{'='*60}")
    print(f"  Total de arquivos selecionados: {len(arquivos_xml)}")
    print(f"  XMLs válidos para envio: {len(xmls_para_enviar)}")
    if xmls_ja_existentes:
        print(f"  XMLs já existentes no SIEG (ignorados): {len(xmls_ja_existentes)}")
    if tipos_identificados:
        print(f"  Tipos identificados:")
        for tipo, quantidade in tipos_identificados.items():
            print(f"    - {tipo}: {quantidade}")
    print(f"{'='*60}")
    
    if not xmls_para_enviar:
        print("\nTodos os XMLs já existem no SIEG. Nada para enviar.")
        return
    
    # Confirmação
    resposta = input(f"\nDeseja enviar {len(xmls_para_enviar)} XML(s) para o SIEG? (s/n): ").strip().lower()
    if resposta != 's':
        print("Operação cancelada.")
        return
    
    # Perguntar número de threads
    print("\nConfiguração de Threads:")
    print("  - Mais threads = envio mais rápido")
    print("  - Recomendado: 10-20 threads (rate limit: 2000 req/min)")
    num_threads_input = input(f"\nNúmero de threads (padrão: {NUM_THREADS_PADRAO}, Enter para usar padrão): ").strip()
    
    try:
        num_threads = int(num_threads_input) if num_threads_input else NUM_THREADS_PADRAO
        if num_threads < 1:
            num_threads = NUM_THREADS_PADRAO
        elif num_threads > 50:
            print("  AVISO: Número muito alto, limitando a 50 threads para evitar problemas.")
            num_threads = 50
    except ValueError:
        num_threads = NUM_THREADS_PADRAO
    
    # Enviar XMLs
    print(f"\n{'='*60}")
    print("Iniciando envio dos XMLs...")
    print(f"{'='*60}\n")
    
    resultado = service.enviar_xmls(xmls_para_enviar, num_threads=num_threads)
    
    # Resumo final
    print(f"\n{'='*60}")
    print("RESUMO FINAL DO ENVIO")
    print(f"{'='*60}")
    print(f"  Sucesso: {resultado['enviados']}")
    print(f"  Falhas: {resultado['erros']}")
    print(f"  Total processado: {resultado['total']}")
    print(f"  Tempo total: {resultado['tempo_total']:.2f} segundos")
    if resultado['total'] > 0 and resultado['tempo_total'] > 0:
        print(f"  Velocidade média: {resultado['total']/resultado['tempo_total']:.2f} XMLs/segundo")
    
    if resultado['erros_detalhados']:
        print(f"\n  Detalhes dos erros ({len(resultado['erros_detalhados'])} erro(s)):")
        for erro in resultado['erros_detalhados'][:10]:
            print(f"    - {erro['xml']['nome']}: {erro['erro']}")
        if len(resultado['erros_detalhados']) > 10:
            print(f"    ... e mais {len(resultado['erros_detalhados']) - 10} erro(s)")
    
    print(f"{'='*60}")
    
    # Oferecer reprocessamento de erros se houver
    if resultado.get('erros_detalhados') and resultado['erros'] > 0:
        oferecer_reprocessamento_erros(
            resultado['erros_detalhados'],
            pasta_origem=arquivos_xml[0] if arquivos_xml else None,
            num_threads=num_threads,
            verificar_existentes=verificar_existentes
        )


def salvar_erros_arquivo(erros_detalhados: List[dict], nome_arquivo: str = ARQUIVO_ERROS_PADRAO) -> str:
    """
    Salva os nomes dos arquivos com erro em um arquivo de texto
    
    Args:
        erros_detalhados: Lista de dicionários com erros (deve ter 'xml' com 'nome')
        nome_arquivo: Nome do arquivo para salvar (padrão: arquivos_reprocessar.txt)
        
    Returns:
        Caminho completo do arquivo salvo
    """
    if not erros_detalhados:
        return None
    
    # Extrair nomes dos arquivos com erro
    nomes_arquivos = []
    for erro in erros_detalhados:
        if isinstance(erro, dict):
            xml_info = erro.get('xml', {})
            if isinstance(xml_info, dict):
                nome = xml_info.get('nome')
                if nome:
                    nomes_arquivos.append(nome)
            # Também tentar pegar diretamente se não estiver em 'xml'
            elif 'nome' in erro:
                nomes_arquivos.append(erro['nome'])
    
    if not nomes_arquivos:
        return None
    
    # Salvar em arquivo
    caminho_arquivo = os.path.join(os.getcwd(), nome_arquivo)
    try:
        with open(caminho_arquivo, 'w', encoding='utf-8') as f:
            for nome in nomes_arquivos:
                f.write(f"{nome}\n")
        return caminho_arquivo
    except Exception as e:
        print(f"[ERRO] Nao foi possivel salvar arquivo de erros: {e}")
        return None


def oferecer_reprocessamento_erros(
    erros_detalhados: List[dict],
    pasta_origem: str = None,
    num_threads: int = NUM_THREADS_PADRAO,
    verificar_existentes: bool = False,
    confirmar_automatico: bool = False
):
    """
    Oferece reprocessar arquivos com erro ao final do processamento
    
    Args:
        erros_detalhados: Lista de erros detalhados
        pasta_origem: Pasta onde os XMLs estão localizados
        num_threads: Número de threads para reprocessamento
        verificar_existentes: Se deve verificar XMLs existentes
        confirmar_automatico: Se True, reprocessa automaticamente sem perguntar
    """
    if not erros_detalhados:
        return
    
    # Salvar erros em arquivo
    arquivo_erros = salvar_erros_arquivo(erros_detalhados)
    
    if not arquivo_erros:
        print("\n[AVISO] Nao foi possivel salvar lista de erros para reprocessamento.")
        return
    
    print(f"\n{'='*60}")
    print("REPROCESSAMENTO DE ERROS DISPONIVEL")
    print(f"{'='*60}")
    print(f"  [INFO] {len(erros_detalhados)} arquivo(s) com erro foram salvos em:")
    print(f"         {arquivo_erros}")
    print(f"\n  [INFO] Voce pode reprocessar esses arquivos usando:")
    if pasta_origem:
        pasta_xmls = os.path.dirname(pasta_origem) if os.path.isfile(pasta_origem) else pasta_origem
        print(f"         python scripts/enviar_xmls.py --pasta \"{pasta_xmls}\" --reprocessar-nomes {os.path.basename(arquivo_erros)} --threads {num_threads} --sem-verificacao --sim")
    else:
        print(f"         python scripts/enviar_xmls.py --pasta \"<PASTA_XMLS>\" --reprocessar-nomes {os.path.basename(arquivo_erros)} --threads {num_threads} --sem-verificacao --sim")
    
    # Perguntar se deseja reprocessar agora
    if confirmar_automatico:
        print(f"\n[INFO] Reprocessamento automatico ativado. Iniciando reprocessamento...")
        resposta = 's'
    else:
        resposta = input(f"\nDeseja reprocessar os {len(erros_detalhados)} arquivo(s) com erro agora? (s/n): ").strip().lower()
    
    if resposta == 's':
        if not pasta_origem:
            print("\n[ERRO] Pasta de origem nao identificada. Por favor, especifique a pasta manualmente.")
            print(f"       Use o comando acima com a pasta correta.")
            return
        
        # Determinar pasta dos XMLs
        if os.path.isfile(pasta_origem):
            pasta_xmls = os.path.dirname(pasta_origem)
        else:
            pasta_xmls = pasta_origem
        
        print(f"\n[INFO] Iniciando reprocessamento de {len(erros_detalhados)} arquivo(s)...")
        print(f"{'='*60}\n")
        
        # Chamar função de reprocessamento
        try:
            with open(arquivo_erros, 'r', encoding='utf-8') as f:
                nomes_arquivos = [linha.strip() for linha in f if linha.strip()]
            
            reprocessar_arquivos_por_nome(
                pasta=pasta_xmls,
                nomes_arquivos=nomes_arquivos,
                num_threads=num_threads,
                verificar_existentes=verificar_existentes,
                confirmar_automatico=True  # Já confirmado acima
            )
        except Exception as e:
            print(f"\n[ERRO] Falha ao reprocessar: {e}")
            print(f"       Voce pode tentar manualmente usando o comando acima.")
    else:
        print(f"\n[INFO] Reprocessamento cancelado. Voce pode reprocessar depois usando o arquivo:")
        print(f"       {arquivo_erros}")


def enviar_automatico(pasta: str = None, num_threads: int = NUM_THREADS_PADRAO):
    """Modo automático: verifica, envia e exclui XMLs sem interação"""
    if not pasta:
        pasta = PASTA_PADRAO_XMLS
    
    print("="*60)
    print("🚀 MODO AUTOMÁTICO - Envio de XMLs para SIEG")
    print("="*60)
    print(f"\n📁 Pasta: {pasta}")
    print(f"🔧 Threads: {num_threads}")
    
    if not os.path.exists(pasta):
        print(f"\n❌ ERRO: Pasta não encontrada: {pasta}")
        return
    
    # Buscar XMLs
    from sieg_xml.utils.file_utils import buscar_xmls_recursivo
    xmls_encontrados = buscar_xmls_recursivo(pasta)
    
    if not xmls_encontrados:
        print("\nℹ️  Nenhum arquivo XML encontrado na pasta.")
        return
    
    print(f"📦 Encontrados: {len(xmls_encontrados)} arquivo(s) XML")
    
    # Validar e verificar
    service = UploadService()
    xmls_validos, _ = service.validar_xmls(xmls_encontrados)
    
    if not xmls_validos:
        print("\nℹ️  Nenhum XML válido encontrado.")
        return
    
    xmls_para_enviar, xmls_ja_existentes = service.verificar_xmls_existentes(xmls_validos)
    
    print(f"\n📊 Resultado da verificação:")
    print(f"   ○ Para enviar: {len(xmls_para_enviar)}")
    print(f"   ⚠ Já existentes: {len(xmls_ja_existentes)}")
    
    # Excluir XMLs já existentes
    if xmls_ja_existentes:
        print(f"\n🗑️  Excluindo {len(xmls_ja_existentes)} XMLs já existentes no SIEG...")
        for xml_info in xmls_ja_existentes:
            try:
                os.remove(xml_info['caminho'])
            except:
                pass
        print("   ✅ Concluído")
    
    if not xmls_para_enviar:
        print("\n✅ Todos os XMLs já estão no SIEG. Nada para enviar!")
        return
    
    # Enviar com warm-up
    print(f"\n{'='*60}")
    print("🔥 Iniciando envio com WARM-UP gradual...")
    print("="*60)
    
    resultado = service.enviar_xmls(xmls_para_enviar, num_threads=num_threads, usar_warmup=True)
    
    # Excluir XMLs enviados com sucesso
    if resultado['enviados_sucesso']:
        print(f"\n🗑️  Excluindo {len(resultado['enviados_sucesso'])} XMLs enviados com sucesso...")
        excluidos = 0
        for xml_info in resultado['enviados_sucesso']:
            try:
                os.remove(xml_info['caminho'])
                excluidos += 1
            except:
                pass
        print(f"   ✅ {excluidos} arquivo(s) excluído(s)")
    
    # Resumo final
    print(f"\n{'='*60}")
    print("📊 RESUMO FINAL")
    print("="*60)
    print(f"   📁 Total de XMLs encontrados: {len(xmls_validos)}")
    print(f"   ⚠️  Já existentes no SIEG: {len(xmls_ja_existentes)}")
    print(f"   ✅ Enviados com sucesso: {resultado['enviados']}")
    print(f"   ❌ Erros: {resultado['erros']}")
    print(f"   ⏱️  Tempo total: {resultado['tempo_total']:.2f} segundos")
    if resultado['total'] > 0 and resultado['tempo_total'] > 0:
        print(f"   🚀 Velocidade: {resultado['enviados']/resultado['tempo_total']:.2f} XMLs/segundo")
    print("="*60)
    
    # Oferecer reprocessamento de erros se houver (modo automático - apenas salvar arquivo)
    if resultado.get('erros_detalhados') and resultado.get('erros', 0) > 0:
        arquivo_erros = salvar_erros_arquivo(resultado['erros_detalhados'])
        if arquivo_erros:
            print(f"\n[INFO] Arquivos com erro foram salvos em: {arquivo_erros}")
            print(f"       Voce pode reprocessar usando:")
            print(f"       python scripts/enviar_xmls.py --pasta \"{pasta}\" --reprocessar-nomes {os.path.basename(arquivo_erros)} --threads {num_threads} --sem-verificacao --sim")


def reprocessar_arquivos_por_nome(pasta: str, nomes_arquivos: List[str], num_threads: int = NUM_THREADS_PADRAO, verificar_existentes: bool = False, confirmar_automatico: bool = False):
    """
    Reprocessa XMLs específicos baseado em uma lista de nomes de arquivos
    
    Args:
        pasta: Pasta onde buscar os XMLs
        nomes_arquivos: Lista de nomes de arquivos para reprocessar (ex: ['arquivo1.xml', 'arquivo2.xml'])
        num_threads: Número de threads para processamento paralelo
        verificar_existentes: Se True, verifica se XMLs já existem antes de enviar
    """
    print("="*60)
    print("REPROCESSAMENTO DE XMLs POR NOME DE ARQUIVO")
    print("="*60)
    print(f"\nPasta: {pasta}")
    print(f"Arquivos para reprocessar: {len(nomes_arquivos)}")
    print(f"Threads: {num_threads}")
    
    if not os.path.exists(pasta):
        print(f"\n[ERRO] Pasta nao encontrada: {pasta}")
        return
    
    # Buscar todos os XMLs na pasta
    print(f"\n[BUSCANDO] Buscando XMLs na pasta...")
    xmls_encontrados = buscar_xmls_recursivo(pasta)
    
    if not xmls_encontrados:
        print("\n[ERRO] Nenhum arquivo XML encontrado na pasta.")
        return
    
    print(f"[INFO] Encontrados: {len(xmls_encontrados)} arquivo(s) XML")
    
    # Normalizar nomes de arquivos (remover caminho, manter apenas nome)
    # Remover espaços em branco e normalizar para lowercase
    nomes_normalizados = {os.path.basename(nome).strip().lower() for nome in nomes_arquivos if nome.strip()}
    
    print(f"\n[FILTRANDO] Filtrando XMLs pelos nomes fornecidos...")
    print(f"   Procurando por {len(nomes_normalizados)} nome(s) de arquivo especifico(s)...")
    print(f"   Nomes normalizados (primeiros 3): {list(nomes_normalizados)[:3]}")
    
    xmls_filtrados = []
    arquivos_encontrados = set()
    arquivos_nao_encontrados = set(nomes_normalizados)
    
    # Contador para debug
    total_verificados = 0
    for caminho_xml in xmls_encontrados:
        total_verificados += 1
        nome_arquivo = os.path.basename(caminho_xml).strip().lower()
        if nome_arquivo in nomes_normalizados:
            xmls_filtrados.append(caminho_xml)
            arquivos_encontrados.add(nome_arquivo)
            arquivos_nao_encontrados.discard(nome_arquivo)
            print(f"   [OK] Encontrado: {nome_arquivo}")
    
    print(f"\n[ESTATISTICAS]")
    print(f"   - Total de XMLs na pasta: {len(xmls_encontrados)}")
    print(f"   - XMLs verificados: {total_verificados}")
    print(f"   - XMLs encontrados e filtrados: {len(xmls_filtrados)} de {len(nomes_normalizados)} solicitados")
    
    if arquivos_nao_encontrados:
        print(f"\n[AVISO] Arquivos nao encontrados ({len(arquivos_nao_encontrados)}):")
        for nome in sorted(arquivos_nao_encontrados)[:10]:
            print(f"    - {nome}")
        if len(arquivos_nao_encontrados) > 10:
            print(f"    ... e mais {len(arquivos_nao_encontrados) - 10} arquivo(s)")
    
    if not xmls_filtrados:
        print("\n[ERRO] Nenhum XML encontrado correspondendo aos nomes fornecidos.")
        return
    
    # IMPORTANTE: Garantir que estamos processando apenas os arquivos filtrados
    if len(xmls_filtrados) != len(nomes_normalizados):
        print(f"\n[AVISO] Esperado {len(nomes_normalizados)} arquivo(s), mas encontrado {len(xmls_filtrados)} arquivo(s).")
        print(f"   Continuando apenas com os arquivos encontrados...")
    
    # Validar XMLs (APENAS os filtrados)
    print(f"\n[VALIDANDO] Validando {len(xmls_filtrados)} XML(s) filtrado(s)...")
    service = UploadService()
    xmls_validos, tipos_identificados = service.validar_xmls(xmls_filtrados)
    
    if not xmls_validos:
        print("\n[ERRO] Nenhum XML valido encontrado.")
        return
    
    print(f"[OK] XMLs validos: {len(xmls_validos)} de {len(xmls_filtrados)} processados")
    if tipos_identificados:
        for tipo, qtd in tipos_identificados.items():
            print(f"   - {tipo}: {qtd}")
    
    # Verificar existência se solicitado
    xmls_para_enviar = xmls_validos
    xmls_ja_existentes = []
    
    if verificar_existentes:
        print(f"\n🔍 Verificando XMLs existentes no SIEG...")
        xmls_para_enviar, xmls_ja_existentes = service.verificar_xmls_existentes(xmls_validos)
        print(f"   ○ Para enviar: {len(xmls_para_enviar)}")
        if xmls_ja_existentes:
            print(f"   ⚠ Já existentes: {len(xmls_ja_existentes)}")
    
    if not xmls_para_enviar:
        print("\n✅ Todos os XMLs já existem no SIEG. Nada para enviar!")
        return
    
    # Confirmação
    print(f"\n{'='*60}")
    print("CONFIRMACAO DE ENVIO")
    print(f"{'='*60}")
    print(f"  Total de XMLs para enviar: {len(xmls_para_enviar)}")
    
    if confirmar_automatico:
        print(f"\n[INFO] Confirmacao automatica ativada. Enviando {len(xmls_para_enviar)} XML(s)...")
        resposta = 's'
    else:
        resposta = input(f"\nDeseja enviar {len(xmls_para_enviar)} XML(s) para o SIEG? (s/n): ").strip().lower()
    
    if resposta != 's':
        print("\n[INFO] Operacao cancelada pelo usuario.")
        return
    
    # Enviar XMLs
    print(f"\n{'='*60}")
    print("ENVIANDO XMLs")
    print(f"{'='*60}\n")
    
    resultado = service.enviar_xmls(
        xmls_para_enviar,
        num_threads=num_threads,
        usar_warmup=False
    )
    
    # Exibir resultados
    print(f"\n{'='*60}")
    print("RESULTADO DO ENVIO")
    print(f"{'='*60}")
    print(f"  [OK] Sucesso: {resultado.get('enviados', 0)}")
    print(f"  [ERRO] Erros: {resultado.get('erros', 0)}")
    print(f"  [TOTAL] Total: {resultado.get('total', 0)}")
    
    if resultado.get('tempo_total'):
        print(f"  [TEMPO] Tempo total: {resultado['tempo_total']:.2f} segundos")
        if resultado.get('enviados', 0) > 0 and resultado['tempo_total'] > 0:
            print(f"  [VELOCIDADE] Velocidade: {resultado['enviados']/resultado['tempo_total']:.2f} XMLs/segundo")
    
    if resultado.get('erros_detalhados'):
        print(f"\n  Detalhes dos erros ({len(resultado['erros_detalhados'])} erro(s)):")
        for erro in resultado['erros_detalhados']:
            xml_info = erro.get('xml', {})
            nome_arquivo = xml_info.get('nome', 'N/A') if isinstance(xml_info, dict) else 'N/A'
            erro_msg = erro.get('erro', 'Erro desconhecido')
            print(f"    - {nome_arquivo}: {erro_msg}")
    
    print(f"{'='*60}\n")


def reprocessar_chaves_especificas(pasta: str, chaves: List[str], num_threads: int = NUM_THREADS_PADRAO, verificar_existentes: bool = False):
    """
    Reprocessa XMLs específicos baseado em uma lista de chaves de acesso
    
    Args:
        pasta: Pasta onde buscar os XMLs
        chaves: Lista de chaves de acesso (44 dígitos) para reprocessar
        num_threads: Número de threads para processamento paralelo
        verificar_existentes: Se True, verifica se XMLs já existem antes de enviar
    """
    print("="*60)
    print("🔄 REPROCESSAMENTO DE XMLs ESPECÍFICOS")
    print("="*60)
    print(f"\n📁 Pasta: {pasta}")
    print(f"🔑 Chaves para reprocessar: {len(chaves)}")
    print(f"🔧 Threads: {num_threads}")
    
    if not os.path.exists(pasta):
        print(f"\n❌ ERRO: Pasta não encontrada: {pasta}")
        return
    
    # Buscar todos os XMLs na pasta
    print(f"\n🔍 Buscando XMLs na pasta...")
    xmls_encontrados = buscar_xmls_recursivo(pasta)
    
    if not xmls_encontrados:
        print("\n❌ Nenhum arquivo XML encontrado na pasta.")
        return
    
    print(f"📦 Encontrados: {len(xmls_encontrados)} arquivo(s) XML")
    
    # Filtrar XMLs que correspondem às chaves fornecidas
    print(f"\n🔍 Filtrando XMLs pelas chaves fornecidas...")
    xmls_filtrados = []
    chaves_encontradas = set()
    chaves_nao_encontradas = set(chaves)
    
    for caminho_xml in xmls_encontrados:
        try:
            with open(caminho_xml, 'r', encoding='utf-8') as f:
                xml_content = f.read()
            
            chave = extrair_chave_acesso(xml_content)
            if chave and chave in chaves:
                xmls_filtrados.append(caminho_xml)
                chaves_encontradas.add(chave)
                chaves_nao_encontradas.discard(chave)
        except Exception as e:
            print(f"  ⚠️  Erro ao processar {os.path.basename(caminho_xml)}: {e}")
            continue
    
    print(f"✅ XMLs encontrados: {len(xmls_filtrados)}")
    
    if chaves_nao_encontradas:
        print(f"\n⚠️  Chaves não encontradas ({len(chaves_nao_encontradas)}):")
        for chave in sorted(chaves_nao_encontradas)[:10]:
            print(f"    - {chave}")
        if len(chaves_nao_encontradas) > 10:
            print(f"    ... e mais {len(chaves_nao_encontradas) - 10} chave(s)")
    
    if not xmls_filtrados:
        print("\n❌ Nenhum XML encontrado correspondendo às chaves fornecidas.")
        return
    
    # Validar XMLs
    print(f"\n✅ Validando XMLs...")
    service = UploadService()
    xmls_validos, tipos_identificados = service.validar_xmls(xmls_filtrados)
    
    if not xmls_validos:
        print("\n❌ Nenhum XML válido encontrado.")
        return
    
    print(f"✅ XMLs válidos: {len(xmls_validos)}")
    if tipos_identificados:
        for tipo, qtd in tipos_identificados.items():
            print(f"   - {tipo}: {qtd}")
    
    # Verificar existência se solicitado
    xmls_para_enviar = xmls_validos
    xmls_ja_existentes = []
    
    if verificar_existentes:
        print(f"\n🔍 Verificando XMLs existentes no SIEG...")
        xmls_para_enviar, xmls_ja_existentes = service.verificar_xmls_existentes(xmls_validos)
        print(f"   ○ Para enviar: {len(xmls_para_enviar)}")
        if xmls_ja_existentes:
            print(f"   ⚠ Já existentes: {len(xmls_ja_existentes)}")
    
    if not xmls_para_enviar:
        print("\n✅ Todos os XMLs já existem no SIEG. Nada para enviar!")
        return
    
    # Confirmação
    print(f"\n{'='*60}")
    print("CONFIRMAÇÃO DE ENVIO")
    print(f"{'='*60}")
    print(f"  Total de XMLs para enviar: {len(xmls_para_enviar)}")
    resposta = input(f"\nDeseja enviar {len(xmls_para_enviar)} XML(s) para o SIEG? (s/n): ").strip().lower()
    if resposta != 's':
        print("Operação cancelada.")
        return
    
    # Enviar XMLs
    print(f"\n{'='*60}")
    print("🔥 Iniciando envio...")
    print("="*60)
    
    resultado = service.enviar_xmls(xmls_para_enviar, num_threads=num_threads, usar_warmup=False)
    
    # Resumo final
    print(f"\n{'='*60}")
    print("📊 RESUMO FINAL")
    print("="*60)
    print(f"   ✅ Enviados com sucesso: {resultado['enviados']}")
    print(f"   ❌ Erros: {resultado['erros']}")
    print(f"   📦 Total processado: {resultado['total']}")
    print(f"   ⏱️  Tempo total: {resultado['tempo_total']:.2f} segundos")
    if resultado['total'] > 0 and resultado['tempo_total'] > 0:
        print(f"   🚀 Velocidade: {resultado['enviados']/resultado['tempo_total']:.2f} XMLs/segundo")
    
    if resultado['erros_detalhados']:
        print(f"\n   📋 Detalhes dos erros ({len(resultado['erros_detalhados'])} erro(s)):")
        for erro in resultado['erros_detalhados']:
            print(f"      - {erro['xml']['nome']}: {erro['erro']}")
    
    print("="*60)
    
    # Oferecer reprocessamento de erros se houver
    if resultado.get('erros_detalhados') and resultado.get('erros', 0) > 0:
        oferecer_reprocessamento_erros(
            resultado['erros_detalhados'],
            pasta_origem=pasta,
            num_threads=num_threads,
            verificar_existentes=verificar_existentes,
            confirmar_automatico=False
        )
    
    # Oferecer reprocessamento de erros se houver
    if resultado.get('erros_detalhados') and resultado.get('erros', 0) > 0:
        oferecer_reprocessamento_erros(
            resultado['erros_detalhados'],
            pasta_origem=pasta,
            num_threads=num_threads,
            verificar_existentes=verificar_existentes,
            confirmar_automatico=False
        )


def main():
    """Função principal com suporte a argumentos de linha de comando"""
    parser = argparse.ArgumentParser(
        description="Enviar XMLs para a API SIEG",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos:
  python scripts/enviar_xmls.py                    # Modo interativo
  python scripts/enviar_xmls.py --auto             # Modo automático (pasta padrão)
  python scripts/enviar_xmls.py --auto --pasta "C:\\Minha\\Pasta"
        """
    )
    
    parser.add_argument(
        '--auto', '-a',
        action='store_true',
        help='Modo automático: verifica, envia e exclui sem interação'
    )
    
    parser.add_argument(
        '--pasta', '-p',
        type=str,
        default=None,
        help=f'Pasta com XMLs (padrão: {PASTA_PADRAO_XMLS})'
    )
    
    parser.add_argument(
        '--threads', '-t',
        type=int,
        default=NUM_THREADS_PADRAO,
        help=f'Número de threads (padrão: {NUM_THREADS_PADRAO})'
    )
    
    parser.add_argument(
        '--reprocessar', '-r',
        type=str,
        nargs='+',
        metavar='CHAVE',
        help='Reprocessar XMLs específicos por chave de acesso (pode especificar múltiplas chaves)'
    )
    
    parser.add_argument(
        '--reprocessar-arquivo', '-rf',
        type=str,
        metavar='ARQUIVO',
        help='Arquivo de texto com uma chave por linha para reprocessar'
    )
    
    parser.add_argument(
        '--reprocessar-nomes', '-rn',
        type=str,
        metavar='ARQUIVO',
        help='Arquivo de texto com um nome de arquivo por linha para reprocessar (ex: arquivo.xml)'
    )
    
    parser.add_argument(
        '--sem-verificacao',
        action='store_true',
        help='Não verificar se XMLs já existem antes de enviar (apenas para reprocessamento)'
    )
    
    parser.add_argument(
        '--sim',
        action='store_true',
        help='Confirmar automaticamente sem pedir confirmação (útil para scripts)'
    )
    
    args = parser.parse_args()
    
    # Debug: mostrar qual modo está sendo usado (apenas se DEBUG=True)
    if DEBUG:
        print(f"[DEBUG] Argumentos recebidos:")
        print(f"  - reprocessar_nomes: {args.reprocessar_nomes}")
        print(f"  - pasta: {args.pasta}")
        print(f"  - reprocessar: {args.reprocessar}")
        print(f"  - reprocessar_arquivo: {args.reprocessar_arquivo}")
        print(f"  - auto: {args.auto}")
    
    # Modo reprocessamento por nomes de arquivo
    if args.reprocessar_nomes:
        if not args.pasta:
            print("❌ ERRO: É necessário especificar a pasta com --pasta ao reprocessar arquivos por nome.")
            return
        
        if not os.path.exists(args.reprocessar_nomes):
            print(f"❌ ERRO: Arquivo não encontrado: {args.reprocessar_nomes}")
            return
        
        try:
            with open(args.reprocessar_nomes, 'r', encoding='utf-8') as f:
                nomes_arquivos = [linha.strip() for linha in f if linha.strip()]
        except Exception as e:
            print(f"❌ ERRO ao ler arquivo: {e}")
            return
        
        if not nomes_arquivos:
            print("❌ ERRO: Nenhum nome de arquivo encontrado no arquivo.")
            return
        
        print(f"\n[INFO] Arquivos a serem reprocessados ({len(nomes_arquivos)}):")
        for nome in nomes_arquivos[:10]:
            print(f"   - {nome}")
        if len(nomes_arquivos) > 10:
            print(f"   ... e mais {len(nomes_arquivos) - 10} arquivo(s)")
        
        verificar_existentes = not args.sem_verificacao
        reprocessar_arquivos_por_nome(
            pasta=args.pasta,
            nomes_arquivos=nomes_arquivos,
            num_threads=args.threads,
            verificar_existentes=verificar_existentes,
            confirmar_automatico=args.sim
        )
    # Modo reprocessamento por chaves
    elif args.reprocessar or args.reprocessar_arquivo:
        if not args.pasta:
            print("❌ ERRO: É necessário especificar a pasta com --pasta ao reprocessar chaves específicas.")
            return
        
        chaves = []
        
        # Ler chaves do argumento
        if args.reprocessar:
            chaves.extend(args.reprocessar)
        
        # Ler chaves do arquivo
        if args.reprocessar_arquivo:
            if not os.path.exists(args.reprocessar_arquivo):
                print(f"❌ ERRO: Arquivo não encontrado: {args.reprocessar_arquivo}")
                return
            try:
                with open(args.reprocessar_arquivo, 'r', encoding='utf-8') as f:
                    chaves_arquivo = [linha.strip() for linha in f if linha.strip()]
                    chaves.extend(chaves_arquivo)
            except Exception as e:
                print(f"❌ ERRO ao ler arquivo: {e}")
                return
        
        # Remover duplicatas e validar chaves
        chaves_unicas = []
        for chave in chaves:
            chave = chave.strip()
            if chave and chave not in chaves_unicas:
                if len(chave) == 44 and chave.isdigit():
                    chaves_unicas.append(chave)
                else:
                    print(f"⚠️  Chave inválida ignorada: {chave}")
        
        if not chaves_unicas:
            print("❌ ERRO: Nenhuma chave válida fornecida.")
            return
        
        verificar_existentes = not args.sem_verificacao
        reprocessar_chaves_especificas(
            pasta=args.pasta,
            chaves=chaves_unicas,
            num_threads=args.threads,
            verificar_existentes=verificar_existentes
        )
    elif args.auto:
        enviar_automatico(pasta=args.pasta, num_threads=args.threads)
    else:
        processar_envio_interativo()


if __name__ == "__main__":
    main()
