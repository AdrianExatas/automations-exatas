"""
Função principal para upload automático de XMLs para o SIEG
"""
import os
import time
from pathlib import Path
from typing import Optional, Dict
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

from src.core.config import PATHS, SIEG_API_KEY
from src.upload.utils import validar_xml, extrair_chave_acesso, identificar_tipo_xml, obter_tipo_completo_nota
from src.upload.sieg_api import enviar_xml, verificar_xml_existe


# Configurações de warm-up (aquecimento gradual)
WARM_UP_FASE1_QTD = 5       # Quantidade de XMLs na fase 1 (sequencial)
WARM_UP_FASE1_THREADS = 1   # Threads na fase 1
WARM_UP_FASE2_QTD = 15      # Quantidade de XMLs na fase 2
WARM_UP_FASE2_THREADS = 5   # Threads na fase 2
WARM_UP_FASE3_QTD = 30      # Quantidade de XMLs na fase 3
WARM_UP_FASE3_THREADS = 10  # Threads na fase 3
WARM_UP_DELAY = 0.2         # Delay entre envios no warm-up (segundos)

# Configurações padrão
NUM_THREADS_PADRAO = 20
NUM_THREADS_VERIFICACAO = 20


def processar_xml_individual(xml_info: Dict, api_key: Optional[str] = None) -> tuple:
    """
    Processa um XML individual: valida, verifica existência e envia se necessário
    
    Args:
        xml_info: Dict com informações do XML (caminho, nome, conteudo, chave, tipo)
        api_key: API Key do SIEG (usa do config se None)
        
    Returns:
        Tupla (sucesso: bool, ja_existia: bool, mensagem: str)
    """
    if not api_key:
        api_key = SIEG_API_KEY
    
    if not api_key:
        return False, False, "API Key não configurada"
    
    nome = xml_info.get('nome', 'Desconhecido')
    conteudo = xml_info.get('conteudo', '')
    chave = xml_info.get('chave')
    
    # Valida XML
    if not validar_xml(conteudo):
        return False, False, "XML inválido"
    
    # Verifica se já existe (se tem chave)
    ja_existia = False
    if chave:
        ja_existia = verificar_xml_existe(chave, api_key)
        if ja_existia:
            return True, True, "XML já existe no SIEG"
    
    # Envia XML
    sucesso, msg, _ = enviar_xml(conteudo, api_key, silencioso=True)
    
    if sucesso:
        return True, False, "Enviado com sucesso"
    else:
        return False, False, msg


def enviar_automatico(
    pasta: Optional[str] = None,
    excluir_enviados: bool = True,
    num_threads: int = NUM_THREADS_PADRAO
) -> Dict:
    """
    Modo automático: verifica, envia e exclui XMLs sem interação.
    Usa warm-up gradual para evitar sobrecarga no servidor.
    
    Args:
        pasta: Pasta com XMLs (usa PATHS.downloads_dir se None)
        excluir_enviados: Se True, exclui XMLs enviados com sucesso
        num_threads: Número máximo de threads (após warm-up)
        
    Returns:
        Dict com estatísticas do envio
    """
    print("="*60)
    print("MODO AUTOMÁTICO - Envio de XMLs para SIEG")
    print("="*60)
    
    # Usar pasta padrão se não informada
    if not pasta:
        pasta = str(PATHS.downloads_dir)
    
    print(f"\n📁 Pasta: {pasta}")
    print(f"🔧 Threads máx: {num_threads}")
    print(f"🗑️  Excluir após envio: {'Sim' if excluir_enviados else 'Não'}")
    print()
    
    # Verificar se pasta existe
    if not os.path.exists(pasta):
        print(f"\nERRO: Pasta não encontrada: {pasta}")
        return {"erro": "Pasta não encontrada"}
    
    # Obter API Key
    api_key = SIEG_API_KEY
    if not api_key:
        print("\nERRO: API Key não configurada no .env")
        return {"erro": "API Key não configurada"}
    
    # Buscar XMLs
    print(f"\n{'='*60}")
    print("Buscando arquivos XML...")
    print("="*60)
    
    xmls_encontrados = []
    for root_dir, dirs, files in os.walk(pasta):
        for arquivo in files:
            if arquivo.lower().endswith('.xml'):
                caminho_completo = os.path.join(root_dir, arquivo)
                xmls_encontrados.append(caminho_completo)
    
    if not xmls_encontrados:
        print("ℹ️  Nenhum arquivo XML encontrado na pasta.")
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
    print("⏳ Verificando duplicados na API...")
    
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
    print(f"   📤 Fase 1: {WARM_UP_FASE1_QTD} XMLs com {WARM_UP_FASE1_THREADS} thread(s) (sequencial)")
    print(f"   📤 Fase 2: {WARM_UP_FASE2_QTD} XMLs com {WARM_UP_FASE2_THREADS} thread(s)")
    print(f"   📤 Fase 3: {WARM_UP_FASE3_QTD} XMLs com {WARM_UP_FASE3_THREADS} thread(s)")
    print(f"   📤 Fase 4: Restante com {num_threads} thread(s)")
    print(f"\n⏳ Enviando {len(xmls_para_enviar)} XML(s) para o SIEG...\n")
    
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
        
        # Obtém chave completa (44 dígitos) e tipo completo com código
        chave = xml_info.get('chave', '')
        tipo_completo = obter_tipo_completo_nota(xml_info['conteudo'])
        
        # Formata chave: mostra completa se tiver 44 dígitos
        if chave and len(chave) == 44:
            chave_formatada = f"N_{chave}"
        else:
            # Se não tem chave completa, tenta extrair novamente do conteúdo
            chave_extraida = extrair_chave_acesso(xml_info['conteudo'])
            if chave_extraida and len(chave_extraida) == 44:
                chave_formatada = f"N_{chave_extraida}"
            else:
                # Fallback: usa nome do arquivo truncado
                chave_formatada = xml_info['nome'][:45] + "..."
        
        tipo_info = f" ({tipo_completo})" if tipo_completo and tipo_completo != 'Desconhecido' else ""
        
        if sucesso:
            print(f"[{processados}/{total_para_enviar}] ✅ OK{fase_info} - {chave_formatada}{tipo_info}")
            return ('sucesso', xml_info, msg)
        else:
            print(f"[{processados}/{total_para_enviar}] ❌ ERRO{fase_info} - {chave_formatada}{tipo_info}")
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
    print("📊 RESUMO FINAL DO UPLOAD")
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
    print()
    
    return {
        "total": len(xmls_validos),
        "enviados": len(enviados_sucesso),
        "existentes": len(xmls_ja_existentes),
        "erros": len(erros_envio)
    }
