/* =====================================================================
   FeFER, script compartilhado por todas as páginas
   - monta topo, rodapé, chamada final (CTA) e botão do WhatsApp
   - preenchimento direcional dos botões  [data-fill], [data-fill="x"], [data-fill="y"]
   - animações de entrada com Motion       [data-reveal]
   - lista de orçamento (vários produtos numa mensagem só)
   Os textos vêm de assets/content.js e os produtos de assets/products.js
   ===================================================================== */
(() => {
const M = window.Motion || null;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ease = [0.22, 1, 0.36, 1];
const SITE = window.FEFER_SITE || {};
const C = SITE.contato || {};
const CATS = Object.fromEntries(Object.entries(SITE.categorias || {}).map(([s, c]) => [s, c.nome]));
const PRODUCTS = window.FEFER_PRODUCTS || [];
const page = document.body.dataset.page || '';

const icon = {
  arrow:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M12 5v14M5 12h14"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8"><path d="m5 12.5 4.5 4.5L19 7"/></svg>',
  list:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.2" fill="currentColor"/><circle cx="4.5" cy="12" r="1.2" fill="currentColor"/><circle cx="4.5" cy="18" r="1.2" fill="currentColor"/></svg>',
  close:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  wa:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.2 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l2 1c.3.1.5.2.5.3.1.2.1.7-.1 1.3z"/></svg>',
  gear:'<svg class="gear" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.4 13a7.7 7.7 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.6 7.6 0 0 0-1.7-1L15 3.3h-4L10.7 6a7.6 7.6 0 0 0-1.7 1l-2.5-1-2 3.5L4.6 11a7.7 7.7 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.6 7.6 0 0 0 1.7 1l.3 2.7h4l.3-2.7a7.6 7.6 0 0 0 1.7-1l2.5 1 2-3.5zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z"/></svg>',
};

/* ---------- helpers ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* *palavra* vira destaque */
const mark = (s, cls = 'hl') => esc(s).replace(/\*([^*]+)\*/g, `<span class="${cls}">$1</span>`);
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const param = k => new URLSearchParams(location.search).get(k);
const wa = msg => `https://api.whatsapp.com/send/?phone=${C.whatsapp || ''}` + (msg ? `&text=${encodeURIComponent(msg)}` : '');
const productUrl = p => `produto.html?p=${encodeURIComponent(p.slug)}`;
const catUrl = slug => slug === 'maquinas' ? 'maquinas.html' : `catalogo.html?cat=${encodeURIComponent(slug)}`;
const countByCat = PRODUCTS.reduce((a, p) => (a[p.cat] = (a[p.cat] || 0) + 1, a), {});
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } },
};

function card(p) {
  const img = p.img[0] || {};
  const inList = Quote.has(p.slug);
  return `<article class="prod" data-reveal data-cat="${esc(p.cat)}">
    <a class="pic" href="${productUrl(p)}" tabindex="-1" aria-hidden="true"><img src="${esc(img.t || img.s)}" srcset="${esc(img.ss)}" sizes="(max-width:640px) 45vw, 280px" alt="" loading="lazy" decoding="async"></a>
    <div class="info">
      <span class="tag">${esc(CATS[p.cat] || '')}</span>
      <h3><a href="${productUrl(p)}">${esc(p.name)}</a></h3>
      <div class="prod-actions">
        <a class="more" href="${productUrl(p)}">Ver produto ${icon.arrow}</a>
        <button class="add-quote${inList ? ' on' : ''}" type="button" data-quote="${esc(p.slug)}" aria-pressed="${inList}" aria-label="${inList ? 'Remover da' : 'Adicionar à'} lista de orçamento: ${esc(p.name)}" title="Lista de orçamento">${inList ? icon.check : icon.plus}</button>
      </div>
    </div>
  </article>`;
}

/* ---------- lista de orçamento ---------- */
const Quote = {
  items: store.get('fefer-orcamento', []),
  has(slug) { return this.items.some(i => i.slug === slug); },
  save() { store.set('fefer-orcamento', this.items); this.render(); },
  toggle(slug) {
    if (this.has(slug)) { this.items = this.items.filter(i => i.slug !== slug); toast('Removido da lista de orçamento'); }
    else { this.items.push({ slug, qtd: 1 }); toast('Adicionado à lista de orçamento'); this.bump(); }
    this.save(); this.sync();
  },
  sync() {
    document.querySelectorAll('[data-quote]').forEach(b => {
      const on = this.has(b.dataset.quote);
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
      if (b.classList.contains('add-quote')) b.innerHTML = on ? icon.check : icon.plus;
      if (b.dataset.label !== undefined) b.querySelector('.lbl').textContent = on ? 'Na lista de orçamento' : 'Adicionar à lista';
    });
  },
  bump() {
    const b = document.querySelector('.quote-btn');
    if (b && M && !reduce) M.animate(b, { scale:[1, 1.18, 1] }, { duration:.45, ease });
  },
  message() {
    const lines = this.items.map(i => {
      const p = PRODUCTS.find(x => x.slug === i.slug);
      return p ? `${i.qtd}x ${p.name}` : null;
    }).filter(Boolean);
    return `Olá! Gostaria de um orçamento para os itens abaixo:\n\n${lines.join('\n')}\n\nObrigado!`;
  },
  render() {
    const n = this.items.length;
    document.querySelectorAll('.quote-count').forEach(e => { e.textContent = n; e.hidden = !n; });
    const list = document.getElementById('quoteList');
    if (!list) return;
    list.innerHTML = n ? this.items.map(i => {
      const p = PRODUCTS.find(x => x.slug === i.slug);
      if (!p) return '';
      const img = p.img[0] || {};
      return `<li>
        <img src="${esc(img.t || img.s)}" alt="">
        <div><a href="${productUrl(p)}">${esc(p.name)}</a>
          <div class="qty" role="group" aria-label="Quantidade">
            <button type="button" data-q="-1" data-s="${esc(p.slug)}" aria-label="Diminuir">−</button>
            <span>${i.qtd}</span>
            <button type="button" data-q="1" data-s="${esc(p.slug)}" aria-label="Aumentar">+</button>
          </div>
        </div>
        <button class="rm" type="button" data-rm="${esc(p.slug)}" aria-label="Remover">${icon.close}</button>
      </li>`;
    }).join('') : `<li class="empty-q"><p>Sua lista está vazia.</p><p>Use o botão <b>+</b> nos produtos para montar um pedido com vários itens e enviar tudo de uma vez.</p></li>`;
    document.getElementById('quoteSend').hidden = !n;
    document.getElementById('quoteSend').href = wa(this.message());
  },
};

/* ---------- layout compartilhado ---------- */
const NAV = [
  ['inicio','index.html','Início'],
  ['catalogo','catalogo.html','Produtos'],
  ['maquinas','maquinas.html','Máquinas'],
  ['sobre','sobre.html','Sobre'],
  ['contato','contato.html','Contato'],
];
const navLinks = NAV.map(([k, h, t]) => `<a href="${h}"${k === page ? ' class="active" aria-current="page"' : ''}>${t}</a>`).join('');
const searchForm = ph => `<form class="search" role="search" action="catalogo.html" method="get">
      <input type="search" name="q" placeholder="${ph}" aria-label="Buscar produtos" value="${esc(page === 'catalogo' ? (param('q') || '') : '')}">
      <button aria-label="Buscar">${icon.search}</button>
    </form>`;
const quoteBtn = `<button class="quote-btn" type="button" data-open-quote aria-label="Lista de orçamento">${icon.list}<span class="quote-count" hidden>0</span></button>`;

const headerSlot = document.getElementById('site-header');
if (headerSlot) {
  const topItems = Object.entries(CATS).map(([s, n]) => `<a href="${catUrl(s)}">${esc(n.toUpperCase())}</a><span aria-hidden="true"></span>`).join('');
  headerSlot.outerHTML = `
<a class="skip" href="#main">Pular para o conteúdo</a>
<div class="topbar"><div class="track">${topItems.repeat(4)}</div></div>
<header class="header" id="header">
  <div class="wrap">
    <a class="logo" href="index.html" aria-label="FeFER, página inicial">
      <img src="https://feferferramentas.com.br/wp-content/uploads/2023/06/Logo-4cm-completa.png" alt="FeFER Ferramentas para Usinagem" width="236" height="94">
    </a>
    <nav class="nav" aria-label="Principal">${navLinks}</nav>
    ${searchForm('Buscar ferramenta, marca ou código')}
    ${quoteBtn}
    <a class="btn btn--green btn--sm header-cta" data-fill href="${wa()}" target="_blank" rel="noopener">${esc(C.telefone)}</a>
    <button class="menu-btn" id="menuBtn" aria-label="Abrir menu" aria-expanded="false" aria-controls="mobileNav">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M4 7h16M4 12h16M4 17h10"/></svg>
    </button>
  </div>
  <div class="mobile-nav" id="mobileNav"><div class="wrap">${navLinks}${searchForm('Buscar ferramenta')}</div></div>
</header>`;
}

/* chamada final amarela, com texto próprio de cada página */
const ctaSlot = document.getElementById('site-cta');
if (ctaSlot) {
  const k = ctaSlot.dataset.cta || page;
  const t = (SITE.chamadas || {})[k] || (SITE.chamadas || {}).inicio || {};
  ctaSlot.outerHTML = `
<section class="cta">
  ${icon.gear}
  <div class="wrap">
    <h2 data-reveal>${mark(t.titulo)}</h2>
    <div class="cta-actions" data-reveal>
      <a class="btn btn--dark" data-fill href="${wa(t.mensagem)}" target="_blank" rel="noopener">${esc(t.botao)}</a>
      ${t.botao2 ? `<a class="btn btn--line-dark" data-fill="y" href="${esc(t.link2)}">${esc(t.botao2)}</a>` : ''}
    </div>
  </div>
</section>`;
}

const footerSlot = document.getElementById('site-footer');
if (footerSlot) {
  footerSlot.outerHTML = `
<footer class="footer">
  <div class="wrap">
    <div class="grid">
      <div>
        <a class="logo-f" href="index.html" aria-label="FeFER, página inicial"><img src="assets/logo-fefer-negativo.png" alt="FeFER Ferramentas para Usinagem" width="489" height="204"></a>
        <a href="mailto:${esc(C.email)}">${esc(C.email)}</a>
        <a href="contato.html">${esc(C.endereco)}<br>${esc(C.cidade)}, ${esc(C.cep)}</a>
      </div>
      <div>
        <h4>Navegação</h4>
        ${NAV.map(([, h, t]) => `<a href="${h}">${t}</a>`).join('')}
      </div>
      <div>
        <h4>Categorias</h4>
        ${Object.entries(CATS).slice(0, 6).map(([s, n]) => `<a href="${catUrl(s)}">${esc(n)}</a>`).join('')}
      </div>
      <div>
        <h4>Precisa de ajuda?</h4>
        <a class="phone" href="${wa()}" target="_blank" rel="noopener">${esc(C.telefone)}</a>
        <p style="margin:8px 0 16px;line-height:1.6;max-width:260px">${esc(C.horario)}</p>
        <div class="social">
          ${C.instagram ? `<a href="${esc(C.instagram)}" target="_blank" rel="noopener" aria-label="Instagram" data-fill="y"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg></a>` : ''}
          ${C.facebook ? `<a href="${esc(C.facebook)}" target="_blank" rel="noopener" aria-label="Facebook" data-fill="y"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 9V7c0-.8.5-1 1-1h2V3h-3c-2.8 0-3.5 2-3.5 3.5V9H8v3h2.5v9H14v-9h2.6l.4-3z"/></svg></a>` : ''}
          <a href="${wa()}" target="_blank" rel="noopener" aria-label="WhatsApp" data-fill="y">${icon.wa}</a>
        </div>
      </div>
    </div>
    <div class="legal">
      <span>Fefer Comercial e Distribuidora de Produtos LTDA © ${new Date().getFullYear()}. Todos os direitos reservados.</span>
      <span>CNPJ 35.063.488/0001-80</span>
    </div>
  </div>
</footer>
<a class="wa" href="${wa('Olá! Vim pelo site da FeFER.')}" target="_blank" rel="noopener" aria-label="Falar no WhatsApp">${icon.wa}</a>
<div class="quote-drawer" id="quoteDrawer" role="dialog" aria-modal="true" aria-labelledby="quoteTitle" hidden>
  <div class="qd-backdrop" data-close-quote></div>
  <div class="qd-panel">
    <div class="qd-head">
      <h2 id="quoteTitle">Lista de orçamento</h2>
      <button class="qd-close" type="button" data-close-quote aria-label="Fechar">${icon.close}</button>
    </div>
    <p class="qd-sub">Monte sua lista e envie tudo numa mensagem só pelo WhatsApp.</p>
    <ul class="qd-list" id="quoteList"></ul>
    <div class="qd-foot">
      <a class="btn btn--solid" data-fill id="quoteSend" href="#" target="_blank" rel="noopener" hidden>${icon.wa.replace('<svg', '<svg width="18" height="18"')} Enviar pedido</a>
      <a class="btn btn--line-dark" data-fill="y" href="catalogo.html">Continuar navegando</a>
    </div>
  </div>
</div>`;
}

/* ---------- preenchimento direcional ----------
   data-fill        → entra e sai pelo lado mais próximo do cursor
   data-fill="x"    → sempre da esquerda para a direita
   data-fill="y"    → sempre de cima para baixo                          */
const OFF = { left:'-101%,0', right:'101%,0', top:'0,-101%', bottom:'0,101%' };
function edge(el, e) {
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
  const d = { left:x, right:1 - x, top:y, bottom:1 - y };
  return Object.keys(d).reduce((a, b) => d[a] < d[b] ? a : b);
}
function initFill(root = document) {
  root.querySelectorAll('[data-fill]:not([data-fill-ready])').forEach(el => {
    el.dataset.fillReady = '';
    let fill = el.querySelector(':scope > .fill');
    if (!fill) { fill = document.createElement('span'); fill.className = 'fill'; fill.setAttribute('aria-hidden', 'true'); el.prepend(fill); }
    const mode = el.dataset.fill;
    const set = (from, to, animate) => {
      fill.style.transition = 'none';
      if (from) fill.style.transform = `translate3d(${OFF[from]},0)`;
      if (!animate) return;
      fill.getBoundingClientRect();
      fill.style.transition = 'transform .55s cubic-bezier(.65,0,.35,1)';
      fill.style.transform = to ? `translate3d(${OFF[to]},0)` : 'translate3d(0,0,0)';
    };
    set(mode === 'y' ? 'top' : 'left', null, false);
    el.addEventListener('pointerenter', e => {
      if (e.pointerType === 'touch') return;
      set(mode === 'x' ? 'left' : mode === 'y' ? 'top' : edge(el, e), null, true);
      el.classList.add('is-filled');
    });
    el.addEventListener('pointerleave', e => {
      if (e.pointerType === 'touch') return;
      set(null, mode === 'x' ? 'right' : mode === 'y' ? 'bottom' : edge(el, e), true);
      el.classList.remove('is-filled');
    });
    el.addEventListener('focusin', () => { if (el.matches(':focus-visible')) { set(mode === 'y' ? 'top' : 'left', null, true); el.classList.add('is-filled'); } });
    el.addEventListener('focusout', () => { if (!el.classList.contains('is-filled')) return; set(null, mode === 'y' ? 'bottom' : 'right', true); el.classList.remove('is-filled'); });
  });
}

/* ---------- inclinação suave nos cards de produto ---------- */
function initTilt(root = document) {
  if (reduce || !matchMedia('(hover:hover)').matches) return;
  root.querySelectorAll('.prod:not([data-tilt])').forEach(p => {
    p.dataset.tilt = '';
    p.addEventListener('pointermove', e => {
      const r = p.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      p.style.setProperty('--mx', x + 'px'); p.style.setProperty('--my', y + 'px');
      p.style.transform = `perspective(900px) rotateX(${((y / r.height) - .5) * -5}deg) rotateY(${((x / r.width) - .5) * 5}deg) translateY(-4px)`;
    });
    p.addEventListener('pointerleave', () => {
      if (M) M.animate(p, { transform:'perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0px)' }, { duration:.6, ease });
      else p.style.transform = '';
    });
  });
}

/* ---------- divide um título em palavras com máscara ---------- */
function splitWords(node) {
  [...node.childNodes].forEach(n => {
    if (n.nodeType === 3) {
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(t => {
        if (!t) return;
        if (/^\s+$/.test(t)) { frag.append(' '); return; }
        const w = document.createElement('span'); w.className = 'word';
        const i = document.createElement('span'); i.textContent = t; w.append(i); frag.append(w);
      });
      n.replaceWith(frag);
    } else if (n.nodeType === 1 && n.tagName !== 'BR') {
      const w = document.createElement('span'); w.className = 'word';
      const i = document.createElement('span'); n.replaceWith(w); w.append(i); i.append(n);
    }
  });
  return node.querySelectorAll('.word>span');
}

/* ---------- animações de entrada ----------
   Cada elemento é observado sozinho: o que já está na tela anima logo ao abrir,
   o resto anima quando aparecer. Elementos que entram juntos ganham um pequeno escalonamento. */
let queue = [], qTimer = null;
function flush() {
  const els = queue; queue = []; qTimer = null;
  els.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top || a.getBoundingClientRect().left - b.getBoundingClientRect().left);
  M.animate(els, { opacity:[0,1], y:[32,0], filter:['blur(6px)','blur(0px)'] }, { delay:M.stagger(.055), duration:.75, ease });
}
function reveal(items) {
  items = [...items];
  if (!items.length) return;
  if (!M || reduce) { items.forEach(e => e.style.opacity = 1); return; }
  queue.push(...items);
  if (!qTimer) qTimer = requestAnimationFrame(flush);
}
function initReveal(root = document) {
  const els = [...root.querySelectorAll('[data-reveal]:not([data-revealed])')];
  els.forEach(el => el.dataset.revealed = '');
  if (!M || reduce) return els.forEach(e => e.style.opacity = 1);
  els.forEach(el => M.inView(el, () => reveal([el]), { amount:0, margin:'0px 0px -6% 0px' }));
}
function heroIntro() {
  const h1 = document.querySelector('[data-split]');
  if (h1) {
    const words = splitWords(h1);
    if (M && !reduce) M.animate(words, { y:['110%','0%'], rotate:[6,0] }, { delay:M.stagger(.07, { startDelay:.1 }), duration:.9, ease });
  }
}
function countUp(el) {
  const to = +el.dataset.count;
  if (!M || reduce) { el.textContent = to; return; }
  M.animate(0, to, { duration:1.8, ease:[0.16, 1, 0.3, 1], onUpdate:v => el.textContent = Math.round(v) });
}

/* ---------- topo + menu ---------- */
function initHeader() {
  const header = document.getElementById('header');
  if (!header) return;
  const onScroll = () => header.classList.toggle('scrolled', scrollY > 30);
  addEventListener('scroll', onScroll, { passive:true }); onScroll();
  const btn = document.getElementById('menuBtn'), nav = document.getElementById('mobileNav');
  btn.addEventListener('click', () => {
    const open = !nav.classList.contains('open');
    btn.setAttribute('aria-expanded', open);
    if (!M || reduce) return nav.classList.toggle('open', open);
    if (open) {
      nav.classList.add('open'); const h = nav.scrollHeight; nav.style.height = '0px';
      M.animate(nav, { height:[0, h] }, { duration:.45, ease }).then(() => nav.style.height = '');
      M.animate(nav.querySelectorAll('a,form'), { opacity:[0,1], x:[-16,0] }, { delay:M.stagger(.04, { startDelay:.08 }), duration:.4, ease });
    } else {
      M.animate(nav, { height:[nav.offsetHeight, 0] }, { duration:.35, ease }).then(() => { nav.classList.remove('open'); nav.style.height = ''; });
    }
  });
}

/* ---------- gaveta da lista de orçamento ---------- */
function initQuote() {
  const dr = document.getElementById('quoteDrawer');
  if (!dr) return;
  const panel = dr.querySelector('.qd-panel');
  let last = null;
  const open = () => {
    last = document.activeElement; Quote.render(); dr.hidden = false; document.body.style.overflow = 'hidden';
    if (M && !reduce) { M.animate(panel, { x:['100%','0%'] }, { duration:.5, ease }); M.animate(dr.querySelector('.qd-backdrop'), { opacity:[0,1] }, { duration:.3 }); }
    dr.querySelector('.qd-close').focus();
  };
  const close = () => {
    const done = () => { dr.hidden = true; document.body.style.overflow = ''; last && last.focus(); };
    if (M && !reduce) M.animate(panel, { x:['0%','100%'] }, { duration:.35, ease }).then(done); else done();
  };
  document.addEventListener('click', e => {
    const q = e.target.closest('[data-quote]'); if (q) { e.preventDefault(); Quote.toggle(q.dataset.quote); return; }
    if (e.target.closest('[data-open-quote]')) return open();
    if (e.target.closest('[data-close-quote]')) return close();
    const rm = e.target.closest('[data-rm]'); if (rm) { Quote.items = Quote.items.filter(i => i.slug !== rm.dataset.rm); Quote.save(); Quote.sync(); return; }
    const qb = e.target.closest('[data-q]');
    if (qb) { const it = Quote.items.find(i => i.slug === qb.dataset.s); if (it) { it.qtd = Math.max(1, it.qtd + +qb.dataset.q); Quote.save(); } }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !dr.hidden) close(); });
  Quote.render();
}

/* ---------- aviso rápido ---------- */
function toast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
  t.textContent = msg;
  if (M && !reduce) M.animate(t, { opacity:[0,1,1,0], y:[16,0,0,8] }, { duration:2.4, times:[0,.12,.85,1] });
  else { t.style.opacity = 1; setTimeout(() => t.style.opacity = 0, 2000); }
}

function enhance(root = document) { initFill(root); initTilt(root); initReveal(root); }

window.FEFER = { M, reduce, ease, SITE, C, CATS, PRODUCTS, countByCat, esc, mark, norm, param, wa, productUrl, catUrl, card, icon,
  enhance, initFill, initTilt, reveal, splitWords, countUp, toast, Quote, store };

const boot = () => { initHeader(); initQuote(); heroIntro(); enhance(document); };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
