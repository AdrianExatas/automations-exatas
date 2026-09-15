#!/usr/bin/env python3
"""Extrai prints de cliques guiados pela transcricão (timestamps) + OCR.

ARQUIVADO: feature fora do fluxo ativo. Ver archive/captura-prints/README.md.

Modo principal (--transcript):
1. Carrega segments.json (sidecar do Whisper) ou o caminho .segments.json.
2. Deriva acoes de UI a partir de falas operacionais.
3. Amostra frames na janela da fala e localiza o alvo por OCR.
4. Fallback: cursor por movimento so dentro da janela da fala.
5. Exporta PNG com o circulo de referencias/click_circle.png.

Modo legado (sem transcricão): heuristica cursor parado + mudanca de UI.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path

import cv2
import numpy as np

_MARKER: np.ndarray | None = None
_OCR = None

# Verbos / pistas de acao operacional (PT).
_ACTION_RE = re.compile(
    r"\b("
    r"clic(?:ar|a|amos|amos|amos)|"
    r"vir(?:\s+em|\s+at[eé])|"
    r"copiar|copie|copiamos|"
    r"filtrar|filtre|filtramos|"
    r"salvar|salve|salvamos|"
    r"criar|crie|criamos|"
    r"fechar|feche|fechamos|"
    r"definir|defina|definimos|"
    r"pesquisar|pesquise|pesquisamos|"
    r"colocar|coloque|colocamos|"
    r"selecionar|selecione|"
    r"abrir|abra|"
    r"usar|usamos|"
    r"alterar|altere|"
    r"setinha|"
    r"menu"
    r")\b",
    re.IGNORECASE,
)

_INTRO_RE = re.compile(
    r"(no\s+v[ií]deo\s+de\s+hoje|a\s+gente\s+vai\s+ensinar|"
    r"ol[aá],?\s+no\s+v[ií]deo|vai\s+ensinar\s+como)",
    re.IGNORECASE,
)

# Alvos conhecidos de UI (padrao falado -> frases OCR candidatas).
_TARGET_RULES: list[tuple[re.Pattern[str], list[str], str]] = [
    (
        re.compile(r"retorno\s+ao\s+cliente|retornar\s+ao\s+cliente", re.I),
        ["Retorno ao cliente"],
        "nome_modelo",
    ),
    (
        re.compile(r"tarefas\s+e\s+projetos", re.I),
        ["Tarefas e Projetos", "Tarefas e projetos", "Tarefas"],
        "menu_tarefas",
    ),
    (
        re.compile(r"usando\s+o\s+modelo|tarefas\s+usando|setinha", re.I),
        ["Tarefas usando o modelo", "usando o modelo", "Criar"],
        "criar_modelo",
    ),
    (
        re.compile(r"filtro|pesquis", re.I),
        ["Pesquisar", "Filtro", "Modelos de Tarefa"],
        "filtro",
    ),
    (
        re.compile(r"c[oó]pia\s+dessa\s+tarefa|fazer\s+uma\s+c[oó]pia|c[oó]pia\s+da", re.I),
        ["Copiar", "Criar com base", "modelo"],
        "copiar_tarefa",
    ),
    (
        re.compile(r"\bteste\b|alterar\s+o\s+nome\s+do\s+cliente", re.I),
        ["TESTE", "Teste"],
        "renomear",
    ),
    (
        re.compile(
            r"toda\s+semana|ter[cç]as?-feiras|every\s+week|recorr[eê]ncia\s+ela\s+finaliza",
            re.I,
        ),
        ["Recurrence", "Every week", "Recorrência", "Tuesday", "terça"],
        "recorrencia",
    ),
    (
        re.compile(r"27\s+de\s+agosto|inicia\s+no\s+dia\s+\d+", re.I),
        ["27", "agosto", "Start date", "Data de início"],
        "data_inicio",
    ),
    (
        re.compile(r"salvar\s+e\s+criar|salva\s+e\s+cria|clica\s+em\s+salvar", re.I),
        ["Salvar e criar", "Criar"],
        "salvar_criar",
    ),
    (
        re.compile(r"fechar\s+aqui|pode\s+fechar|feche\s+aqui", re.I),
        ["Fechar", "Cancelar", "Close", "×"],
        "fechar",
    ),
    (
        re.compile(r"filtrar\s+ela|pode\s+filtrar|filtrar\s+ela", re.I),
        ["Acompanhamento", "administrativo", "judicial", "Pesquisar"],
        "filtrar_acompanhamento",
    ),
]


def _safe_print(msg: str) -> None:
    try:
        print(msg, flush=True)
    except UnicodeEncodeError:
        print(msg.encode("ascii", "replace").decode("ascii"), flush=True)


def _project_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _slugify(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-")
    return s or "video"


def _norm(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _marker_image() -> np.ndarray:
    global _MARKER
    if _MARKER is not None:
        return _MARKER
    path = _project_root() / "referencias" / "click_circle.png"
    img = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
    if img is None:
        raise RuntimeError(f"Marcador nao encontrado: {path}")
    if img.ndim == 2:
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGRA)
    elif img.shape[2] == 3:
        img = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
    _MARKER = img
    return _MARKER


def _overlay_bgra(dst: np.ndarray, overlay: np.ndarray, cx: int, cy: int) -> None:
    oh, ow = overlay.shape[:2]
    x0, y0 = cx - ow // 2, cy - oh // 2
    x1, y1 = x0 + ow, y0 + oh
    dh, dw = dst.shape[:2]
    sx0, sy0 = max(0, -x0), max(0, -y0)
    sx1, sy1 = ow - max(0, x1 - dw), oh - max(0, y1 - dh)
    dx0, dy0 = max(0, x0), max(0, y0)
    if sx1 <= sx0 or sy1 <= sy0:
        return
    src = overlay[sy0:sy1, sx0:sx1]
    roi = dst[dy0 : dy0 + (sy1 - sy0), dx0 : dx0 + (sx1 - sx0)]
    alpha = src[:, :, 3:4].astype(np.float32) / 255.0
    blended = src[:, :, :3].astype(np.float32) * alpha + roi.astype(np.float32) * (1.0 - alpha)
    roi[:] = blended.astype(np.uint8)


def _annotate(frame: np.ndarray, point: tuple[int, int]) -> np.ndarray:
    out = frame.copy()
    _overlay_bgra(out, _marker_image(), int(point[0]), int(point[1]))
    return out


def _motion_cursor(
    prev: np.ndarray,
    curr: np.ndarray,
    taskbar: int,
) -> tuple[tuple[int, int] | None, float]:
    g0 = cv2.cvtColor(prev, cv2.COLOR_BGR2GRAY)
    g1 = cv2.cvtColor(curr, cv2.COLOR_BGR2GRAY)
    h, _w = g0.shape
    g0 = g0[: h - taskbar, :]
    g1 = g1[: h - taskbar, :]
    diff = cv2.absdiff(g0, g1)
    diff = cv2.GaussianBlur(diff, (5, 5), 0)
    _, thr = cv2.threshold(diff, 18, 255, cv2.THRESH_BINARY)
    thr = cv2.morphologyEx(thr, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    contours, _ = cv2.findContours(thr, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    best = None
    for c in contours:
        area = cv2.contourArea(c)
        if area < 25 or area > 1800:
            continue
        x, y, bw, bh = cv2.boundingRect(c)
        if bw > 120 or bh > 120:
            continue
        tip = (x + max(2, bw // 5), y + max(2, bh // 5))
        score = float(area)
        if best is None or score > best[0]:
            best = (score, tip, float(np.mean(diff[y : y + bh, x : x + bw])))
    if best is None:
        return None, 0.0
    return best[1], best[2]


def _local_change(
    pre: np.ndarray,
    post: np.ndarray,
    center: tuple[int, int],
    radius: int = 160,
) -> float:
    g0 = cv2.cvtColor(pre, cv2.COLOR_BGR2GRAY)
    g1 = cv2.cvtColor(post, cv2.COLOR_BGR2GRAY)
    h, w = g0.shape
    x, y = center
    x0, x1 = max(0, x - radius), min(w, x + radius)
    y0, y1 = max(0, y - radius), min(h, y + radius)
    if x1 <= x0 or y1 <= y0:
        return 0.0
    return float(np.mean(cv2.absdiff(g0[y0:y1, x0:x1], g1[y0:y1, x0:x1])))


def _global_change(pre: np.ndarray, post: np.ndarray, taskbar: int) -> float:
    g0 = cv2.cvtColor(pre, cv2.COLOR_BGR2GRAY)
    g1 = cv2.cvtColor(post, cv2.COLOR_BGR2GRAY)
    h = g0.shape[0]
    return float(np.mean(cv2.absdiff(g0[: h - taskbar, :], g1[: h - taskbar, :])))


def _similar(a: np.ndarray, b: np.ndarray, threshold: float = 0.94) -> bool:
    sa = cv2.resize(a, (160, 90))
    sb = cv2.resize(b, (160, 90))
    ga = cv2.cvtColor(sa, cv2.COLOR_BGR2GRAY).astype(np.float32)
    gb = cv2.cvtColor(sb, cv2.COLOR_BGR2GRAY).astype(np.float32)
    ga = (ga - ga.mean()) / (ga.std() + 1e-6)
    gb = (gb - gb.mean()) / (gb.std() + 1e-6)
    return float(np.mean(ga * gb)) >= threshold


# ---------------------------------------------------------------------------
# Transcricao / acoes
# ---------------------------------------------------------------------------


def _resolve_segments_path(transcript: Path) -> Path:
    if transcript.suffix.lower() == ".json":
        return transcript
    name = transcript.name
    m = re.match(r"^(.+) \(transcribed on .+\)\.txt$", name, re.IGNORECASE)
    stem = m.group(1) if m else transcript.stem
    candidate = transcript.parent / f"{stem}.segments.json"
    if candidate.is_file():
        return candidate
    raise FileNotFoundError(
        f"Sidecar de segmentos nao encontrado: {candidate}. "
        "Retranscreva com transcribe_media.py (gera .segments.json)."
    )


def _load_segments(path: Path) -> list[dict]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, list):
        return data
    segs = data.get("segments")
    if not isinstance(segs, list):
        raise ValueError(f"Formato invalido em {path}: falta 'segments'")
    return segs


def _extract_actions(segments: list[dict], min_gap: float = 2.0) -> list[dict]:
    """Deriva acoes de print a partir de falas operacionais.

    Prioriza regras de UI conhecidas (uma por tipo, na ordem da fala).
    Ignora introducao e falas genericas sem alvo de tela.
    """
    actions: list[dict] = []
    used_acoes: set[str] = set()

    for seg in segments:
        text = str(seg.get("text") or "").strip()
        if not text:
            continue
        if _INTRO_RE.search(text):
            continue

        for pattern, queries, acao in _TARGET_RULES:
            if acao in used_acoes:
                continue
            if not pattern.search(text):
                continue
            actions.append(
                {
                    "acao": acao,
                    "alvo": queries[0],
                    "queries": queries,
                    "text": text,
                    "start": float(seg["start"]),
                    "end": float(seg["end"]),
                }
            )
            used_acoes.add(acao)
            break

    # Junta "tarefas" (seg N) + "e projetos" (seg N+1) se menu ainda nao capturado
    if "menu_tarefas" not in used_acoes:
        for i, seg in enumerate(segments):
            text = str(seg.get("text") or "")
            nxt = str(segments[i + 1].get("text") or "") if i + 1 < len(segments) else ""
            joined = f"{text} {nxt}"
            if re.search(r"tarefas\s+e\s+projetos|vir\s+em\s+tarefas", joined, re.I):
                actions.append(
                    {
                        "acao": "menu_tarefas",
                        "alvo": "Tarefas e Projetos",
                        "queries": ["Tarefas e Projetos", "Tarefas e projetos"],
                        "text": joined.strip(),
                        "start": float(seg["start"]),
                        "end": float(segments[min(i + 1, len(segments) - 1)]["end"]),
                    }
                )
                break

    actions.sort(key=lambda x: x["start"])
    # Garante salvar_criar mesmo se data_inicio pegou o mesmo segmento
    for seg in segments:
        text = str(seg.get("text") or "")
        if re.search(r"salvar\s+e\s+criar", text, re.I) and "salvar_criar" not in {
            a["acao"] for a in actions
        }:
            actions.append(
                {
                    "acao": "salvar_criar",
                    "alvo": "Salvar e criar",
                    "queries": ["Salvar e criar", "Criar", "Save"],
                    "text": text,
                    "start": float(seg["start"]),
                    "end": float(seg["end"]),
                }
            )
    actions.sort(key=lambda x: x["start"])

    filtered: list[dict] = []
    last_t = -1e9
    for a in actions:
        if a["start"] - last_t < min_gap and filtered and filtered[-1]["acao"] == a["acao"]:
            continue
        filtered.append(a)
        last_t = a["start"]
    return filtered


# ---------------------------------------------------------------------------
# OCR
# ---------------------------------------------------------------------------


def _get_ocr():
    global _OCR
    if _OCR is not None:
        return _OCR
    try:
        from rapidocr_onnxruntime import RapidOCR
    except ImportError as exc:
        raise SystemExit(
            "Pacote rapidocr-onnxruntime nao instalado. Execute:\n"
            "  pip install -r skills/gerar-pop-it/scripts/requirements-prints.txt\n"
            "Use Python 3.10–3.12 (RapidOCR nao publica wheel para 3.13+)."
        ) from exc
    _OCR = RapidOCR()
    return _OCR


def _ocr_boxes(frame: np.ndarray, scale: float = 0.7) -> list[dict]:
    """Retorna [{text, center, box, score}] — OCR em resolucao reduzida."""
    engine = _get_ocr()
    h, w = frame.shape[:2]
    if scale < 0.99:
        small = cv2.resize(frame, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    else:
        small = frame
        scale = 1.0
    rgb = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)
    result, _ = engine(rgb)
    boxes: list[dict] = []
    if not result:
        return boxes
    inv = 1.0 / scale
    for item in result:
        if len(item) < 3:
            continue
        pts, text, score = item[0], item[1], item[2]
        if not text or float(score) < 0.4:
            continue
        xs = [p[0] * inv for p in pts]
        ys = [p[1] * inv for p in pts]
        cx = int(sum(xs) / len(xs))
        cy = int(sum(ys) / len(ys))
        boxes.append(
            {
                "text": str(text),
                "norm": _norm(str(text)),
                "center": (cx, cy),
                "box": (int(min(xs)), int(min(ys)), int(max(xs)), int(max(ys))),
                "score": float(score),
            }
        )
    return boxes


def _token_overlap(a: str, b: str) -> float:
    ta = set(a.split())
    tb = set(b.split())
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / max(len(ta), len(tb))


def _find_target_in_boxes(
    boxes: list[dict],
    queries: list[str],
) -> tuple[tuple[int, int], str, float] | None:
    best: tuple[float, tuple[int, int], str] | None = None
    for q in queries:
        nq = _norm(q)
        if len(nq) < 2:
            continue
        q_tokens = nq.split()
        short = len(nq) <= 6
        for b in boxes:
            bn = b["norm"]
            if not bn:
                continue
            # Preferir match completo / substring longa (evita "Cliente" sozinho)
            if nq == bn:
                score = b["score"] + 3.0 + 0.1 * len(nq)
            elif nq in bn:
                score = b["score"] + 2.0 + 0.05 * len(nq)
            elif (not short) and bn in nq and len(bn) >= max(4, int(0.6 * len(nq))):
                score = b["score"] + 1.2 + 0.03 * len(bn)
            else:
                ov = _token_overlap(nq, bn)
                if short:
                    # Queries curtas (Criar, Teste): so match quase exato
                    if ov < 0.99 and nq not in bn and bn not in nq:
                        continue
                if ov < 0.6 and not (len(q_tokens) >= 2 and set(q_tokens) <= set(bn.split())):
                    continue
                score = b["score"] * ov
            # Desempate: mais a esquerda / mais acima (titulo principal vs sidebar)
            score -= b["center"][0] / 100000.0
            score -= b["center"][1] / 200000.0
            if best is None or score > best[0]:
                best = (score, b["center"], b["text"])
    if best is None:
        return None
    return best[1], best[2], best[0]


# ---------------------------------------------------------------------------
# Extracao guiada por transcricão
# ---------------------------------------------------------------------------


def _sample_window_frames(
    cap: cv2.VideoCapture,
    fps: float,
    t0: float,
    t1: float,
    *,
    max_samples: int = 5,
) -> list[tuple[float, np.ndarray]]:
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    duration = total / fps if fps else 0.0
    t0 = max(0.0, t0)
    t1 = min(duration, max(t0 + 0.25, t1))
    if max_samples <= 1:
        times = [t0]
    else:
        times = [t0 + (t1 - t0) * i / (max_samples - 1) for i in range(max_samples)]
    frames: list[tuple[float, np.ndarray]] = []
    for t in times:
        idx = int(t * fps)
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ok, frame = cap.read()
        if not ok:
            continue
        frames.append((idx / fps, frame))
    return frames


def _cursor_in_window(
    frames: list[tuple[float, np.ndarray]],
) -> tuple[tuple[int, int], float] | None:
    if len(frames) < 2:
        return None
    taskbar = max(48, int(frames[0][1].shape[0] * 0.08))
    last_pos = None
    best_still: tuple[float, tuple[int, int], float] | None = None
    prev = frames[0][1]
    for i in range(1, len(frames)):
        t, frame = frames[i]
        cursor, energy = _motion_cursor(prev, frame, taskbar)
        if cursor is not None and energy >= 2.0:
            last_pos = cursor
        if last_pos is not None and energy < 8.0:
            score = 10.0 - energy
            if i + 1 < len(frames):
                score += 0.1 * _local_change(frame, frames[i + 1][1], last_pos)
            if best_still is None or score > best_still[0]:
                best_still = (score, last_pos, t)
        prev = frame
    if best_still is None and last_pos is not None:
        return last_pos, frames[-1][0]
    if best_still is None:
        return None
    return best_still[1], best_still[2]


def extract_clicks_from_transcript(
    video_path: Path,
    output_dir: Path,
    segments_path: Path,
    *,
    pre_pad: float = 0.3,
    post_pad: float = 1.5,
    sample_fps: float = 4.0,
    max_frames: int = 30,
    annotate: bool = True,
    save_clean: bool = True,
) -> dict:
    segments = _load_segments(segments_path)
    actions = _extract_actions(segments)
    print(f"[info] segmentos={len(segments)} acoes={len(actions)}", flush=True)
    for a in actions:
        print(
            f"  - {a['start']:.1f}-{a['end']:.1f}s [{a['acao']}] alvo={a['alvo']!r}",
            flush=True,
        )

    # sample_fps legado -> numero de amostras por janela
    max_samples = max(5, min(8, int(round(sample_fps)) + 2))

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise RuntimeError(f"Nao foi possivel abrir o video: {video_path}")
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    duration = total / fps if fps else 0.0

    output_dir.mkdir(parents=True, exist_ok=True)
    clean_dir = output_dir / "clean"
    if save_clean:
        clean_dir.mkdir(parents=True, exist_ok=True)

    # Limpa prints antigos do mesmo diretorio
    for old in output_dir.glob("*.png"):
        old.unlink(missing_ok=True)
    if clean_dir.is_dir():
        for old in clean_dir.glob("*.png"):
            old.unlink(missing_ok=True)

    entries: list[dict] = []
    kept: list[np.ndarray] = []

    for i, action in enumerate(actions):
        if len(entries) >= max_frames:
            break
        next_start = actions[i + 1]["start"] if i + 1 < len(actions) else duration
        t0 = action["start"] - pre_pad
        t1 = min(action["end"] + post_pad, next_start + 0.2)
        window = _sample_window_frames(cap, fps, t0, t1, max_samples=max_samples)
        if not window:
            print(f"[skip] sem frames @ {action['start']:.1f}s", flush=True)
            continue

        print(
            f"[ocr] [{action['acao']}] {len(window)} frames @ {t0:.1f}-{t1:.1f}s",
            flush=True,
        )
        best_hit: dict | None = None
        for t, frame in window:
            boxes = _ocr_boxes(frame)
            hit = _find_target_in_boxes(boxes, action["queries"])
            if hit is None:
                continue
            point, matched_text, score = hit
            early_bonus = max(0.0, 2.0 - abs(t - action["start"]))
            total_score = score + early_bonus
            if best_hit is None or total_score > best_hit["score"]:
                best_hit = {
                    "t": t,
                    "frame": frame,
                    "pos": point,
                    "matched": matched_text,
                    "score": total_score,
                    "method": "ocr",
                }

        if best_hit is None:
            fallback = _cursor_in_window(window)
            if fallback is None:
                print(
                    f"[skip] OCR/cursor falhou [{action['acao']}] @ {action['start']:.1f}s",
                    flush=True,
                )
                continue
            pos, t_fb = fallback
            frame = min(window, key=lambda x: abs(x[0] - t_fb))[1]
            best_hit = {
                "t": t_fb,
                "frame": frame,
                "pos": pos,
                "matched": None,
                "score": 0.0,
                "method": "cursor",
            }

        frame = best_hit["frame"]
        # Cada acao da fala gera um print; nao descartar por similaridade visual.

        n = len(entries) + 1
        name = f"{n:03d}.png"
        if save_clean:
            cv2.imwrite(str(clean_dir / name), frame)
        if annotate:
            cv2.imwrite(str(output_dir / name), _annotate(frame, best_hit["pos"]))
        else:
            cv2.imwrite(str(output_dir / name), frame)
        kept.append(frame)
        entry = {
            "index": n,
            "t_sec": round(float(best_hit["t"]), 3),
            "t_fala_start": round(float(action["start"]), 3),
            "t_fala_end": round(float(action["end"]), 3),
            "acao": action["acao"],
            "alvo": action["alvo"],
            "matched_text": best_hit.get("matched"),
            "metodo": best_hit["method"],
            "score": round(float(best_hit["score"]), 3),
            "arquivo": name,
            "arquivo_clean": f"clean/{name}" if save_clean else None,
            "cursor_xy": [int(best_hit["pos"][0]), int(best_hit["pos"][1])],
            "annotated": annotate,
            "fala": action["text"],
        }
        entries.append(entry)
        _safe_print(
            f"[ok] {name} [{action['acao']}] metodo={best_hit['method']} "
            f"@ {best_hit['t']:.2f}s xy={entry['cursor_xy']} "
            f"match={best_hit.get('matched')!r}"
        )

    cap.release()

    manifest = {
        "video": str(video_path),
        "duration_sec": round(duration, 3),
        "method": "transcript-ocr+cursor-fallback",
        "segments_path": str(segments_path),
        "actions": [
            {
                "acao": a["acao"],
                "alvo": a["alvo"],
                "start": a["start"],
                "end": a["end"],
                "text": a["text"],
            }
            for a in actions
        ],
        "count": len(entries),
        "frames": entries,
    }
    (output_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"[done] {len(entries)} print(s) -> {output_dir}", flush=True)
    print(
        "EXTRACT_JSON:"
        + json.dumps({"output_dir": str(output_dir), "count": len(entries)}, ensure_ascii=False)
    )
    return manifest


# ---------------------------------------------------------------------------
# Modo legado (sem transcricão)
# ---------------------------------------------------------------------------


def extract_clicks(
    video_path: Path,
    output_dir: Path,
    *,
    target_fps: float = 15.0,
    min_gap: float = 1.2,
    still_sec: float = 0.25,
    look_ahead_sec: float = 0.45,
    local_thr: float = 8.0,
    max_frames: int = 30,
    annotate: bool = True,
    save_clean: bool = True,
) -> dict:
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise RuntimeError(f"Nao foi possivel abrir o video: {video_path}")

    src_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    duration = total / src_fps if src_fps else 0.0
    step = max(1, int(round(src_fps / target_fps)))
    still_n = max(2, int(round(still_sec * target_fps)))
    ahead_n = max(2, int(round(look_ahead_sec * target_fps)))

    print(
        f"[info] video={video_path.name} {duration:.1f}s fps={src_fps:.1f} "
        f"sample_every={step} still_n={still_n} ahead_n={ahead_n} (legado)",
        flush=True,
    )

    meta: list[dict] = []
    prev = None
    idx = 0
    taskbar = 0
    last_pos = None
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if idx % step != 0:
            idx += 1
            continue
        if taskbar == 0:
            taskbar = max(48, int(frame.shape[0] * 0.08))
        t = idx / src_fps
        energy = 0.0
        moving = False
        if prev is not None:
            cursor, energy = _motion_cursor(prev, frame, taskbar)
            if cursor is not None and energy >= 2.0:
                last_pos = cursor
                moving = True
        meta.append(
            {
                "frame_idx": idx,
                "t": t,
                "pos": last_pos,
                "moving": moving,
                "energy": energy,
            }
        )
        prev = frame
        idx += 1
    cap.release()

    if len(meta) < still_n + ahead_n + 2:
        raise RuntimeError("Video curto demais.")

    candidate_idxs: list[dict] = []
    i = still_n
    while i < len(meta) - ahead_n:
        window = meta[i - still_n : i + 1]
        if any(w["pos"] is None for w in window):
            i += 1
            continue
        moving_count = sum(1 for w in window if w["moving"])
        if moving_count > max(1, still_n // 3):
            i += 1
            continue
        pos = window[-1]["pos"]
        xs = [w["pos"][0] for w in window]
        ys = [w["pos"][1] for w in window]
        if max(xs) - min(xs) > 40 or max(ys) - min(ys) > 40:
            i += 1
            continue
        candidate_idxs.append(
            {"i": i, "t": meta[i]["t"], "pos": pos, "frame_idx": meta[i]["frame_idx"]}
        )
        i += ahead_n

    print(f"[info] pré-candidatos={len(candidate_idxs)}", flush=True)

    cap = cv2.VideoCapture(str(video_path))
    scored: list[dict] = []
    for c in candidate_idxs:
        i = c["i"]
        cap.set(cv2.CAP_PROP_POS_FRAMES, c["frame_idx"])
        ok_pre, pre = cap.read()
        if not ok_pre:
            continue
        best_local = 0.0
        best_peak_t = c["t"]
        for j in range(i + 1, i + ahead_n + 1):
            cap.set(cv2.CAP_PROP_POS_FRAMES, meta[j]["frame_idx"])
            ok_post, post = cap.read()
            if not ok_post:
                continue
            local = _local_change(pre, post, c["pos"])
            glob = _global_change(pre, post, taskbar)
            score = local + 0.25 * glob
            if score > best_local:
                best_local = score
                best_peak_t = meta[j]["t"]
        if best_local < local_thr:
            continue
        scored.append(
            {
                "t": c["t"],
                "pos": c["pos"],
                "score": best_local,
                "frame": pre,
                "peak_t": best_peak_t,
            }
        )
    cap.release()

    scored.sort(key=lambda c: c["t"])
    filtered: list[dict] = []
    last_t = -1e9
    for c in scored:
        if c["t"] - last_t < min_gap:
            if filtered and c["score"] > filtered[-1]["score"]:
                filtered[-1] = c
                last_t = c["t"]
            continue
        filtered.append(c)
        last_t = c["t"]

    if len(filtered) > max_frames:
        top = sorted(filtered, key=lambda c: c["score"], reverse=True)[:max_frames]
        filtered = sorted(top, key=lambda c: c["t"])

    print(f"[info] aprovados={len(filtered)}", flush=True)

    output_dir.mkdir(parents=True, exist_ok=True)
    clean_dir = output_dir / "clean"
    if save_clean:
        clean_dir.mkdir(parents=True, exist_ok=True)

    entries: list[dict] = []
    kept: list[np.ndarray] = []
    for c in filtered:
        frame = c["frame"]
        if any(_similar(frame, prev) for prev in kept):
            print(f"[skip] similar @ {c['t']:.2f}s", flush=True)
            continue
        n = len(entries) + 1
        name = f"{n:03d}.png"
        if save_clean:
            cv2.imwrite(str(clean_dir / name), frame)
        if annotate:
            cv2.imwrite(str(output_dir / name), _annotate(frame, c["pos"]))
        else:
            cv2.imwrite(str(output_dir / name), frame)
        kept.append(frame)
        entries.append(
            {
                "index": n,
                "t_sec": round(float(c["t"]), 3),
                "peak_t_sec": round(float(c["peak_t"]), 3),
                "score": round(float(c["score"]), 3),
                "arquivo": name,
                "arquivo_clean": f"clean/{name}" if save_clean else None,
                "cursor_xy": [int(c["pos"][0]), int(c["pos"][1])],
                "annotated": annotate,
                "metodo": "cursor",
            }
        )
        print(
            f"[ok] {name} @ {c['t']:.2f}s score={c['score']:.1f} cursor={c['pos']}",
            flush=True,
        )

    manifest = {
        "video": str(video_path),
        "duration_sec": round(duration, 3),
        "method": "cursor-motion-stillness+local-ui-change",
        "min_gap": min_gap,
        "still_sec": still_sec,
        "look_ahead_sec": look_ahead_sec,
        "local_thr": local_thr,
        "count": len(entries),
        "frames": entries,
    }
    (output_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"[done] {len(entries)} print(s) -> {output_dir}", flush=True)
    print(
        "EXTRACT_JSON:"
        + json.dumps({"output_dir": str(output_dir), "count": len(entries)}, ensure_ascii=False)
    )
    return manifest


def main() -> int:
    # Evita crash no console Windows com texto OCR nao-latin
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
    except Exception:
        pass
    root = _project_root()
    parser = argparse.ArgumentParser(
        description="Extrai prints de cliques (guiado por transcricão ou legado)"
    )
    parser.add_argument("--video", required=True)
    parser.add_argument("--output-dir", default="")
    parser.add_argument(
        "--transcript",
        default="",
        help="Caminho do .txt ou .segments.json (ativa modo guiado pela fala)",
    )
    parser.add_argument("--target-fps", type=float, default=15.0)
    parser.add_argument("--min-gap", type=float, default=1.2)
    parser.add_argument("--still-sec", type=float, default=0.25)
    parser.add_argument("--look-ahead-sec", type=float, default=0.45)
    parser.add_argument("--local-thr", type=float, default=8.0)
    parser.add_argument("--max-frames", type=int, default=30)
    parser.add_argument("--pre-pad", type=float, default=0.3)
    parser.add_argument("--post-pad", type=float, default=1.5)
    parser.add_argument("--sample-fps", type=float, default=4.0)
    parser.add_argument("--no-annotate", action="store_true")
    parser.add_argument("--no-clean", action="store_true")
    args = parser.parse_args()

    video = Path(args.video).expanduser().resolve()
    if not video.is_file():
        print(f"ERRO: video nao encontrado: {video}", file=sys.stderr)
        return 2
    out = (
        Path(args.output_dir).expanduser().resolve()
        if args.output_dir
        else root / "output" / "prints" / _slugify(video.stem)
    )
    try:
        if args.transcript:
            transcript = Path(args.transcript).expanduser().resolve()
            if not transcript.is_file():
                print(f"ERRO: transcricão nao encontrada: {transcript}", file=sys.stderr)
                return 2
            segments_path = _resolve_segments_path(transcript)
            extract_clicks_from_transcript(
                video,
                out,
                segments_path,
                pre_pad=args.pre_pad,
                post_pad=args.post_pad,
                sample_fps=args.sample_fps,
                max_frames=args.max_frames,
                annotate=not args.no_annotate,
                save_clean=not args.no_clean,
            )
        else:
            extract_clicks(
                video,
                out,
                target_fps=args.target_fps,
                min_gap=args.min_gap,
                still_sec=args.still_sec,
                look_ahead_sec=args.look_ahead_sec,
                local_thr=args.local_thr,
                max_frames=args.max_frames,
                annotate=not args.no_annotate,
                save_clean=not args.no_clean,
            )
    except Exception as exc:
        print(f"ERRO: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
