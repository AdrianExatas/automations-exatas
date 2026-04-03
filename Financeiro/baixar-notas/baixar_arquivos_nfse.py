from __future__ import annotations

import argparse
import base64
import json
import re
import sys
import threading
import time
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from playwright.sync_api import Browser, BrowserContext, Page, Playwright, sync_playwright
from pywinauto import Desktop


BASE_URL = "https://tobiasbarretose.webiss.com.br"
USER_AGENT = "Mozilla/5.0"
CERTIFICATE_DIALOG_TEXT = "selecione um certificado"
CERTIFICATE_DIALOG_POLL_INTERVAL = 0.5
LINK_STYLESHEET_RE = re.compile(
    r"<link\b[^>]*rel=[\"'][^\"']*stylesheet[^\"']*[\"'][^>]*href=[\"']([^\"']+)[\"'][^>]*>",
    flags=re.IGNORECASE,
)
IMG_SRC_RE = re.compile(
    r"(<img\b[^>]*\bsrc=[\"'])([^\"']+)([\"'][^>]*>)",
    flags=re.IGNORECASE,
)
DEFAULT_HTTP_TIMEOUT = 120
DEFAULT_RETRIES = 3
RETRY_BACKOFF_SECONDS = (5, 10, 20)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Baixa XML e PDF publicos das NFS-e listadas em um arquivo JSON."
    )
    parser.add_argument(
        "--input",
        default="nfse_2026-03.json",
        help="Arquivo JSON com a lista de NFS-e.",
    )
    parser.add_argument(
        "--output-dir",
        default="saida_nfse",
        help="Diretorio de saida para os arquivos baixados.",
    )
    parser.add_argument(
        "--format",
        choices=("xml", "pdf", "ambos"),
        default="ambos",
        help="Formato dos arquivos a baixar.",
    )
    parser.add_argument(
        "--headless",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Executa o Chrome em modo headless ao gerar PDF.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limita a quantidade de NFS-e processadas.",
    )
    parser.add_argument(
        "--http-timeout",
        type=int,
        default=DEFAULT_HTTP_TIMEOUT,
        help="Timeout HTTP em segundos para buscar HTML, CSS e XML.",
    )
    parser.add_argument(
        "--retries",
        type=int,
        default=DEFAULT_RETRIES,
        help="Quantidade de novas tentativas apos a primeira requisicao.",
    )
    return parser.parse_args()


def load_nfse_items(path: Path) -> list[dict[str, Any]]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise RuntimeError(f"Arquivo JSON nao encontrado: {path}") from exc
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Arquivo JSON invalido: {path}") from exc

    if not isinstance(data, list):
        raise RuntimeError("O arquivo JSON deve conter uma lista de NFS-e.")

    items = [item for item in data if isinstance(item, dict)]
    if not items:
        raise RuntimeError("Nenhuma NFS-e valida encontrada no JSON.")

    return items


def digits_only(value: str) -> str:
    return "".join(ch for ch in value if ch.isdigit())


def require_string(item: dict[str, Any], key: str) -> str:
    value = item.get(key)
    if not isinstance(value, str) or not value.strip():
        raise RuntimeError(f"Campo obrigatorio ausente ou invalido: {key}")
    return value.strip()


def build_visualizacao_url(cnpj: str, codigo: str, numero: str) -> str:
    return f"{BASE_URL}/externo/nfse/visualizar/{cnpj}/{codigo}/{numero}"


def build_xml_url(cnpj: str, codigo: str, numero: str) -> str:
    return f"{BASE_URL}/externo/nfse/xml/{cnpj}/{codigo}/{numero}"


def resolve_resource_url(url: str) -> str:
    url = url.strip()
    if url.startswith("//"):
        return f"https:{url}"
    if url.startswith("http://") or url.startswith("https://"):
        return url
    if url.startswith("/"):
        return f"{BASE_URL}{url}"
    return f"{BASE_URL}/{url.lstrip('/')}"


def shorten_url(url: str, max_length: int = 120) -> str:
    if len(url) <= max_length:
        return url
    return f"{url[:max_length - 3]}..."


def backoff_for_retry(retry_index: int) -> int:
    if retry_index < len(RETRY_BACKOFF_SECONDS):
        return RETRY_BACKOFF_SECONDS[retry_index]
    return RETRY_BACKOFF_SECONDS[-1]


def fetch_bytes(url: str, *, stage: str, timeout: int, retries: int) -> bytes:
    request = Request(url, headers={"User-Agent": USER_AGENT})
    attempts = max(retries, 0) + 1
    last_error: RuntimeError | None = None

    for attempt in range(1, attempts + 1):
        started_at = time.monotonic()
        try:
            with urlopen(request, timeout=timeout) as response:
                return response.read()
        except HTTPError as exc:
            elapsed = time.monotonic() - started_at
            details = exc.read().decode("utf-8", errors="replace").strip()
            last_error = RuntimeError(
                f"Erro {stage}: HTTP {exc.code} em {shorten_url(url)} "
                f"apos {elapsed:.1f}s. {details[:300]}"
            )
            break
        except (TimeoutError, URLError) as exc:
            elapsed = time.monotonic() - started_at
            reason = exc.reason if isinstance(exc, URLError) else str(exc)
            last_error = RuntimeError(
                f"Erro {stage}: {type(exc).__name__} em {shorten_url(url)} "
                f"apos {elapsed:.1f}s. {reason}"
            )
            if attempt >= attempts:
                break
            backoff = backoff_for_retry(attempt - 1)
            print(
                f"Nova tentativa de {stage} ({attempt + 1}/{attempts}) em {backoff}s "
                f"para {shorten_url(url)}",
                file=sys.stderr,
            )
            time.sleep(backoff)

    if last_error is not None:
        raise last_error

    raise RuntimeError(f"Erro {stage}: falha desconhecida ao acessar {shorten_url(url)}.")


def fetch_text(url: str, *, stage: str, timeout: int, retries: int) -> str:
    return fetch_bytes(url, stage=stage, timeout=timeout, retries=retries).decode(
        "utf-8", errors="replace"
    )


def detect_content_type(url: str, content: bytes) -> str:
    lowered = url.lower()
    if lowered.endswith(".png"):
        return "image/png"
    if lowered.endswith(".svg"):
        return "image/svg+xml"
    if lowered.endswith(".gif"):
        return "image/gif"
    if lowered.endswith(".webp"):
        return "image/webp"
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if content.startswith((b"GIF87a", b"GIF89a")):
        return "image/gif"
    if content.startswith(b"RIFF") and b"WEBP" in content[:16]:
        return "image/webp"
    if content.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if content.lstrip().startswith(b"<svg"):
        return "image/svg+xml"
    return "application/octet-stream"


def stylesheet_urls_from_html(html: str) -> list[str]:
    urls: list[str] = []
    seen: set[str] = set()

    for href in LINK_STYLESHEET_RE.findall(html):
        href = href.strip()
        if not href:
            continue
        url = resolve_resource_url(href)

        if url not in seen:
            urls.append(url)
            seen.add(url)

    return urls


def inline_stylesheets(html: str, *, timeout: int, retries: int) -> str:
    stylesheet_map: dict[str, str] = {}

    for url in stylesheet_urls_from_html(html):
        css = fetch_text(url, stage="css", timeout=timeout, retries=retries)
        stylesheet_map[url] = f"<style>\n{css}\n</style>"

    def replace_link(match: re.Match[str]) -> str:
        href = match.group(1).strip()
        url = resolve_resource_url(href)
        return stylesheet_map.get(url, match.group(0))

    return LINK_STYLESHEET_RE.sub(replace_link, html)


def inline_images(html: str, *, timeout: int, retries: int) -> str:
    image_map: dict[str, str] = {}

    for src in IMG_SRC_RE.findall(html):
        original_src = src[1].strip()
        if not original_src or original_src.startswith("data:"):
            continue

        url = resolve_resource_url(original_src)
        if url in image_map:
            continue

        content = fetch_bytes(url, stage="imagem", timeout=timeout, retries=retries)
        content_type = detect_content_type(url, content)
        encoded = base64.b64encode(content).decode("ascii")
        image_map[url] = f"data:{content_type};base64,{encoded}"

    def replace_img(match: re.Match[str]) -> str:
        prefix, raw_src, suffix = match.groups()
        src = raw_src.strip()
        if not src or src.startswith("data:"):
            return match.group(0)
        url = resolve_resource_url(src)
        return f"{prefix}{image_map.get(url, src)}{suffix}"

    return IMG_SRC_RE.sub(replace_img, html)


def prepare_html_for_pdf(html: str, *, timeout: int, retries: int) -> str:
    html = inline_stylesheets(html, timeout=timeout, retries=retries)
    html = inline_images(html, timeout=timeout, retries=retries)
    if "<head>" in html:
        return html.replace("<head>", f'<head><base href="{BASE_URL}/">', 1)
    return f'<base href="{BASE_URL}/">{html}'


def save_xml(url: str, target_file: Path, *, timeout: int, retries: int) -> None:
    target_file.write_bytes(fetch_bytes(url, stage="xml", timeout=timeout, retries=retries))


def window_contains_certificate_prompt(window: Any) -> bool:
    try:
        title = window.window_text().strip().lower()
    except Exception:
        title = ""

    if CERTIFICATE_DIALOG_TEXT in title:
        return True

    try:
        descendants = window.descendants()
    except Exception:
        return False

    for control in descendants:
        try:
            text = control.window_text().strip().lower()
        except Exception:
            continue
        if CERTIFICATE_DIALOG_TEXT in text:
            return True

    return False


def dismiss_certificate_dialog(window: Any) -> bool:
    buttons_to_try = ("Cancelar", "Fechar", "OK")

    for button_title in buttons_to_try:
        try:
            button = window.child_window(title=button_title, control_type="Button")
            if button.exists(timeout=0.2):
                button.click_input()
                return True
        except Exception:
            continue

    try:
        window.set_focus()
        window.type_keys("{ESC}")
        return True
    except Exception:
        return False


def close_certificate_dialogs() -> int:
    closed = 0
    for window in Desktop(backend="uia").windows():
        if not window_contains_certificate_prompt(window):
            continue
        if dismiss_certificate_dialog(window):
            closed += 1
    return closed


class CertificateDialogCloser:
    def __init__(self) -> None:
        self._stop_event = threading.Event()
        self._thread = threading.Thread(target=self._run, daemon=True)

    def start(self) -> None:
        close_certificate_dialogs()
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        self._thread.join(timeout=2)
        close_certificate_dialogs()

    def _run(self) -> None:
        while not self._stop_event.is_set():
            try:
                close_certificate_dialogs()
            except Exception:
                pass
            self._stop_event.wait(CERTIFICATE_DIALOG_POLL_INTERVAL)


def launch_browser(playwright: Playwright, headless: bool) -> tuple[Browser, BrowserContext, Page]:
    browser = playwright.chromium.launch(channel="chrome", headless=headless)
    context = browser.new_context()
    page = context.new_page()
    page.set_default_navigation_timeout(0)
    return browser, context, page


def ensure_print_layout(page: Page) -> None:
    page.emulate_media(media="print")
    hidden_print_visible = page.evaluate(
        """
        () => Array.from(document.querySelectorAll('.hidden-print')).some((element) => {
            const style = window.getComputedStyle(element);
            return style.display !== 'none' && style.visibility !== 'hidden';
        })
        """
    )
    if hidden_print_visible:
        raise RuntimeError(
            "Layout de impressao invalido: elementos com 'hidden-print' continuam visiveis."
        )


def save_pdf(
    page: Page,
    html: str,
    target_file: Path,
    *,
    timeout: int,
    retries: int,
) -> None:
    page.set_content(
        prepare_html_for_pdf(html, timeout=timeout, retries=retries),
        wait_until="commit",
    )
    page.wait_for_timeout(3000)
    ensure_print_layout(page)
    page.pdf(
        path=str(target_file),
        format="A4",
        print_background=True,
        margin={"top": "8mm", "right": "8mm", "bottom": "8mm", "left": "8mm"},
    )


def ensure_output_dirs(base_dir: Path) -> tuple[Path, Path]:
    xml_dir = base_dir / "xml"
    pdf_dir = base_dir / "pdf"
    xml_dir.mkdir(parents=True, exist_ok=True)
    pdf_dir.mkdir(parents=True, exist_ok=True)
    return xml_dir, pdf_dir


def file_stem(numero: str, codigo: str) -> str:
    return f"{numero}_{codigo}"


def pdf_file_name(numero: str, codigo: str) -> str:
    return f"NFS-e {numero} {codigo} _ WebISS\u00AE.pdf"


def process_items(
    items: list[dict[str, Any]],
    output_dir: Path,
    file_format: str,
    headless: bool,
    http_timeout: int,
    retries: int,
) -> tuple[int, int]:
    xml_dir, pdf_dir = ensure_output_dirs(output_dir)
    successes = 0
    failures = 0

    with sync_playwright() as playwright:
        browser = context = page = None
        certificate_dialog_closer = CertificateDialogCloser()
        needs_pdf = file_format in {"pdf", "ambos"}

        if needs_pdf:
            certificate_dialog_closer.start()
            browser, context, page = launch_browser(playwright, headless=headless)

        try:
            for index, item in enumerate(items, start=1):
                cnpj = digits_only(require_string(item, "cCNPJEmissor"))
                codigo = require_string(item, "cCodigoVerifNFSe")
                numero = require_string(item, "nNumeroNFSe")
                stem = file_stem(numero, codigo)

                print(f"[{index}/{len(items)}] Processando NFSe {numero} ({codigo})...")
                try:
                    if file_format in {"xml", "ambos"}:
                        xml_url = build_xml_url(cnpj, codigo, numero)
                        save_xml(
                            xml_url,
                            xml_dir / f"{stem}.xml",
                            timeout=http_timeout,
                            retries=retries,
                        )

                    if needs_pdf and page is not None:
                        visualizacao_url = build_visualizacao_url(cnpj, codigo, numero)
                        html = fetch_text(
                            visualizacao_url,
                            stage="html",
                            timeout=http_timeout,
                            retries=retries,
                        )
                        save_pdf(
                            page,
                            html,
                            pdf_dir / pdf_file_name(numero, codigo),
                            timeout=http_timeout,
                            retries=retries,
                        )
                except RuntimeError as exc:
                    failures += 1
                    print(
                        f"[{index}/{len(items)}] Falha na NFSe {numero} ({codigo}): {exc}",
                        file=sys.stderr,
                    )
                    continue

                successes += 1
        finally:
            if context is not None:
                context.close()
            if browser is not None:
                browser.close()
            if needs_pdf:
                certificate_dialog_closer.stop()

    return successes, failures


def main() -> int:
    args = parse_args()
    input_path = Path(args.input).resolve()
    output_dir = Path(args.output_dir).resolve()

    try:
        items = load_nfse_items(input_path)
        if args.limit is not None:
            items = items[: max(args.limit, 0)]
        if not items:
            raise RuntimeError("Nenhuma NFS-e selecionada para processamento.")
        successes, failures = process_items(
            items=items,
            output_dir=output_dir,
            file_format=args.format,
            headless=args.headless,
            http_timeout=max(args.http_timeout, 1),
            retries=max(args.retries, 0),
        )
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    print(
        f"Concluido. Sucessos: {successes} | Falhas: {failures} | "
        f"Saida: {output_dir}"
    )
    return 0 if failures == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
