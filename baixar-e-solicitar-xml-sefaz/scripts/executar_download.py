#!/usr/bin/env python3
"""
Script principal para automação de download de XMLs do SEFAZ
"""
import os
import sys
import argparse
from pathlib import Path

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

from src.download import state
from src.download.http_runner import executar_download_http
from src.download.login import executar_login_completo, iniciar_thread
from src.download.checkpoint import verificar_checkpoint, limpar_checkpoint
from src.download.downloader import executar_download


def main():
    """Função principal do script CLI"""
    parser = argparse.ArgumentParser(
        description='Automação de download de XMLs do SEFAZ',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos de uso:
  python executar_download.py                         # Execução normal
  python executar_download.py --headless              # Modo invisível
  python executar_download.py --visible               # Modo visível
  python executar_download.py --upload                # Com upload automático para SIEG
  python executar_download.py --status                # Mostra status do checkpoint
  python executar_download.py --limpar                # Limpa checkpoint existente

Este script:
  1. Faz login no portal SEFAZ
  2. Navega até a área de downloads
  3. Baixa XMLs disponíveis
  4. Descompacta os arquivos .zip (se habilitado)
  5. Faz upload automático para SIEG após todos os downloads (se --upload habilitado)
  6. Salva checkpoints para retomada

Ideal para agendamento DIÁRIO automático.
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
        help='Executar navegador visível (padrão)'
    )
    
    parser.add_argument(
        '--status',
        action='store_true',
        help='Apenas mostrar status do checkpoint'
    )
    
    parser.add_argument(
        '--limpar',
        action='store_true',
        help='Limpa checkpoint existente (cria backup)'
    )
    
    parser.add_argument(
        '--pagina-inicial',
        type=int,
        default=None,
        help='Página inicial para processamento'
    )
    
    parser.add_argument(
        '--pagina-final',
        type=int,
        default=None,
        help='Página final para processamento'
    )
    
    parser.add_argument(
        '--data',
        type=str,
        default=None,
        help='Filtro de data de solicitação (formato: DDMMYYYY)'
    )
    
    parser.add_argument(
        '--extrair',
        action='store_true',
        default=None,
        help='Extrai automaticamente os arquivos .zip baixados (padrão: True)'
    )
    
    parser.add_argument(
        '--nao-extrair',
        dest='extrair',
        action='store_false',
        help='Não extrai os arquivos .zip baixados'
    )
    
    parser.add_argument(
        '--upload',
        action='store_true',
        default=False,
        help='Executa upload automático para SIEG após descompactação'
    )

    parser.add_argument(
        '--selenium',
        action='store_true',
        default=False,
        help='Força o fluxo antigo via Selenium'
    )

    parser.add_argument(
        '--http',
        action='store_true',
        default=True,
        help='Usa o fluxo HTTP autenticado (padrão)'
    )
    
    args = parser.parse_args()
    
    # Apenas mostrar status
    if args.status:
        checkpoint = verificar_checkpoint()
        if not checkpoint:
            print("\n[INFO] Nenhum checkpoint encontrado.")
        sys.exit(0)
    
    # Limpar checkpoint (sem interação)
    if args.limpar:
        print("Limpando checkpoint (modo não-interativo)...")
        limpar_checkpoint()
        sys.exit(0)
    
    # Configura estado
    state.usar_headless = args.headless
    state.pagina_inicial = args.pagina_inicial
    state.pagina_final = args.pagina_final
    state.data_solicitacao = args.data
    state.upload_automatico = args.upload
    if args.extrair is not None:
        state.extrair_zips = args.extrair
    
    print("=" * 60)
    print("AUTOMAÇÃO DE DOWNLOAD DE XMLs SEFAZ")
    print("=" * 60)
    print(f"Execução: {'Selenium' if args.selenium else 'HTTP'}")
    print(f"Modo: {'Headless' if args.headless else 'Visível'}")
    print(f"Extração automática: {'Sim' if state.extrair_zips else 'Não'}")
    print(f"Upload automático SIEG: {'Sim' if state.upload_automatico else 'Não'}")
    if args.pagina_inicial:
        print(f"Página inicial: {args.pagina_inicial}")
    if args.pagina_final:
        print(f"Página final: {args.pagina_final}")
    if args.data:
        print(f"Filtro de data: {args.data}")
    print("=" * 60)
    
    # Verifica checkpoint existente (sem interação: sempre retoma; use --limpar para zerar)
    checkpoint = verificar_checkpoint()
    if checkpoint:
        print("\nCheckpoint encontrado: retomando automaticamente. Use --limpar para zerar.")
    
    try:
        if args.selenium:
            executar_login_completo(callback_download=executar_download)
        else:
            executar_download_http()
        sys.exit(0)
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
