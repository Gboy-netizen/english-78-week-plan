"""Serve the static learning site on loopback. No account/API/backend storage."""
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
from functools import partial
import argparse,webbrowser
def main():
    p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=4173);p.add_argument('--no-open',action='store_true');args=p.parse_args()
    root=Path(__file__).resolve().parents[1]
    server=ThreadingHTTPServer(('127.0.0.1',args.port),partial(SimpleHTTPRequestHandler,directory=str(root)))
    print(f'English course: http://localhost:{args.port}/ — Ctrl+C to stop',flush=True)
    if not args.no_open:webbrowser.open(f'http://localhost:{args.port}/')
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()
if __name__=='__main__':main()
