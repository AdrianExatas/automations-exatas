"""
Utilitários para processamento de XMLs
"""
import xml.etree.ElementTree as ET
from typing import Optional


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
        
    except Exception:
        return None


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


def obter_codigo_tipo_nota(xml_string: str) -> Optional[int]:
    """
    Obtém o código numérico do tipo de nota fiscal (55 para NF-e, 65 para NFC-e)
    
    Args:
        xml_string: String com o conteúdo do XML
    
    Returns:
        Código do tipo (55, 65, etc.) ou None se não identificar
    """
    try:
        root = ET.fromstring(xml_string)
        
        # Namespace da NFe
        ns = {'nfe': 'http://www.portalfiscal.inf.br/nfe'}
        
        # Tentar encontrar o código do modelo (mod) em diferentes caminhos
        caminhos_possiveis = [
            './/nfe:mod',
            './/{http://www.portalfiscal.inf.br/nfe}mod',
            './/mod',
            './/nfe:ide/nfe:mod',
            './/{http://www.portalfiscal.inf.br/nfe}ide/{http://www.portalfiscal.inf.br/nfe}mod',
            './/ide/mod',
        ]
        
        for caminho in caminhos_possiveis:
            try:
                elemento = root.find(caminho, ns) if 'nfe:' in caminho else root.find(caminho)
                if elemento is not None and elemento.text:
                    codigo = int(elemento.text.strip())
                    # Valida se é um código conhecido
                    if codigo in [55, 65]:
                        return codigo
            except:
                continue
        
        # Se não encontrou pelo mod, busca em todos os elementos
        for elem in root.iter():
            if 'mod' in elem.tag.lower() and elem.text:
                try:
                    codigo = int(elem.text.strip())
                    if codigo in [55, 65]:
                        return codigo
                except:
                    continue
        
        # Se não encontrou pelo mod, tenta identificar pelo tipo
        tipo = identificar_tipo_xml(xml_string)
        if tipo == 'NFe':
            return 55
        elif tipo == 'NFCe':
            return 65
        
        return None
    except Exception:
        return None


def obter_tipo_completo_nota(xml_string: str) -> str:
    """
    Obtém o tipo completo da nota (ex: "NF-e" ou "NFC-e")
    
    Args:
        xml_string: String com o conteúdo do XML
    
    Returns:
        String com tipo completo (ex: "NF-e" ou "NFC-e") ou tipo simples se não identificar
    """
    tipo = identificar_tipo_xml(xml_string)
    codigo = obter_codigo_tipo_nota(xml_string)
    
    # Usa o código para identificar corretamente NF-e vs NFC-e
    if codigo == 55:
        return 'NF-e'
    elif codigo == 65:
        return 'NFC-e'
    elif tipo == 'NFe':
        return 'NF-e'
    elif tipo == 'NFCe':
        return 'NFC-e'
    elif tipo:
        return tipo
    
    return 'Desconhecido'
