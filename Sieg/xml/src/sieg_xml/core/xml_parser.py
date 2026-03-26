"""
Funções para parsing e validação de XMLs fiscais
"""
import xml.etree.ElementTree as ET
from typing import Optional, Tuple


def validar_xml(xml_string: str) -> bool:
    """
    Valida se o XML é bem formado
    
    Args:
        xml_string: String com o conteúdo do XML
        
    Returns:
        True se o XML é válido, False caso contrário
    """
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
        
    except Exception:
        return None


def extrair_data_xml(xml_string: str) -> Tuple[Optional[int], Optional[int]]:
    """
    Extrai o ano e mês da data de emissão do XML da NFe
    
    Args:
        xml_string: String com o conteúdo do XML
        
    Returns:
        Tupla (ano, mês) ou (None, None) se não conseguir extrair
    """
    try:
        # Parse do XML
        root = ET.fromstring(xml_string)
        
        # Namespace da NFe
        ns = {'nfe': 'http://www.portalfiscal.inf.br/nfe'}
        
        # Tentar encontrar dhEmi (data e hora de emissão)
        # Pode estar em diferentes caminhos dependendo da estrutura
        caminhos_possiveis = [
            './/nfe:dhEmi',  # Caminho mais comum
            './/{http://www.portalfiscal.inf.br/nfe}dhEmi',
            './/dhEmi',  # Sem namespace
        ]
        
        data_emissao = None
        for caminho in caminhos_possiveis:
            try:
                elemento = root.find(caminho, ns) if 'nfe:' in caminho else root.find(caminho)
                if elemento is not None and elemento.text:
                    data_emissao = elemento.text
                    break
            except:
                continue
        
        # Se não encontrou com namespace, tenta sem namespace
        if data_emissao is None:
            for elem in root.iter():
                if elem.tag.endswith('dhEmi') or 'dhEmi' in elem.tag:
                    if elem.text:
                        data_emissao = elem.text
                        break
        
        if data_emissao:
            # Formato esperado: 2023-01-17T11:40:00-03:00 ou similar
            # Extrair apenas a parte da data (antes do T)
            data_part = data_emissao.split('T')[0]
            partes = data_part.split('-')
            
            if len(partes) >= 2:
                ano = int(partes[0])
                mes = int(partes[1])
                return ano, mes
        
        return None, None
        
    except Exception:
        return None, None


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
    except Exception:
        return None
