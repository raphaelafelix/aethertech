let TOKEN = localStorage.getItem('token') || '';
let USUARIO_LOGADO = JSON.parse(localStorage.getItem('usuario') || 'null');
let salas = [], professores = [], solicitacoes = [];

const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (TOKEN) opts.headers.Authorization = `Bearer ${TOKEN}`;
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch('/api' + path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.erro || 'Não foi possível concluir a operação');
  return data;
}

function toast(msg, tipo='ok') {
  const el = $('toast');
  el.textContent = msg;
  el.className = tipo === 'err' ? 'show err' : 'show';
  setTimeout(() => el.className = '', 2800);
}

function abrir(id) { $(id)?.classList.add('open'); }
function fechar(id) { $(id)?.classList.remove('open'); }

async function fazerLogin() {
  const email = $('l-email').value.trim();
  const senha = $('l-senha').value;
  const perfil = $('l-perfil').value;
  $('login-erro').textContent = '';
  if (!perfil) {
    $('login-erro').textContent = 'Selecione o tipo de usuário.';
    return;
  }
  try {
    const data = await api('POST', '/auth/login', { email, senha, perfil });
    TOKEN = data.token;
    USUARIO_LOGADO = data.usuario;
    localStorage.setItem('token', TOKEN);
    localStorage.setItem('usuario', JSON.stringify(USUARIO_LOGADO));
    iniciarApp();
  } catch (e) {
    $('login-erro').textContent = e.message;
  }
}

function atualizarPlaceholderLogin() {
  const perfil = $('l-perfil').value;
  const email = $('l-email');
  if (perfil === 'Professor') email.placeholder = 'eduardofallabela@gmail.com';
  else if (perfil === 'Coordenador') email.placeholder = 'e-mail cadastrado pelo Coordenador';
  else email.placeholder = 'selecione o tipo de usuário';
}

function sair() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  TOKEN = '';
  USUARIO_LOGADO = null;
  location.reload();
}

function iniciarApp() {
  $('tela-login').style.display = 'none';
  $('app').style.display = 'flex';
  $('sb-nome').textContent = USUARIO_LOGADO?.nome || 'Usuário';
  $('sb-perfil').textContent = USUARIO_LOGADO?.perfil || 'Professor';

  const admin = String(USUARIO_LOGADO?.perfil || '').toLowerCase() === 'coordenador';
  const professor = !admin;
  $('menu-usuarios').style.display = admin ? '' : 'none';
  $('btn-usuarios').style.display = admin ? '' : 'none';
  $('btn-nova-sala').style.display = admin ? '' : 'none';
  $('btn-novo-professor').style.display = admin ? '' : 'none';
  carregarTudo();
}

function ir(secao, botao) {
  document.querySelectorAll('.secao').forEach(s => s.classList.remove('ativa'));
  $('pg-' + secao)?.classList.add('ativa');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('ativo'));
  botao?.classList.add('ativo');

  if (secao === 'calendario') carregarcalendario();
  if (secao === 'solicitacoes') carregarsolicitacoes();
  if (secao === 'salas') carregarsalas();
  if (secao === 'professores') carregarprofessores();
  if (secao === 'usuarios') carregarusuarios();
}

async function carregarTudo() {
  try {
    [salas, professores, solicitacoes] = await Promise.all([
      api('GET', '/salas'),
      api('GET', '/professores'),
      api('GET', '/solicitacoes')
    ]);
    renderDashboard();
    renderSalas();
    renderProfessores();
    renderSolicitacoes();
    preencherSelects();
    if (String(USUARIO_LOGADO?.perfil || '').toLowerCase() === 'coordenador') carregarusuarios();
  } catch (e) {
    toast(e.message, 'err');
  }
}

async function carregarcalendario() {
  await carregarTudo();
}

function statusLabel(status) {
  const map = {
    pendente: ['🕐 Pendente','b-warn'],
    aprovado: ['✅ Aprovado','b-on'],
    rejeitado: ['🚫 Rejeitado','b-off'],
    em_uso: ['🟢 Em uso','b-on'],
    concluido: ['✔️ Concluído','b-on'],
    cancelado: ['❌ Cancelado','b-off']
  };
  const [label, cls] = map[status] || [status, ''];
  return `<span class="badge ${cls}">${label}</span>`;
}

function dataBR(data) {
  if (!data) return '—';
  const [y,m,d] = data.split('-');
  return `${d}/${m}/${y}`;
}

function renderDashboard() {
  const pendentes = solicitacoes.filter(s => s.status === 'pendente').length;
  const livres = salas.filter(s => s.disponivel).length;
  $('s-soli').textContent = solicitacoes.length;
  $('s-soli-sub').textContent = 'reservas registradas';
  $('s-prof').textContent = professores.length;
  $('s-piz').textContent = livres;
  $('s-pend').textContent = pendentes;

  const proximos = [...solicitacoes]
    .filter(s => s.status !== 'cancelado' && s.status !== 'rejeitado')
    .sort((a,b) => (`${a.dataAgendamento}${a.horarioInicio}`).localeCompare(`${b.dataAgendamento}${b.horarioInicio}`))
    .slice(0,6);

  $('cal-solicitacoes').innerHTML = proximos.length ? proximos.map(s => `
    <div class="mini-row">
      <span>🏫 <strong>${esc(s.sala?.nome)}</strong><br>
      <small>${dataBR(s.dataAgendamento)} · ${esc(s.horarioInicio)}–${esc(s.horarioFim)} · ${esc(s.professor?.nome)}</small></span>
      ${statusLabel(s.status)}
    </div>`).join('') : '<div class="empty">Nenhum agendamento registrado.</div>';

  $('cal-mapa').innerHTML = salas.length ? salas.map(s => `
    <div class="mini-row">
      <span>🏫 <strong>${esc(s.nome)}</strong><br><small>${esc(s.localizacao || 'Localização não informada')} · ${s.capacidade || '—'} lugares</small></span>
      <span class="badge ${s.disponivel ? 'b-on' : 'b-off'}">${s.disponivel ? 'Livre' : 'Indisponível'}</span>
    </div>`).join('') : '<div class="empty">Nenhuma sala cadastrada.</div>';
}

function renderSalas() {
  const el = $('tbl-salas');
  if (!salas.length) {
    el.innerHTML = '<div class="empty">Nenhuma sala cadastrada.</div>';
    return;
  }
  el.innerHTML = `<table><thead><tr>
    <th>Sala</th><th>Categoria</th><th>Capacidade</th><th>Localização</th><th>Recursos</th><th>Status</th><th>Ações</th>
  </tr></thead><tbody>${salas.map(s => `<tr>
    <td><strong>${esc(s.nome)}</strong></td>
    <td>${esc(s.categoria || '—')}</td>
    <td>${s.capacidade || '—'} pessoas</td>
    <td>${esc(s.localizacao || '—')}</td>
    <td>${esc(s.recursos || '—')}</td>
    <td><span class="badge ${s.disponivel ? 'b-on' : 'b-off'}">${s.disponivel ? 'Disponível' : 'Indisponível'}</span></td>
    <td>${String(USUARIO_LOGADO?.perfil || '').toLowerCase() === 'coordenador' ? `
      <button class="btn btn-ghost btn-sm" onclick="editarSala(${s.id})">Editar</button>
      <button class="btn btn-ghost btn-sm" onclick="excluirSala(${s.id})">Excluir</button>` : '<span class="muted">Somente visualização</span>'}</td>
  </tr>`).join('')}</tbody></table>`;
}

function renderProfessores(lista = professores) {
  const el = $('tbl-professores');
  if (!lista.length) {
    el.innerHTML = '<div class="empty">Nenhum professor cadastrado.</div>';
    return;
  }
  el.innerHTML = `<table><thead><tr><th>Professor</th><th>Telefone</th><th>Observações</th><th>Ações</th></tr></thead><tbody>
    ${lista.map(p => `<tr>
      <td><strong>${esc(p.nome)}</strong></td><td>${esc(p.telefone)}</td><td>${esc(p.observacoes || '—')}</td>
      <td>${String(USUARIO_LOGADO?.perfil || '').toLowerCase() === 'coordenador' ? `
        <button class="btn btn-ghost btn-sm" onclick="editarProfessor(${p.id})">Editar</button>
        <button class="btn btn-ghost btn-sm" onclick="excluirProfessor(${p.id})">Excluir</button>` : '<span class="muted">Somente visualização</span>'}</td>
    </tr>`).join('')}
  </tbody></table>`;
}

function renderSolicitacoes() {
  const el = $('tbl-solicitacoes');
  if (!solicitacoes.length) {
    el.innerHTML = '<div class="empty">Nenhum agendamento cadastrado.</div>';
    return;
  }
  const ordenadas = [...solicitacoes].sort((a,b) => (`${a.dataAgendamento}${a.horarioInicio}`).localeCompare(`${b.dataAgendamento}${b.horarioInicio}`));
  el.innerHTML = `<table><thead><tr>
    <th>#</th><th>Professor</th><th>Sala</th><th>Data</th><th>Horário</th><th>Finalidade</th><th>Participantes</th><th>Status</th>${String(USUARIO_LOGADO?.perfil || '').toLowerCase() === 'coordenador' ? '<th>Ações</th>' : ''}
  </tr></thead><tbody>${ordenadas.map(s => `<tr>
    <td><strong>#${String(s.numeroSolicitacao || s.id).padStart(3,'0')}</strong></td>
    <td>${esc(s.professor?.nome || '—')}</td>
    <td><strong>${esc(s.sala?.nome || '—')}</strong></td>
    <td>${dataBR(s.dataAgendamento)}</td>
    <td>${esc(s.horarioInicio)}–${esc(s.horarioFim)}</td>
    <td>${esc(s.finalidade || '—')}</td>
    <td>${s.participantes}</td>
    <td>${statusLabel(s.status)}</td>
    ${String(USUARIO_LOGADO?.perfil || '').toLowerCase() === 'coordenador' ? `<td style="white-space:nowrap"><button class="btn btn-blue btn-sm" onclick="abrirStatus(${s.id})">Status</button> <button class="btn btn-ghost btn-sm" onclick="excluirSolicitacao(${s.id})">Excluir</button></td>` : ''}
  </tr>`).join('')}</tbody></table>`;
}

async function carregarsalas() {
  salas = await api('GET', '/salas');
  renderSalas(); preencherSelects(); renderDashboard();
}
async function carregarsolicitacoes() {
  solicitacoes = await api('GET', '/solicitacoes');
  renderSolicitacoes(); renderDashboard();
}
async function carregarprofessores() {
  professores = await api('GET', '/professores');
  renderProfessores(); preencherSelects(); renderDashboard();
}
async function buscarprof(valor) {
  try { renderProfessores(await api('GET', '/professores?busca=' + encodeURIComponent(valor))); }
  catch (e) { toast(e.message, 'err'); }
}

function preencherSelects() {
  if ($('soli-prof')) $('soli-prof').innerHTML = '<option value="">Selecione o professor...</option>' +
    professores.map(p => `<option value="${p.id}">${esc(p.nome)}</option>`).join('');
  if ($('soli-sala')) $('soli-sala').innerHTML = '<option value="">Selecione a sala...</option>' +
    salas.filter(s => s.disponivel).map(s => `<option value="${s.id}">${esc(s.nome)} · ${s.capacidade || '?'} lugares</option>`).join('');
}

function atualizarResumo() {
  const sala = salas.find(s => String(s.id) === $('soli-sala').value);
  const data = $('soli-data').value;
  const inicio = $('soli-inicio').value;
  const fim = $('soli-fim').value;
  $('resumo-agendamento').textContent = sala && data && inicio && fim
    ? `${sala.nome} · ${dataBR(data)} · ${inicio}–${fim}`
    : 'Selecione a sala, data e horário';
}

async function abrirsolicitacao() {
  preencherSelects();
  $('soli-data').value = '';
  $('soli-inicio').value = '';
  $('soli-fim').value = '';
  $('soli-finalidade').value = '';
  $('soli-participantes').value = 1;
  $('soli-obs').value = '';
  atualizarResumo();
  abrir('m-solicitacao');
}

['soli-sala','soli-data','soli-inicio','soli-fim'].forEach(id => {
  document.addEventListener('change', e => { if (e.target?.id === id) atualizarResumo(); });
});

async function salvarsolicitacao() {
  const body = {
    professor: Number($('soli-prof').value),
    sala: Number($('soli-sala').value),
    dataAgendamento: $('soli-data').value,
    horarioInicio: $('soli-inicio').value,
    horarioFim: $('soli-fim').value,
    finalidade: $('soli-finalidade').value.trim(),
    participantes: Number($('soli-participantes').value) || 1,
    observacoes: $('soli-obs').value.trim()
  };
  if (!body.professor || !body.sala || !body.dataAgendamento || !body.horarioInicio || !body.horarioFim || !body.finalidade) {
    toast('Preencha professor, sala, data, horário e finalidade.', 'err'); return;
  }
  try {
    await api('POST', '/solicitacoes', body);
    fechar('m-solicitacao');
    toast('Agendamento solicitado com sucesso!');
    await carregarTudo();
  } catch (e) { toast(e.message, 'err'); }
}

function abrirStatus(id) {
  const s = solicitacoes.find(x => x.id === id);
  if (!s) return;
  $('st-id').value = id;
  $('st-val').value = s.status;
  abrir('m-status');
}

async function salvarStatus() {
  try {
    await api('PATCH', `/solicitacoes/${$('st-id').value}/status`, { status: $('st-val').value });
    fechar('m-status');
    toast('Status atualizado!');
    await carregarTudo();
  } catch (e) { toast(e.message, 'err'); }
}

function abrirsala() {
  $('m-sala-t').textContent = 'Nova sala';
  $('p-id').value = '';
  $('p-nome').value = '';
  $('p-cat').value = 'Sala de aula';
  $('p-cap').value = '';
  $('p-local').value = '';
  $('p-recursos').value = '';
  $('p-disp').value = 'true';
  abrir('m-sala');
}

function editarSala(id) {
  const s = salas.find(x => x.id === id);
  if (!s) return;
  $('m-sala-t').textContent = 'Editar sala';
  $('p-id').value = s.id;
  $('p-nome').value = s.nome;
  $('p-cat').value = s.categoria || 'Sala de aula';
  $('p-cap').value = s.capacidade || '';
  $('p-local').value = s.localizacao || '';
  $('p-recursos').value = s.recursos || '';
  $('p-disp').value = String(s.disponivel);
  abrir('m-sala');
}

async function salvarsala() {
  const id = $('p-id').value;
  const body = {
    nome: $('p-nome').value.trim(),
    categoria: $('p-cat').value,
    capacidade: Number($('p-cap').value) || 0,
    localizacao: $('p-local').value.trim(),
    recursos: $('p-recursos').value.trim(),
    disponivel: $('p-disp').value === 'true'
  };
  if (!body.nome) { toast('Informe o nome da sala.', 'err'); return; }
  try {
    await api(id ? 'PUT' : 'POST', id ? `/salas/${id}` : '/salas', body);
    fechar('m-sala'); toast(id ? 'Sala atualizada!' : 'Sala cadastrada!'); await carregarTudo();
  } catch (e) { toast(e.message, 'err'); }
}

async function excluirSala(id) {
  if (!confirm('Excluir esta sala?')) return;
  try { await api('DELETE', `/salas/${id}`); toast('Sala excluída!'); await carregarTudo(); }
  catch (e) { toast(e.message, 'err'); }
}

function abrirprofessor() {
  $('m-prof-t').textContent = 'Novo professor';
  $('c-id').value = ''; $('c-nome').value = ''; $('c-tel').value = ''; $('c-obs').value = '';
  abrir('m-professor');
}
function editarProfessor(id) {
  const p = professores.find(x => x.id === id);
  if (!p) return;
  $('m-prof-t').textContent = 'Editar professor';
  $('c-id').value = p.id; $('c-nome').value = p.nome; $('c-tel').value = p.telefone; $('c-obs').value = p.observacoes || '';
  abrir('m-professor');
}
async function salvarprofessor() {
  const id = $('c-id').value;
  const body = { nome: $('c-nome').value.trim(), telefone: $('c-tel').value.trim(), observacoes: $('c-obs').value.trim() };
  if (!body.nome || !body.telefone) { toast('Nome e telefone são obrigatórios.', 'err'); return; }
  try {
    await api(id ? 'PUT' : 'POST', id ? `/professores/${id}` : '/professores', body);
    fechar('m-professor'); toast(id ? 'Professor atualizado!' : 'Professor cadastrado!'); await carregarTudo();
  } catch (e) { toast(e.message, 'err'); }
}
async function excluirProfessor(id) {
  if (!confirm('Excluir este professor?')) return;
  try { await api('DELETE', `/professores/${id}`); toast('Professor excluído!'); await carregarTudo(); }
  catch (e) { toast(e.message, 'err'); }
}

async function carregarusuarios() {
  try {
    const usuarios = await api('GET', '/usuarios');
    $('tbl-usuarios').innerHTML = `<table><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th><th>Ações</th></tr></thead><tbody>
      ${usuarios.map(u => `<tr><td><strong>${esc(u.nome)}</strong></td><td>${esc(u.email)}</td><td>${esc(u.perfil)}</td>
      <td>${u.ativo ? '✅ Ativo' : '❌ Inativo'}</td>
      <td><button class="btn btn-ghost btn-sm" onclick="excluirUsuario(${u.id})">Excluir</button></td></tr>`).join('')}
    </tbody></table>`;
  } catch (e) { toast(e.message, 'err'); }
}
function abrirUsuario() {
  $('u-nome').value=''; $('u-email').value=''; $('u-senha').value=''; $('u-perfil').value='Professor'; abrir('m-usuario');
}
async function salvarUsuario() {
  const body = { nome: $('u-nome').value.trim(), email: $('u-email').value.trim(), senha: $('u-senha').value, perfil: $('u-perfil').value };
  if (!body.nome || !body.email || !body.senha) { toast('Preencha nome, e-mail e senha.', 'err'); return; }
  try { await api('POST','/usuarios',body); fechar('m-usuario'); toast('Usuário criado!'); carregarusuarios(); }
  catch (e) { toast(e.message,'err'); }
}
async function excluirUsuario(id) {
  if (!confirm('Excluir este usuário?')) return;
  try { await api('DELETE',`/usuarios/${id}`); toast('Usuário excluído!'); carregarusuarios(); }
  catch (e) { toast(e.message,'err'); }
}
async function excluirSolicitacao(id) {
  if (!confirm('Excluir este agendamento?')) return;
  try { await api('DELETE',`/solicitacoes/${id}`); toast('Agendamento excluído!'); await carregarTudo(); }
  catch (e) { toast(e.message,'err'); }
}

document.addEventListener('DOMContentLoaded', () => {
  if (TOKEN && USUARIO_LOGADO) iniciarApp();
  else {
    $('app').style.display = 'none';
    $('tela-login').style.display = 'flex';
  }
});
