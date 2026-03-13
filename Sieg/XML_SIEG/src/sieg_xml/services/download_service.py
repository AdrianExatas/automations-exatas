"""
Serviço para download de XMLs da API SIEG
"""
import os
from datetime import datetime
from typing import List, Optional
from ..api.client import SiegAPIClient
from ..core.xml_parser import validar_xml, extrair_data_xml
from ..config import PASTA_XMLS_BAIXADOS, inferir_tipo_documento_chave

# Quantas falhas exibir com detalhe (evita poluir o log)
NUM_DETALHES_ERRO = 5


class DownloadService:
    """Serviço para download e organização de XMLs"""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Inicializa o serviço de download
        
        Args:
            api_key: Chave da API (usa a padrão se None)
        """
        self.client = SiegAPIClient(api_key)
        self.pasta_xmls = PASTA_XMLS_BAIXADOS
        os.makedirs(self.pasta_xmls, exist_ok=True)
    
    def baixar_xmls(self, chaves: List[str]) -> dict:
        """
        Baixa XMLs para uma lista de chaves de acesso
        
        Args:
            chaves: Lista de chaves de acesso (44 dígitos)
            
        Returns:
            Dicionário com estatísticas do download (sucesso, falhas, total, chaves_com_falha)
        """
        sucesso = 0
        falhas = 0
        chaves_com_falha: List[str] = []
        
        print(f"\n{'='*60}")
        print("Iniciando download dos XMLs...")
        print(f"{'='*60}\n")
        
        detalhes_mostrados = 0
        for idx, chave in enumerate(chaves, 1):
            tipo = inferir_tipo_documento_chave(chave)
            if tipo == 'CTe':
                print(f"[{idx}/{len(chaves)}] Processando chave (CTe): {chave}")
            else:
                print(f"[{idx}/{len(chaves)}] Processando chave: {chave}")
            
            xml_content, valido, erro_detalhe = self.client.download_xml(chave)
            
            if xml_content and valido:
                # Validar XML
                if not validar_xml(xml_content):
                    print(f"  AVISO: XML inválido para chave: {chave}")
                    falhas += 1
                    chaves_com_falha.append(chave)
                    continue
                
                # Extrair ano do XML (organização apenas por ano)
                ano, _ = extrair_data_xml(xml_content)
                
                # Determinar pasta de destino
                if ano:
                    # Criar estrutura: xmls_baixados/2023/
                    pasta_ano = os.path.join(self.pasta_xmls, str(ano))
                    os.makedirs(pasta_ano, exist_ok=True)
                    caminho_xml = os.path.join(pasta_ano, f"{chave}.xml")
                    info_data = f" ({ano})"
                else:
                    # Se não conseguir extrair data, salva na pasta raiz
                    caminho_xml = os.path.join(self.pasta_xmls, f"{chave}.xml")
                    info_data = " (data não identificada)"
                
                # Verificar se já existe
                if os.path.exists(caminho_xml):
                    print(f"  AVISO: Arquivo já existe, sobrescrevendo...")
                
                with open(caminho_xml, 'w', encoding='utf-8') as f:
                    f.write(xml_content)
                
                print(f"  OK - XML baixado e salvo{info_data}: {caminho_xml}")
                sucesso += 1
            else:
                print(f"  ERRO: Falha ao baixar XML para chave: {chave}")
                if erro_detalhe and detalhes_mostrados < NUM_DETALHES_ERRO:
                    print(f"    Detalhe: {erro_detalhe}")
                    detalhes_mostrados += 1
                falhas += 1
                chaves_com_falha.append(chave)
        
        # Resumo e arquivo com chaves que falharam (para nova tentativa)
        print(f"\n{'='*60}")
        print("Resumo do download")
        print(f"{'='*60}")
        print(f"  Sucesso: {sucesso}")
        print(f"  Falhas:  {falhas}")
        print(f"  Total:   {len(chaves)}")
        if chaves_com_falha:
            nome_arquivo = os.path.join(
                self.pasta_xmls,
                f"chaves_falha_{datetime.now().strftime('%Y%m%d_%H%M')}.txt"
            )
            try:
                with open(nome_arquivo, 'w', encoding='utf-8') as f:
                    f.write("\n".join(chaves_com_falha))
                print(f"\n  Chaves com falha salvas em: {nome_arquivo}")
                print("  (Use essa lista para tentar novamente depois.)")
            except OSError as e:
                print(f"\n  (Não foi possível salvar lista de falhas: {e})")
        print()
        
        return {
            "sucesso": sucesso,
            "falhas": falhas,
            "total": len(chaves),
            "chaves_com_falha": chaves_com_falha,
        }
