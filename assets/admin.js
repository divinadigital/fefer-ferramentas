/* =====================================================================
   FeFER, página de administração
   Edita assets/content.js (textos, banners, contatos...) e assets/products.js (produtos).
   Salva pelo api.php (server.py no computador ou PHP na hospedagem).
   Sem servidor, permite baixar os dois arquivos para substituir manualmente.
   ===================================================================== */
(() => {
const clone = o => JSON.parse(JSON.stringify(o));
let S = clone(window.FEFER_SITE || {});
let P = clone(window.FEFER_PRODUCTS || []);
let token = '';
let online = false;
let dirty = false;
let tab = 'painel';

const $ = s => document.querySelector(s);
const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'class') el.className = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  kids.flat().forEach(c => c != null && c !== false && el.append(c.nodeType ? c : document.createTextNode(c)));
  return el;
};
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const slugify = s => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || 'produto';
const sess = {
  get() { try { return sessionStorage.getItem('fefer-admin') || ''; } catch (e) { return ''; } },
  set(v) { try { v ? sessionStorage.setItem('fefer-admin', v) : sessionStorage.removeItem('fefer-admin'); } catch (e) { /* sem armazenamento */ } },
};

/* ---------- avisos ---------- */
let tt;
function toast(msg, err) {
  const t = $('#toast'); t.textContent = msg; t.classList.toggle('err', !!err); t.classList.add('show');
  clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2800);
}
function setDirty(v = true) {
  dirty = v;
  const e = $('#estado');
  e.textContent = v ? 'Alterações não salvas' : 'Tudo salvo';
  e.classList.toggle('sujo', v);
  $('#salvar').disabled = !v || !online;
}
addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

/* ---------- API ---------- */
async function api(acao, dados = {}) {
  const r = await fetch('api.php', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ acao, token, ...dados }) });
  let j = {};
  try { j = await r.json(); } catch (e) { throw new Error('O servidor não respondeu como esperado.'); }
  if (!r.ok) {
    if (r.status === 401 && acao !== 'login') { token = ''; sess.set(''); }
    throw new Error(j.erro || 'Erro ao falar com o servidor.');
  }
  return j;
}

/* ---------- login ---------- */
async function start() {
  try { await api('status'); online = true; } catch (e) { online = false; }
  if (!online) $('#semServidor').hidden = false;
  token = sess.get();
  if (token && online) { enter(); return; }
  $('#senha').focus();
}
$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  $('#loginErro').textContent = '';
  if (!online) { $('#loginErro').textContent = 'Servidor indisponível. Use "Editar mesmo assim".'; return; }
  try {
    const r = await api('login', { senha: $('#senha').value });
    token = r.token; sess.set(token);
    enter();
    if (r.senha_inicial) setTimeout(() => toast('Você ainda usa a senha inicial. Troque na aba Segurança.'), 600);
  } catch (err) { $('#loginErro').textContent = err.message; }
});
$('#entrarOffline').addEventListener('click', () => enter());
function enter() {
  $('#login').hidden = true; $('#app').hidden = false;
  setDirty(false); renderTabs(); show(tab);
}
$('#sair').addEventListener('click', async () => {
  if (dirty && !confirm('Existem alterações não salvas. Sair mesmo assim?')) return;
  try { if (online && token) await api('sair'); } catch (e) { /* sessão já encerrada */ }
  token = ''; sess.set(''); dirty = false; location.reload();
});

/* ---------- salvar / baixar ---------- */
function validate() {
  const slugs = new Set();
  for (const p of P) {
    if (!p.name.trim()) return 'Existe um produto sem nome.';
    if (slugs.has(p.slug)) return `O endereço "${p.slug}" está repetido em dois produtos.`;
    slugs.add(p.slug);
    if (!S.categorias[p.cat]) return `O produto "${p.name}" está sem categoria.`;
  }
  return '';
}
function prepare() {
  S.inicio.destaques = (S.inicio.destaques || []).filter(s => P.some(p => p.slug === s));
  P.forEach(p => { p.sum = (p.sum || '').trim() || textOf(p.short || p.desc).slice(0, 160); });
}
$('#salvar').addEventListener('click', async () => {
  const err = validate(); if (err) return toast(err, true);
  prepare();
  const b = $('#salvar'); b.disabled = true; b.textContent = 'Salvando...';
  try {
    const r = await api('salvar', { conteudo: S, produtos: P });
    setDirty(false); toast(`Publicado em ${r.quando}`);
  } catch (e) {
    toast(e.message, true); setDirty(true);
    if (!token) location.reload();
  } finally { b.textContent = 'Salvar e publicar'; }
});
function download(name, text) {
  const a = h('a', { href: URL.createObjectURL(new Blob([text], { type:'text/javascript' })), download: name });
  document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
$('#baixar').addEventListener('click', () => {
  const err = validate(); if (err) return toast(err, true);
  prepare();
  download('content.js', `/* Conteúdo editável do site FeFER. Este arquivo é gerado pela página admin.html */\nwindow.FEFER_SITE = ${JSON.stringify(S, null, 1)};\n`);
  setTimeout(() => download('products.js', `/* Produtos do site FeFER. Este arquivo é gerado pela página admin.html */\nwindow.FEFER_PRODUCTS = ${JSON.stringify(P)};\n`), 400);
  toast('Substitua os dois arquivos na pasta assets do site.');
});

/* ---------- navegação ---------- */
const TABS = [
  ['painel', 'Painel'], ['produtos', 'Produtos'], ['inicio', 'Página inicial'], ['categorias', 'Categorias'],
  ['marcas', 'Marcas'], ['sobre', 'Sobre'], ['chamadas', 'Chamadas finais'], ['contato', 'Contato'], ['seguranca', 'Segurança'],
];
function renderTabs() {
  $('#tabs').replaceChildren(...TABS.map(([k, t]) => h('button', { type:'button', 'aria-current': k === tab, onclick: () => show(k) },
    t, k === 'produtos' ? h('span', { class:'n' }, P.length) : null)));
}
function show(k) {
  tab = k; renderTabs();
  $('#secTitle').textContent = TABS.find(t => t[0] === k)[1];
  const c = $('#content'); c.replaceChildren();
  VIEWS[k](c);
  $('.side').classList.remove('open');
  scrollTo(0, 0);
}
$('#menu').addEventListener('click', () => $('.side').classList.toggle('open'));

/* ---------- campos ligados aos dados ---------- */
function text(label, obj, key, o = {}) {
  const input = h(o.area ? 'textarea' : 'input', { type: o.type || 'text', placeholder: o.ph || '', maxlength: o.max || null, rows: o.rows || null });
  input.value = obj[key] ?? '';
  input.addEventListener('input', () => { obj[key] = o.type === 'number' ? parseFloat(input.value) : input.value; setDirty(); o.change && o.change(input.value); });
  return h('label', { class:'f' }, h('span', {}, label), input, o.hint ? h('small', {}, o.hint) : null);
}
function select(label, obj, key, options, o = {}) {
  const s = h('select', {}, options.map(([v, t]) => h('option', { value: v }, t)));
  s.value = obj[key] ?? '';
  s.addEventListener('change', () => { obj[key] = s.value; setDirty(); o.change && o.change(s.value); });
  return h('label', { class:'f' }, h('span', {}, label), s);
}
async function uploadFile(file) {
  if (!online || !token) throw new Error('Envio de imagem precisa do servidor. Cole o endereço (URL) da imagem.');
  if (file.size > 8 * 1024 * 1024) throw new Error('Imagem maior que 8 MB.');
  const dados = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(file); });
  return (await api('upload', { nome: file.name, dados })).url;
}
function image(label, obj, key, o = {}) {
  const prev = h('div', { class:'prev' });
  const input = h('input', { type:'text', placeholder:'Endereço da imagem ou envie um arquivo' });
  const paint = () => { prev.style.backgroundImage = input.value ? `url("${input.value.replace(/"/g, '%22')}")` : ''; prev.textContent = input.value ? '' : 'sem imagem'; };
  input.value = obj[key] || ''; paint();
  input.addEventListener('input', () => { obj[key] = input.value; setDirty(); paint(); o.change && o.change(input.value); });
  const file = h('input', { type:'file', accept:'image/png,image/jpeg,image/webp,image/gif', hidden:true });
  file.addEventListener('change', async () => {
    const f = file.files[0]; if (!f) return;
    try { toast('Enviando imagem...'); const url = await uploadFile(f); input.value = url; input.dispatchEvent(new Event('input')); toast('Imagem enviada'); }
    catch (e) { toast(e.message, true); }
    file.value = '';
  });
  return h('div', { class:'f' }, h('span', {}, label),
    h('div', { class:'img-f' }, prev, h('div', {}, h('div', { class:'row' }, input, h('button', { class:'b', type:'button', onclick: () => file.click() }, 'Enviar')), o.hint ? h('small', {}, o.hint) : null)), file);
}
function check(label, value, onchange) {
  const i = h('input', { type:'checkbox' }); i.checked = value;
  i.addEventListener('change', () => { onchange(i.checked); setDirty(); });
  return h('label', { class:'check' }, i, label);
}
/* lista com adicionar, remover e reordenar */
function listEditor(arr, renderItem, { title = i => `Item ${i + 1}`, newItem, addLabel = 'Adicionar', min = 0 } = {}) {
  const box = h('div', { class:'list' });
  const paint = () => {
    box.replaceChildren(...arr.map((it, i) => h('div', { class:'item' },
      h('div', { class:'item-head' }, h('b', {}, title(i, it)),
        h('button', { class:'b b-sm', type:'button', title:'Subir', disabled: i === 0, onclick: () => { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; setDirty(); paint(); } }, '↑'),
        h('button', { class:'b b-sm', type:'button', title:'Descer', disabled: i === arr.length - 1, onclick: () => { [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; setDirty(); paint(); } }, '↓'),
        h('button', { class:'b b-sm b-danger', type:'button', disabled: arr.length <= min, onclick: () => { if (confirm('Remover este item?')) { arr.splice(i, 1); setDirty(); paint(); } } }, 'Remover')),
      renderItem(it, i))),
      newItem ? h('button', { class:'b add', type:'button', onclick: () => { arr.push(newItem()); setDirty(); paint(); } }, '+ ' + addLabel) : '');
  };
  paint();
  return box;
}
/* editor de texto com negrito, lista e título */
function rte(label, obj, key, hint) {
  const area = h('div', { class:'rte-area', contenteditable:'true', role:'textbox', 'aria-multiline':'true', 'aria-label': label });
  area.innerHTML = obj[key] || '';
  const sync = () => { obj[key] = cleanHtml(area.innerHTML); setDirty(); };
  area.addEventListener('input', sync);
  area.addEventListener('paste', e => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')); });
  const cmd = (c, v) => () => { area.focus(); document.execCommand(c, false, v); sync(); };
  const bar = h('div', { class:'rte-bar' },
    h('button', { type:'button', onclick: cmd('bold'), title:'Negrito' }, 'N'),
    h('button', { type:'button', onclick: cmd('insertUnorderedList'), title:'Lista' }, '• Lista'),
    h('button', { type:'button', onclick: cmd('formatBlock', 'h4'), title:'Título' }, 'Título'),
    h('button', { type:'button', onclick: cmd('formatBlock', 'p'), title:'Parágrafo' }, 'Parágrafo'),
    h('button', { type:'button', onclick: cmd('removeFormat'), title:'Limpar formatação' }, 'Limpar'));
  return h('div', { class:'f' }, h('span', {}, label), h('div', { class:'rte' }, bar, area), hint ? h('small', {}, hint) : null);
}
const ALLOWED = new Set(['P','BR','UL','OL','LI','STRONG','B','EM','I','H4','TABLE','THEAD','TBODY','TR','TD','TH']);
function cleanHtml(html) {
  const tpl = document.createElement('template'); tpl.innerHTML = html;
  const walk = node => [...node.childNodes].forEach(n => {
    if (n.nodeType === 1) {
      walk(n);
      if (!ALLOWED.has(n.tagName)) { n.replaceWith(...n.childNodes); return; }
      [...n.attributes].forEach(a => n.removeAttribute(a.name));
    } else if (n.nodeType !== 3) n.remove();
  });
  walk(tpl.content);
  return tpl.innerHTML.replace(/<div>/g, '<p>').replace(/<\/div>/g, '</p>').trim();
}
function textOf(html) { const d = document.createElement('div'); d.innerHTML = html || ''; return d.textContent.replace(/\s+/g, ' ').trim(); }
const card = (title, desc, ...kids) => h('div', { class:'card' }, h('h2', {}, title), desc ? h('p', { class:'muted' }, desc) : null, ...kids);
const catOptions = () => Object.entries(S.categorias).map(([s, c]) => [s, c.nome]);

/* ---------- telas ---------- */
const VIEWS = {
  painel(c) {
    const destaques = (S.inicio.destaques || []).length;
    c.append(
      h('div', { class:'stats' },
        ...[[P.length, 'Produtos'], [Object.keys(S.categorias).length, 'Categorias'], [destaques, 'Destaques na home'], [(S.inicio.banners || []).length, 'Banners']]
          .map(([n, t]) => h('div', { class:'stat' }, h('b', {}, n), h('span', {}, t)))),
      card('Atalhos', 'O que você mais vai usar no dia a dia.',
        h('div', { class:'quick' },
          ...[['produtos', 'Produtos', 'Cadastrar, editar fotos e descrições'], ['inicio', 'Banners e destaques', 'Trocar banners e produtos da home'], ['contato', 'Contato', 'Telefone, e-mail, endereço e horário']]
            .map(([k, t, d]) => h('button', { type:'button', onclick: () => show(k) }, h('b', {}, t), h('span', {}, d))))),
      card('Como funciona', null, h('ol', { class:'howto' },
        h('li', {}, 'Faça as alterações nas abas da esquerda. Nada vai para o site até você salvar.'),
        h('li', {}, 'Clique em "Salvar e publicar" no topo. O site é atualizado na hora e uma cópia de segurança da versão anterior fica guardada na pasta backups.'),
        h('li', {}, 'Para destacar um texto em amarelo ou verde, coloque a palavra entre asteriscos, por exemplo: Precisão que *move* a sua produção.'),
        h('li', {}, online ? 'Servidor conectado: você pode enviar imagens direto do computador.' : 'Sem servidor: edite e use "Baixar arquivos" para substituir content.js e products.js na pasta assets.'))));
  },

  produtos(c) {
    const q = h('input', { type:'search', placeholder:'Buscar produto pelo nome', 'aria-label':'Buscar produto' });
    const cat = h('select', { 'aria-label':'Filtrar categoria' }, h('option', { value:'' }, 'Todas as categorias'), ...catOptions().map(([v, t]) => h('option', { value: v }, t)));
    const only = h('select', { 'aria-label':'Filtrar destaques' }, h('option', { value:'' }, 'Todos'), h('option', { value:'d' }, 'Só destaques'));
    const list = h('div', { class:'ptable' });
    const count = h('p', { class:'muted', style:'margin-bottom:10px' });
    const paint = () => {
      const t = norm(q.value), d = S.inicio.destaques;
      const rows = P.filter(p => (!t || norm(p.name).includes(t)) && (!cat.value || p.cat === cat.value) && (!only.value || d.includes(p.slug)));
      count.textContent = `${rows.length} de ${P.length} produtos`;
      list.replaceChildren(...rows.slice(0, 300).map(p => {
        const on = d.includes(p.slug);
        const star = h('button', { class:'star' + (on ? ' on' : ''), type:'button', title: on ? 'Tirar dos destaques da home' : 'Destacar na home', 'aria-pressed': on,
          onclick: e => { e.stopPropagation(); toggleDestaque(p.slug); paint(); } }, '★');
        return h('div', { class:'prow', role:'button', tabindex:'0', onclick: () => editProduct(p, paint), onkeydown: e => { if (e.key === 'Enter') editProduct(p, paint); } },
          h('img', { src: p.img[0]?.t || p.img[0]?.s || '', alt:'', loading:'lazy' }),
          h('div', {}, h('div', { class:'nm' }, p.name), h('div', { class:'cat' }, S.categorias[p.cat]?.nome || 'sem categoria')),
          h('span', { class:'pill' }, `${p.img.length} foto${p.img.length === 1 ? '' : 's'}`),
          star, h('button', { class:'b b-sm', type:'button' }, 'Editar'));
      }));
    };
    [q, cat, only].forEach(e => e.addEventListener('input', paint));
    const novo = h('button', { class:'b b-primary', type:'button', onclick: () => {
      const p = { id: Math.max(0, ...P.map(x => x.id || 0)) + 1, slug:'', name:'', cat: cat.value || Object.keys(S.categorias)[0], sub:[], img:[], short:'', desc:'', sum:'' };
      P.unshift(p); setDirty(); renderTabs(); editProduct(p, paint, true);
    } }, '+ Novo produto');
    c.append(h('div', { class:'toolbar' }, q, cat, only, novo), count, list);
    paint();
  },

  inicio(c) {
    const I = S.inicio;
    c.append(
      card('Topo da página', 'Aparece logo que o visitante entra no site.',
        text('Chamada pequena', I, 'chamada'),
        text('Título', I, 'titulo', { hint:'A palavra entre *asteriscos* fica em amarelo.' }),
        text('Texto', I, 'texto', { area:true })),
      card('Banners', 'Imagens que passam sozinhas ao lado do título. Tamanho ideal: 1920 x 839 pixels.',
        listEditor(I.banners, b => h('div', {}, image('Imagem', b, 'img'), text('Título curto', b, 'titulo', { hint:'Aparece na aba abaixo do banner. Ex.: Catálogo completo', max:28 }), h('div', { class:'grid2' },
          text('Link ao clicar', b, 'link', { hint:'Ex.: catalogo.html ou catalogo.html?cat=fresamento' }), text('Descrição da imagem', b, 'alt', { hint:'Para acessibilidade e Google.' }))),
          { title: i => `Banner ${i + 1}`, newItem: () => ({ img:'', titulo:'', link:'catalogo.html', alt:'' }), addLabel:'Adicionar banner', min:1 })),
      card('Produtos em destaque', 'Escolha e ordene os produtos da seção "Destaques". Também dá para marcar com a estrela na aba Produtos.', destaquesEditor()),
      card('Nosso compromisso', 'Frase grande que acende conforme a rolagem.', text('Frase', I, 'compromisso', { area:true, hint:'Palavras entre *asteriscos* ficam em amarelo.' })),
      card('Por que escolher a FeFER', null,
        listEditor(I.diferenciais, d => h('div', { class:'grid2' }, text('Título', d, 'titulo'), text('Texto', d, 'texto', { area:true, rows:2 })),
          { title: i => `Diferencial ${i + 1}`, newItem: () => ({ titulo:'', texto:'' }), addLabel:'Adicionar diferencial' })));
  },

  categorias(c) {
    const box = h('div');
    const paint = () => box.replaceChildren(...Object.entries(S.categorias).map(([slug, cat]) => {
      const n = P.filter(p => p.cat === slug).length;
      return h('div', { class:'item', style:'margin-bottom:10px' },
        h('div', { class:'item-head' }, h('b', {}, `${cat.nome} (${n} ${n === 1 ? 'produto' : 'produtos'})`),
          h('button', { class:'b b-sm b-danger', type:'button', disabled: n > 0, title: n ? 'Mova ou exclua os produtos antes' : 'Excluir categoria',
            onclick: () => { if (confirm(`Excluir a categoria ${cat.nome}?`)) { delete S.categorias[slug]; setDirty(); paint(); } } }, 'Excluir')),
        h('div', { class:'grid2' }, text('Nome', cat, 'nome'), image('Imagem redonda', cat, 'img')));
    }));
    const nome = h('input', { type:'text', placeholder:'Nome da nova categoria' });
    c.append(card('Categorias', 'Aparecem na home, no menu de cima, no catálogo e no rodapé.', box,
      h('div', { class:'toolbar', style:'margin-top:12px' }, nome, h('button', { class:'b b-primary', type:'button', onclick: () => {
        const n = nome.value.trim(); if (!n) return;
        const s = slugify(n); if (S.categorias[s]) return toast('Essa categoria já existe.', true);
        S.categorias[s] = { nome: n, img: '' }; nome.value = ''; setDirty(); paint();
      } }, '+ Criar categoria'))));
    paint();
  },

  marcas(c) {
    const M = S.marcas;
    const nomes = { v: (M.nomes || []).join('\n') };
    c.append(
      card('Logos das marcas', 'Faixa de logos que passa sozinha. Prefira PNG com fundo transparente ou SVG.',
        listEditor(M.logos, l => h('div', { class:'grid2' }, text('Nome da marca', l, 'nome'), image('Logo', l, 'logo')),
          { title: (i, l) => l.nome || `Marca ${i + 1}`, newItem: () => ({ nome:'', logo:'' }), addLabel:'Adicionar marca' })),
      card('Nomes das marcas', 'Segunda faixa, com os nomes escritos. Clicar em um nome busca os produtos da marca.',
        text('Uma marca por linha', nomes, 'v', { area:true, rows:8, change: v => { M.nomes = v.split('\n').map(s => s.trim()).filter(Boolean); } })));
  },

  sobre(c) {
    const A = S.sobre;
    c.append(
      card('Topo da página', null, text('Título', A, 'titulo', { hint:'A palavra entre *asteriscos* fica em amarelo.' }), text('Subtítulo', A, 'subtitulo', { area:true, rows:2 })),
      card('Foto', 'A foto aparece num quadro e o recorte faz a cabeça "sair" por cima dele.',
        h('div', { class:'grid2' }, image('Foto completa', A, 'foto'), image('Recorte sem fundo (PNG)', A, 'recorte', { hint:'Mesma foto, com o fundo removido.' }))),
      card('Texto', null,
        text('Frase de destaque', A, 'destaque', { area:true, hint:'Palavras entre *asteriscos* ficam em verde.' }),
        listEditor(A.paragrafos, (t, i) => { const o = { v: t }; return text('Parágrafo', o, 'v', { area:true, rows:4, change: v => { A.paragrafos[i] = v; } }); },
          { title: i => `Parágrafo ${i + 1}`, newItem: () => '', addLabel:'Adicionar parágrafo' })),
      card('Diferenciais', null,
        listEditor(A.diferenciais, d => h('div', {}, h('div', { class:'grid2' }, text('Título', d, 'titulo'), image('Ícone', d, 'icone')), text('Texto', d, 'texto', { area:true, rows:2 })),
          { title: (i, d) => d.titulo || `Diferencial ${i + 1}`, newItem: () => ({ titulo:'', texto:'', icone:'' }), addLabel:'Adicionar diferencial' })));
  },

  chamadas(c) {
    const NOMES = { inicio:'Página inicial', catalogo:'Catálogo', produto:'Página de produto', maquinas:'Máquinas', sobre:'Sobre', contato:'Contato' };
    c.append(h('p', { class:'muted', style:'margin-bottom:14px' }, 'Faixa amarela no fim de cada página, logo antes do rodapé.'));
    Object.entries(NOMES).forEach(([k, n]) => {
      const t = S.chamadas[k] = S.chamadas[k] || { titulo:'', botao:'', mensagem:'', botao2:'', link2:'' };
      c.append(card(n, null,
        text('Título', t, 'titulo', { hint:'Palavra entre *asteriscos* fica em verde.' }),
        h('div', { class:'grid2' }, text('Botão do WhatsApp', t, 'botao'), text('Mensagem que já vem escrita', t, 'mensagem')),
        h('div', { class:'grid2' }, text('Segundo botão (opcional)', t, 'botao2'), text('Link do segundo botão', t, 'link2'))));
    });
  },

  contato(c) {
    const C = S.contato;
    const lat = text('Latitude', C, 'lat', { type:'number' }), lng = text('Longitude', C, 'lng', { type:'number' });
    c.append(
      card('Telefone e WhatsApp', 'Usados no topo, no rodapé, nos botões e em todas as mensagens.',
        h('div', { class:'grid2' }, text('Telefone (como aparece no site)', C, 'telefone'), text('Número do WhatsApp', C, 'whatsapp', { hint:'Só números, com 55 e DDD. Ex.: 5548996453143' }))),
      card('E-mail e redes', null, text('E-mail', C, 'email'), h('div', { class:'grid2' }, text('Instagram (link)', C, 'instagram'), text('Facebook (link)', C, 'facebook'))),
      card('Endereço e horário', null,
        text('Rua e número, bairro', C, 'endereco'),
        h('div', { class:'grid2' }, text('Cidade, UF', C, 'cidade'), text('CEP', C, 'cep')),
        text('Horário de atendimento', C, 'horario'),
        h('div', { class:'grid2' }, lat, lng),
        h('button', { class:'b', type:'button', onclick: async e => {
          const b = e.currentTarget; b.disabled = true; b.textContent = 'Buscando...';
          try {
            const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(`${C.endereco}, ${C.cidade}, Brasil`)}`).then(r => r.json());
            if (!r[0]) throw new Error();
            C.lat = +r[0].lat; C.lng = +r[0].lon;
            lat.querySelector('input').value = C.lat; lng.querySelector('input').value = C.lng; setDirty(); toast('Posição do mapa atualizada');
          } catch (err) { toast('Não achei esse endereço. Ajuste a latitude e longitude à mão.', true); }
          b.disabled = false; b.textContent = 'Atualizar posição do mapa pelo endereço';
        } }, 'Atualizar posição do mapa pelo endereço')));
  },

  seguranca(c) {
    const o = { atual:'', nova:'', conf:'' };
    const f = (l, k) => {
      const i = h('input', { type:'password', autocomplete: k === 'atual' ? 'current-password' : 'new-password' });
      i.addEventListener('input', () => { o[k] = i.value; });
      return h('label', { class:'f' }, h('span', {}, l), i);
    };
    c.append(card('Trocar senha', online ? 'Use pelo menos 8 caracteres. Anote em lugar seguro.' : 'Disponível apenas com o servidor do site rodando.',
      f('Senha atual', 'atual'), f('Nova senha', 'nova'), f('Repita a nova senha', 'conf'),
      h('button', { class:'b b-primary', type:'button', disabled: !online || !token, onclick: async () => {
        if (o.nova !== o.conf) return toast('As senhas novas não são iguais.', true);
        try { await api('senha', { atual: o.atual, nova: o.nova }); toast('Senha alterada'); show('seguranca'); }
        catch (e) { toast(e.message, true); }
      } }, 'Trocar senha')));
  },
};

function toggleDestaque(slug) {
  const d = S.inicio.destaques, i = d.indexOf(slug);
  if (i >= 0) d.splice(i, 1); else d.push(slug);
  setDirty();
}
function destaquesEditor() {
  const box = h('div');
  const search = h('input', { type:'search', placeholder:'Digite para adicionar um produto aos destaques' });
  const results = h('div', { class:'ptable', style:'margin-top:8px' });
  const paint = () => {
    const d = S.inicio.destaques;
    const items = d.map(s => P.find(p => p.slug === s)).filter(Boolean);
    box.replaceChildren(listEditor(d, s => { const p = P.find(x => x.slug === s); return h('div', { class:'muted' }, p ? `${S.categorias[p.cat]?.nome || ''}` : 'produto removido'); },
      { title: (i, s) => P.find(x => x.slug === s)?.name || s }));
    if (!items.length) box.prepend(h('p', { class:'muted' }, 'Nenhum destaque escolhido.'));
  };
  search.addEventListener('input', () => {
    const t = norm(search.value);
    results.replaceChildren(...(t.length < 2 ? [] : P.filter(p => norm(p.name).includes(t) && !S.inicio.destaques.includes(p.slug)).slice(0, 6).map(p =>
      h('div', { class:'prow', role:'button', tabindex:'0', onclick: () => { S.inicio.destaques.push(p.slug); setDirty(); search.value = ''; results.replaceChildren(); paint(); } },
        h('img', { src: p.img[0]?.t || p.img[0]?.s || '', alt:'' }), h('div', { class:'nm' }, p.name), h('span'), h('span'), h('button', { class:'b b-sm', type:'button' }, 'Adicionar')))));
  });
  paint();
  return h('div', {}, box, h('div', { class:'toolbar', style:'margin:14px 0 0' }, search), results);
}

/* ---------- editor de produto ---------- */
function editProduct(p, onClose, isNew) {
  const d = $('#drawer'), body = $('#drawerBody');
  $('#drawerTitle').textContent = isNew ? 'Novo produto' : 'Editar produto';
  const imgs = p.img;
  const slugF = text('Endereço da página', p, 'slug', { hint:'Gerado pelo nome. Aparece no link: produto.html?p=...' });
  const slugInput = slugF.querySelector('input');
  let autoSlug = isNew || !p.slug;
  slugInput.addEventListener('input', () => {
    autoSlug = false;
    const old = p.slug; p.slug = slugify(slugInput.value) || old;
    S.inicio.destaques = S.inicio.destaques.map(s => s === old ? p.slug : s);
  });
  const subs = { v: p.sub.join(', ') };
  const ehDestaque = S.inicio.destaques.includes(p.slug);
  body.replaceChildren(
    text('Nome do produto', p, 'name', { change: v => {
      if (!autoSlug) return;
      const old = p.slug; let s = slugify(v), n = 2;
      while (P.some(x => x !== p && x.slug === s)) s = `${slugify(v)}-${n++}`;
      p.slug = s; slugInput.value = s;
      S.inicio.destaques = S.inicio.destaques.map(x => x === old ? s : x);
    } }),
    h('div', { class:'grid2' }, select('Categoria', p, 'cat', catOptions()), text('Subcategorias', subs, 'v', { hint:'Separe por vírgula. Ex.: Discos, Rebolos', change: v => { p.sub = v.split(',').map(s => s.trim()).filter(Boolean); } })),
    slugF,
    check('Mostrar nos destaques da página inicial', ehDestaque, on => { const has = S.inicio.destaques.includes(p.slug); if (on !== has) toggleDestaque(p.slug); }),
    h('div', { class:'f' }, h('span', {}, 'Fotos (a primeira é a principal)'),
      listEditor(imgs, im => image('Imagem', im, 's', { change: v => { im.t = v; im.ss = ''; } }),
        { title: i => i ? `Foto ${i + 1}` : 'Foto principal', newItem: () => ({ s:'', t:'', ss:'' }), addLabel:'Adicionar foto' })),
    text('Resumo (aparece no Google e nos cards de máquina)', p, 'sum', { area:true, rows:2, max:160, hint:'Até 160 caracteres. Se ficar vazio, é criado a partir da descrição.' }),
    rte('Descrição curta (ao lado da foto)', p, 'short'),
    rte('Descrição completa', p, 'desc', 'Pode ter listas, negrito e títulos. Ao colar de outro site, o texto entra sem formatação.'));
  $('#excluir').hidden = false;
  $('#excluir').onclick = () => {
    if (!confirm(`Excluir "${p.name || 'este produto'}"? Ele sai do site quando você salvar.`)) return;
    P.splice(P.indexOf(p), 1);
    S.inicio.destaques = S.inicio.destaques.filter(s => s !== p.slug);
    setDirty(); renderTabs(); close(); toast('Produto excluído');
  };
  const close = () => {
    if (!p.name.trim() && P.includes(p) && !p.img.length) { P.splice(P.indexOf(p), 1); renderTabs(); }
    d.hidden = true; onClose && onClose();
  };
  d.querySelectorAll('[data-close]').forEach(b => b.onclick = close);
  d.onkeydown = e => { if (e.key === 'Escape') close(); };
  d.hidden = false;
  body.scrollTop = 0;
  body.querySelector('input').focus();
}

start();
})();
