<?php
/*
 * API do admin do site FeFER (para hospedagem com PHP).
 * Faz o mesmo que o server.py: login, salvar conteúdo/produtos, enviar imagem e trocar senha.
 * Senha inicial: fefer2026 (troque na aba "Segurança" do admin).
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
session_start();

$ROOT = __DIR__;
$CONFIG = "$ROOT/config/admin.json";
$BACKUPS = "$ROOT/backups";
$UPLOADS = "$ROOT/uploads";
$MAX_UPLOAD = 8 * 1024 * 1024;
$EXT_OK = ['png' => 'png', 'jpg' => 'jpg', 'jpeg' => 'jpg', 'webp' => 'webp', 'gif' => 'gif'];

function responder($codigo, $dados) { http_response_code($codigo); echo json_encode($dados, JSON_UNESCAPED_UNICODE); exit; }
function hash_senha($senha, $sal) { return hash_pbkdf2('sha256', $senha, hex2bin($sal), 200000, 64); }
function ler_config() {
  global $CONFIG;
  if (!file_exists($CONFIG)) {
    @mkdir(dirname($CONFIG), 0750, true);
    file_put_contents(dirname($CONFIG) . '/.htaccess', "Require all denied\nDeny from all\n");
    $sal = bin2hex(random_bytes(16));
    salvar_config(['sal' => $sal, 'hash' => hash_senha('fefer2026', $sal), 'senha_inicial' => true]);
  }
  return json_decode(file_get_contents($CONFIG), true);
}
function salvar_config($cfg) { global $CONFIG; file_put_contents($CONFIG, json_encode($cfg)); }
function escrever_js($nome, $variavel, $dados, $comentario) {
  global $ROOT, $BACKUPS;
  $destino = "$ROOT/assets/$nome";
  if (!is_dir($BACKUPS)) { @mkdir($BACKUPS, 0750, true); file_put_contents("$BACKUPS/.htaccess", "Require all denied\nDeny from all\n"); }
  if (file_exists($destino)) copy($destino, "$BACKUPS/" . date('Ymd-His') . "-$nome");
  $flags = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | ($variavel === 'FEFER_SITE' ? JSON_PRETTY_PRINT : 0);
  $corpo = str_replace('</', '<\/', json_encode($dados, $flags));
  file_put_contents("$destino.tmp", "/* $comentario */\nwindow.$variavel = $corpo;\n");
  rename("$destino.tmp", $destino);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') responder(405, ['erro' => 'Use POST.']);
$req = json_decode(file_get_contents('php://input'), true);
if (!is_array($req)) responder(400, ['erro' => 'Requisição inválida.']);
$acao = $req['acao'] ?? '';

if ($acao === 'status') responder(200, ['ok' => true, 'servidor' => 'php']);

if ($acao === 'login') {
  $agora = time();
  $_SESSION['erros'] = array_filter($_SESSION['erros'] ?? [], fn($t) => $agora - $t < 600);
  if (count($_SESSION['erros']) >= 8) responder(429, ['erro' => 'Muitas tentativas. Aguarde alguns minutos.']);
  $cfg = ler_config();
  if (!hash_equals($cfg['hash'], hash_senha((string)($req['senha'] ?? ''), $cfg['sal']))) {
    $_SESSION['erros'][] = $agora;
    responder(401, ['erro' => 'Senha incorreta.']);
  }
  $_SESSION['erros'] = [];
  $token = bin2hex(random_bytes(32));
  $_SESSION['token'] = $token;
  $_SESSION['expira'] = $agora + 8 * 3600;
  responder(200, ['token' => $token, 'senha_inicial' => !empty($cfg['senha_inicial'])]);
}

$token = (string)($req['token'] ?? '');
if (empty($_SESSION['token']) || !hash_equals($_SESSION['token'], $token) || ($_SESSION['expira'] ?? 0) < time()) {
  responder(401, ['erro' => 'Sessão expirada. Entre de novo.']);
}

if ($acao === 'salvar') {
  if (!is_array($req['conteudo'] ?? null) || !is_array($req['produtos'] ?? null)) responder(400, ['erro' => 'Dados inválidos.']);
  escrever_js('content.js', 'FEFER_SITE', $req['conteudo'], 'Conteúdo editável do site FeFER. Este arquivo é gerado pela página admin.html');
  escrever_js('products.js', 'FEFER_PRODUCTS', $req['produtos'], 'Produtos do site FeFER. Este arquivo é gerado pela página admin.html');
  responder(200, ['ok' => true, 'quando' => date('d/m/Y H:i')]);
}

if ($acao === 'upload') {
  $nome = (string)($req['nome'] ?? 'imagem');
  $ext = strtolower(pathinfo($nome, PATHINFO_EXTENSION));
  if (!isset($EXT_OK[$ext]) || !preg_match('/^data:image\/[\w.+-]+;base64,(.+)$/s', (string)($req['dados'] ?? ''), $m)) {
    responder(400, ['erro' => 'Envie uma imagem PNG, JPG, WEBP ou GIF.']);
  }
  $bin = base64_decode($m[1]);
  if (strlen($bin) > $MAX_UPLOAD) responder(413, ['erro' => 'Imagem maior que 8 MB.']);
  if (@getimagesizefromstring($bin) === false) responder(400, ['erro' => 'O arquivo não é uma imagem válida.']);
  $base = trim(preg_replace('/[^a-z0-9-]+/', '-', strtolower(pathinfo($nome, PATHINFO_FILENAME))), '-');
  $base = substr($base ?: 'imagem', 0, 50);
  $mes = date('Y-m');
  @mkdir("$UPLOADS/$mes", 0755, true);
  $arquivo = "$base-" . bin2hex(random_bytes(3)) . '.' . $EXT_OK[$ext];
  file_put_contents("$UPLOADS/$mes/$arquivo", $bin);
  responder(200, ['url' => "uploads/$mes/$arquivo"]);
}

if ($acao === 'senha') {
  $cfg = ler_config();
  if (!hash_equals($cfg['hash'], hash_senha((string)($req['atual'] ?? ''), $cfg['sal']))) responder(400, ['erro' => 'A senha atual não confere.']);
  $nova = (string)($req['nova'] ?? '');
  if (strlen($nova) < 8) responder(400, ['erro' => 'A nova senha precisa ter pelo menos 8 caracteres.']);
  $sal = bin2hex(random_bytes(16));
  salvar_config(['sal' => $sal, 'hash' => hash_senha($nova, $sal), 'senha_inicial' => false]);
  responder(200, ['ok' => true]);
}

if ($acao === 'sair') { session_destroy(); responder(200, ['ok' => true]); }

responder(400, ['erro' => 'Ação desconhecida.']);
