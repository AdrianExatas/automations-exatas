"""
Módulo de download de arquivos XML do SEFAZ
"""
import os
import time
import re
import json
from pathlib import Path
from datetime import datetime
from urllib.parse import unquote
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException

from src.core.config import PATHS
from src.download import state
from src.download.checkpoint import salvar_checkpoint, carregar_checkpoint

# Delays ajustados para acelerar sem quebrar carregamentos
FAST_NAV_DELAY = 0.15
PAGE_LOAD_TIMEOUT = 3


def obter_numero_pagina_atual(navegador) -> int | None:
    """Obtém o número da página atual (usa marcadores da paginação)."""
    try:
        pagina_atual = navegador.find_element(By.XPATH, "//td[@class='pgAtualNav']//b")
        return int(pagina_atual.text.strip())
    except:
        try:
            pagina_atual = navegador.find_element(By.XPATH, "//font[@class='fontPgAtualNav']//b")
            return int(pagina_atual.text.strip())
        except:
            return None


def obter_links_download(navegador, wait) -> list:
    """
    Obtém todos os links de download na página atual
    
    Returns:
        Lista de tuplas (elemento, url_download, nome_arquivo, situacao, tipo_download)
        tipo_download: NFC, NFE, CTE, etc.
    """
    links = []
    
    try:
        # Tenta encontrar tabela no contexto atual ou em iframes
        tabela_encontrada = False
        
        # Tenta primeiro no contexto atual
        try:
            wait.until(EC.presence_of_element_located((By.TAG_NAME, "table")))
            tabela_encontrada = True
        except:
            pass
        
        # Se não encontrou, procura em iframes
        if not tabela_encontrada:
            try:
                iframes = navegador.find_elements(By.TAG_NAME, "iframe")
                for iframe in iframes:
                    try:
                        navegador.switch_to.frame(iframe)
                        wait.until(EC.presence_of_element_located((By.TAG_NAME, "table")))
                        tabela_encontrada = True
                        break
                    except:
                        navegador.switch_to.default_content()
            except:
                pass
        
        if not tabela_encontrada:
            print("   ⚠️ Tabela não encontrada")
            return links
        
        time.sleep(FAST_NAV_DELAY)
        
        # Procura por linhas na tabela (mesmo padrão do código legado)
        linhas = navegador.find_elements(By.XPATH, "//tr[contains(@class, 'tr') or td]")
        
        for linha in linhas:
            try:
                # Procura pelo link/botão de download nesta linha
                try:
                    link_elem = linha.find_element(By.XPATH, ".//a[contains(@href, 'process.jsp')]")
                except:
                    continue
                
                if link_elem:
                    href = link_elem.get_attribute('href')
                    
                    # Verifica se está com status pronto: preferir coluna final com texto
                    status_text = ""
                    try:
                        status_text = linha.find_elements(By.TAG_NAME, "td")[-1].text.strip()
                    except:
                        pass
                    if 'PRONTO PARA DOWNLOAD' not in status_text.upper() and 'PRONTO%20PARA%20DOWNLOAD' not in href and 'PRONTO PARA DOWNLOAD' not in href.upper():
                        continue
                    
                    # Extrai informações da linha (nome do arquivo, situação, etc)
                    tds = linha.find_elements(By.TAG_NAME, "td")
                    nome = ""
                    situacao = ""
                    data = ""
                    
                    for idx, td in enumerate(tds):
                        texto = td.text.strip()
                        
                        # Identifica data (formato DD/MM/YYYY HH:MM:SS)
                        if re.match(r'\d{2}/\d{2}/\d{4} \d{2}:\d{2}:\d{2}', texto):
                            data = texto
                        
                        # Identifica situação
                        if 'PRONTO' in texto.upper() or 'NENHUM' in texto.upper() or 'PROCESSANDO' in texto.upper():
                            situacao = texto
                    
                    # Extrai nome do arquivo da URL se necessário
                    match = re.search(r'nmArquivo=([^&]+)', href)
                    if match:
                        nome = match.group(1)
                    
                    # Extrai tipo de download (NFC, NFE, CTE, etc.) da URL
                    tipo_download = None
                    match_tipo = re.search(r'tdb_dsTipoDownload=([^&]+)', href)
                    if match_tipo:
                        tipo_download = match_tipo.group(1)
                        try:
                            tipo_download = unquote(tipo_download)
                        except:
                            pass
                    
                    # Usa data como identificador único também
                    if data:
                        links.append((link_elem, href, nome or data, situacao or 'PRONTO PARA DOWNLOAD', tipo_download or 'DESCONHECIDO'))
                    else:
                        links.append((link_elem, href, nome or href, situacao or 'PRONTO PARA DOWNLOAD', tipo_download or 'DESCONHECIDO'))
            except Exception as e:
                continue
        
        # Se não encontrou na tabela, procura diretamente os links
        if not links:
            # Procura em todo o documento
            elementos = navegador.find_elements(
                By.XPATH, "//a[contains(@href, 'process.jsp') and contains(@href, 'PRONTO%20PARA%20DOWNLOAD')]"
            )
            
            for elem in elementos:
                try:
                    href = elem.get_attribute('href')
                    match = re.search(r'nmArquivo=([^&]+)', href)
                    nome = match.group(1) if match else ''
                    # Extrai tipo de download
                    tipo_download = None
                    match_tipo = re.search(r'tdb_dsTipoDownload=([^&]+)', href)
                    if match_tipo:
                        tipo_download = match_tipo.group(1)
                        try:
                            tipo_download = unquote(tipo_download)
                        except:
                            pass
                    links.append((elem, href, nome, 'PRONTO PARA DOWNLOAD', tipo_download or 'DESCONHECIDO'))
                except:
                    pass
                
    except Exception as e:
        print(f"⚠️ Erro ao obter links de download: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Garante que está no contexto principal
        try:
            navegador.switch_to.default_content()
        except:
            pass
    
    return links


def _parse_nome_empresa_e_ano_mes(nm_arquivo: str, dt_solicitacao: str | None = None) -> tuple[str, str, str]:
    """
    Extrai nome da empresa, ano e mês (MM) a partir do parâmetro nmArquivo.
    Se dt_solicitacao for fornecido (DDMMYYYYHHMMSS), usa essa data para ano/mês.

    Formato dt_solicitacao: DDMMYYYYHHMMSS (ex: 09012026091926 = 09/01/2026 09:19:26)
    - Posições 0-1: DD (dia)
    - Posições 2-3: MM (mês)
    - Posições 4-7: YYYY (ano)
    - Posições 8-13: HHMMSS (hora)

    Espera formato nmArquivo: INSCRICAO_NOME_EMPRESA_DDMMYYYY_DDMMYYYY_TIMESTAMP
    """
    try:
        # Prioriza dt_solicitacao para ano/mês
        if dt_solicitacao and dt_solicitacao.isdigit() and len(dt_solicitacao) >= 8:
            # Formato: DDMMYYYYHHMMSS -> ano na posição 4-7, mês na posição 2-3
            ano = dt_solicitacao[4:8]  # YYYY (posições 4,5,6,7)
            mes = dt_solicitacao[2:4]  # MM (posições 2,3)
        else:
            agora = datetime.now()
            ano = agora.strftime("%Y")
            mes = agora.strftime("%m")

        partes = nm_arquivo.split("_")
        if len(partes) < 3:
            return "DESCONHECIDO", ano, mes

        # Inscrição é a primeira parte, nome vai até encontrar data (8 dígitos)
        nome_parts = []
        for p in partes[1:]:
            if p.isdigit() and len(p) >= 8:
                # se não veio dt_solicitacao, usa a primeira data encontrada para ano/mês
                if not dt_solicitacao:
                    ano = p[-4:]
                    mes = p[2:4]
                break
            nome_parts.append(p)

        nome = " ".join(nome_parts).strip() or "DESCONHECIDO"
        # Sanitiza nome para pasta
        nome = re.sub(r'[<>:"/\\|?*]', "_", nome)
        nome = re.sub(r"_+", "_", nome).strip("_ ")
        if len(nome) > 60:
            nome = nome[:60]
        return nome or "DESCONHECIDO", ano, mes
    except Exception:
        agora = datetime.now()
        return "DESCONHECIDO", agora.strftime("%Y"), agora.strftime("%m")


def _verificar_zip_valido(arquivo: Path) -> bool:
    """
    Verifica se o arquivo ZIP é válido e pode ser aberto.
    
    Returns:
        True se o ZIP é válido, False caso contrário
    """
    try:
        import zipfile
        with zipfile.ZipFile(arquivo, 'r') as zip_ref:
            # Tenta listar os arquivos no ZIP (verifica integridade)
            zip_ref.testzip()
            return True
    except (zipfile.BadZipFile, IOError, PermissionError):
        return False
    except Exception:
        return False


def _aguardar_arquivo_disponivel(arquivo: Path, timeout: int = 20) -> bool:
    """
    Aguarda o arquivo estar completamente baixado, não bloqueado pelo antivírus e válido.
    
    Returns:
        True se o arquivo está disponível e válido, False se timeout
    """
    import time as time_module
    inicio = time_module.time()
    
    # Verifica se há arquivo .crdownload (download em progresso no Chrome)
    arquivo_crdownload = arquivo.parent / f"{arquivo.name}.crdownload"
    
    while (time_module.time() - inicio) < timeout:
        try:
            # Se existe .crdownload, o download ainda está em progresso
            if arquivo_crdownload.exists():
                time_module.sleep(0.5)
                continue
            
            # Verifica se o arquivo existe
            if not arquivo.exists():
                time_module.sleep(0.3)
                continue
            
            # Verifica se o arquivo não está mais crescendo (download completo)
            tamanho1 = arquivo.stat().st_size
            time_module.sleep(0.8)  # Aguarda mais tempo para garantir
            tamanho2 = arquivo.stat().st_size
            
            if tamanho1 == tamanho2 and tamanho1 > 0:
                # Verifica se não está bloqueado pelo antivírus (pode ler)
                try:
                    with open(arquivo, 'rb') as f:
                        f.read(1)  # Tenta ler 1 byte
                except (PermissionError, IOError):
                    # Arquivo ainda bloqueado, aguarda mais
                    time_module.sleep(1)
                    continue
                
                # Aguarda um pouco mais para o antivírus terminar a verificação
                time_module.sleep(1)
                
                # Verifica se o ZIP é válido (não corrompido)
                if _verificar_zip_valido(arquivo):
                    # Arquivo disponível e válido!
                    return True
                else:
                    # ZIP corrompido, aguarda mais um pouco e tenta novamente
                    time_module.sleep(1)
                    continue
            else:
                # Arquivo ainda sendo baixado
                time_module.sleep(0.5)
        except Exception:
            time_module.sleep(0.5)
            continue
    
    return False


def _detectar_encoding(arquivo: Path) -> str:
    """
    Detecta o encoding de um arquivo XML tentando diferentes encodings comuns
    
    Args:
        arquivo: Caminho do arquivo
        
    Returns:
        Encoding detectado (padrão: utf-8)
    """
    # Verifica se o arquivo existe antes de tentar ler
    if not arquivo.exists() or not arquivo.is_file():
        return 'utf-8'
    
    # Lista de encodings para tentar (em ordem de preferência)
    encodings = ['utf-8', 'utf-8-sig', 'windows-1252', 'iso-8859-1', 'latin-1']
    
    for encoding in encodings:
        try:
            with open(arquivo, 'r', encoding=encoding, errors='strict') as f:
                # Tenta ler apenas um pouco para verificar se funciona
                f.read(100)
                return encoding
        except (FileNotFoundError, OSError, PermissionError):
            # Arquivo não existe mais ou está bloqueado
            return 'utf-8'
        except (UnicodeDecodeError, LookupError):
            continue
    
    # Se nenhum funcionou, retorna UTF-8 com tratamento de erros
    return 'utf-8'


def _processar_xmls_presos_automaticamente():
    """
    Processa automaticamente XMLs que ficaram presos nas pastas xmls/ após extração.
    Isso garante que nenhum XML fique sem processar, mesmo se o upload simultâneo falhou.
    
    Nota: Processa de forma inteligente - verifica se há XMLs presos e processa apenas essas pastas.
    Usa enviar_automatico que já busca recursivamente, então processa tudo de uma vez.
    """
    try:
        from src.core.config import LIMPEZA_AUTOMATICA_XMLS_PRESOS
        
        # Só processa se upload automático está habilitado E limpeza automática está habilitada
        if not state.upload_automatico or not LIMPEZA_AUTOMATICA_XMLS_PRESOS:
            return
        
        downloads_dir = PATHS.downloads_dir
        if not downloads_dir.exists():
            return
        
        # Busca todas as pastas xmls/ recursivamente e verifica se têm XMLs
        # Guarda também a quantidade para ordenar depois (evita verificar duas vezes)
        pastas_com_xmls = []
        for pasta_xmls in downloads_dir.rglob("xmls"):
            if pasta_xmls.is_dir():
                xmls = list(pasta_xmls.glob("*.xml"))
                if xmls:
                    pastas_com_xmls.append((pasta_xmls, len(xmls)))
        
        if not pastas_com_xmls:
            # Nenhum XML preso encontrado - tudo limpo!
            return
        
        # Ordena por quantidade de XMLs (maior primeiro) para processar pastas grandes primeiro
        pastas_com_xmls.sort(key=lambda x: x[1], reverse=True)
        total_xmls_presos = sum(qtd for _, qtd in pastas_com_xmls)
        
        print("\n" + "=" * 60)
        print("🧹 LIMPEZA AUTOMÁTICA DE XMLs PRESOS")
        print("=" * 60)
        print(f"📦 Encontradas {len(pastas_com_xmls)} pasta(s) xmls/ com {total_xmls_presos} XML(s) preso(s)")
        print("⏳ Processando XMLs presos (até 10 pastas por execução)...\n")
        
        from src.upload.uploader import enviar_automatico
        from src.core.config import UPLOAD_NUM_WORKERS
        
        # Usa número de workers configurado (padrão: 3, limitado entre 1 e 10)
        num_threads = max(1, min(UPLOAD_NUM_WORKERS or 3, 10))
        
        # Processa cada pasta xmls/ encontrada
        total_enviados = 0
        total_existentes = 0
        total_erros = 0
        pastas_processadas = 0
        
        # Limita processamento a 10 pastas por execução para não demorar muito
        # As restantes serão processadas na próxima execução (evita timeout)
        # Já está ordenado por quantidade (mais XMLs primeiro)
        pastas_para_processar = pastas_com_xmls[:10]
        
        for idx, (pasta_xmls, qtd_xmls) in enumerate(pastas_para_processar, 1):
            if not state.executando:
                break
            
            # Verifica novamente se ainda tem XMLs (pode ter sido limpo por outro processo)
            xmls_atuais = list(pasta_xmls.glob("*.xml"))
            if len(xmls_atuais) == 0:
                print(f"[{idx}/{len(pastas_para_processar)}] ⏭️  {pasta_xmls.parent.name}/xmls/ - já estava limpa")
                continue
            
            empresa_nome = pasta_xmls.parent.name if pasta_xmls.parent else "Desconhecido"
            print(f"[{idx}/{len(pastas_para_processar)}] Processando: {empresa_nome}/xmls/ ({len(xmls_atuais)} XMLs)")
            
            try:
                resultado = enviar_automatico(
                    pasta=str(pasta_xmls),
                    excluir_enviados=True,  # Exclui após envio/verificação
                    num_threads=num_threads
                )
                
                if "erro" in resultado:
                    print(f"   ⚠️  Erro: {resultado['erro']}")
                    total_erros += resultado.get('erros', 0)
                    continue
                
                enviados = resultado.get('enviados', 0)
                existentes = resultado.get('existentes', 0)
                erros = resultado.get('erros', 0)
                
                total_enviados += enviados
                total_existentes += existentes
                total_erros += erros
                pastas_processadas += 1
                
                if enviados > 0 or existentes > 0 or erros > 0:
                    print(f"   ✅ Processado: {enviados} enviados, {existentes} já existentes, {erros} erros")
                else:
                    print(f"   ✅ Processado: pasta já estava limpa")
                
            except Exception as e:
                empresa_nome = pasta_xmls.parent.name if pasta_xmls.parent else "Desconhecido"
                print(f"   ⚠️  Erro ao processar {empresa_nome}: {e}")
                continue
        
        # Resumo
        if pastas_processadas > 0:
            print("\n" + "=" * 60)
            print("📊 RESUMO DA LIMPEZA AUTOMÁTICA")
            print("=" * 60)
            print(f"   📁 Pastas processadas: {pastas_processadas}/{len(pastas_com_xmls)}")
            if len(pastas_com_xmls) > len(pastas_para_processar):
                restantes = len(pastas_com_xmls) - len(pastas_para_processar)
                print(f"   ⚠️  {restantes} pasta(s) restante(s) serão processadas na próxima execução")
            print(f"   ✅ Enviados com sucesso: {total_enviados}")
            print(f"   ⚠️  Já existentes no SIEG: {total_existentes}")
            print(f"   ❌ Erros: {total_erros}")
            print("=" * 60)
        else:
            print("✅ Todas as pastas já estavam limpas!")
            print("=" * 60)
        
    except Exception as e:
        # Não interrompe o processo se a limpeza falhar
        print(f"\n⚠️  Erro na limpeza automática de XMLs presos: {e}")
        import traceback
        traceback.print_exc()


def _extrair_zip(arquivo_zip: Path, pasta_destino: Path | None = None, sobrescrever: bool = False, profundidade: int = 0) -> bool:
    """
    Extrai o conteúdo de um arquivo ZIP recursivamente (extrai ZIPs aninhados também).
    
    Args:
        arquivo_zip: Caminho do arquivo ZIP
        pasta_destino: Pasta de destino para extração (padrão: mesma pasta do ZIP)
        sobrescrever: Se True, sobrescreve arquivos existentes
        profundidade: Profundidade atual da recursão (limite: 5 níveis)
    
    Returns:
        True se extração bem-sucedida, False caso contrário
    """
    try:
        import zipfile
        
        # Limite de profundidade para evitar loops infinitos
        MAX_PROFUNDIDADE = 5
        if profundidade > MAX_PROFUNDIDADE:
            print(f"   ⚠️ Profundidade máxima atingida para {arquivo_zip.name}, pulando extração recursiva")
            return False
        
        if not arquivo_zip.exists():
            return False
        
        # Verifica se o ZIP é válido
        if not _verificar_zip_valido(arquivo_zip):
            print(f"   ⚠️ ZIP inválido, não foi possível extrair: {arquivo_zip.name}")
            return False
        
        # Define pasta de destino (padrão: mesma pasta do ZIP, com nome igual ao ZIP sem extensão)
        if pasta_destino is None:
            pasta_destino = arquivo_zip.parent / arquivo_zip.stem
        
        # Cria pasta de destino se não existir
        pasta_destino = Path(pasta_destino)
        pasta_destino.mkdir(parents=True, exist_ok=True)
        
        # Extrai o ZIP
        with zipfile.ZipFile(arquivo_zip, 'r') as zip_ref:
            # Lista arquivos para verificar se já foram extraídos
            arquivos_zip = [f for f in zip_ref.namelist() if not f.endswith('/')]  # Remove diretórios
            
            if not sobrescrever and arquivos_zip:
                # Verifica se todos os arquivos já existem
                todos_existem = all(
                    (pasta_destino / Path(arquivo)).exists() 
                    for arquivo in arquivos_zip
                    if arquivo.strip()
                )
                if todos_existem and profundidade == 0:
                    # Só retorna True se for a primeira chamada (não recursiva)
                    # Se for recursiva, ainda precisa verificar ZIPs aninhados
                    return True
            
            # Extrai todos os arquivos
            zip_ref.extractall(pasta_destino)
            
            total_extraidos = len(arquivos_zip)
            if profundidade == 0:
                print(f"   📦 Extraído: {total_extraidos} arquivo(s) para {pasta_destino.name}/")
            
            # Procura por ZIPs aninhados e extrai recursivamente
            zips_aninhados = []
            for arquivo in arquivos_zip:
                arquivo_path = pasta_destino / Path(arquivo)
                # Verifica se é um arquivo ZIP
                if arquivo_path.suffix.lower() == '.zip' and arquivo_path.exists() and arquivo_path.is_file():
                    zips_aninhados.append(arquivo_path)
            
            # Extrai ZIPs aninhados recursivamente
            if zips_aninhados:
                if profundidade == 0:
                    print(f"   🔍 Encontrados {len(zips_aninhados)} ZIP(s) aninhado(s), extraindo recursivamente...")
                
                for zip_aninhado in zips_aninhados:
                    try:
                        # Extrai o ZIP aninhado na mesma pasta (substitui o ZIP pelo conteúdo)
                        sucesso_extracao = _extrair_zip(zip_aninhado, pasta_destino=pasta_destino, sobrescrever=sobrescrever, profundidade=profundidade + 1)
                        
                        if sucesso_extracao:
                            # Verifica se a extração realmente produziu arquivos antes de remover
                            arquivos_extraidos = list(pasta_destino.glob("*.xml"))
                            if arquivos_extraidos or zip_aninhado.stat().st_size < 1000:  # ZIP pequeno ou tem XMLs extraídos
                                # Remove o ZIP aninhado apenas se a extração foi bem-sucedida
                                try:
                                    zip_aninhado.unlink()
                                    if profundidade == 0:
                                        print(f"      ✅ Extraído e removido: {zip_aninhado.name}")
                                except (OSError, PermissionError):
                                    # Se não conseguir remover, continua mesmo assim
                                    if profundidade == 0:
                                        print(f"      ⚠️ Extraído mas não foi possível remover: {zip_aninhado.name}")
                            else:
                                # Extração pode ter falhado silenciosamente, mantém o ZIP
                                if profundidade == 0:
                                    print(f"      ⚠️ Extração pode ter falhado, mantendo ZIP: {zip_aninhado.name}")
                        else:
                            # Falha na extração, mantém o ZIP para tentar depois
                            if profundidade == 0:
                                print(f"      ⚠️ Falha na extração, mantendo ZIP: {zip_aninhado.name}")
                    except Exception as e:
                        # Erro ao extrair ZIP aninhado, mantém o arquivo
                        if profundidade == 0:
                            print(f"      ⚠️ Erro ao extrair ZIP aninhado {zip_aninhado.name}: {e}, mantendo arquivo")
                        continue
            
            return True
            
    except zipfile.BadZipFile:
        print(f"   ❌ ZIP corrompido, não foi possível extrair: {arquivo_zip.name}")
        return False
    except PermissionError as e:
        print(f"   ⚠️ Sem permissão para extrair: {e}")
        return False
    except Exception as e:
        print(f"   ⚠️ Erro ao extrair ZIP: {e}")
        return False


def _mover_arquivo_baixado(nm_arquivo: str, dt_solicitacao: str | None = None, extrair: bool = True, tipo_download: str | None = None) -> None:
    """
    Move o último arquivo .zip baixado para a estrutura organizada:
    Downloads/XML SEFAZ/<ano>/<mes>/<empresa>/
    
    Estrutura organizada:
    - empresa/
      - zips/          (arquivos ZIP originais com prefixo de tipo: NFC_nome.zip)
      - xmls/          (XMLs extraídos, todos juntos)
    
    Args:
        nm_arquivo: Nome do arquivo
        dt_solicitacao: Data de solicitação para organizar pastas
        extrair: Se True, extrai o conteúdo do ZIP após mover
        tipo_download: Tipo do download (NFC, NFE, CTE, etc.) - será usado como prefixo
    """
    try:
        download_dir = PATHS.downloads_dir
        if not download_dir.exists():
            download_dir.mkdir(parents=True, exist_ok=True)

        # identifica nome da empresa e ano
        empresa, ano, mes = _parse_nome_empresa_e_ano_mes(nm_arquivo, dt_solicitacao)
        destino_dir = download_dir / ano / mes / empresa
        destino_dir.mkdir(parents=True, exist_ok=True)

        # Pastas organizadas: zips/ e xmls/
        pasta_zips = destino_dir / "zips"
        pasta_xmls = destino_dir / "xmls"
        pasta_zips.mkdir(exist_ok=True)
        pasta_xmls.mkdir(exist_ok=True)

        # Adiciona prefixo do tipo ao nome do arquivo (ex: NFC_nome.zip)
        nome_com_tipo = nm_arquivo
        if tipo_download and tipo_download != 'DESCONHECIDO':
            # Verifica se já não tem o prefixo
            if not nm_arquivo.startswith(f"{tipo_download}_"):
                nome_com_tipo = f"{tipo_download}_{nm_arquivo}"
        
        # arquivo esperado na pasta zips/ com prefixo do tipo
        destino_final = pasta_zips / f"{nome_com_tipo}.zip"
        if destino_final.exists():
            # já organizado
            return

        # encontra o .zip mais recente no diretório de download base
        # Exclui arquivos .crdownload (downloads em progresso)
        zips = [f for f in download_dir.glob("*.zip") 
                if not f.name.endswith('.crdownload') and f.exists()]
        if not zips:
            return
        ultimo_zip = max(zips, key=lambda p: p.stat().st_mtime)

        # Aguarda o arquivo estar completamente baixado, não bloqueado pelo antivírus e válido
        if not _aguardar_arquivo_disponivel(ultimo_zip, timeout=20):
            print(f"   ⚠️ Timeout aguardando arquivo disponível/válido: {ultimo_zip.name}")
            # Verifica se o arquivo existe mas está corrompido
            if ultimo_zip.exists():
                if not _verificar_zip_valido(ultimo_zip):
                    print(f"   ❌ Arquivo ZIP corrompido ou inválido: {ultimo_zip.name}")
            return

        # Tenta mover o arquivo com retry em caso de bloqueio temporário
        # O replace() move e renomeia o arquivo para o nome correto (com prefixo do tipo)
        max_tentativas = 3
        for tentativa in range(max_tentativas):
            try:
                ultimo_zip.replace(destino_final)
                
                # Extrai o ZIP se solicitado (extrai diretamente na pasta xmls/)
                if extrair:
                    _extrair_zip(destino_final, pasta_destino=pasta_xmls, sobrescrever=False)
                
                return  # Sucesso!
            except (PermissionError, IOError, OSError) as e:
                if tentativa < max_tentativas - 1:
                    time.sleep(1)
                    continue
                else:
                    print(f"   ⚠️ Não foi possível mover arquivo após {max_tentativas} tentativas: {e}")
                    return
    except Exception as e:
        print(f"⚠️ Erro ao mover arquivo baixado: {e}")


def baixar_arquivo(navegador, wait, elemento, url: str, destino: Path, nm_arquivo: str, dt_solicitacao: str | None = None, tipo_download: str | None = None) -> bool:
    """
    Baixa um arquivo específico
    
    Args:
        navegador: WebDriver
        wait: WebDriverWait
        elemento: Elemento WebElement para clicar (pode estar stale)
        url: URL do download
        destino: Diretório de destino
        
    Returns:
        True se download bem-sucedido
    """
    try:
        # Garante que está no contexto principal
        navegador.switch_to.default_content()
        
        # Salva a URL atual antes de clicar
        url_atual = navegador.current_url
        
        # Tenta encontrar o elemento novamente pela URL (evita elemento stale)
        elemento_novo = None
        try:
            # Procura o elemento pela URL em todo o documento
            elemento_novo = navegador.find_element(By.XPATH, f"//a[@href='{url}']")
        except:
            # Se não encontrou, tenta em iframes
            iframes = navegador.find_elements(By.TAG_NAME, "iframe")
            for iframe in iframes:
                try:
                    navegador.switch_to.frame(iframe)
                    elemento_novo = navegador.find_element(By.XPATH, f"//a[@href='{url}']")
                    navegador.switch_to.default_content()
                    break
                except:
                    navegador.switch_to.default_content()
        
        # Se não encontrou novo, usa o elemento original
        elem_a_usar = elemento_novo if elemento_novo else elemento
        
        # Clique no elemento
        if elem_a_usar:
            try:
                elem_a_usar.click()
            except:
                # Se ainda falhou, tenta JavaScript
                navegador.execute_script("arguments[0].click();", elem_a_usar)
        else:
            # Última tentativa: navegar direto para a URL
            navegador.get(url)
        
        # Aguarda um pouco para a página carregar ou download iniciar (reduzido para acelerar)
        time.sleep(FAST_NAV_DELAY)
        
        # Verifica se está na página de erro
        try:
            page_source = navegador.page_source.lower()
            if "não foi localizado" in page_source or \
               "arquivo não foi localizado" in page_source or \
               "o arquivo não foi localizado" in page_source:
                print("   ⚠️ Arquivo não encontrado no servidor")
                # Volta para a página anterior
                navegador.back()
                # Aguarda voltar
                time.sleep(2)
                navegador.switch_to.default_content()
                return False
        except:
            pass
        
        # Aguarda o download iniciar (tempo suficiente para iniciar)
        time.sleep(1.2)

        # Move/organiza o arquivo baixado (aguarda verificação de vírus e validação ZIP)
        _mover_arquivo_baixado(nm_arquivo or "arquivo", dt_solicitacao, extrair=state.extrair_zips, tipo_download=tipo_download)
        
        # Volta para a página anterior imediatamente
        navegador.switch_to.default_content()
        navegador.back()
        
        # Aguarda a página voltar (timeout curto e direto)
        try:
            # Wait curto e específico
            WebDriverWait(navegador, 2).until(
                lambda d: url_atual in d.current_url or '/process.jsp' in d.current_url
            )
        except:
            # Se não voltou em 2s, continua mesmo assim (pode estar carregando ainda)
            pass
        
        # Garante contexto e segue sem delay adicional
        navegador.switch_to.default_content()
        
        return True
        
    except Exception as e:
        print(f"❌ Erro ao baixar arquivo: {e}")
        # Tenta voltar mesmo em caso de erro
        try:
            navegador.switch_to.default_content()
            navegador.back()
            time.sleep(1)
        except:
            pass
        return False


def ir_para_pagina(navegador, wait, numero_pagina: int) -> bool:
    """
    Navega para uma página específica
    
    Args:
        numero_pagina: Número da página
        
    Returns:
        True se navegação bem-sucedida
    """
    try:
        # Tenta clicar no link da página
        link = wait.until(EC.element_to_be_clickable(
            (By.XPATH, f"//a[contains(@href, 'page={numero_pagina}') or text()='{numero_pagina}']")
        ))
        link.click()
        time.sleep(2)
        return True
    except:
        try:
            # Alternativa: input de página
            input_pagina = navegador.find_element(By.XPATH, "//input[@type='text'][contains(@name, 'page')]")
            input_pagina.clear()
            input_pagina.send_keys(str(numero_pagina))
            input_pagina.submit()
            time.sleep(2)
            return True
        except:
            return False


def processar_pagina(navegador, wait, numero_pagina: int, arquivos_baixados: set) -> tuple:
    """
    Processa uma página de downloads
    
    Args:
        navegador: WebDriver
        wait: WebDriverWait  
        numero_pagina: Número da página atual
        arquivos_baixados: Set de arquivos já baixados
        
    Returns:
        Tupla (novos_downloads: int, erros: int)
    """
    novos = 0
    erros = 0
    
    if not state.executando:
        return novos, erros
    
    print(f"\n📄 Processando página {numero_pagina}...")
    
    # Obtém links de download
    links = obter_links_download(navegador, wait)
    
    if not links:
        print(f"   Nenhum arquivo encontrado na página {numero_pagina}")
        return novos, erros
    
    # Filtra apenas os que estão prontos
    links_prontos = [l for l in links if 'PRONTO' in l[3].upper()]
    print(f"   Encontrados {len(links_prontos)} arquivos PRONTOS de {len(links)} totais")
    
    for elemento, url, nome, situacao, tipo_download in links_prontos:
        if not state.executando:
            break
        
        # Extrai identificadores únicos (data da solicitação e nome)
        dt_solicitacao = None
        match = re.search(r'dtSolicitacao=(\d+)', url)
        if match:
            dt_solicitacao = match.group(1)
        
        # Verifica se já foi baixado (por URL, nome ou data)
        ja_baixado = False
        if url in arquivos_baixados:
            ja_baixado = True
        elif nome and nome in arquivos_baixados:
            ja_baixado = True
        elif dt_solicitacao and any(dt_solicitacao in str(a) for a in arquivos_baixados):
            ja_baixado = True
        
        if ja_baixado:
            print(f"   ⏭️ {nome or dt_solicitacao} - já baixado")
            continue
        
        # Verifica se já organizado fisicamente (nova estrutura: empresa/zips/TIPO_arquivo.zip)
        empresa_check, ano_check, mes_check = _parse_nome_empresa_e_ano_mes(nome or "", dt_solicitacao)
        # Verifica tanto com prefixo quanto sem (para compatibilidade)
        nome_com_tipo_check = f"{tipo_download}_{nome}" if tipo_download and tipo_download != 'DESCONHECIDO' and not nome.startswith(f"{tipo_download}_") else nome
        destino_existente = PATHS.downloads_dir / ano_check / mes_check / empresa_check / "zips" / f"{nome_com_tipo_check or dt_solicitacao}.zip"
        # Verifica também sem o prefixo (caso arquivos antigos existam)
        if not destino_existente.exists() and nome:
            destino_existente = PATHS.downloads_dir / ano_check / mes_check / empresa_check / "zips" / f"{nome or dt_solicitacao}.zip"
        if destino_existente.exists():
            print(f"   ⏭️ {nome or dt_solicitacao} - já organizado em disco [{tipo_download or '?'}]")
            # Adiciona informações mesmo se já existir
            info_arquivo = {
                'url': url,
                'nome': nome or '',
                'dt_solicitacao': dt_solicitacao or '',
                'tipo_download': tipo_download or 'DESCONHECIDO'
            }
            arquivos_baixados.add(url)
            if nome:
                arquivos_baixados.add(nome)
            if dt_solicitacao:
                arquivos_baixados.add(dt_solicitacao)
            arquivos_baixados.add(json.dumps(info_arquivo, sort_keys=True))
            continue

        print(f"   📥 Baixando: {nome or dt_solicitacao or url[:50]}... [{tipo_download or '?'}]")
        
        if baixar_arquivo(navegador, wait, elemento, url, PATHS.downloads_dir, nome or dt_solicitacao or url, dt_solicitacao, tipo_download):
            # Salva informações estruturadas do arquivo baixado
            info_arquivo = {
                'url': url,
                'nome': nome or '',
                'dt_solicitacao': dt_solicitacao or '',
                'tipo_download': tipo_download or 'DESCONHECIDO'
            }
            # Adiciona múltiplos identificadores para compatibilidade
            arquivos_baixados.add(url)
            if nome:
                arquivos_baixados.add(nome)
            if dt_solicitacao:
                arquivos_baixados.add(dt_solicitacao)
            # Adiciona informação estruturada como JSON string para manter compatibilidade com set
            arquivos_baixados.add(json.dumps(info_arquivo, sort_keys=True))
            novos += 1
            print(f"   ✅ {nome or dt_solicitacao or 'Arquivo'} - OK [{tipo_download or '?'}]")
        else:
            erros += 1
            print(f"   ❌ {nome or dt_solicitacao or 'Arquivo'} - ERRO")
    
    return novos, erros


def executar_download(navegador):
    """
    Função principal de download - chamada como callback após login
    
    Args:
        navegador: WebDriver já logado e na página de downloads
    """
    wait = WebDriverWait(navegador, 10)
    
    # Garante que está no contexto principal
    try:
        navegador.switch_to.default_content()
    except:
        pass
    
    print("\n" + "=" * 60)
    print("INICIANDO DOWNLOAD DE ARQUIVOS")
    print("=" * 60)
    
    # Carrega checkpoint se existir
    checkpoint = carregar_checkpoint()
    arquivos_baixados = set()
    pagina_inicial = 1
    total_baixados = 0
    
    if checkpoint:
        arquivos_baixados = set(checkpoint.get('arquivos_baixados', []))
        pagina_inicial = checkpoint.get('pagina_atual', 1)
        total_baixados = checkpoint.get('total_baixados', 0)
        print(f"📋 Retomando do checkpoint: página {pagina_inicial}, {total_baixados} já baixados")
    
    # Sobrescreve com parâmetros da linha de comando se fornecidos
    if state.pagina_inicial:
        pagina_inicial = state.pagina_inicial
    
    pagina_final = state.pagina_final
    
    print(f"📍 Processando páginas (usar 'Próximo' para avançar)")
    print("=" * 60)
    
    pagina_corrente = obter_numero_pagina_atual(navegador) or pagina_inicial
    
    # Se houver pagina_inicial definida e estamos antes dela, avançar sem processar
    while state.pagina_inicial and pagina_corrente and pagina_corrente < state.pagina_inicial:
        try:
            botao_proximo = navegador.find_element(By.XPATH, "//a[contains(text(), 'Próximo')]")
            botao_proximo.click()
            time.sleep(0.5)
            pagina_corrente = obter_numero_pagina_atual(navegador) or pagina_corrente + 1
        except:
            break
    
    while True:
        if not state.executando:
            print("\n🛑 Execução interrompida pelo usuário")
            break
        
        pagina_corrente = obter_numero_pagina_atual(navegador) or pagina_corrente
        
        # Se há limite superior e já atingiu, para
        if pagina_final and pagina_corrente and pagina_corrente > pagina_final:
            print(f"✅ Limite de páginas atingido ({pagina_final}). Finalizando...")
            break
        
        novos, erros = processar_pagina(navegador, wait, pagina_corrente or 1, arquivos_baixados)
        total_baixados += novos
        
        salvar_checkpoint(
            pagina_atual=pagina_corrente or 1,
            arquivos_baixados=arquivos_baixados,
            total_baixados=total_baixados,
            data_solicitacao=state.data_solicitacao
        )
        print(f"   📊 Página {pagina_corrente or 1}: +{novos} downloads, {erros} erros")
        
        # Decide próxima página
        proxima = (pagina_corrente or 1) + 1
        if pagina_final and proxima > pagina_final:
            print(f"✅ Limite de páginas atingido ({pagina_final}). Finalizando...")
            break

        # Primeiro tenta clicar no número da próxima página (evita salto de bloco)
        navegou = False
        try:
            link_num = navegador.find_element(By.XPATH, f"//a[normalize-space(text())='{proxima}']")
            navegador.execute_script("arguments[0].scrollIntoView();", link_num)
            link_num.click()
            time.sleep(FAST_NAV_DELAY)
            # Aguarda tabela carregar na nova página
            try:
                WebDriverWait(navegador, PAGE_LOAD_TIMEOUT).until(
                    EC.presence_of_element_located((By.TAG_NAME, "table"))
                )
            except:
                pass
            pagina_corrente = proxima
            navegou = True
        except:
            pass

        # Se não encontrou o número, tenta o "Próximo" (pode abrir próximo bloco)
        if not navegou:
            try:
                botao_proximo = navegador.find_element(By.XPATH, "//a[contains(text(), 'Próximo')]")
                navegador.execute_script("arguments[0].scrollIntoView();", botao_proximo)
                botao_proximo.click()
                time.sleep(FAST_NAV_DELAY)
                try:
                    WebDriverWait(navegador, PAGE_LOAD_TIMEOUT).until(
                        EC.presence_of_element_located((By.TAG_NAME, "table"))
                    )
                except:
                    pass
                pagina_corrente = proxima
                navegou = True
            except:
                pass

        if not navegou:
            print("✅ Fim da paginação. Todos os blocos foram verificados.")
            break
    
    # Limpeza final: processa e organiza arquivos ZIP que possam ter ficado na pasta base
    try:
        zips_presos = [f for f in PATHS.downloads_dir.iterdir() 
                      if f.is_file() and f.suffix.lower() == '.zip']
        if zips_presos:
            print("\n⚠️ Processando arquivos ZIP presos na pasta base...")
            import shutil
            for zip_file in zips_presos:
                try:
                    nome_sem_ext = zip_file.stem
                    # Remove prefixo se tiver
                    tipo_prefixo = None
                    if nome_sem_ext.startswith("NFE_"):
                        tipo_prefixo = "NFE"
                        nome_base = nome_sem_ext[4:]
                    elif nome_sem_ext.startswith("NFC_"):
                        tipo_prefixo = "NFC"
                        nome_base = nome_sem_ext[4:]
                    elif nome_sem_ext.startswith("CTE_"):
                        tipo_prefixo = "CTE"
                        nome_base = nome_sem_ext[4:]
                    else:
                        nome_base = nome_sem_ext
                        tipo_prefixo = "NFE"  # Assume NFE como padrão
                    
                    empresa, ano, mes = _parse_nome_empresa_e_ano_mes(nome_base, None)
                    destino_dir = PATHS.downloads_dir / ano / mes / empresa
                    pasta_zips = destino_dir / "zips"
                    pasta_xmls = destino_dir / "xmls"
                    pasta_zips.mkdir(parents=True, exist_ok=True)
                    pasta_xmls.mkdir(parents=True, exist_ok=True)
                    
                    nome_final = f"{tipo_prefixo}_{nome_base}" if tipo_prefixo else nome_base
                    destino = pasta_zips / f"{nome_final}.zip"
                    
                    if not destino.exists():
                        # Move para pasta organizada
                        shutil.move(str(zip_file), str(destino))
                        print(f"  ✓ Movido: {zip_file.name}")
                        
                        # Tenta extrair o ZIP após mover
                        try:
                            if _extrair_zip(destino, pasta_destino=pasta_xmls, sobrescrever=False):
                                print(f"  ✓ Extraído: {zip_file.name}")
                        except Exception as e:
                            print(f"  ⚠️ Não foi possível extrair {zip_file.name}: {e}")
                            # Mantém o ZIP para tentar processar depois
                    else:
                        # ZIP duplicado - verifica se já foi processado (tem XMLs extraídos)
                        xmls_extraidos = list(pasta_xmls.glob("*.xml"))
                        if xmls_extraidos:
                            # Já foi processado, pode remover o duplicado
                            zip_file.unlink()
                            print(f"  ✓ Removido duplicado (já processado): {zip_file.name}")
                        else:
                            # Duplicado mas não processado - tenta processar este também
                            try:
                                if _extrair_zip(zip_file, pasta_destino=pasta_xmls, sobrescrever=False):
                                    print(f"  ✓ Processado duplicado: {zip_file.name}")
                                    zip_file.unlink()
                                    print(f"  ✓ Removido após processamento: {zip_file.name}")
                                else:
                                    print(f"  ⚠️ Não foi possível processar duplicado {zip_file.name}, mantendo arquivo")
                            except Exception as e:
                                print(f"  ⚠️ Erro ao processar duplicado {zip_file.name}: {e}, mantendo arquivo")
                except Exception as e:
                    print(f"  ⚠️ Erro ao processar {zip_file.name}: {e}, mantendo arquivo")
    except Exception as e:
        pass  # Não interrompe o processo se a limpeza falhar
    
    print("\n" + "=" * 60)
    print("RESUMO DO DOWNLOAD")
    print("=" * 60)
    print(f"✅ Total de arquivos baixados: {total_baixados}")
    print(f"📁 Diretório de destino: {PATHS.downloads_dir}")
    print("=" * 60)
    
    # Upload automático sequencial para SIEG (se habilitado)
    if state.upload_automatico:
        print("\n" + "=" * 60)
        print("🚀 INICIANDO UPLOAD AUTOMÁTICO PARA SIEG")
        print("=" * 60)
        print("⏳ Aguarde, processando XMLs extraídos...\n")
        try:
            from src.upload.uploader import enviar_automatico
            
            resultado = enviar_automatico(
                pasta=str(PATHS.downloads_dir),
                excluir_enviados=True,  # Exclui XMLs enviados com sucesso
                num_threads=20
            )
            
            if "erro" in resultado:
                print(f"\n⚠️ ERRO no upload: {resultado['erro']}")
            else:
                print(f"\n✅ Upload concluído: {resultado.get('enviados', 0)} enviados, {resultado.get('erros', 0)} erros")
        except Exception as e:
            print(f"\n⚠️ ERRO ao executar upload automático: {e}")
            import traceback
            traceback.print_exc()
    
    # Limpeza automática de XMLs presos (após upload automático)
    # Isso garante que XMLs que não foram processados sejam limpos
    if state.upload_automatico:
        _processar_xmls_presos_automaticamente()