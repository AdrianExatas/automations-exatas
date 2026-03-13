"""
Script para enviar XMLs para a API SIEG
Suporta NFe, NFCe, NFSe, CTe, CFe
Documentação: https://up.sieg.com/swagger/ui/index#!/Upload/Upload_EnviarXml

Uso:
  python enviar_xmls_sieg.py              # Modo interativo
  python enviar_xmls_sieg.py --auto       # Modo automático (pasta padrão, verifica, envia, exclui)
  python enviar_xmls_sieg.py --auto --manter  # Modo automático sem excluir
  python enviar_xmls_sieg.py --auto --pasta "C:\\Minha\\Pasta"  # Pasta específica
"""
import requests
import json
import os
import sys
import time
import base64
import urllib.parse
import shutil
import argparse
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Optional, Tuple, List
import tkinter as tk
from tkinter import filedialog
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

# Carregar variáveis de ambiente do arquivo .env
try:
    load_dotenv()
except Exception as e:
    # Se houver erro ao carregar .env (ex: encoding incorreto), usar valor padrão
    print(f"AVISO: Erro ao carregar arquivo .env: {e}")
    print("Usando valor padrão da API Key ou será solicitado ao usuário.")

# ============================================================
# CONFIGURAÇÕES PADRÃO
# ============================================================
PASTA_PADRAO_XMLS = r'C:\Users\Exatas\Downloads\XML SEFAZ'
NUM_THREADS_PADRAO = 20
NUM_THREADS_VERIFICACAO = 20

# Configurações de warm-up (aquecimento gradual)
WARM_UP_FASE1_QTD = 5       # Quantidade de XMLs na fase 1 (sequencial)
WARM_UP_FASE1_THREADS = 1   # Threads na fase 1
WARM_UP_FASE2_QTD = 15      # Quantidade de XMLs na fase 2
WARM_UP_FASE2_THREADS = 5   # Threads na fase 2
WARM_UP_FASE3_QTD = 30      # Quantidade de XMLs na fase 3
WARM_UP_FASE3_THREADS = 10  # Threads na fase 3
WARM_UP_DELAY = 0.2         # Delay entre envios no warm-up (segundos)

# Configurações de retry
RETRY_MAX_TENTATIVAS = 3
RETRY_ERROS_RECUPERAVEIS = [500, 502, 503, 504, 429]

# Configurações da API
API_URL_BASE = 'https://up.sieg.com/EnviarXml'
API_URL_VERIFICAR = 'https://api.sieg.com/BaixarXml?xmlType=1'
RATE_LIMIT_MAX = 2000  # Requisições por minuto
RATE_LIMIT_WINDOW = 60  # Janela de tempo em segundos

# Obter chave de API do .env (com fallback para valor padrão)
SIEG_API_KEY = os.getenv('SIEG_API_KEY', 'oecN20qEJJ0D8l6IFq7Nvg==')


def validar_xml(xml_string: str) -> bool:
    """Valida se o XML é bem formado"""
    try:
        ET.fromstring(xml_string)
        return True
    except ET.ParseError:
        return False


def extrair_chave_acesso(xml_string: str) -> Optional[str]:
    """
    Extrai a chave de acesso do XML (NFe, NFCe, etc.)
    
    Args:
        xml_string: String com o conteúdo do XML
        
    Returns:
        Chave de acesso (44 dígitos) ou None se não encontrar
    """
    try:
        root = ET.fromstring(xml_string)
        
        # Namespace da NFe
        ns = {'nfe': 'http://www.portalfiscal.inf.br/nfe'}
        
        # Tentar encontrar a chave de acesso
        # Pode estar em diferentes caminhos dependendo da estrutura
        caminhos_possiveis = [
            './/nfe:chNFe',  # Caminho mais comum
            './/{http://www.portalfiscal.inf.br/nfe}chNFe',
            './/chNFe',  # Sem namespace
            './/nfe:infNFe',  # Pode estar no atributo Id
            './/infNFe',
        ]
        
        chave = None
        for caminho in caminhos_possiveis:
            try:
                elemento = root.find(caminho, ns) if 'nfe:' in caminho else root.find(caminho)
                if elemento is not None:
                    # Tentar obter do atributo Id (formato: NFe352501...)
                    if 'Id' in elemento.attrib:
                        chave = elemento.attrib['Id']
                        # Remover prefixo "NFe" se existir
                        if chave.startswith('NFe'):
                            chave = chave[3:]
                        break
                    # Ou do texto do elemento
                    if elemento.text and elemento.text.strip():
                        chave = elemento.text.strip()
                        break
            except:
                continue
        
        # Se não encontrou, tentar buscar em todos os elementos
        if not chave:
            for elem in root.iter():
                # Verificar atributo Id
                if 'Id' in elem.attrib:
                    id_val = elem.attrib['Id']
                    if id_val.startswith('NFe') and len(id_val) == 47:  # NFe + 44 dígitos
                        chave = id_val[3:]
                        break
                # Verificar se o texto é uma chave de 44 dígitos
                if elem.text and elem.text.strip().isdigit() and len(elem.text.strip()) == 44:
                    chave = elem.text.strip()
                    break
        
        # Validar se é uma chave válida (44 dígitos)
        if chave and chave.isdigit() and len(chave) == 44:
            return chave
        
        return None
        
    except Exception as e:
        return None


def verificar_xml_existe(chave_acesso: str, api_key_verificar: Optional[str] = None) -> bool:
    """
    Verifica se um XML já existe no SIEG usando a chave de acesso
    
    Args:
        chave_acesso: Chave de acesso do XML (44 dígitos)
        api_key_verificar: API Key para verificação (usa a mesma do envio se None)
        
    Returns:
        True se o XML já existe, False caso contrário
    """
    if not chave_acesso or len(chave_acesso) != 44:
        return False
    
    try:
        # Usar a mesma API key se não fornecida
        if not api_key_verificar:
            api_key_verificar = SIEG_API_KEY
        
        # Construir URL de verificação
        url_verificar = f"{API_URL_VERIFICAR}&api_key={urllib.parse.quote(api_key_verificar)}"
        
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        
        # Tentar baixar o XML
        response = requests.post(
            url_verificar,
            headers=headers,
            data=chave_acesso,
            timeout=10  # Timeout menor para verificação rápida
        )
        
        # Se retornou 200, o XML existe
        if response.status_code == 200:
            return True
        # Se retornou 404 ou outro erro, provavelmente não existe
        return False
        
    except Exception:
        # Em caso de erro na verificação, assumir que não existe para não bloquear o envio
        return False


def identificar_tipo_xml(xml_string: str) -> Optional[str]:
    """
    Identifica o tipo de documento fiscal (NFe, NFCe, NFSe, CTe, CFe)
    
    Args:
        xml_string: String com o conteúdo do XML
        
    Returns:
        Tipo do documento ou None se não identificar
    """
    try:
        root = ET.fromstring(xml_string)
        
        # Verificar tags comuns para cada tipo
        tag_lower = root.tag.lower()
        
        if 'nfe' in tag_lower:
            # Verificar se é NFCe (procEventoNFe ou tem indicador de NFCe)
            if 'nfe' in tag_lower and ('nfce' in tag_lower or 'procEventoNFe' in tag_lower):
                # Verificar mais especificamente
                for elem in root.iter():
                    if 'tpNF' in elem.tag or 'indPres' in elem.tag:
                        return 'NFCe'
                return 'NFe'
        elif 'nfse' in tag_lower:
            return 'NFSe'
        elif 'cte' in tag_lower:
            return 'CTe'
        elif 'cfe' in tag_lower:
            return 'CFe'
        
        # Tentar identificar pelo namespace
        if root.tag.startswith('{'):
            namespace = root.tag.split('}')[0].strip('{')
            if 'nfe' in namespace.lower():
                return 'NFe'
            elif 'nfse' in namespace.lower():
                return 'NFSe'
            elif 'cte' in namespace.lower():
                return 'CTe'
        
        return None
    except Exception as e:
        print(f"  AVISO: Erro ao identificar tipo do XML: {e}")
        return None


def obter_api_key() -> Optional[str]:
    """
    Obtém a chave de API do .env ou solicita do usuário
    
    Returns:
        API Key ou None se não disponível
    """
    # Tentar obter do .env primeiro
    api_key = SIEG_API_KEY
    
    if not api_key or api_key == '':
        print("\n" + "="*60)
        print("Configuração de Autenticação - API SIEG")
        print("="*60)
        print("\nA chave de API não foi encontrada no arquivo .env")
        print("Por favor, informe a chave de API do SIEG:")
        print("\n" + "-"*60)
        
        api_key = input("\nAPI Key: ").strip()
        if not api_key:
            print("ERRO: API Key é obrigatória")
            return None
    
    return api_key


def enviar_xml(
    xml_content: str,
    api_key: str,
    retry_count: int = RETRY_MAX_TENTATIVAS,
    silencioso: bool = False
) -> Tuple[bool, Optional[str], bool]:
    """
    Envia um XML para a API SIEG com retry inteligente
    
    Args:
        xml_content: Conteúdo do XML como string
        api_key: API Key para autenticação
        retry_count: Número de tentativas em caso de erro recuperável
        silencioso: Se True, não imprime mensagens de retry
        
    Returns:
        Tupla (sucesso, mensagem, erro_recuperavel) onde:
        - sucesso: True se enviado com sucesso
        - mensagem: Mensagem de erro ou sucesso
        - erro_recuperavel: True se o erro pode ser retentado
    """
    url_completa = f"{API_URL_BASE}?api_key={urllib.parse.quote(api_key)}"
    xml_base64 = base64.b64encode(xml_content.encode('utf-8')).decode('utf-8')
    payload = {"Xml": xml_base64}
    headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    
    ultimo_erro = ""
    ultimo_codigo = 0
    
    for tentativa in range(retry_count):
        try:
            response = requests.post(
                url_completa,
                headers=headers,
                json=payload,
                timeout=30
            )
            
            ultimo_codigo = response.status_code
            
            if response.status_code == 200:
                try:
                    resposta_json = response.json()
                    return True, f"Enviado: {json.dumps(resposta_json, ensure_ascii=False)}", False
                except:
                    return True, "Enviado com sucesso", False
            
            # Erros recuperáveis - tentar novamente com backoff
            elif response.status_code in RETRY_ERROS_RECUPERAVEIS:
                wait_time = (2 ** tentativa) + (tentativa * 0.5)
                if tentativa < retry_count - 1:
                    if not silencioso:
                        print(f"    ⟳ Erro {response.status_code}, retry em {wait_time:.1f}s...")
                    time.sleep(wait_time)
                    continue
                else:
                    try:
                        error_data = response.json()
                        ultimo_erro = error_data.get('Message', error_data.get('message', response.text))
                    except:
                        ultimo_erro = response.text
                    return False, f"Erro HTTP {response.status_code}: {ultimo_erro}", True
            
            # Erros permanentes - não tentar novamente
            elif response.status_code == 401:
                return False, "Erro de autenticação. Verifique a API Key", False
            elif response.status_code == 404:
                return False, "Endpoint não encontrado (404)", False
            elif response.status_code == 400:
                try:
                    error_data = response.json()
                    ultimo_erro = error_data.get('message', error_data.get('error', response.text))
                except:
                    ultimo_erro = response.text
                return False, f"Erro na requisição: {ultimo_erro}", False
            else:
                try:
                    error_data = response.json()
                    ultimo_erro = error_data.get('message', error_data.get('error', response.text))
                except:
                    ultimo_erro = response.text
                return False, f"Erro HTTP {response.status_code}: {ultimo_erro}", False
                
        except requests.exceptions.Timeout:
            if tentativa < retry_count - 1:
                wait_time = (2 ** tentativa) + 1
                if not silencioso:
                    print(f"    ⟳ Timeout, retry em {wait_time:.1f}s...")
                time.sleep(wait_time)
                continue
            return False, "Timeout na requisição", True
        except requests.exceptions.RequestException as e:
            ultimo_erro = str(e)
            if tentativa < retry_count - 1:
                wait_time = (2 ** tentativa) + 1
                time.sleep(wait_time)
                continue
            return False, f"Erro na requisição: {ultimo_erro}", True
        except Exception as e:
            return False, f"Erro inesperado: {str(e)}", False
    
    return False, f"Falha após {retry_count} tentativas (último código: {ultimo_codigo})", True


def selecionar_arquivos_xml() -> List[str]:
    """
    Abre um diálogo para o usuário selecionar arquivos XML
    Retorna lista de caminhos dos arquivos selecionados
    """
    print("\nAbrindo diálogo de seleção de arquivos...")
    print("Por favor, selecione os arquivos XML no diálogo que será aberto.\n")
    
    # Criar janela root (oculta)
    root = tk.Tk()
    root.withdraw()  # Esconder a janela principal
    root.attributes('-topmost', True)  # Trazer para frente
    
    # Abrir diálogo de seleção múltipla de arquivos
    arquivos = filedialog.askopenfilenames(
        title="Selecione os arquivos XML para enviar (Ctrl+Click para múltiplos)",
        filetypes=[
            ("Arquivos XML", "*.xml"),
            ("Todos os arquivos", "*.*")
        ],
        initialdir=os.getcwd()  # Começar no diretório atual
    )
    
    root.destroy()  # Fechar a janela
    
    if arquivos:
        print(f"Arquivos selecionados: {len(arquivos)}")
        return list(arquivos)
    else:
        print("Nenhum arquivo selecionado.")
        return []


def selecionar_pasta_xmls() -> List[str]:
    """
    Permite selecionar uma pasta e retorna todos os XMLs encontrados nela
    """
    print("\nAbrindo diálogo de seleção de pasta...")
    print("Por favor, selecione a pasta que contém os arquivos XML.\n")
    
    # Criar janela root (oculta)
    root = tk.Tk()
    root.withdraw()
    root.attributes('-topmost', True)
    
    pasta = filedialog.askdirectory(
        title="Selecione a pasta com os arquivos XML",
        initialdir=os.getcwd()
    )
    
    root.destroy()
    
    if not pasta:
        print("Nenhuma pasta selecionada.")
        return []
    
    # Buscar todos os XMLs na pasta (recursivamente)
    xmls_encontrados = []
    for root_dir, dirs, files in os.walk(pasta):
        for arquivo in files:
            if arquivo.lower().endswith('.xml'):
                caminho_completo = os.path.join(root_dir, arquivo)
                xmls_encontrados.append(caminho_completo)
    
    print(f"Encontrados {len(xmls_encontrados)} arquivo(s) XML na pasta")
    return xmls_encontrados


def limpar_xmls_ja_enviados():
    """
    Remove ou move XMLs que já foram enviados para o SIEG
    """
    print("\n" + "="*60)
    print("Limpeza de XMLs Já Enviados")
    print("="*60)
    
    # Obter API Key
    api_key = obter_api_key()
    if not api_key:
        print("\nOperação cancelada. API Key não fornecida.")
        return
    
    # Selecionar pasta
    print("\nAbrindo diálogo de seleção de pasta...")
    print("Selecione a pasta que contém os arquivos XML.\n")
    
    root = tk.Tk()
    root.withdraw()
    root.attributes('-topmost', True)
    
    pasta = filedialog.askdirectory(
        title="Selecione a pasta com os XMLs para verificar",
        initialdir=os.getcwd()
    )
    
    root.destroy()
    
    if not pasta:
        print("Nenhuma pasta selecionada.")
        return
    
    # Buscar todos os XMLs na pasta
    print(f"\n🔍 Buscando XMLs em: {pasta}")
    xmls_encontrados = []
    for root_dir, dirs, files in os.walk(pasta):
        for arquivo in files:
            if arquivo.lower().endswith('.xml'):
                caminho_completo = os.path.join(root_dir, arquivo)
                xmls_encontrados.append(caminho_completo)
    
    if not xmls_encontrados:
        print("Nenhum arquivo XML encontrado na pasta.")
        return
    
    print(f"📦 Encontrados {len(xmls_encontrados)} arquivo(s) XML\n")
    
    # Perguntar ação
    print("O que fazer com os XMLs já enviados?")
    print("  [1] Excluir permanentemente")
    print("  [2] Mover para pasta '_enviados'")
    print("  [q] Cancelar")
    
    acao = input("\nEscolha uma opção (1/2/q): ").strip().lower()
    
    if acao == 'q':
        print("Operação cancelada.")
        return
    elif acao not in ['1', '2']:
        print("Opção inválida.")
        return
    
    excluir = acao == '1'
    
    # Verificar XMLs em paralelo
    print(f"\n{'='*60}")
    print("Verificando XMLs no SIEG...")
    print(f"{'='*60}\n")
    
    xmls_existentes = []
    xmls_nao_existentes = []
    xmls_sem_chave = []
    
    verificacao_lock = Lock()
    total_verificado = 0
    
    def verificar_xml_paralelo(caminho_xml):
        """Verifica se XML existe no SIEG"""
        nonlocal total_verificado
        nome_arquivo = os.path.basename(caminho_xml)
        
        try:
            with open(caminho_xml, 'r', encoding='utf-8') as f:
                xml_content = f.read()
            
            if not validar_xml(xml_content):
                with verificacao_lock:
                    total_verificado += 1
                    print(f"[{total_verificado}/{len(xmls_encontrados)}] ⚠ XML inválido: {nome_arquivo}")
                return ('invalido', caminho_xml, nome_arquivo)
            
            chave_acesso = extrair_chave_acesso(xml_content)
            
            if not chave_acesso:
                with verificacao_lock:
                    total_verificado += 1
                    print(f"[{total_verificado}/{len(xmls_encontrados)}] ⚠ Sem chave: {nome_arquivo}")
                return ('sem_chave', caminho_xml, nome_arquivo)
            
            existe = verificar_xml_existe(chave_acesso, api_key)
            
            with verificacao_lock:
                total_verificado += 1
                status = "✓ EXISTE" if existe else "○ Não existe"
                chave_curta = f"{chave_acesso[:10]}...{chave_acesso[-4:]}"
                print(f"[{total_verificado}/{len(xmls_encontrados)}] {status}: {nome_arquivo} ({chave_curta})")
            
            return ('existe' if existe else 'nao_existe', caminho_xml, nome_arquivo)
            
        except Exception as e:
            with verificacao_lock:
                total_verificado += 1
                print(f"[{total_verificado}/{len(xmls_encontrados)}] ✗ Erro: {nome_arquivo} - {e}")
            return ('erro', caminho_xml, nome_arquivo)
    
    # Verificar em paralelo
    num_threads = min(20, len(xmls_encontrados))
    print(f"Usando {num_threads} thread(s) para verificação...\n")
    
    inicio = time.time()
    
    with ThreadPoolExecutor(max_workers=num_threads) as executor:
        futures = {executor.submit(verificar_xml_paralelo, xml): xml for xml in xmls_encontrados}
        
        for future in as_completed(futures):
            try:
                status, caminho, nome = future.result()
                if status == 'existe':
                    xmls_existentes.append(caminho)
                elif status == 'nao_existe':
                    xmls_nao_existentes.append(caminho)
                else:
                    xmls_sem_chave.append(caminho)
            except Exception as e:
                pass
    
    tempo_verificacao = time.time() - inicio
    
    # Resumo
    print(f"\n{'='*60}")
    print("RESUMO DA VERIFICAÇÃO")
    print(f"{'='*60}")
    print(f"  ✓ XMLs JÁ ENVIADOS (existem no SIEG): {len(xmls_existentes)}")
    print(f"  ○ XMLs NÃO enviados: {len(xmls_nao_existentes)}")
    print(f"  ⚠ XMLs sem chave/inválidos: {len(xmls_sem_chave)}")
    print(f"  ⏱ Tempo de verificação: {tempo_verificacao:.2f}s")
    print(f"{'='*60}")
    
    if not xmls_existentes:
        print("\n✅ Nenhum XML já enviado encontrado. Nada a fazer!")
        return
    
    # Confirmar ação
    acao_str = "EXCLUIR" if excluir else "MOVER"
    print(f"\n⚠️  ATENÇÃO: Serão {acao_str.lower()}dos {len(xmls_existentes)} XML(s) já enviados!")
    
    if excluir:
        print("    ⚠️  Esta ação NÃO pode ser desfeita!")
    
    confirma = input(f"\nConfirma {acao_str} os {len(xmls_existentes)} XML(s)? (s/n): ").strip().lower()
    
    if confirma != 's':
        print("Operação cancelada.")
        return
    
    # Executar ação
    print(f"\n{'='*60}")
    print(f"{'Excluindo' if excluir else 'Movendo'} XMLs já enviados...")
    print(f"{'='*60}\n")
    
    sucesso_acao = 0
    erros_acao = 0
    
    # Criar pasta de destino se for mover
    pasta_destino = None
    if not excluir:
        pasta_destino = os.path.join(pasta, "_enviados")
        os.makedirs(pasta_destino, exist_ok=True)
        print(f"📁 Pasta de destino: {pasta_destino}\n")
    
    for idx, caminho_xml in enumerate(xmls_existentes, 1):
        nome_arquivo = os.path.basename(caminho_xml)
        try:
            if excluir:
                os.remove(caminho_xml)
                print(f"[{idx}/{len(xmls_existentes)}] 🗑️ Excluído: {nome_arquivo}")
            else:
                # Manter estrutura de subpastas
                caminho_relativo = os.path.relpath(caminho_xml, pasta)
                destino_completo = os.path.join(pasta_destino, caminho_relativo)
                os.makedirs(os.path.dirname(destino_completo), exist_ok=True)
                
                shutil.move(caminho_xml, destino_completo)
                print(f"[{idx}/{len(xmls_existentes)}] 📦 Movido: {nome_arquivo}")
            
            sucesso_acao += 1
        except Exception as e:
            erros_acao += 1
            print(f"[{idx}/{len(xmls_existentes)}] ✗ Erro: {nome_arquivo} - {e}")
    
    # Resumo final
    print(f"\n{'='*60}")
    print("RESUMO DA LIMPEZA")
    print(f"{'='*60}")
    print(f"  ✅ {'Excluídos' if excluir else 'Movidos'} com sucesso: {sucesso_acao}")
    print(f"  ❌ Erros: {erros_acao}")
    print(f"  📁 XMLs restantes (não enviados): {len(xmls_nao_existentes)}")
    print(f"{'='*60}")


def processar_envio_xmls():
    """
    Função principal para processar o envio de XMLs
    """
    print("="*60)
    print("Sistema de Envio de XMLs - API SIEG")
    print("="*60)
    
    # Obter API Key
    api_key = obter_api_key()
    if not api_key:
        print("\nOperação cancelada. API Key não fornecida.")
        return
    
    # Selecionar arquivos XML
    print("\n" + "="*60)
    print("Seleção de Arquivos XML")
    print("="*60)
    print("\nOpções:")
    print("  [1] Selecionar arquivos XML específicos")
    print("  [2] Selecionar pasta com XMLs (busca recursiva)")
    print("  [3] Limpar XMLs já enviados (excluir/mover)")
    print("  [q] Cancelar")
    
    escolha = input("\nEscolha uma opção (1/2/3/q): ").strip().lower()
    
    arquivos_xml = []
    if escolha == '1':
        arquivos_xml = selecionar_arquivos_xml()
    elif escolha == '2':
        arquivos_xml = selecionar_pasta_xmls()
    elif escolha == '3':
        limpar_xmls_ja_enviados()
        return
    elif escolha == 'q':
        print("Operação cancelada.")
        return
    else:
        print("Opção inválida.")
        return
    
    if not arquivos_xml:
        print("\nNenhum arquivo XML selecionado.")
        return
    
    # Perguntar se deseja verificar XMLs existentes antes de enviar
    print(f"\n{'='*60}")
    print("Verificação de XMLs Existentes")
    print(f"{'='*60}")
    print("\nDeseja verificar se os XMLs já existem no SIEG antes de enviar?")
    print("  - Isso evita envios duplicados")
    print("  - Pode aumentar o tempo de processamento")
    verificar_existentes = input("\nVerificar XMLs existentes antes de enviar? (s/n, padrão: s): ").strip().lower()
    verificar_existentes = verificar_existentes != 'n'
    
    # Validar XMLs antes de enviar
    print(f"\n{'='*60}")
    print("Validação dos XMLs")
    print(f"{'='*60}")
    
    xmls_validos_temp = []
    tipos_identificados = {}
    
    # Primeira passada: validar e ler todos os XMLs
    print("Lendo e validando XMLs...")
    for idx, caminho_xml in enumerate(arquivos_xml, 1):
        nome_arquivo = os.path.basename(caminho_xml)
        print(f"[{idx}/{len(arquivos_xml)}] Validando: {nome_arquivo}")
        
        try:
            with open(caminho_xml, 'r', encoding='utf-8') as f:
                xml_content = f.read()
            
            if not validar_xml(xml_content):
                print(f"  ERRO: XML inválido ou mal formado")
                continue
            
            tipo_xml = identificar_tipo_xml(xml_content)
            if tipo_xml:
                tipos_identificados[tipo_xml] = tipos_identificados.get(tipo_xml, 0) + 1
                print(f"  OK - Tipo identificado: {tipo_xml}")
            else:
                print(f"  AVISO: Tipo não identificado (será enviado mesmo assim)")
            
            chave_acesso = extrair_chave_acesso(xml_content)
            xmls_validos_temp.append((caminho_xml, nome_arquivo, xml_content, tipo_xml, chave_acesso))
            
        except Exception as e:
            print(f"  ERRO ao ler arquivo: {e}")
    
    if not xmls_validos_temp:
        print("\nNenhum XML válido encontrado para enviar.")
        return
    
    # Segunda passada: verificar existência em paralelo (se solicitado)
    xmls_validos = []
    xmls_ja_existentes = []
    
    if verificar_existentes:
        print(f"\n{'='*60}")
        print("Verificando XMLs existentes no SIEG (paralelo)")
        print(f"{'='*60}")
        
        # Contadores thread-safe
        verificacao_lock = Lock()
        total_verificado = 0
        
        def verificar_xml_paralelo(args):
            """Wrapper para verificar XML com controle de progresso thread-safe"""
            caminho_xml, nome_arquivo, xml_content, tipo_xml, chave_acesso = args
            
            resultado = None
            if chave_acesso:
                existe = verificar_xml_existe(chave_acesso, api_key)
                resultado = ('existe' if existe else 'nao_existe', caminho_xml, nome_arquivo, chave_acesso, tipo_xml, xml_content)
            else:
                # Se não tem chave, não pode verificar, assume que não existe
                resultado = ('sem_chave', caminho_xml, nome_arquivo, None, tipo_xml, xml_content)
            
            with verificacao_lock:
                nonlocal total_verificado
                total_verificado += 1
                status = "✓" if resultado[0] == 'nao_existe' or resultado[0] == 'sem_chave' else "⚠"
                chave_info = f" ({resultado[3][:10]}...)" if resultado[3] else " (sem chave)"
                print(f"[{total_verificado}/{len(xmls_validos_temp)}] {status} {resultado[2]}{chave_info}")
            
            return resultado
        
        # Usar 20 threads para verificação (mais rápido que envio)
        num_threads_verificacao = min(20, len(xmls_validos_temp))
        print(f"Usando {num_threads_verificacao} thread(s) para verificação paralela...\n")
        
        inicio_verificacao = time.time()
        
        # Processar verificações em paralelo
        with ThreadPoolExecutor(max_workers=num_threads_verificacao) as executor:
            futures = {executor.submit(verificar_xml_paralelo, args): args for args in xmls_validos_temp}
            
            for future in as_completed(futures):
                try:
                    resultado = future.result()
                    status, caminho_xml, nome_arquivo, chave_acesso, tipo_xml, xml_content = resultado
                    
                    if status == 'existe':
                        xmls_ja_existentes.append((caminho_xml, nome_arquivo, chave_acesso, tipo_xml))
                    else:
                        xmls_validos.append((caminho_xml, xml_content, tipo_xml))
                except Exception as e:
                    # Em caso de erro, assume que não existe para não bloquear
                    caminho_xml, nome_arquivo, xml_content, tipo_xml, _ = futures[future]
                    xmls_validos.append((caminho_xml, xml_content, tipo_xml))
        
        tempo_verificacao = time.time() - inicio_verificacao
        print(f"\nVerificação concluída em {tempo_verificacao:.2f} segundos")
    else:
        # Se não verificar, todos os XMLs válidos vão para envio
        for caminho_xml, nome_arquivo, xml_content, tipo_xml, _ in xmls_validos_temp:
            xmls_validos.append((caminho_xml, xml_content, tipo_xml))
    
    if not xmls_validos and not xmls_ja_existentes:
        print("\nNenhum XML válido encontrado para enviar.")
        return
    
    # Resumo antes de enviar
    print(f"\n{'='*60}")
    print("RESUMO ANTES DO ENVIO")
    print(f"{'='*60}")
    print(f"  Total de arquivos selecionados: {len(arquivos_xml)}")
    print(f"  XMLs válidos para envio: {len(xmls_validos)}")
    if xmls_ja_existentes:
        print(f"  XMLs já existentes no SIEG (ignorados): {len(xmls_ja_existentes)}")
    if tipos_identificados:
        print(f"  Tipos identificados:")
        for tipo, quantidade in tipos_identificados.items():
            print(f"    - {tipo}: {quantidade}")
    print(f"{'='*60}")
    
    if not xmls_validos:
        print("\nTodos os XMLs já existem no SIEG. Nada para enviar.")
        if xmls_ja_existentes:
            print("\nXMLs já existentes:")
            for _, nome, chave, tipo in xmls_ja_existentes[:10]:
                tipo_info = f" ({tipo})" if tipo else ""
                print(f"  - {nome}{tipo_info} - Chave: {chave}")
            if len(xmls_ja_existentes) > 10:
                print(f"  ... e mais {len(xmls_ja_existentes) - 10} XML(s)")
        return
    
    # Confirmação
    resposta = input(f"\nDeseja enviar {len(xmls_validos)} XML(s) para o SIEG? (s/n): ").strip().lower()
    if resposta != 's':
        print("Operação cancelada.")
        return
    
    # Processar envio
    print(f"\n{'='*60}")
    print("Iniciando envio dos XMLs...")
    print(f"{'='*60}\n")
    
    # Perguntar número de threads (padrão: 10, máximo recomendado: 30 para respeitar rate limit)
    print("Configuração de Threads:")
    print("  - Mais threads = envio mais rápido")
    print("  - Recomendado: 10-20 threads (rate limit: 2000 req/min)")
    num_threads_input = input(f"\nNúmero de threads (padrão: 10, Enter para usar padrão): ").strip()
    
    try:
        num_threads = int(num_threads_input) if num_threads_input else 10
        if num_threads < 1:
            num_threads = 10
        elif num_threads > 50:
            print("  AVISO: Número muito alto, limitando a 50 threads para evitar problemas.")
            num_threads = 50
    except ValueError:
        num_threads = 10
    
    print(f"\nUsando {num_threads} thread(s) para envio paralelo...\n")
    
    # Contadores thread-safe
    sucesso = 0
    falhas = 0
    erros_detalhados = []
    contador_lock = Lock()
    progresso_lock = Lock()
    total_processado = 0
    
    def enviar_xml_com_progresso(args):
        """Wrapper para enviar XML com controle de progresso thread-safe"""
        caminho_xml, xml_content, tipo_xml, idx_total = args
        nome_arquivo = os.path.basename(caminho_xml)
        tipo_info = f" ({tipo_xml})" if tipo_xml else ""
        
        # Enviar XML (agora retorna 3 valores)
        sucesso_envio, mensagem, _ = enviar_xml(xml_content, api_key)
        
        # Atualizar contadores de forma thread-safe
        with contador_lock:
            nonlocal sucesso, falhas, total_processado
            total_processado += 1
            
            if sucesso_envio:
                sucesso += 1
                status = "✓ OK"
            else:
                falhas += 1
                status = "✗ ERRO"
                erros_detalhados.append({
                    'arquivo': nome_arquivo,
                    'erro': mensagem
                })
        
        # Exibir progresso de forma thread-safe
        with progresso_lock:
            print(f"[{total_processado}/{len(xmls_validos)}] {status} - {nome_arquivo}{tipo_info}")
            if not sucesso_envio:
                print(f"         Erro: {mensagem}")
        
        return sucesso_envio, nome_arquivo, mensagem
    
    # Preparar argumentos para cada XML
    args_list = [
        (caminho_xml, xml_content, tipo_xml, idx)
        for idx, (caminho_xml, xml_content, tipo_xml) in enumerate(xmls_validos, 1)
    ]
    
    # Iniciar tempo
    inicio_tempo = time.time()
    
    # Processar com ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=num_threads) as executor:
        # Submeter todas as tarefas
        futures = {executor.submit(enviar_xml_com_progresso, args): args for args in args_list}
        
        # Aguardar conclusão (as_completed retorna conforme completam)
        for future in as_completed(futures):
            try:
                future.result()  # Aguardar resultado (já processado na função)
            except Exception as e:
                caminho_xml, _, _, _ = futures[future]
                nome_arquivo = os.path.basename(caminho_xml)
                with contador_lock:
                    falhas += 1
                    total_processado += 1
                    erros_detalhados.append({
                        'arquivo': nome_arquivo,
                        'erro': f"Exceção: {str(e)}"
                    })
                with progresso_lock:
                    print(f"[{total_processado}/{len(xmls_validos)}] ✗ ERRO - {nome_arquivo}")
                    print(f"         Exceção: {str(e)}")
    
    # Calcular tempo total
    tempo_total = time.time() - inicio_tempo
    
    # Resumo final
    print(f"\n{'='*60}")
    print("RESUMO FINAL DO ENVIO")
    print(f"{'='*60}")
    print(f"  Sucesso: {sucesso}")
    print(f"  Falhas: {falhas}")
    print(f"  Total processado: {len(xmls_validos)}")
    print(f"  Tempo total: {tempo_total:.2f} segundos")
    if len(xmls_validos) > 0:
        print(f"  Velocidade média: {len(xmls_validos)/tempo_total:.2f} XMLs/segundo")
    
    if erros_detalhados:
        print(f"\n  Detalhes dos erros ({len(erros_detalhados)} erro(s)):")
        # Mostrar apenas os primeiros 10 erros para não poluir a tela
        for erro in erros_detalhados[:10]:
            print(f"    - {erro['arquivo']}: {erro['erro']}")
        if len(erros_detalhados) > 10:
            print(f"    ... e mais {len(erros_detalhados) - 10} erro(s)")
    
    print(f"{'='*60}")


def enviar_automatico(
    pasta: str = None,
    excluir_enviados: bool = True,
    num_threads: int = NUM_THREADS_PADRAO
) -> dict:
    """
    Modo automático: verifica, envia e exclui XMLs sem interação.
    Usa warm-up gradual para evitar sobrecarga no servidor.
    
    Args:
        pasta: Pasta com XMLs (usa PASTA_PADRAO_XMLS se None)
        excluir_enviados: Se True, exclui XMLs enviados com sucesso
        num_threads: Número máximo de threads (após warm-up)
        
    Returns:
        Dict com estatísticas do envio
    """
    print("="*60)
    print("🚀 MODO AUTOMÁTICO - Envio de XMLs para SIEG")
    print("="*60)
    
    # Usar pasta padrão se não informada
    if not pasta:
        pasta = PASTA_PADRAO_XMLS
    
    print(f"\n📁 Pasta: {pasta}")
    print(f"🔧 Threads máx: {num_threads}")
    print(f"🗑️  Excluir após envio: {'Sim' if excluir_enviados else 'Não'}")
    
    # Verificar se pasta existe
    if not os.path.exists(pasta):
        print(f"\n❌ ERRO: Pasta não encontrada: {pasta}")
        return {"erro": "Pasta não encontrada"}
    
    # Obter API Key
    api_key = SIEG_API_KEY
    if not api_key:
        print("\n❌ ERRO: API Key não configurada no .env")
        return {"erro": "API Key não configurada"}
    
    # Buscar XMLs
    print(f"\n{'='*60}")
    print("📂 Buscando arquivos XML...")
    print("="*60)
    
    xmls_encontrados = []
    for root_dir, dirs, files in os.walk(pasta):
        for arquivo in files:
            if arquivo.lower().endswith('.xml'):
                caminho_completo = os.path.join(root_dir, arquivo)
                xmls_encontrados.append(caminho_completo)
    
    if not xmls_encontrados:
        print("\nℹ️  Nenhum arquivo XML encontrado na pasta.")
        return {"total": 0, "enviados": 0, "existentes": 0, "erros": 0}
    
    print(f"📦 Encontrados: {len(xmls_encontrados)} arquivo(s) XML")
    
    # Ler e validar XMLs
    print(f"\n{'='*60}")
    print("🔍 Lendo e validando XMLs...")
    print("="*60)
    
    xmls_validos = []
    for caminho in xmls_encontrados:
        try:
            with open(caminho, 'r', encoding='utf-8') as f:
                xml_content = f.read()
            
            if not validar_xml(xml_content):
                continue
            
            chave_acesso = extrair_chave_acesso(xml_content)
            tipo_xml = identificar_tipo_xml(xml_content)
            xmls_validos.append({
                'caminho': caminho,
                'nome': os.path.basename(caminho),
                'conteudo': xml_content,
                'chave': chave_acesso,
                'tipo': tipo_xml
            })
        except:
            continue
    
    print(f"✅ XMLs válidos: {len(xmls_validos)}")
    
    if not xmls_validos:
        print("\nℹ️  Nenhum XML válido encontrado.")
        return {"total": 0, "enviados": 0, "existentes": 0, "erros": 0}
    
    # Verificar existência no SIEG (paralelo)
    print(f"\n{'='*60}")
    print("🔎 Verificando XMLs existentes no SIEG...")
    print("="*60)
    
    xmls_para_enviar = []
    xmls_ja_existentes = []
    verificacao_lock = Lock()
    verificados = 0
    
    def verificar_paralelo(xml_info):
        nonlocal verificados
        if xml_info['chave']:
            existe = verificar_xml_existe(xml_info['chave'], api_key)
        else:
            existe = False  # Sem chave, assumir que não existe
        
        with verificacao_lock:
            nonlocal verificados
            verificados += 1
            status = "⚠ Existe" if existe else "○ Novo"
            print(f"[{verificados}/{len(xmls_validos)}] {status}: {xml_info['nome'][:50]}...")
        
        return (xml_info, existe)
    
    with ThreadPoolExecutor(max_workers=NUM_THREADS_VERIFICACAO) as executor:
        futures = [executor.submit(verificar_paralelo, xml) for xml in xmls_validos]
        for future in as_completed(futures):
            xml_info, existe = future.result()
            if existe:
                xmls_ja_existentes.append(xml_info)
            else:
                xmls_para_enviar.append(xml_info)
    
    print(f"\n📊 Resultado da verificação:")
    print(f"   ○ Para enviar: {len(xmls_para_enviar)}")
    print(f"   ⚠ Já existentes: {len(xmls_ja_existentes)}")
    
    # Excluir XMLs já existentes
    if excluir_enviados and xmls_ja_existentes:
        print(f"\n🗑️  Excluindo {len(xmls_ja_existentes)} XMLs já existentes no SIEG...")
        for xml_info in xmls_ja_existentes:
            try:
                os.remove(xml_info['caminho'])
            except:
                pass
        print("   ✅ Concluído")
    
    if not xmls_para_enviar:
        print("\n✅ Todos os XMLs já estão no SIEG. Nada para enviar!")
        return {
            "total": len(xmls_validos),
            "enviados": 0,
            "existentes": len(xmls_ja_existentes),
            "erros": 0
        }
    
    # ENVIO COM WARM-UP
    print(f"\n{'='*60}")
    print("🔥 Iniciando envio com WARM-UP gradual...")
    print("="*60)
    print(f"   Fase 1: {WARM_UP_FASE1_QTD} XMLs com {WARM_UP_FASE1_THREADS} thread(s)")
    print(f"   Fase 2: {WARM_UP_FASE2_QTD} XMLs com {WARM_UP_FASE2_THREADS} thread(s)")
    print(f"   Fase 3: {WARM_UP_FASE3_QTD} XMLs com {WARM_UP_FASE3_THREADS} thread(s)")
    print(f"   Fase 4: Restante com {num_threads} thread(s)")
    print()
    
    enviados_sucesso = []
    erros_envio = []
    erros_recuperaveis = []  # Para retentar no final
    
    inicio_tempo = time.time()
    total_para_enviar = len(xmls_para_enviar)
    processados = 0
    
    def enviar_com_progresso(xml_info, fase_info=""):
        nonlocal processados
        sucesso, msg, recuperavel = enviar_xml(xml_info['conteudo'], api_key, silencioso=True)
        
        processados += 1
        tipo_info = f" ({xml_info['tipo']})" if xml_info['tipo'] else ""
        
        if sucesso:
            print(f"[{processados}/{total_para_enviar}] ✓ OK{fase_info} - {xml_info['nome'][:45]}...{tipo_info}")
            return ('sucesso', xml_info, msg)
        else:
            print(f"[{processados}/{total_para_enviar}] ✗ ERRO{fase_info} - {xml_info['nome'][:45]}...")
            print(f"         {msg}")
            return ('erro_recuperavel' if recuperavel else 'erro', xml_info, msg)
    
    # Fase 1: Sequencial (warm-up inicial)
    fase1_qtd = min(WARM_UP_FASE1_QTD, len(xmls_para_enviar))
    if fase1_qtd > 0:
        print(f"── Fase 1: Enviando {fase1_qtd} XMLs sequencialmente ──")
        for xml_info in xmls_para_enviar[:fase1_qtd]:
            resultado, xml, msg = enviar_com_progresso(xml_info, " [F1]")
            if resultado == 'sucesso':
                enviados_sucesso.append(xml)
            elif resultado == 'erro_recuperavel':
                erros_recuperaveis.append(xml)
            else:
                erros_envio.append({'xml': xml, 'erro': msg})
            time.sleep(WARM_UP_DELAY)
    
    restantes = xmls_para_enviar[fase1_qtd:]
    
    # Fase 2: Poucas threads
    fase2_qtd = min(WARM_UP_FASE2_QTD, len(restantes))
    if fase2_qtd > 0:
        print(f"\n── Fase 2: Enviando {fase2_qtd} XMLs com {WARM_UP_FASE2_THREADS} threads ──")
        with ThreadPoolExecutor(max_workers=WARM_UP_FASE2_THREADS) as executor:
            futures = {executor.submit(enviar_com_progresso, xml, " [F2]"): xml for xml in restantes[:fase2_qtd]}
            for future in as_completed(futures):
                resultado, xml, msg = future.result()
                if resultado == 'sucesso':
                    enviados_sucesso.append(xml)
                elif resultado == 'erro_recuperavel':
                    erros_recuperaveis.append(xml)
                else:
                    erros_envio.append({'xml': xml, 'erro': msg})
    
    restantes = restantes[fase2_qtd:]
    
    # Fase 3: Mais threads
    fase3_qtd = min(WARM_UP_FASE3_QTD, len(restantes))
    if fase3_qtd > 0:
        print(f"\n── Fase 3: Enviando {fase3_qtd} XMLs com {WARM_UP_FASE3_THREADS} threads ──")
        with ThreadPoolExecutor(max_workers=WARM_UP_FASE3_THREADS) as executor:
            futures = {executor.submit(enviar_com_progresso, xml, " [F3]"): xml for xml in restantes[:fase3_qtd]}
            for future in as_completed(futures):
                resultado, xml, msg = future.result()
                if resultado == 'sucesso':
                    enviados_sucesso.append(xml)
                elif resultado == 'erro_recuperavel':
                    erros_recuperaveis.append(xml)
                else:
                    erros_envio.append({'xml': xml, 'erro': msg})
    
    restantes = restantes[fase3_qtd:]
    
    # Fase 4: Todas as threads
    if restantes:
        print(f"\n── Fase 4: Enviando {len(restantes)} XMLs com {num_threads} threads ──")
        with ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = {executor.submit(enviar_com_progresso, xml, ""): xml for xml in restantes}
            for future in as_completed(futures):
                resultado, xml, msg = future.result()
                if resultado == 'sucesso':
                    enviados_sucesso.append(xml)
                elif resultado == 'erro_recuperavel':
                    erros_recuperaveis.append(xml)
                else:
                    erros_envio.append({'xml': xml, 'erro': msg})
    
    # Retentar erros recuperáveis
    if erros_recuperaveis:
        print(f"\n── Retentando {len(erros_recuperaveis)} XMLs com erro recuperável ──")
        time.sleep(2)  # Pausa antes de retentar
        
        for xml_info in erros_recuperaveis:
            resultado, xml, msg = enviar_com_progresso(xml_info, " [RETRY]")
            if resultado == 'sucesso':
                enviados_sucesso.append(xml)
            else:
                erros_envio.append({'xml': xml, 'erro': msg})
    
    tempo_total = time.time() - inicio_tempo
    
    # Excluir XMLs enviados com sucesso
    if excluir_enviados and enviados_sucesso:
        print(f"\n🗑️  Excluindo {len(enviados_sucesso)} XMLs enviados com sucesso...")
        excluidos = 0
        for xml_info in enviados_sucesso:
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
    print(f"   ✅ Enviados com sucesso: {len(enviados_sucesso)}")
    print(f"   ❌ Erros: {len(erros_envio)}")
    print(f"   ⏱️  Tempo total: {tempo_total:.2f} segundos")
    if total_para_enviar > 0 and tempo_total > 0:
        print(f"   🚀 Velocidade: {len(enviados_sucesso)/tempo_total:.2f} XMLs/segundo")
    
    if erros_envio:
        print(f"\n   ❌ Detalhes dos erros ({len(erros_envio)}):")
        for erro in erros_envio[:10]:
            print(f"      - {erro['xml']['nome'][:40]}...: {erro['erro'][:50]}")
        if len(erros_envio) > 10:
            print(f"      ... e mais {len(erros_envio) - 10} erro(s)")
    
    print("="*60)
    
    return {
        "total": len(xmls_validos),
        "enviados": len(enviados_sucesso),
        "existentes": len(xmls_ja_existentes),
        "erros": len(erros_envio)
    }


def main():
    """Função principal com suporte a argumentos de linha de comando"""
    parser = argparse.ArgumentParser(
        description="Enviar XMLs para a API SIEG",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos:
  python enviar_xmls_sieg.py                    # Modo interativo
  python enviar_xmls_sieg.py --auto             # Modo automático (pasta padrão)
  python enviar_xmls_sieg.py --auto --manter    # Automático sem excluir
  python enviar_xmls_sieg.py --auto --pasta "C:\\Minha\\Pasta"
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
        '--manter', '-m',
        action='store_true',
        help='Manter XMLs após envio (não excluir)'
    )
    
    parser.add_argument(
        '--threads', '-t',
        type=int,
        default=NUM_THREADS_PADRAO,
        help=f'Número de threads (padrão: {NUM_THREADS_PADRAO})'
    )
    
    args = parser.parse_args()
    
    if args.auto:
        # Modo automático
        enviar_automatico(
            pasta=args.pasta,
            excluir_enviados=not args.manter,
            num_threads=args.threads
        )
    else:
        # Modo interativo
        processar_envio_xmls()


if __name__ == "__main__":
    main()
