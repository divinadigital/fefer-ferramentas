"""
Servidor local do site FeFER.

Serve os arquivos do site e responde às ações da página admin.html em /api.php
(mesmo endereço usado pela versão PHP, assim o admin funciona igual nos dois).

Uso:
    python server.py            -> http://localhost:5510
    python server.py 8080       -> outra porta

Senha inicial do admin: fefer2026  (troque na aba "Segurança" do admin)
"""
import base64, hashlib, hmac, json, os, re, secrets, sys, time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
CONFIG = os.path.join(ROOT, 'config', 'admin.json')
BACKUPS = os.path.join(ROOT, 'backups')
UPLOADS = os.path.join(ROOT, 'uploads')
SENHA_INICIAL = 'fefer2026'
TOKENS = {}                      # token -> expira em (timestamp)
TOKEN_VIDA = 8 * 3600
TENTATIVAS = {}                  # ip -> [timestamps de erros]
MAX_UPLOAD = 8 * 1024 * 1024
EXT_OK = {'png': 'png', 'jpg': 'jpg', 'jpeg': 'jpg', 'webp': 'webp', 'gif': 'gif'}
BLOQUEADOS = ('/config', '/backups', '/server.py', '/api.php', '/.')


def hash_senha(senha, sal):
    return hashlib.pbkdf2_hmac('sha256', senha.encode('utf-8'), bytes.fromhex(sal), 200_000).hex()


def ler_config():
    if not os.path.exists(CONFIG):
        os.makedirs(os.path.dirname(CONFIG), exist_ok=True)
        sal = secrets.token_hex(16)
        salvar_config({'sal': sal, 'hash': hash_senha(SENHA_INICIAL, sal), 'senha_inicial': True})
    with open(CONFIG, encoding='utf-8') as f:
        return json.load(f)


def salvar_config(cfg):
    os.makedirs(os.path.dirname(CONFIG), exist_ok=True)
    with open(CONFIG, 'w', encoding='utf-8') as f:
        json.dump(cfg, f)


def escrever_js(nome, variavel, dados, comentario):
    destino = os.path.join(ROOT, 'assets', nome)
    os.makedirs(BACKUPS, exist_ok=True)
    if os.path.exists(destino):
        carimbo = time.strftime('%Y%m%d-%H%M%S')
        with open(destino, encoding='utf-8') as f:
            antigo = f.read()
        with open(os.path.join(BACKUPS, f'{carimbo}-{nome}'), 'w', encoding='utf-8') as f:
            f.write(antigo)
    corpo = json.dumps(dados, ensure_ascii=False, indent=1 if variavel == 'FEFER_SITE' else None,
                       separators=None if variavel == 'FEFER_SITE' else (',', ':'))
    corpo = corpo.replace('</', '<\\/')
    tmp = destino + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        f.write(f'/* {comentario} */\nwindow.{variavel} = {corpo};\n')
    os.replace(tmp, destino)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def end_headers(self):
        # sem cache durante a edição, para ver as mudanças na hora
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_GET(self):
        caminho = self.path.split('?')[0].lower()
        if caminho.startswith(BLOQUEADOS):
            self.send_error(404)
            return
        super().do_GET()

    def responder(self, codigo, dados):
        corpo = json.dumps(dados, ensure_ascii=False).encode('utf-8')
        self.send_response(codigo)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(corpo)))
        self.end_headers()
        self.wfile.write(corpo)

    def do_POST(self):
        if self.path.split('?')[0] != '/api.php':
            self.send_error(404)
            return
        try:
            tamanho = int(self.headers.get('Content-Length') or 0)
            if tamanho > MAX_UPLOAD * 2:
                return self.responder(413, {'erro': 'Arquivo grande demais.'})
            req = json.loads(self.rfile.read(tamanho) or b'{}')
        except Exception:
            return self.responder(400, {'erro': 'Requisição inválida.'})

        acao = req.get('acao')
        ip = self.client_address[0]

        if acao == 'status':
            return self.responder(200, {'ok': True, 'servidor': 'python'})

        if acao == 'login':
            agora = time.time()
            erros = [t for t in TENTATIVAS.get(ip, []) if agora - t < 600]
            if len(erros) >= 8:
                return self.responder(429, {'erro': 'Muitas tentativas. Aguarde alguns minutos.'})
            cfg = ler_config()
            if not hmac.compare_digest(hash_senha(str(req.get('senha', '')), cfg['sal']), cfg['hash']):
                erros.append(agora)
                TENTATIVAS[ip] = erros
                return self.responder(401, {'erro': 'Senha incorreta.'})
            TENTATIVAS.pop(ip, None)
            token = secrets.token_urlsafe(32)
            TOKENS[token] = agora + TOKEN_VIDA
            return self.responder(200, {'token': token, 'senha_inicial': cfg.get('senha_inicial', False)})

        token = str(req.get('token', ''))
        if TOKENS.get(token, 0) < time.time():
            TOKENS.pop(token, None)
            return self.responder(401, {'erro': 'Sessão expirada. Entre de novo.'})

        if acao == 'salvar':
            conteudo, produtos = req.get('conteudo'), req.get('produtos')
            if not isinstance(conteudo, dict) or not isinstance(produtos, list):
                return self.responder(400, {'erro': 'Dados inválidos.'})
            escrever_js('content.js', 'FEFER_SITE', conteudo,
                        'Conteúdo editável do site FeFER. Este arquivo é gerado pela página admin.html')
            escrever_js('products.js', 'FEFER_PRODUCTS', produtos,
                        'Produtos do site FeFER. Este arquivo é gerado pela página admin.html')
            return self.responder(200, {'ok': True, 'quando': time.strftime('%d/%m/%Y %H:%M')})

        if acao == 'upload':
            nome = str(req.get('nome', 'imagem'))
            m = re.match(r'^data:image/[\w.+-]+;base64,(.+)$', str(req.get('dados', '')), re.S)
            ext = nome.rsplit('.', 1)[-1].lower() if '.' in nome else ''
            if not m or ext not in EXT_OK:
                return self.responder(400, {'erro': 'Envie uma imagem PNG, JPG, WEBP ou GIF.'})
            binario = base64.b64decode(m.group(1))
            if len(binario) > MAX_UPLOAD:
                return self.responder(413, {'erro': 'Imagem maior que 8 MB.'})
            base = re.sub(r'[^a-z0-9-]+', '-', nome.rsplit('.', 1)[0].lower()).strip('-')[:50] or 'imagem'
            pasta = os.path.join(UPLOADS, time.strftime('%Y-%m'))
            os.makedirs(pasta, exist_ok=True)
            arquivo = f'{base}-{secrets.token_hex(3)}.{EXT_OK[ext]}'
            with open(os.path.join(pasta, arquivo), 'wb') as f:
                f.write(binario)
            return self.responder(200, {'url': f'uploads/{time.strftime("%Y-%m")}/{arquivo}'})

        if acao == 'senha':
            cfg = ler_config()
            if not hmac.compare_digest(hash_senha(str(req.get('atual', '')), cfg['sal']), cfg['hash']):
                return self.responder(400, {'erro': 'A senha atual não confere.'})
            nova = str(req.get('nova', ''))
            if len(nova) < 8:
                return self.responder(400, {'erro': 'A nova senha precisa ter pelo menos 8 caracteres.'})
            sal = secrets.token_hex(16)
            salvar_config({'sal': sal, 'hash': hash_senha(nova, sal), 'senha_inicial': False})
            return self.responder(200, {'ok': True})

        if acao == 'sair':
            TOKENS.pop(token, None)
            return self.responder(200, {'ok': True})

        return self.responder(400, {'erro': 'Ação desconhecida.'})


if __name__ == '__main__':
    porta = int(sys.argv[1]) if len(sys.argv) > 1 else 5510
    ler_config()
    print(f'Site FeFER em http://localhost:{porta}   |   admin: http://localhost:{porta}/admin.html')
    ThreadingHTTPServer(('127.0.0.1', porta), Handler).serve_forever()
