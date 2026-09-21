
const API = '/api';

let cpecas    = [];
let cClientes = [];

let TOKEN          = localStorage.getItem('pz_token') || '';
let USUARIO_LOGADO = JSON.parse(localStorage.getItem('pz_usuario') || 'null');
let setorEmFechamento = null;

// ============================================================
// UTILITÁRIOS GLOBAIS
// ============================================================

function R$(v) {
  return 'R$ ' + Number(v || 0).toFixed(2).replace('.', ',');
}

function badge(s) {
  const r = {
    recebido:     '📥 Recebido',
    em_producao:  '⚙️ Fabricando',
    saiu_entrega: '🚚 Saiu p/ Entrega',
    entregue:     '✅ Entregue',
    cancelado:    '❌ Cancelado',
  };
  return `<span class="badge b-${s}">${r[s] || s}</span>`;
}

function toast(msg, tipo = 'ok') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = `show ${tipo}`;
  setTimeout(() => el.className = '', 3000);
}

function abrir(id)  { document.getElementById(id).classList.add('open'); }
function fechar(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('.modal-bg').forEach(bg =>
  bg.addEventListener('click', e => { if (e.target === bg) bg.classList.remove('open'); })
);

async function api(method, url, body) {
  const opts = {
    method,
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${TOKEN}`,
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res  = await fetch(API + url, opts);
  const data = await res.json();
  if (res.status === 401) { sair(); throw new Error('Sessão expirada'); }
  if (!res.ok) throw new Error(data.erro || 'Erro na requisição');
  return data;
}

// ============================================================
// LOGIN / AUTENTICAÇÃO
// ============================================================

async function fazerLogin() {
  const email = document.getElementById('l-email').value.trim();
  const senha = document.getElementById('l-senha').value;
  const btn   = document.getElementById('btn-login');
  const erro  = document.getElementById('login-erro');

  if (!email || !senha) {
    erro.style.display = 'block';
    erro.textContent   = 'Preencha e-mail e senha.';
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Entrando...';
  erro.style.display = 'none';

  try {
    const res  = await fetch(API + '/auth/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, senha }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.erro || 'Credenciais inválidas');

    TOKEN          = data.token;
    USUARIO_LOGADO = data.usuario;
    localStorage.setItem('pz_token',   TOKEN);
    localStorage.setItem('pz_usuario', JSON.stringify(data.usuario));

    aplicarPerfil(data.usuario);
    document.body.classList.add('logado');

  } catch (e) {
    erro.style.display = 'block';
    erro.textContent   = e.message;
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Entrar';
  }
}

function sair() {
  TOKEN          = '';
  USUARIO_LOGADO = null;
  localStorage.removeItem('pz_token');
  localStorage.removeItem('pz_usuario');
  document.body.classList.remove('logado');
  document.getElementById('l-senha').value = '';
}

if (TOKEN && USUARIO_LOGADO) {
  aplicarPerfil(USUARIO_LOGADO);
  document.body.classList.add('logado');
}

// ============================================================
// PERFIL / NAVEGAÇÃO
// ============================================================

function aplicarPerfil(usuario) {
  document.getElementById('sb-nome').textContent   = usuario.nome;
  document.getElementById('sb-perfil').textContent = usuario.perfil;

  const isAdmin = usuario.perfil === 'Administrador';

  function show(id, visible, type = 'flex') {
    const el = document.getElementById(id);
    if (el) el.style.display = visible ? type : 'none';
  }
  function showEl(el, visible, type = 'flex') {
    if (el) el.style.display = visible ? type : 'none';
  }

  show('menu-usuarios',   isAdmin, 'block');
  show('btn-usuarios',    isAdmin, 'flex');
  show('sb-group-gestor', true,    'block');
  show('btn-nav-setores', true,    'flex');

  showEl(document.querySelector('[onclick*="clientes"]'),  true);
  showEl(document.querySelector('[onclick*="pedidos"]'),   true);
  showEl(document.querySelector('[onclick*="dashboard"]'), true);
  showEl(document.querySelector('.sb-group'),              true, 'block');

  show('btn-nova-peca', true, 'inline-flex');
  show('stat-fat',      true, 'block');
  show('stat-cli',      true, 'block');

  ir('dashboard', document.querySelector('[onclick*="dashboard"]'));
}

function ir(pg, btn) {
  const perfil = document.getElementById('sb-perfil').textContent;
  if (pg === 'usuarios' && perfil !== 'Administrador') {
    toast('Acesso restrito a Administradores', 'err');
    return;
  }
  document.querySelectorAll('.secao').forEach(s => s.classList.remove('ativa'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('ativo'));
  document.getElementById('pg-' + pg).classList.add('ativa');
  if (btn) btn.classList.add('ativo');

  const loaders = {
    dashboard: carregarDashboard,
    pedidos:   carregarPedidos,
    pecas:     carregarpecas,
    clientes:  carregarClientes,
    usuarios:  carregarUsuarios,
    setores:   carregarsetores,
  };
  if (loaders[pg]) loaders[pg]();
}

// ============================================================
// DASHBOARD
// ============================================================

async function carregarDashboard() {
  const h = new Date().getHours();
  const s = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  document.getElementById('dash-sub').textContent = `${s}! Aqui está o resumo.`;

  try {
    const [pecas, clientes, pedidos] = await Promise.all([
      api('GET', '/pecas'),
      api('GET', '/clientes'),
      api('GET', '/pedidos'),
    ]);

    cpecas    = pecas;
    cClientes = clientes;

    document.getElementById('s-piz').textContent = pecas.length;
    document.getElementById('s-cli').textContent = clientes.length;
    document.getElementById('s-ped').textContent = pedidos.length;
    document.getElementById('s-ent').textContent =
      pedidos.filter(p => p.status === 'saiu_entrega').length;
    document.getElementById('s-fat').textContent =
      R$(pedidos.reduce((acc, p) => acc + (p.total || 0), 0));

    const pend = pedidos.filter(p => !['entregue','cancelado'].includes(p.status)).length;
    document.getElementById('s-ped-sub').textContent = `${pend} pendente(s)`;

    const elP = document.getElementById('dash-pedidos');
    elP.innerHTML = pedidos.slice(0, 8).map(p => `
      <div class="mini-row">
        <div>
          <div class="mn">#${String(p.numeroPedido || '?').padStart(3,'0')} · ${p.cliente?.nome || '—'}</div>
          <div class="mc">${new Date(p.createdAt).toLocaleString('pt-BR')}</div>
        </div>
        <div style="text-align:right">
          ${badge(p.status)}<br>
          <small style="color:var(--muted)">${R$(p.total)}</small>
        </div>
      </div>`).join('') ||
      '<div class="empty"><span class="ei">📋</span>Nenhum pedido ainda</div>';

    const elC = document.getElementById('dash-cardapio');
    elC.innerHTML = pecas.filter(p => p.disponivel).slice(0, 8).map(p => `
      <div class="mini-row">
        <span>🛰️ ${p.nome}</span>
        <small style="color:var(--muted)">${R$(p.precos?.G || p.precos?.P || 0)}</small>
      </div>`).join('') ||
      '<div class="empty"><span class="ei">⚙️</span>Nenhuma peça</div>';

  } catch (e) { toast('Erro dashboard: ' + e.message, 'err'); }
}

// ============================================================
// SETORES
// ============================================================

async function carregarsetores(setorFiltro = null) {
  const grid = document.getElementById('grid-setores');
  grid.innerHTML = '<div class="spin-wrap"><div class="spin"></div> Carregando...</div>';

  document.getElementById('setores-sub').textContent =
    `Olá, ${USUARIO_LOGADO?.nome}! Seus pedidos ativos.`;

  try {
    const url    = USUARIO_LOGADO?.perfil === 'Administrador'
      ? '/pedidos'
      : `/pedidos?gestor=${USUARIO_LOGADO.id}`;
    const pedidos = await api('GET', url);
    const ativos  = pedidos.filter(p => !['entregue','cancelado'].includes(p.status));

    document.getElementById('g-ped').textContent     = pedidos.length;
    document.getElementById('g-ped-sub').textContent = `${ativos.length} ativo(s)`;

    const setoresAtivas = new Set(ativos.map(p => p.setor).filter(Boolean));
    document.getElementById('g-setores').textContent  = setoresAtivas.size;
    document.getElementById('g-preparo').textContent = ativos.filter(p => p.status === 'em_producao').length;
    document.getElementById('g-prontos').textContent = ativos.filter(p => p.status === 'saiu_entrega').length;

    const botoes = document.getElementById('setor-botoes');
    botoes.innerHTML = Array.from({length: 10}, (_, i) => {
      const n      = i + 1;
      const temPed = setoresAtivas.has(n);
      const ativo  = setorFiltro === n;
      return `
        <button class="btn btn-sm ${ativo ? 'btn-red' : temPed ? 'btn-green' : 'btn-ghost'}"
          onclick="carregarsetores(${n})"
          title="${temPed ? 'Setor com pedido ativo' : 'Setor livre'}">
          ${n}${temPed ? ' 🔴' : ''}
        </button>`;
    }).join('');

    const pedidosFiltrados = setorFiltro
      ? ativos.filter(p => p.setor === setorFiltro)
      : ativos;

    if (!pedidosFiltrados.length) {
      grid.innerHTML = `
        <div class="empty" style="grid-column:1/-1">
          <span class="ei">🚚</span>
          Nenhum pedido ativo no momento.<br>
          <button class="btn btn-red" style="margin-top:12px" onclick="abrirPedidosetor()">
            + Abrir primeiro pedido
          </button>
        </div>`;
      return;
    }

    const porsetor = {};
    pedidosFiltrados.forEach(p => {
      const key = p.setor || 'balcão';
      if (!porsetor[key]) porsetor[key] = [];
      porsetor[key].push(p);
    });

    grid.innerHTML = Object.entries(porsetor).map(([setor, peds]) => {
      const totalsetor  = peds.reduce((s, p) => s + (p.total || 0), 0);
      const todosItens  = peds.flatMap(p => p.itens);
      const itensAgrup  = {};
      todosItens.forEach(it => {
        const nome = it.nomePeca || '—';
        const size = it.tamanho ? ` (${it.tamanho})` : '';
        const k    = `${nome}${size}`;
        itensAgrup[k] = (itensAgrup[k] || 0) + it.quantidade;
      });
      const statusAtual = peds[peds.length - 1]?.status;

      return `
        <div class="setor-card">
          <div class="setor-card-head">
            <div>
              <div class="setor-num">Setor ${setor}</div>
              <div style="font-size:.72rem;color:var(--muted);margin-top:2px">
                ${peds.length} pedido(s) · ${peds[0]?.cliente?.nome || 'Sem cadastro'}
              </div>
            </div>
            ${badge(statusAtual)}
          </div>
          <div class="setor-card-body">
            ${Object.entries(itensAgrup).map(([nome, qtd]) => `
              <div class="setor-item"><strong>${qtd}x ${nome}</strong></div>`).join('')}
            <div class="setor-total">
              <span style="color:var(--muted)">Total do setor</span>
              <span style="color:var(--gold)">${R$(totalsetor)}</span>
            </div>
          </div>
          <div class="setor-card-foot">
            <button class="btn btn-ghost btn-sm" style="flex:1"
              onclick="abrirPedidosetor(${setor})">+ Item</button>
            <button class="btn btn-blue btn-sm"
              onclick="abrirStatus('${peds[peds.length-1]?._id}','${statusAtual}')">
              📝 Status
            </button>
            <button class="btn btn-green btn-sm"
              onclick="abrirFecharsetor(${setor}, ${totalsetor}, '${peds.map(p=>p._id).join(',')}')">
              ✅ Fechar
            </button>
          </div>
        </div>`;
    }).join('');

  } catch (e) {
    grid.innerHTML = `<div class="empty" style="color:var(--red)">${e.message}</div>`;
  }
}

async function abrirPedidosetor(setorNum = null) {
  try {
    if (!cpecas.length)    cpecas    = await api('GET', '/pecas');
    if (!cClientes.length) cClientes = await api('GET', '/clientes');
  } catch (e) { toast('Erro ao carregar dados', 'err'); return; }

  document.getElementById('pm-cli').innerHTML =
    '<option value="">— Sem cadastro —</option>' +
    cClientes.map(c => `<option value="${c._id}">${c.nome} · ${c.telefone}</option>`).join('');

  document.getElementById('pm-setor').value = setorNum || '';
  document.getElementById('itens-setor-lista').innerHTML = '';
  document.getElementById('pm-obs').value  = '';
  document.getElementById('pm-sub').textContent = 'R$ 0,00';
  document.getElementById('pm-tot').textContent = 'R$ 0,00';

  addItemsetor();
  abrir('m-pedido-setor');
}

function addItemsetor() {
  const d    = document.createElement('div');
  d.className = 'item-row';
  const opts = cpecas.filter(p => p.disponivel)
    .map(p => `<option value="${p._id}"
      data-p="${p.precos?.P||0}" data-m="${p.precos?.M||0}" data-g="${p.precos?.G||0}">
      ${p.nome}</option>`).join('');
  d.innerHTML = `
    <select class="ip" onchange="recalcsetor()"><option value="">Selecione...</option>${opts}</select>
    <select class="it" onchange="recalcsetor()">
      <option value="P">P</option><option value="M">M</option><option value="G" selected>G</option>
    </select>
    <input class="iq" type="number" value="1" min="1" oninput="recalcsetor()">
    <div class="is" style="font-size:.8rem;text-align:right;color:var(--muted)">R$ 0,00</div>
    <button class="btn-rm" onclick="this.parentElement.remove();recalcsetor()">×</button>`;
  document.getElementById('itens-setor-lista').appendChild(d);
}

function recalcsetor() {
  let sub = 0;
  document.querySelectorAll('#itens-setor-lista .item-row').forEach(row => {
    const sel = row.querySelector('.ip');
    const tam = row.querySelector('.it').value.toLowerCase();
    const qtd = parseInt(row.querySelector('.iq').value) || 0;
    const pc  = parseFloat(sel.options[sel.selectedIndex]?.dataset?.[tam] || 0);
    const s   = pc * qtd;
    sub += s;
    row.querySelector('.is').textContent = R$(s);
  });
  document.getElementById('pm-sub').textContent = R$(sub);
  document.getElementById('pm-tot').textContent = R$(sub);
}

async function salvarPedidosetor() {
  const setor = parseInt(document.getElementById('pm-setor').value) || 0;
  if (!setor || setor < 1) { toast('Selecione o setor', 'err'); return; }

  const cliId = document.getElementById('pm-cli').value || null;
  const itens = [];
  let valido  = true;

  document.querySelectorAll('#itens-setor-lista .item-row').forEach(row => {
    const pid = row.querySelector('.ip').value;
    if (!pid) { valido = false; return; }
    itens.push({
      peca:       pid,
      tamanho:    row.querySelector('.it').value,
      quantidade: parseInt(row.querySelector('.iq').value) || 1,
    });
  });

  if (!valido || !itens.length) { toast('Adicione ao menos um item', 'err'); return; }

  let clienteId = cliId;
  if (!clienteId) {
    try {
      const todos  = await api('GET', `/clientes?busca=Setor ${setor}`);
      const existe = todos.find(c => c.nome === `Setor ${setor}`);
      if (existe) {
        clienteId = existe._id;
      } else {
        const novo = await api('POST', '/clientes', { nome: `Setor ${setor}`, telefone: 'setor' });
        clienteId  = novo._id;
        cClientes  = [];
      }
    } catch (e) { toast('Erro ao registrar setor', 'err'); return; }
  }

  try {
    await api('POST', '/pedidos', {
      cliente:        clienteId,
      itens,
      taxaEntrega:    0,
      formaPagamento: 'pix',
      observacoes:    document.getElementById('pm-obs').value,
      setor,
      origem:         'setor',
      gestor:         USUARIO_LOGADO?.id,
    });
    toast(`Pedido lançado no setor ${setor}! 🛰️`);
    fechar('m-pedido-setor');
    carregarsetores();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}

function abrirFecharsetor(setor, total, ids) {
  setorEmFechamento = { setor, total, ids: ids.split(',') };
  document.getElementById('fm-titulo').textContent = `Fechar Setor ${setor}`;
  document.getElementById('fm-total').textContent  = R$(total);
  document.getElementById('fm-resumo').innerHTML   =
    `<p style="font-size:.82rem;color:var(--muted)">
      ${setorEmFechamento.ids.length} pedido(s) serão marcados como
      <strong style="color:var(--green)">Entregue</strong>.
    </p>`;
  abrir('m-fechar-setor');
}

async function confirmarFechamento() {
  if (!setorEmFechamento) return;
  try {
    await Promise.all(
      setorEmFechamento.ids.map(id =>
        api('PATCH', `/pedidos/${id}/status`, { status: 'entregue' })
      )
    );
    toast(`Setor ${setorEmFechamento.setor} fechado! ✅`);
    fechar('m-fechar-setor');
    setorEmFechamento = null;
    carregarsetores();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}

// ============================================================
// PEÇAS
// ============================================================

async function carregarpecas() {
  const el = document.getElementById('tbl-pecas');
  el.innerHTML = '<div class="spin-wrap"><div class="spin"></div> Carregando...</div>';
  try {
    cpecas = await api('GET', '/pecas');
    if (!cpecas.length) {
      el.innerHTML = '<div class="empty"><span class="ei">⚙️</span>Nenhuma peça</div>';
      return;
    }
    el.innerHTML = `
      <table>
        <thead>
          <tr><th>Nome</th><th>Categoria</th><th>Status</th><th>Preço (P)</th><th>Ações</th></tr>
        </thead>
        <tbody>
          ${cpecas.map(p => `
            <tr>
              <td><strong>${p.nome}</strong></td>
              <td><span class="badge b-cat">${p.categoria || '—'}</span></td>
              <td><span class="badge ${p.disponivel ? 'b-on' : 'b-off'}">${p.disponivel ? '✅ Disponível' : '❌ Off'}</span></td>
              <td>${R$((() => {
                if (!p.precos) return 0;
                if (typeof p.precos === 'object') return p.precos.P ?? p.precos.M ?? p.precos.G ?? 0;
                try { const o = JSON.parse(p.precos); return o.P ?? o.M ?? o.G ?? 0; } catch { return 0; }
              })())}</td>
              <td>
                <div style="display:flex;gap:5px">
                  <button class="btn btn-ghost btn-sm" onclick="editarpeca('${p._id}')">✏️ Editar</button>
                  <button class="btn btn-danger btn-sm" onclick="deletarpeca('${p._id}','${p.nome.replace(/'/g,"\\'")}')">🗑️</button>
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    el.innerHTML = `<div class="empty" style="color:var(--red)">${e.message}</div>`;
  }
}

function abrirpeca() {
  document.getElementById('m-peca-t').textContent = 'Nova Peça';
  document.getElementById('p-id').value    = '';
  document.getElementById('p-nome').value  = '';
  document.getElementById('p-pp').value    = '';
  document.getElementById('p-cat').value   = 'Motor';
  document.getElementById('p-disp').value  = 'true';
  abrir('m-peca');
}

async function editarpeca(id) {
  let p = cpecas.find(x => String(x._id) === String(id));

  if (!p) {
    try {
      p = await api('GET', '/pecas/' + id);
    } catch (e) {
      toast('Erro ao carregar peça: ' + e.message, 'err');
      return;
    }
  }

  document.getElementById('m-peca-t').textContent = 'Editar Peça';
  document.getElementById('p-id').value   = p._id;
  document.getElementById('p-nome').value = p.nome;

  let precoValor = '';
  if (p.precos && typeof p.precos === 'object') {
    precoValor = p.precos.P ?? p.precos.M ?? p.precos.G ?? '';
  } else if (typeof p.precos === 'string') {
    try {
      const obj = JSON.parse(p.precos);
      precoValor = obj.P ?? obj.M ?? obj.G ?? '';
    } catch { precoValor = ''; }
  } else if (typeof p.precos === 'number') {
    precoValor = p.precos;
  }

  document.getElementById('p-pp').value   = precoValor;
  document.getElementById('p-cat').value  = p.categoria || 'Motor';
  document.getElementById('p-disp').value = String(p.disponivel);
  abrir('m-peca');
}

async function salvarpeca() {
  const id   = document.getElementById('p-id').value;
  const nome = document.getElementById('p-nome').value.trim();
  if (!nome) { toast('Nome é obrigatório', 'err'); return; }

  const d = {
    nome,
    precos:     { P: parseFloat(document.getElementById('p-pp').value) || 0 },
    categoria:  document.getElementById('p-cat').value,
    disponivel: document.getElementById('p-disp').value === 'true',
  };

  try {
    if (id) {
      await api('PUT', '/pecas/' + id, d);
      toast('Peça atualizada! ✅');
    } else {
      await api('POST', '/pecas', d);
      toast('Peça criada! ✅');
    }
    fechar('m-peca');
    cpecas = [];
    carregarpecas();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}

async function deletarpeca(id, nome) {
  if (!confirm(`Deletar "${nome}"?`)) return;
  try {
    await api('DELETE', '/pecas/' + id);
    toast('Peça deletada!');
    cpecas = [];
    carregarpecas();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}

// ============================================================
// CLIENTES
// ============================================================

async function carregarClientes(busca = '') {
  const el = document.getElementById('tbl-clientes');
  el.innerHTML = '<div class="spin-wrap"><div class="spin"></div> Carregando...</div>';
  try {
    const url = busca ? `/clientes?busca=${encodeURIComponent(busca)}` : '/clientes';
    cClientes = await api('GET', url);

    if (!cClientes.length) {
      el.innerHTML = '<div class="empty"><span class="ei">👥</span>Nenhum cliente</div>';
      return;
    }

    el.innerHTML = `
      <table>
        <thead><tr><th>Nome</th><th>Telefone</th><th>Endereço</th><th>Obs</th><th>Ações</th></tr></thead>
        <tbody>
          ${cClientes.map(c => `
            <tr>
              <td><strong>${c.nome}</strong></td>
              <td>${c.telefone}</td>
              <td style="font-size:.76rem;color:var(--muted)">
                ${[c.endereco?.rua, c.endereco?.numero, c.endereco?.bairro, c.endereco?.cidade]
                  .filter(Boolean).join(', ') || '—'}
              </td>
              <td style="font-size:.76rem;color:var(--muted)">${c.observacoes || '—'}</td>
              <td>
                <div style="display:flex;gap:5px">
                  <button class="btn btn-ghost btn-sm" onclick="editarCliente('${c._id}')">✏️ Editar</button>
                  <button class="btn btn-danger btn-sm" onclick="deletarCliente('${c._id}','${c.nome.replace(/'/g,"\\'")}')">🗑️</button>
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    el.innerHTML = `<div class="empty" style="color:var(--red)">${e.message}</div>`;
  }
}

let _t;
function buscarCli(v) {
  clearTimeout(_t);
  _t = setTimeout(() => carregarClientes(v), 400);
}

function abrirCliente() {
  document.getElementById('m-cli-t').textContent = 'Novo Cliente';
  ['c-id','c-nome','c-tel','c-rua','c-num','c-bairro','c-cidade','c-cep','c-comp','c-obs']
    .forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
  abrir('m-cliente');
}

async function editarCliente(id) {
  let c = cClientes.find(x => x._id === id || String(x._id) === String(id));

  if (!c) {
    try {
      c = await api('GET', '/clientes/' + id);
    } catch (e) {
      toast('Erro ao carregar cliente: ' + e.message, 'err');
      return;
    }
  }

  document.getElementById('m-cli-t').textContent    = 'Editar Cliente';
  document.getElementById('c-id').value     = c._id;
  document.getElementById('c-nome').value   = c.nome;
  document.getElementById('c-tel').value    = c.telefone;
  document.getElementById('c-rua').value    = c.endereco?.rua         || '';
  document.getElementById('c-num').value    = c.endereco?.numero      || '';
  document.getElementById('c-bairro').value = c.endereco?.bairro      || '';
  document.getElementById('c-cidade').value = c.endereco?.cidade      || '';
  document.getElementById('c-cep').value    = c.endereco?.cep         || '';
  document.getElementById('c-comp').value   = c.endereco?.complemento || '';
  document.getElementById('c-obs').value    = c.observacoes           || '';
  abrir('m-cliente');
}

async function salvarCliente() {
  const id   = document.getElementById('c-id').value;
  const nome = document.getElementById('c-nome').value.trim();
  const tel  = document.getElementById('c-tel').value.trim();
  if (!nome || !tel) { toast('Nome e telefone são obrigatórios', 'err'); return; }

  const d = {
    nome,
    telefone: tel,
    endereco: {
      rua:         document.getElementById('c-rua').value.trim(),
      numero:      document.getElementById('c-num').value.trim(),
      bairro:      document.getElementById('c-bairro').value.trim(),
      cidade:      document.getElementById('c-cidade').value.trim(),
      cep:         document.getElementById('c-cep').value.trim(),
      complemento: document.getElementById('c-comp').value.trim(),
    },
    observacoes: document.getElementById('c-obs').value.trim(),
  };

  try {
    if (id) {
      await api('PUT', '/clientes/' + id, d);
      toast('Cliente atualizado! ✅');
    } else {
      await api('POST', '/clientes', d);
      toast('Cliente cadastrado! ✅');
    }
    fechar('m-cliente');
    cClientes = [];
    carregarClientes();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}

async function deletarCliente(id, nome) {
  if (!confirm(`Deletar "${nome}"?`)) return;
  try {
    await api('DELETE', '/clientes/' + id);
    toast('Cliente deletado!');
    cClientes = [];
    carregarClientes();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}

// ============================================================
// PEDIDOS
// ============================================================

async function carregarPedidos() {
  const el = document.getElementById('tbl-pedidos');
  el.innerHTML = '<div class="spin-wrap"><div class="spin"></div> Carregando...</div>';
  try {
    const pedidos = await api('GET', '/pedidos');
    if (!pedidos.length) {
      el.innerHTML = '<div class="empty"><span class="ei">📋</span>Nenhum pedido</div>';
      return;
    }
    el.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>#</th><th>Cliente</th><th>Itens</th><th>Subtotal</th>
            <th>Entrega</th><th>Total</th><th>Pagamento</th><th>Status</th>
            <th>Data</th><th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${pedidos.map(p => `
            <tr>
              <td><strong style="color:var(--red)">#${String(p.numeroPedido||'?').padStart(3,'0')}</strong></td>
              <td>
                <strong>${p.cliente?.nome || '—'}</strong><br>
                <small style="color:var(--muted)">${p.cliente?.telefone || ''}</small>
              </td>
              <td style="font-size:.76rem">
                ${p.itens.map(it =>
                  `${it.quantidade}x ${it.nomePeca || it.nome_peca || '?'}${it.tamanho ? ` (${it.tamanho})` : ''} — ${R$(it.precoUnitario ?? it.preco_unitario ?? 0)}`
                ).join('<br>')}
              </td>
              <td>${R$(p.subtotal)}</td>
              <td>${R$(p.taxaEntrega)}</td>
              <td><strong style="color:var(--gold)">${R$(p.total)}</strong></td>
              <td style="font-size:.76rem">${(p.formaPagamento || '—').replace('_', ' ')}</td>
              <td>${badge(p.status)}</td>
              <td style="font-size:.7rem;color:var(--muted)">${new Date(p.createdAt).toLocaleString('pt-BR')}</td>
              <td>
                <div style="display:flex;gap:5px">
                  <button class="btn btn-blue btn-sm" onclick="abrirStatus('${p._id}','${p.status}')">📝</button>
                  <button class="btn btn-danger btn-sm" onclick="deletarPedido('${p._id}')">🗑️</button>
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    el.innerHTML = `<div class="empty" style="color:var(--red)">${e.message}</div>`;
  }
}

async function abrirPedido() {
  try {
    cpecas    = await api('GET', '/pecas');
    cClientes = await api('GET', '/clientes');
  } catch (e) { toast('Erro ao carregar dados', 'err'); return; }

  document.getElementById('ped-cli').innerHTML =
    '<option value="">— Selecione o cliente —</option>' +
    cClientes.map(c => `<option value="${c._id}">${c.nome} · ${c.telefone}</option>`).join('');

  document.getElementById('itens-lista').innerHTML = '';
  document.getElementById('ped-taxa').value  = '0';
  document.getElementById('ped-obs').value   = '';
  document.getElementById('ped-pag').value   = 'pix';
  document.getElementById('ped-sub').textContent = 'R$ 0,00';
  document.getElementById('ped-tot').textContent = 'R$ 0,00';
  document.getElementById('wrap-troco').style.display = 'none';

  addItem();
  abrir('m-pedido');
}

function addItem() {
  const d    = document.createElement('div');
  d.className = 'item-row';
  const opts = cpecas
    .filter(p => p.disponivel)
    .map(p => `<option value="${p._id}" data-p="${p.precos?.P||0}" data-m="${p.precos?.M||0}" data-g="${p.precos?.G||0}">${p.nome}</option>`)
    .join('');
  d.innerHTML = `
    <select class="ip" onchange="recalc()"><option value="">Selecione...</option>${opts}</select>
    <input class="iq" type="number" value="1" min="1" oninput="recalc()">
    <div class="is" style="font-size:.8rem;text-align:right;color:var(--muted)">R$ 0,00</div>
    <button class="btn-rm" onclick="this.parentElement.remove(); recalc()">×</button>`;
  document.getElementById('itens-lista').appendChild(d);
}

function recalc() {
  let sub = 0;
  document.querySelectorAll('#itens-lista .item-row').forEach(row => {
    const sel = row.querySelector('.ip');
    const qtd = parseInt(row.querySelector('.iq').value) || 0;
    const opt = sel.options[sel.selectedIndex];
    const pc  = parseFloat(opt?.dataset?.p || 0);
    const s   = pc * qtd;
    sub += s;
    row.querySelector('.is').textContent = R$(s);
  });
  const taxa = parseFloat(document.getElementById('ped-taxa').value) || 0;
  document.getElementById('ped-sub').textContent = R$(sub);
  document.getElementById('ped-tot').textContent = R$(sub + taxa);
}

function toggleTroco() {
  const pag = document.getElementById('ped-pag').value;
  document.getElementById('wrap-troco').style.display =
    pag === 'dinheiro' ? 'block' : 'none';
}

async function salvarPedido() {
  const cliId = document.getElementById('ped-cli').value;
  if (!cliId) { toast('Selecione um cliente', 'err'); return; }

  const itens = [];
  let valido  = true;
  document.querySelectorAll('#itens-lista .item-row').forEach(row => {
    const pid = row.querySelector('.ip').value;
    if (!pid) { valido = false; return; }
    itens.push({
      peca:       pid,
      quantidade: parseInt(row.querySelector('.iq').value) || 1,
      tamanho:    'P',
    });
  });

  if (!valido || !itens.length) {
    toast('Adicione ao menos um item válido', 'err');
    return;
  }

  try {
    await api('POST', '/pedidos', {
      cliente:        cliId,
      itens,
      taxaEntrega:    parseFloat(document.getElementById('ped-taxa').value) || 0,
      formaPagamento: document.getElementById('ped-pag').value,
      troco:          parseFloat(document.getElementById('ped-troco')?.value) || 0,
      observacoes:    document.getElementById('ped-obs').value,
    });
    toast('Pedido criado! 🛰️');
    fechar('m-pedido');
    carregarPedidos();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}

function abrirStatus(id, status) {
  if (!id || id === 'undefined') {
    toast('Pedido não encontrado', 'err');
    return;
  }
  document.getElementById('st-id').value  = id;
  document.getElementById('st-val').value = status;
  abrir('m-status');
}

async function salvarStatus() {
  const id     = document.getElementById('st-id').value;
  const status = document.getElementById('st-val').value;
  try {
    await api('PATCH', '/pedidos/' + id + '/status', { status });
    toast('Status atualizado! ✅');
    fechar('m-status');
    const secaoAtiva = document.querySelector('.secao.ativa')?.id;
    if (secaoAtiva === 'pg-pedidos')  carregarPedidos();
    if (secaoAtiva === 'pg-setores')  carregarsetores();
    if (secaoAtiva === 'pg-dashboard') carregarDashboard();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}

async function deletarPedido(id) {
  if (!confirm('Deletar este pedido?')) return;
  try {
    await api('DELETE', '/pedidos/' + id);
    toast('Pedido deletado!');
    carregarPedidos();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}

// ============================================================
// USUÁRIOS
// ============================================================

async function carregarUsuarios() {
  const el = document.getElementById('tbl-usuarios');
  el.innerHTML = '<div class="spin-wrap"><div class="spin"></div> Carregando...</div>';
  try {
    const us = await api('GET', '/usuarios');
    if (!us.length) {
      el.innerHTML = '<div class="empty"><span class="ei">🔐</span>Nenhum usuário</div>';
      return;
    }
    el.innerHTML = `
      <table>
        <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th><th>Criado em</th><th>Ações</th></tr></thead>
        <tbody>
          ${us.map(u => `
            <tr>
              <td><strong>${u.nome}</strong></td>
              <td>${u.email}</td>
              <td><span class="badge ${u.perfil === 'Administrador' ? 'b-admin' : 'b-atend'}">${u.perfil}</span></td>
              <td><span class="badge ${u.ativo ? 'b-on' : 'b-off'}">${u.ativo ? 'Ativo' : 'Inativo'}</span></td>
              <td style="font-size:.73rem;color:var(--muted)">${new Date(u.createdAt).toLocaleDateString('pt-BR')}</td>
              <td><button class="btn btn-danger btn-sm" onclick="deletarUsuario('${u._id}','${u.nome.replace(/'/g,"\\'")}')">🗑️</button></td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    el.innerHTML = `<div class="empty" style="color:var(--red)">${e.message}</div>`;
  }
}

// Função abrirUsuario corrigida e garantida
function abrirUsuario() {
  // Limpa os campos do formulário
  document.getElementById('u-nome').value = '';
  document.getElementById('u-email').value = '';
  document.getElementById('u-senha').value = '';
  document.getElementById('u-perfil').value = 'Funcionário';
  // Abre o modal correto
  abrir('m-usuario');
}

async function salvarUsuario() {
  const nome  = document.getElementById('u-nome').value.trim();
  const email = document.getElementById('u-email').value.trim();
  const senha = document.getElementById('u-senha').value;
  if (!nome || !email || !senha) { toast('Preencha todos os campos', 'err'); return; }

  try {
    await api('POST', '/usuarios', {
      nome, email, senha,
      perfil: document.getElementById('u-perfil').value,
    });
    toast('Usuário criado! ✅');
    fechar('m-usuario');
    carregarUsuarios();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}

async function deletarUsuario(id, nome) {
  if (!confirm(`Deletar "${nome}"?`)) return;
  try {
    await api('DELETE', '/usuarios/' + id);
    toast('Usuário deletado!');
    carregarUsuarios();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}