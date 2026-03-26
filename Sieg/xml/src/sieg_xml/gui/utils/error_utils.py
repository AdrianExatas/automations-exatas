"""
Utilitários para tratamento e interpretação de erros
"""


def interpretar_erro_api(mensagem_erro: str) -> dict:
    """
    Interpreta e traduz erros comuns da API SIEG
    
    Args:
        mensagem_erro: Mensagem de erro retornada pela API
        
    Returns:
        Dicionário com:
        - tipo: Tipo do erro (erro, aviso, info)
        - mensagem: Mensagem traduzida/interpretada
        - original: Mensagem original
        - solucao: Sugestão de solução (opcional)
    """
    mensagem_lower = mensagem_erro.lower()
    
    # Erro de protocolo NFe inexistente
    if 'protnfe' in mensagem_lower and ('inesist' in mensagem_lower or 'inexist' in mensagem_lower):
        return {
            'tipo': 'erro',
            'mensagem': 'XML sem protocolo de autorização (protNFe)',
            'original': mensagem_erro,
            'solucao': 'O XML não possui o protocolo de autorização da SEFAZ. Verifique se o XML foi autorizado corretamente.'
        }
    
    # Erro de XML inválido
    if 'xml' in mensagem_lower and ('invalid' in mensagem_lower or 'inválido' in mensagem_lower):
        return {
            'tipo': 'erro',
            'mensagem': 'XML inválido ou mal formado',
            'original': mensagem_erro,
            'solucao': 'Verifique se o XML está completo e bem formado.'
        }
    
    # Erro de chave de acesso
    if 'chave' in mensagem_lower or 'key' in mensagem_lower:
        return {
            'tipo': 'erro',
            'mensagem': 'Erro relacionado à chave de acesso',
            'original': mensagem_erro,
            'solucao': 'Verifique se a chave de acesso está correta e completa (44 dígitos).'
        }
    
    # Erro de conexão/timeout
    if 'timeout' in mensagem_lower or 'connection' in mensagem_lower or 'conexão' in mensagem_lower:
        return {
            'tipo': 'erro',
            'mensagem': 'Erro de conexão ou timeout',
            'original': mensagem_erro,
            'solucao': 'Verifique sua conexão com a internet e tente novamente.'
        }
    
    # Erro de autenticação
    if 'unauthorized' in mensagem_lower or 'autenticação' in mensagem_lower or 'api key' in mensagem_lower:
        return {
            'tipo': 'erro',
            'mensagem': 'Erro de autenticação',
            'original': mensagem_erro,
            'solucao': 'Verifique se a API Key está correta nas configurações.'
        }
    
    # Erro genérico
    return {
        'tipo': 'erro',
        'mensagem': mensagem_erro,
        'original': mensagem_erro,
        'solucao': None
    }


def formatar_erro_para_log(erro_info: dict) -> str:
    """
    Formata informações de erro para exibição no log
    
    Args:
        erro_info: Dicionário retornado por interpretar_erro_api
        
    Returns:
        String formatada para exibição
    """
    mensagem = erro_info['mensagem']
    
    if erro_info.get('solucao'):
        return f"{mensagem}\n         💡 {erro_info['solucao']}"
    
    return mensagem
