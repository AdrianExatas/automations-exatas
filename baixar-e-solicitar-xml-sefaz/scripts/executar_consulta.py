#!/usr/bin/env python3
"""
Script de captura contínua de XMLs com recuperação automática de períodos perdidos

Este script:
1. Executa diariamente via agendamento
2. Verifica o histórico de cada empresa
3. Calcula dias pendentes (desde última execução)
4. Faz UMA solicitação única por intervalo (do primeiro ao último dia pendente)
5. Garante que nenhum XML seja perdido, mesmo após dias/semanas sem execução
6. Otimiza o uso do limite diário de consultas da SEFAZ

Exemplo: Se a última consulta foi dia 01 e hoje é dia 05, 
         ao invés de fazer 3 consultas (dia 02, 03, 04),
         faz 1 consulta única (do dia 02 até o dia 04).
"""
import os
import sys
import argparse
from pathlib import Path
from datetime import datetime, date, timedelta

# Configura encoding UTF-8 para Windows
if sys.platform == 'win32':
    import io
    if sys.stdout.encoding != 'utf-8':
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    if sys.stderr.encoding != 'utf-8':
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Adiciona o diretório raiz ao path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Importa módulos necessários
from src.core.browser import SefazBrowser
from src.core.config import PATHS, USUARIO_SEFAZ, SENHA_SEFAZ, validar_configuracoes, validar_configuracao_completa
from src.core.constants import Timeouts, CapturaContinuaConfig, SIMBOLOS
from src.consulta.actions import SefazActions
from src.sefaz_http import SefazHttpClient, SefazHttpError
from src.consulta.historico import (
    carregar_historico,
    salvar_historico,
    obter_ultima_data_empresa,
    atualizar_data_empresa,
    calcular_dias_pendentes,
    exibir_status_historico,
    obter_data_ontem,
    MAX_DIAS_RECUPERACAO
)
from src.utils.logger import configurar_logging
from src.utils.retry import retry_com_backoff

import pandas as pd
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select
from selenium.common.exceptions import NoSuchElementException, StaleElementReferenceException, TimeoutException
from typing import Optional, Dict, Any, List, Tuple


def verificar_lock_sefaz() -> bool:
    """
    Verifica se já existe uma execução do SEFAZ em andamento usando lock file
    
    Returns:
        True se pode executar, False se já está em execução
    """
    lock_file = PATHS.lock_dir / "sefaz_global.lock"
    
    if lock_file.exists():
        try:
            lock_content = lock_file.read_text().strip()
            if lock_content:
                pid = int(lock_content)
                try:
                    import psutil
                    processo = psutil.Process(pid)
                    if processo.is_running():
                        cmdline = ' '.join(processo.cmdline())
                        if 'automacao' in cmdline.lower() or 'sefaz' in cmdline.lower() or 'captura' in cmdline.lower():
                            print(f"⚠️ Já existe uma execução do SEFAZ em andamento (PID: {pid})")
                            return False
                except ImportError:
                    try:
                        lock_file.unlink()
                    except:
                        pass
                except Exception:
                    try:
                        lock_file.unlink()
                    except:
                        pass
        except (ValueError, FileNotFoundError, PermissionError):
            try:
                lock_file.unlink()
            except:
                pass
    
    try:
        lock_file.write_text(str(os.getpid()))
        print(f"🔒 Lock criado (PID: {os.getpid()})")
        return True
    except:
        return True


def remover_lock_sefaz() -> None:
    """Remove o lock file ao finalizar execução"""
    lock_file = PATHS.lock_dir / "sefaz_global.lock"
    try:
        if lock_file.exists():
            lock_file.unlink()
    except:
        pass


def formatar_data_sefaz(data: date) -> str:
    """Converte date para formato DD/MM/YYYY usado na SEFAZ"""
    return data.strftime("%d/%m/%Y")


def ler_combinacoes_planilha() -> List[Tuple[str, str]]:
    """
    Lê combinações de tipo/pesquisa da planilha exemplo
    
    Returns:
        Lista de tuplas (tipo_arquivo, pesquisar_por)
    """
    try:
        caminho_exemplo = PATHS.project_root / 'exemplo_planilha' / 'DATE_TODAS_empresas_ATUALIZADA.xlsx'
        if caminho_exemplo.exists():
            df_exemplo = pd.read_excel(caminho_exemplo, engine='openpyxl')
            
            combinacoes = []
            if 'Tipo de Arquivo' in df_exemplo.columns and 'Pesquisar Por' in df_exemplo.columns:
                for _, row in df_exemplo.iterrows():
                    tipo = str(row['Tipo de Arquivo']).strip() if pd.notna(row['Tipo de Arquivo']) else None
                    pesquisar = str(row['Pesquisar Por']).strip() if pd.notna(row['Pesquisar Por']) else None
                    
                    if tipo and pesquisar:
                        combinacao = (tipo, pesquisar)
                        if combinacao not in combinacoes:
                            combinacoes.append(combinacao)
            
            if combinacoes:
                return combinacoes
    except Exception as e:
        print(f"[AVISO] Não foi possível ler planilha de exemplo: {e}")
    
    # Combinações padrão
    return [
        ('NFE', 'Emitida'), 
        ('NFE', 'Recebida'), 
        ('NFE', 'Inutilizadas'),
        ('NFC', 'Nota'), 
        ('NFC', 'Inutilização'),
        ('CTE', 'Emitente')
    ]


def executar_captura_continua_selenium(
    headless: bool = False, 
    forcar_data: Optional[date] = None,
    data_inicial: Optional[date] = None,
    data_final: Optional[date] = None
) -> bool:
    """
    Executa captura contínua com recuperação automática de períodos perdidos.
    
    Quando há múltiplos dias pendentes, faz UMA consulta única por intervalo
    (do primeiro ao último dia pendente) para otimizar o uso do limite diário
    de consultas da SEFAZ.
    
    Args:
        headless: Executar navegador em modo headless
        forcar_data: Data específica para processar (opcional)
        data_inicial: Data inicial do intervalo (opcional, ignora histórico neste intervalo)
        data_final: Data final do intervalo (opcional)
    
    Returns:
        True se processo bem-sucedido, False caso contrário
    """
    logger = configurar_logging("captura_continua")
    
    print("=" * 70)
    print("CAPTURA CONTÍNUA DE XMLs COM RECUPERAÇÃO AUTOMÁTICA")
    print("=" * 70)
    print(f"Data/Hora: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print(f"Modo: Captura diária com recuperação de períodos perdidos")
    print(f"Máximo de dias para recuperar: {MAX_DIAS_RECUPERACAO}")
    print("=" * 70)
    
    # Valida configuração
    logger.info("Validando configuração...")
    sucesso, erros = validar_configuracao_completa()
    if not sucesso:
        logger.error("Erros de configuração encontrados:")
        for erro in erros:
            logger.error(f"  - {erro}")
        return False
    
    # Verifica lock
    if not verificar_lock_sefaz():
        logger.warning("Cancelando execução: outra instância já está rodando")
        return False
    
    browser = None
    
    try:
        # Define data alvo ou intervalo
        usar_intervalo = data_inicial is not None and data_final is not None
        data_alvo = None  # Inicializa para evitar erro
        
        if usar_intervalo:
            print(f"\n📅 Intervalo de processamento: {data_inicial.strftime('%d/%m/%Y')} até {data_final.strftime('%d/%m/%Y')}")
            if data_inicial > data_final:
                print(f"{SIMBOLOS['erro']} Data inicial maior que data final!")
                return False
        else:
            data_alvo = forcar_data if forcar_data else obter_data_ontem()
            print(f"\n📅 Data alvo para processamento: {data_alvo.strftime('%d/%m/%Y')}")
        
        # Carrega histórico
        historico = carregar_historico()
        print(f"📊 Empresas já rastreadas no histórico: {len(historico.get('empresas', {}))}")
        
        # Valida configurações SEFAZ
        config_valida, mensagem_config = validar_configuracoes()
        if not config_valida:
            print(f"{SIMBOLOS['erro']} {mensagem_config}")
            remover_lock_sefaz()
            return False
        
        # ETAPA 1: INICIALIZAÇÃO E LOGIN
        print("\n[ETAPA 1/3] Inicializando navegador e fazendo login...")
        print("-" * 60)
        
        try:
            browser = SefazBrowser(headless=headless)
        except Exception as e:
            erro_msg = str(e)
            if "WinError 193" in erro_msg or "ChromeDriver corrompido" in erro_msg:
                print(f"{SIMBOLOS['erro']} Erro ao inicializar ChromeDriver!")
                print(f"{SIMBOLOS['info']} Limpe o cache: %USERPROFILE%\\.wdm")
                return False
            raise
        
        print(f"{SIMBOLOS['login']} Realizando login...")
        if not browser.fazer_login(USUARIO_SEFAZ, SENHA_SEFAZ):
            print(f"{SIMBOLOS['erro']} Falha no login!")
            return False
        
        print(f"{SIMBOLOS['menu']} Navegando para menu XML...")
        if not browser.navegar_para_menu_xml():
            print(f"{SIMBOLOS['erro']} Falha ao navegar para menu XML!")
            return False
        
        wait = browser.get_wait()
        actions = SefazActions(browser)
        
        # ETAPA 2: EXTRAIR EMPRESAS
        print("\n[ETAPA 2/3] Extraindo empresas do portal...")
        print("-" * 60)
        
        combinacoes_exemplo = ler_combinacoes_planilha()
        print(f"{SIMBOLOS['info']} Combinações a processar: {len(combinacoes_exemplo)}")
        
        # Aguarda select de empresas
        select_empresas = retry_com_backoff(
            lambda: wait.until(EC.presence_of_element_located((By.ID, "cdPessoaContribuinte"))),
            max_tentativas=3,
            excecoes=(NoSuchElementException, StaleElementReferenceException, TimeoutException),
            logger=logger
        )
        
        # Extrai empresas
        select = Select(select_empresas)
        empresas_base = []
        
        for opcao in select.options:
            valor = opcao.get_attribute('value')
            texto = opcao.text.strip()
            
            if valor and texto and valor != '' and texto.lower() not in ['selecione', 'selecione...', '']:
                empresas_base.append({
                    'inscricao': valor,
                    'nome': texto
                })
        
        if not empresas_base:
            print(f"{SIMBOLOS['erro']} Nenhuma empresa encontrada!")
            return False
        
        print(f"{SIMBOLOS['sucesso']} {len(empresas_base)} empresas encontradas")
        
        # ETAPA 3: PROCESSAR CADA EMPRESA/COMBINAÇÃO
        print("\n[ETAPA 3/3] Processando solicitações com recuperação automática...")
        print("-" * 60)
        
        total_solicitacoes = 0
        total_sucesso = 0
        total_erros = 0
        empresas_processadas = 0
        
        for idx_empresa, empresa in enumerate(empresas_base, 1):
            inscricao = empresa['inscricao']
            nome_empresa = empresa['nome'][:40]
            
            print(f"\n{'='*60}")
            print(f"[{idx_empresa}/{len(empresas_base)}] {nome_empresa}")
            print(f"    Inscrição: {inscricao}")
            
            for tipo_arquivo, pesquisar_por in combinacoes_exemplo:
                chave_historico = f"{inscricao}_{tipo_arquivo}_{pesquisar_por}"
                
                # Se usar intervalo, faz UMA solicitação única com o intervalo completo
                if usar_intervalo:
                    total_solicitacoes += 1
                    data_inicial_formatada = formatar_data_sefaz(data_inicial)
                    data_final_formatada = formatar_data_sefaz(data_final)
                    
                    dias_intervalo = (data_final - data_inicial).days + 1
                    print(f"\n    📋 {tipo_arquivo} ({pesquisar_por}): Solicitando intervalo único ({dias_intervalo} dias)")
                    print(f"       → Solicitando XMLs de {data_inicial_formatada} até {data_final_formatada}...", end=" ")
                    
                    params = {
                        "inscricao_municipal": inscricao,
                        "tipo_arquivo": tipo_arquivo,
                        "pesquisar_por": pesquisar_por,
                        "data_inicial": data_inicial_formatada,
                        "data_final": data_final_formatada
                    }
                    
                    try:
                        tipo_upper = tipo_arquivo.upper()
                        
                        if tipo_upper in ["NFE", "NFC"]:
                            sucesso_req, msg = retry_com_backoff(
                                lambda: actions.processar_solicitacao_nfe_nfc(params),
                                max_tentativas=2,
                                excecoes=(NoSuchElementException, StaleElementReferenceException, TimeoutException),
                                logger=logger
                            )
                        elif tipo_upper == "CTE":
                            sucesso_req, msg = retry_com_backoff(
                                lambda: actions.processar_solicitacao_cte(params),
                                max_tentativas=2,
                                excecoes=(NoSuchElementException, StaleElementReferenceException, TimeoutException),
                                logger=logger
                            )
                        else:
                            sucesso_req = False
                            msg = f"Tipo desconhecido: {tipo_arquivo}"
                        
                        if sucesso_req:
                            print("✅")
                            total_sucesso += 1
                            
                            # Atualiza histórico com a data final do intervalo
                            atualizar_data_empresa(
                                chave_historico,
                                data_final,
                                tipo_arquivo,
                                pesquisar_por
                            )
                            
                            try:
                                browser.voltar_para_nova_solicitacao()
                            except Exception:
                                pass
                        else:
                            print(f"❌ {msg[:50]}")
                            total_erros += 1
                            
                    except Exception as e:
                        print(f"❌ Erro: {str(e)[:50]}")
                        total_erros += 1
                        logger.error(f"Erro ao processar {inscricao}/{tipo_arquivo}/{data_inicial}-{data_final}: {e}")
                    
                    continue  # Pula o loop de dias quando usar intervalo
                
                # Modo normal: processa com consulta única por intervalo quando há múltiplos dias
                ultima_data = obter_ultima_data_empresa(chave_historico)
                dias_pendentes = calcular_dias_pendentes(ultima_data, data_alvo)
                
                if not dias_pendentes:
                    print(f"    ✓ {tipo_arquivo}/{pesquisar_por}: Já processado até {data_alvo}")
                    continue
                
                print(f"\n    📋 {tipo_arquivo} ({pesquisar_por}): {len(dias_pendentes)} dia(s) pendente(s)")
                
                if ultima_data:
                    print(f"       Última execução: {ultima_data.strftime('%d/%m/%Y')}")
                else:
                    print(f"       Primeira execução para esta empresa/tipo")
                
                # Determina intervalo: se houver múltiplos dias, faz consulta única com intervalo
                # Se houver apenas 1 dia, faz consulta única para aquele dia
                data_inicial_intervalo = dias_pendentes[0]
                data_final_intervalo = dias_pendentes[-1]
                
                total_solicitacoes += 1
                data_inicial_formatada = formatar_data_sefaz(data_inicial_intervalo)
                data_final_formatada = formatar_data_sefaz(data_final_intervalo)
                
                if len(dias_pendentes) == 1:
                    print(f"       → Solicitando XMLs de {data_inicial_formatada}...", end=" ")
                else:
                    dias_intervalo = len(dias_pendentes)
                    print(f"       → Solicitando XMLs de {data_inicial_formatada} até {data_final_formatada} ({dias_intervalo} dias em 1 consulta)...", end=" ")
                
                params = {
                    "inscricao_municipal": inscricao,
                    "tipo_arquivo": tipo_arquivo,
                    "pesquisar_por": pesquisar_por,
                    "data_inicial": data_inicial_formatada,
                    "data_final": data_final_formatada
                }
                
                try:
                    tipo_upper = tipo_arquivo.upper()
                    
                    if tipo_upper in ["NFE", "NFC"]:
                        sucesso_req, msg = retry_com_backoff(
                            lambda: actions.processar_solicitacao_nfe_nfc(params),
                            max_tentativas=2,
                            excecoes=(NoSuchElementException, StaleElementReferenceException, TimeoutException),
                            logger=logger
                        )
                    elif tipo_upper == "CTE":
                        sucesso_req, msg = retry_com_backoff(
                            lambda: actions.processar_solicitacao_cte(params),
                            max_tentativas=2,
                            excecoes=(NoSuchElementException, StaleElementReferenceException, TimeoutException),
                            logger=logger
                        )
                    else:
                        sucesso_req = False
                        msg = f"Tipo desconhecido: {tipo_arquivo}"
                    
                    if sucesso_req:
                        print("✅")
                        total_sucesso += 1
                        
                        # Atualiza histórico com a data final do intervalo processado
                        atualizar_data_empresa(
                            chave_historico,
                            data_final_intervalo,
                            tipo_arquivo,
                            pesquisar_por
                        )
                        
                        try:
                            browser.voltar_para_nova_solicitacao()
                        except Exception:
                            pass
                    else:
                        print(f"❌ {msg[:50]}")
                        total_erros += 1
                        
                except Exception as e:
                    print(f"❌ Erro: {str(e)[:50]}")
                    total_erros += 1
                    logger.error(f"Erro ao processar {inscricao}/{tipo_arquivo}/{data_inicial_intervalo}-{data_final_intervalo}: {e}")
            
            empresas_processadas += 1
        
        # RESUMO FINAL
        print("\n" + "=" * 70)
        print("📊 RESUMO DA EXECUÇÃO")
        print("=" * 70)
        print(f"Empresas processadas: {empresas_processadas}/{len(empresas_base)}")
        print(f"Total de solicitações: {total_solicitacoes}")
        print(f"  ✅ Sucesso: {total_sucesso}")
        print(f"  ❌ Erros: {total_erros}")
        if usar_intervalo:
            print(f"Intervalo processado: {data_inicial.strftime('%d/%m/%Y')} até {data_final.strftime('%d/%m/%Y')}")
        else:
            print(f"Data processada até: {data_alvo.strftime('%d/%m/%Y')}")
        print("=" * 70)
        
        exibir_status_historico()
        
        return total_erros == 0 or total_sucesso > 0
        
    except Exception as e:
        print(f"\n{SIMBOLOS['erro']} Erro crítico: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        remover_lock_sefaz()
        if browser:
            print(f"\n{SIMBOLOS['fechar']} Fechando navegador...")
            browser.fechar()


def executar_captura_continua_http(
    headless: bool = False,
    forcar_data: Optional[date] = None,
    data_inicial: Optional[date] = None,
    data_final: Optional[date] = None
) -> bool:
    """
    Executa captura contínua via cliente HTTP autenticado.

    Observação:
    - O fluxo HTTP cobre login, abertura do formulário e submissão quando o portal aceita a
      navegação server-side.
    - Se a transição inicial da solicitação não for aceita pelo backend, a função levanta
      SefazHttpError para permitir fallback controlado para Selenium.
    """
    logger = configurar_logging("captura_continua_http")

    print("=" * 70)
    print("CAPTURA CONTÍNUA DE XMLs VIA HTTP")
    print("=" * 70)
    print(f"Data/Hora: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print(f"Modo: HTTP autenticado com fallback controlado")
    print("=" * 70)

    sucesso, erros = validar_configuracao_completa()
    if not sucesso:
        logger.error("Erros de configuração encontrados:")
        for erro in erros:
            logger.error(f"  - {erro}")
        return False

    if not verificar_lock_sefaz():
        logger.warning("Cancelando execução: outra instância já está rodando")
        return False

    try:
        usar_intervalo = data_inicial is not None and data_final is not None
        data_alvo = None

        if usar_intervalo:
            print(f"\n📅 Intervalo de processamento: {data_inicial.strftime('%d/%m/%Y')} até {data_final.strftime('%d/%m/%Y')}")
            if data_inicial > data_final:
                print(f"{SIMBOLOS['erro']} Data inicial maior que data final!")
                return False
        else:
            data_alvo = forcar_data if forcar_data else obter_data_ontem()
            print(f"\n📅 Data alvo para processamento: {data_alvo.strftime('%d/%m/%Y')}")

        historico = carregar_historico()
        print(f"📊 Empresas já rastreadas no histórico: {len(historico.get('empresas', {}))}")

        config_valida, mensagem_config = validar_configuracoes()
        if not config_valida:
            print(f"{SIMBOLOS['erro']} {mensagem_config}")
            return False

        print("\n[ETAPA 1/3] Autenticando cliente HTTP...")
        print("-" * 60)

        with SefazHttpClient() as client:
            client.login(USUARIO_SEFAZ, SENHA_SEFAZ)
            print(f"{SIMBOLOS['login']} Login HTTP realizado")

            print("\n[ETAPA 2/3] Extraindo empresas do portal...")
            print("-" * 60)

            combinacoes_exemplo = ler_combinacoes_planilha()
            print(f"{SIMBOLOS['info']} Combinações a processar: {len(combinacoes_exemplo)}")

            empresas_base = client.listar_empresas()
            if not empresas_base:
                print(f"{SIMBOLOS['erro']} Nenhuma empresa encontrada!")
                return False

            print(f"{SIMBOLOS['sucesso']} {len(empresas_base)} empresas encontradas")

            empresa_preflight = empresas_base[0]
            print(
                f"{SIMBOLOS['info']} Validando fluxo HTTP de solicitacao com a inscricao "
                f"{empresa_preflight['inscricao']}..."
            )
            try:
                client.preflight_solicitacao(empresa_preflight["inscricao"])
            except SefazHttpError as exc:
                raise SefazHttpError(
                    f"Preflight HTTP falhou antes do processamento do lote: {exc}"
                ) from exc

            print("\n[ETAPA 3/3] Processando solicitações via HTTP...")
            print("-" * 60)

            total_solicitacoes = 0
            total_sucesso = 0
            total_erros = 0
            empresas_processadas = 0

            for idx_empresa, empresa in enumerate(empresas_base, 1):
                inscricao = empresa['inscricao']
                nome_empresa = empresa['nome'][:40]

                print(f"\n{'='*60}")
                print(f"[{idx_empresa}/{len(empresas_base)}] {nome_empresa}")
                print(f"    Inscrição: {inscricao}")

                for tipo_arquivo, pesquisar_por in combinacoes_exemplo:
                    chave_historico = f"{inscricao}_{tipo_arquivo}_{pesquisar_por}"

                    if usar_intervalo:
                        data_inicial_intervalo = data_inicial
                        data_final_intervalo = data_final
                    else:
                        ultima_data = obter_ultima_data_empresa(chave_historico)
                        dias_pendentes = calcular_dias_pendentes(ultima_data, data_alvo)
                        if not dias_pendentes:
                            print(f"    ✓ {tipo_arquivo}/{pesquisar_por}: Já processado até {data_alvo}")
                            continue
                        data_inicial_intervalo = dias_pendentes[0]
                        data_final_intervalo = dias_pendentes[-1]

                    total_solicitacoes += 1
                    data_inicial_formatada = formatar_data_sefaz(data_inicial_intervalo)
                    data_final_formatada = formatar_data_sefaz(data_final_intervalo)

                    if data_inicial_intervalo == data_final_intervalo:
                        print(f"       → Solicitando XMLs de {data_inicial_formatada}...", end=" ")
                    else:
                        dias_intervalo = (data_final_intervalo - data_inicial_intervalo).days + 1
                        print(
                            f"       → Solicitando XMLs de {data_inicial_formatada} até "
                            f"{data_final_formatada} ({dias_intervalo} dias em 1 consulta)...",
                            end=" "
                        )

                    params = {
                        "inscricao_municipal": inscricao,
                        "tipo_arquivo": tipo_arquivo,
                        "pesquisar_por": pesquisar_por,
                        "data_inicial": data_inicial_formatada,
                        "data_final": data_final_formatada,
                    }

                    try:
                        resultado = client.solicitar_xml(params)
                        print("✅")
                        if resultado.aviso:
                            print(f"         [AVISO] {resultado.aviso[:80]}")
                        total_sucesso += 1
                        atualizar_data_empresa(
                            chave_historico,
                            data_final_intervalo,
                            tipo_arquivo,
                            pesquisar_por
                        )
                    except SefazHttpError as exc:
                        print(f"❌ {str(exc)[:80]}")
                        logger.error(
                            f"Falha HTTP ao processar {inscricao}/{tipo_arquivo}/"
                            f"{data_inicial_formatada}-{data_final_formatada}: {exc}"
                        )
                        total_erros += 1
                    except Exception as exc:
                        print(f"❌ {str(exc)[:80]}")
                        logger.error(
                            f"Erro inesperado ao processar {inscricao}/{tipo_arquivo}/"
                            f"{data_inicial_formatada}-{data_final_formatada}: {exc}"
                        )
                        total_erros += 1

                empresas_processadas += 1

        print("\n" + "=" * 70)
        print("📊 RESUMO DA EXECUÇÃO")
        print("=" * 70)
        print(f"Empresas processadas: {empresas_processadas}/{len(empresas_base)}")
        print(f"Total de solicitações: {total_solicitacoes}")
        print(f"  ✅ Sucesso: {total_sucesso}")
        print(f"  ❌ Erros: {total_erros}")
        if usar_intervalo:
            print(f"Intervalo processado: {data_inicial.strftime('%d/%m/%Y')} até {data_final.strftime('%d/%m/%Y')}")
        else:
            print(f"Data processada até: {data_alvo.strftime('%d/%m/%Y')}")
        print("=" * 70)

        exibir_status_historico()
        return total_erros == 0 or total_sucesso > 0

    finally:
        remover_lock_sefaz()


def main():
    """Função principal do script CLI"""
    parser = argparse.ArgumentParser(
        description='Captura contínua de XMLs com recuperação automática de períodos perdidos',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos de uso:
  python executar_consulta.py                                    # Execução normal (processa ontem)
  python executar_consulta.py --headless                         # Modo invisível
  python executar_consulta.py --visible                          # Modo visível
  python executar_consulta.py --status                           # Mostra status do histórico
  python executar_consulta.py --data-inicial 01/01/2026 --data-final 18/01/2026  # Processa intervalo
  python executar_consulta.py --data-inicial 01012026 --data-final 18012026        # Formato alternativo

Este script:
  1. Verifica o histórico de cada empresa
  2. Calcula dias pendentes desde última execução
  3. Faz UMA solicitação única por intervalo (otimiza limite de consultas)
  4. Garante que nenhum XML seja perdido

Ideal para agendamento DIÁRIO automático.
Otimizado para reduzir o número de consultas e respeitar limites da SEFAZ.
        """
    )
    
    parser.add_argument(
        '--headless',
        action='store_true',
        default=False,
        help='Executar navegador invisível'
    )
    
    parser.add_argument(
        '--visible',
        action='store_false',
        dest='headless',
        default=True,
        help='Executar navegador visível (padrão)'
    )
    
    parser.add_argument(
        '--status',
        action='store_true',
        help='Apenas mostrar status do histórico de execuções'
    )
    
    parser.add_argument(
        '--limpar-historico',
        action='store_true',
        help='Limpa todo o histórico de execuções (cria backup)'
    )
    
    parser.add_argument(
        '--data-inicial',
        type=str,
        default=None,
        help='Data inicial do intervalo (formato: DD/MM/YYYY ou DDMMYYYY). Se especificada, requer --data-final'
    )
    
    parser.add_argument(
        '--data-final',
        type=str,
        default=None,
        help='Data final do intervalo (formato: DD/MM/YYYY ou DDMMYYYY). Se especificada, requer --data-inicial'
    )

    parser.add_argument(
        '--selenium',
        action='store_true',
        default=False,
        help='Força o fluxo legado via Selenium'
    )
    
    args = parser.parse_args()
    
    if args.status:
        exibir_status_historico()
        sys.exit(0)
    
    if args.limpar_historico:
        from src.consulta.historico import limpar_todo_historico
        resposta = input("Tem certeza que deseja limpar todo o histórico? (s/N): ")
        if resposta.lower() == 's':
            limpar_todo_historico()
            print("Histórico limpo!")
        else:
            print("Operação cancelada.")
        sys.exit(0)
    
    try:
        # Processa datas se fornecidas
        data_inicial = None
        data_final = None
        
        if args.data_inicial or args.data_final:
            if not (args.data_inicial and args.data_final):
                print("❌ ERRO: --data-inicial e --data-final devem ser especificados juntos")
                sys.exit(1)
            
            try:
                # Tenta formatos DD/MM/YYYY e DDMMYYYY
                if '/' in args.data_inicial:
                    data_inicial = datetime.strptime(args.data_inicial, "%d/%m/%Y").date()
                else:
                    data_inicial = datetime.strptime(args.data_inicial, "%d%m%Y").date()
                
                if '/' in args.data_final:
                    data_final = datetime.strptime(args.data_final, "%d/%m/%Y").date()
                else:
                    data_final = datetime.strptime(args.data_final, "%d%m%Y").date()
            except ValueError as e:
                print(f"❌ ERRO: Formato de data inválido. Use DD/MM/YYYY ou DDMMYYYY. Erro: {e}")
                sys.exit(1)
        
        if args.selenium:
            sucesso = executar_captura_continua_selenium(
                headless=args.headless,
                data_inicial=data_inicial,
                data_final=data_final
            )
        else:
            try:
                sucesso = executar_captura_continua_http(
                    headless=args.headless,
                    data_inicial=data_inicial,
                    data_final=data_final
                )
            except SefazHttpError as exc:
                print(f"[AVISO] Fluxo HTTP não concluiu a solicitação: {exc}")
                print("[INFO] Aplicando fallback para Selenium nesta execução.")
                sucesso = executar_captura_continua_selenium(
                    headless=args.headless,
                    data_inicial=data_inicial,
                    data_final=data_final
                )
        sys.exit(0 if sucesso else 1)
    except KeyboardInterrupt:
        print("\n\n[INFO] Processo interrompido pelo usuário.")
        sys.exit(130)
    except Exception as e:
        print(f"\n[ERRO] Erro crítico: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
