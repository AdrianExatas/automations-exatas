"""
Serviço para upload de XMLs para a API SIEG
"""
import os
import time
from typing import List, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

from ..api.client import SiegAPIClient
from ..core.xml_parser import validar_xml, extrair_chave_acesso, identificar_tipo_xml
from ..config import (
    NUM_THREADS_PADRAO,
    NUM_THREADS_VERIFICACAO,
    WARM_UP_FASE1_QTD,
    WARM_UP_FASE1_THREADS,
    WARM_UP_FASE2_QTD,
    WARM_UP_FASE2_THREADS,
    WARM_UP_FASE3_QTD,
    WARM_UP_FASE3_THREADS,
    WARM_UP_DELAY
)


class UploadService:
    """Serviço para upload de XMLs com verificação e processamento paralelo"""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Inicializa o serviço de upload
        
        Args:
            api_key: Chave da API (usa a padrão se None)
        """
        self.client = SiegAPIClient(api_key)
    
    def validar_xmls(self, caminhos_xml: List[str]) -> Tuple[List[dict], dict]:
        """
        Valida uma lista de XMLs e extrai informações
        
        Args:
            caminhos_xml: Lista de caminhos dos arquivos XML
            
        Returns:
            Tupla (xmls_validos, tipos_identificados) onde:
            - xmls_validos: Lista de dicts com {caminho, nome, conteudo, tipo, chave}
            - tipos_identificados: Dict com contagem de tipos
        """
        xmls_validos = []
        tipos_identificados = {}
        
        print("Lendo e validando XMLs...")
        for idx, caminho_xml in enumerate(caminhos_xml, 1):
            nome_arquivo = os.path.basename(caminho_xml)
            print(f"[{idx}/{len(caminhos_xml)}] Validando: {nome_arquivo}")
            
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
                xmls_validos.append({
                    'caminho': caminho_xml,
                    'nome': nome_arquivo,
                    'conteudo': xml_content,
                    'tipo': tipo_xml,
                    'chave': chave_acesso
                })
                
            except Exception as e:
                print(f"  ERRO ao ler arquivo: {e}")
        
        return xmls_validos, tipos_identificados
    
    def verificar_xmls_existentes(self, xmls_validos: List[dict]) -> Tuple[List[dict], List[dict]]:
        """
        Verifica quais XMLs já existem no SIEG
        
        Args:
            xmls_validos: Lista de XMLs válidos
            
        Returns:
            Tupla (xmls_para_enviar, xmls_ja_existentes)
        """
        xmls_para_enviar = []
        xmls_ja_existentes = []
        verificacao_lock = Lock()
        total_verificado = 0
        
        def verificar_xml_paralelo(xml_info):
            nonlocal total_verificado
            chave = xml_info.get('chave')
            existe = False
            
            if chave:
                existe = self.client.verify_xml_exists(chave)
            
            with verificacao_lock:
                total_verificado += 1
                status = "⚠ Existe" if existe else "○ Novo"
                chave_info = f" ({chave[:10]}...)" if chave else " (sem chave)"
                print(f"[{total_verificado}/{len(xmls_validos)}] {status}: {xml_info['nome']}{chave_info}")
            
            return (xml_info, existe)
        
        num_threads = min(NUM_THREADS_VERIFICACAO, len(xmls_validos))
        print(f"\nUsando {num_threads} thread(s) para verificação paralela...\n")
        
        with ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = [executor.submit(verificar_xml_paralelo, xml) for xml in xmls_validos]
            for future in as_completed(futures):
                xml_info, existe = future.result()
                if existe:
                    xmls_ja_existentes.append(xml_info)
                else:
                    xmls_para_enviar.append(xml_info)
        
        return xmls_para_enviar, xmls_ja_existentes
    
    def enviar_xmls(
        self,
        xmls_para_enviar: List[dict],
        num_threads: int = NUM_THREADS_PADRAO,
        usar_warmup: bool = False
    ) -> dict:
        """
        Envia XMLs para a API SIEG com processamento paralelo
        
        Args:
            xmls_para_enviar: Lista de XMLs para enviar
            num_threads: Número de threads para processamento paralelo
            usar_warmup: Se True, usa warm-up gradual
            
        Returns:
            Dicionário com estatísticas do envio
        """
        enviados_sucesso = []
        erros_envio = []
        contador_lock = Lock()
        progresso_lock = Lock()
        total_processado = 0
        
        def enviar_com_progresso(xml_info, fase_info=""):
            nonlocal total_processado
            sucesso, msg, _ = self.client.upload_xml(xml_info['conteudo'], silencioso=True)
            
            with contador_lock:
                total_processado += 1
            
            tipo_info = f" ({xml_info['tipo']})" if xml_info.get('tipo') else ""
            
            with progresso_lock:
                if sucesso:
                    print(f"[{total_processado}/{len(xmls_para_enviar)}] ✓ OK{fase_info} - {xml_info['nome']}{tipo_info}")
                    enviados_sucesso.append(xml_info)
                else:
                    print(f"[{total_processado}/{len(xmls_para_enviar)}] ✗ ERRO{fase_info} - {xml_info['nome']}")
                    print(f"         {msg}")
                    erros_envio.append({'xml': xml_info, 'erro': msg})
        
        inicio_tempo = time.time()
        
        if usar_warmup and len(xmls_para_enviar) > WARM_UP_FASE1_QTD:
            # Fase 1: Sequencial
            fase1_qtd = min(WARM_UP_FASE1_QTD, len(xmls_para_enviar))
            if fase1_qtd > 0:
                print(f"── Fase 1: Enviando {fase1_qtd} XMLs sequencialmente ──")
                for xml_info in xmls_para_enviar[:fase1_qtd]:
                    enviar_com_progresso(xml_info, " [F1]")
                    time.sleep(WARM_UP_DELAY)
            
            restantes = xmls_para_enviar[fase1_qtd:]
            
            # Fase 2: Poucas threads
            fase2_qtd = min(WARM_UP_FASE2_QTD, len(restantes))
            if fase2_qtd > 0:
                print(f"\n── Fase 2: Enviando {fase2_qtd} XMLs com {WARM_UP_FASE2_THREADS} threads ──")
                with ThreadPoolExecutor(max_workers=WARM_UP_FASE2_THREADS) as executor:
                    futures = {executor.submit(enviar_com_progresso, xml, " [F2]"): xml for xml in restantes[:fase2_qtd]}
                    for future in as_completed(futures):
                        future.result()
            
            restantes = restantes[fase2_qtd:]
            
            # Fase 3: Mais threads
            fase3_qtd = min(WARM_UP_FASE3_QTD, len(restantes))
            if fase3_qtd > 0:
                print(f"\n── Fase 3: Enviando {fase3_qtd} XMLs com {WARM_UP_FASE3_THREADS} threads ──")
                with ThreadPoolExecutor(max_workers=WARM_UP_FASE3_THREADS) as executor:
                    futures = {executor.submit(enviar_com_progresso, xml, " [F3]"): xml for xml in restantes[:fase3_qtd]}
                    for future in as_completed(futures):
                        future.result()
            
            restantes = restantes[fase3_qtd:]
            
            # Fase 4: Todas as threads
            if restantes:
                print(f"\n── Fase 4: Enviando {len(restantes)} XMLs com {num_threads} threads ──")
                with ThreadPoolExecutor(max_workers=num_threads) as executor:
                    futures = {executor.submit(enviar_com_progresso, xml, ""): xml for xml in restantes}
                    for future in as_completed(futures):
                        future.result()
        else:
            # Envio direto sem warm-up
            print(f"\nUsando {num_threads} thread(s) para envio paralelo...\n")
            with ThreadPoolExecutor(max_workers=num_threads) as executor:
                futures = {executor.submit(enviar_com_progresso, xml, ""): xml for xml in xmls_para_enviar}
                for future in as_completed(futures):
                    future.result()
        
        tempo_total = time.time() - inicio_tempo
        
        return {
            "enviados": len(enviados_sucesso),
            "erros": len(erros_envio),
            "total": len(xmls_para_enviar),
            "tempo_total": tempo_total,
            "enviados_sucesso": enviados_sucesso,
            "erros_detalhados": erros_envio
        }
