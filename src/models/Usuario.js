// ============================================================
// Usuario.js — Model de Usuário (sql.js)
// ============================================================

// Definição de variáveis e suas requisições
const { ready, query, run, get } = require('../database/sqlite');
const bcrypt = require('bcryptjs');


function formatarUsuario(row) {
  if (!row) return null;
  return {
    _id:       row.id,
    id:        row.id,
    nome:      row.nome,
    email:     row.email,
    perfil:    row.perfil,
    ativo:     row.ativo === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const usuario = {

  async findAll() { // De forma assíncrona procura todos os usuários
    await ready;
    const rows = query(`
      SELECT id, nome, email, perfil, ativo, created_at, updated_at
      FROM usuarios ORDER BY created_at DESC
    `);
    return rows.map(formatarUsuario);
  },

  async findByEmail(email) { // De forma assíncrona procura usuarios por email
    await ready;
    return get('SELECT * FROM usuarios WHERE email = ?', [email.toLowerCase().trim()]);
  },

  async findById(id) { // De forma assíncrona procura usuarios por id
    await ready;
    const row = get(`
      SELECT id, nome, email, perfil, ativo, created_at, updated_at
      FROM usuarios WHERE id = ?
    `, [id]);
    return formatarUsuario(row);
  },

  async create({ nome, email, senha, perfil = 'Atendente' }) { // De forma assíncrona cria um usuário
    await ready;
    const hash = await bcrypt.hash(senha, 10);
    const info = run(
      'INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)',
      [nome.trim(), email.toLowerCase().trim(), hash, perfil]
    );
    return this.findById(info.lastInsertRowid);
  },

  async update(id, { nome, email, senha, perfil, ativo }) { // De forma assíncrona atualiza um usuário existente
    await ready;
    const atual = get('SELECT * FROM usuarios WHERE id = ?', [id]);
    if (!atual) return null;

    let senhaFinal = atual.senha;
    if (senha) senhaFinal = await bcrypt.hash(senha, 10);

    run(`
      UPDATE usuarios SET
        nome       = ?,
        email      = ?,
        senha      = ?,
        perfil     = ?,
        ativo      = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `, [
      nome   ?? atual.nome,
      email  ?? atual.email,
      senhaFinal,
      perfil ?? atual.perfil,
      ativo !== undefined ? (ativo ? 1 : 0) : atual.ativo,
      id
    ]);

    return this.findById(id);
  },

  async delete(id) { // De forma assíncrona deleta um usuário
    await ready;
    const info = run('DELETE FROM usuarios WHERE id = ?', [id]);
    return info.changes > 0;
  },

  verificarSenha(senhaDigitada, hashSalvo) { // Verificação e comparação da senha digita e as senhas cadastradas
    return bcrypt.compare(senhaDigitada, hashSalvo);
  },
};

module.exports = usuario; // Através de um módulo exporta a variável Usuario