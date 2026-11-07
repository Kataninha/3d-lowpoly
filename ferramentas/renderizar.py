"""Renderiza páginas do kit (Three.js) em PNG com fundo transparente.

Uma foto:
    python3 ferramentas/renderizar.py ferramentas/foto-zeDesmonte.html saida.png "pose=acenar&emocao=feliz" [largura] [altura]

Várias fotos (usado por gerar_referencias.py):
    from renderizar import renderizar_lote
    renderizar_lote("ferramentas/foto-zeDesmonte.html", [("a.png", "pose=parado", 800, 1000), ...])

Requisitos: pip install playwright && playwright install chromium
"""
import functools
import http.server
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

RAIZ = Path(__file__).resolve().parent.parent  # raiz do kit


class _Silencioso(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def _servir():
    handler = functools.partial(_Silencioso, directory=str(RAIZ))
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def renderizar_lote(pagina, itens):
    """itens = [(arquivo_saida, parametros_url, largura, altura), ...]"""
    srv = _servir()
    porta = srv.server_address[1]
    try:
        with sync_playwright() as p:
            nav = p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
            for saida, params, w, h in itens:
                pg = nav.new_page(viewport={"width": w, "height": h})
                erros = []
                pg.on("pageerror", lambda e: erros.append(str(e)))
                pg.on("console", lambda m: erros.append(m.text) if m.type == "error" else None)
                pg.goto(f"http://127.0.0.1:{porta}/{pagina}?w={w}&h={h}&{params}")
                try:
                    pg.wait_for_function("window.__pronto === true", timeout=60000)
                except Exception:
                    raise RuntimeError(f"Falhou em {saida}: {erros}")
                Path(saida).parent.mkdir(parents=True, exist_ok=True)
                pg.screenshot(path=str(saida), omit_background=True)
                pg.close()
                if erros:
                    print("avisos em", saida, erros)
            nav.close()
    finally:
        srv.shutdown()


if __name__ == "__main__":
    a = sys.argv
    renderizar_lote(a[1], [(a[2], a[3] if len(a) > 3 else "", int(a[4]) if len(a) > 4 else 800, int(a[5]) if len(a) > 5 else 1000)])
    print(a[2])
