# Site FeFER

## Abrir no computador

```bash
python server.py
```

- Site: http://localhost:5510
- Admin: http://localhost:5510/admin.html
- Senha inicial do admin: `fefer2026`. Troque na aba **Segurança** logo no primeiro acesso.

## Onde fica cada coisa

| Arquivo | O que é |
|---|---|
| `assets/content.js` | Textos, banners, categorias, marcas, contatos e chamadas finais. Editado pelo admin. |
| `assets/products.js` | Os produtos. Editado pelo admin. |
| `admin.html` | Página de administração. |
| `server.py` | Servidor para uso no computador (salva as alterações do admin). |
| `api.php` | Mesma função do `server.py`, para hospedagem com PHP. |
| `config/admin.json` | Senha do admin (criptografada). Não apague. |
| `backups/` | Cópia automática da versão anterior a cada vez que você salva no admin. |
| `uploads/` | Imagens enviadas pelo admin. |

## Publicar na hospedagem

Envie a pasta inteira para uma hospedagem com PHP. O admin passa a salvar pelo `api.php`.
As pastas `config` e `backups` ficam protegidas automaticamente.
