// Model de salas para o sistema de agendamento.
const { ready, query, run, get } = require('../database/sqlite');

function formatarSala(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    nome: row.nome,
    categoria: row.categoria,
    capacidade: row.capacidade,
    recursos: row.recursos,
    localizacao: row.localizacao,
    descricao: row.descricao || '',
    disponivel: row.disponivel === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const Salas = {
  async findAll() {
    await ready;
    return query('SELECT * FROM salas ORDER BY nome').map(formatarSala);
  },

  async findById(id) {
    await ready;
    return formatarSala(get('SELECT * FROM salas WHERE id = ?', [id]));
  },

  async create({ nome, categoria = '', capacidade = 0, recursos = '', localizacao = '', descricao = '', disponivel = true }) {
    await ready;
    if (!nome?.trim()) throw new Error('Nome da sala é obrigatório');
    const info = run(`
      INSERT INTO salas (nome, categoria, capacidade, recursos, localizacao, descricao, disponivel)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [nome.trim(), categoria, Number(capacidade) || 0, recursos, localizacao, descricao, disponivel ? 1 : 0]);
    return this.findById(info.lastInsertRowid);
  },

  async update(id, dados) {
    await ready;
    const atual = get('SELECT * FROM salas WHERE id = ?', [id]);
    if (!atual) return null;

    run(`
      UPDATE salas SET
        nome = ?, categoria = ?, capacidade = ?, recursos = ?,
        localizacao = ?, descricao = ?, disponivel = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [
      dados.nome ?? atual.nome,
      dados.categoria ?? atual.categoria,
      dados.capacidade !== undefined ? Number(dados.capacidade) || 0 : atual.capacidade,
      dados.recursos ?? atual.recursos,
      dados.localizacao ?? atual.localizacao,
      dados.descricao ?? atual.descricao ?? '',
      dados.disponivel !== undefined ? (dados.disponivel ? 1 : 0) : atual.disponivel,
      id
    ]);

    return this.findById(id);
  },

  async findDisponiveis({ data, inicio, fim } = {}) {
    await ready;
    let rows = query('SELECT * FROM salas WHERE disponivel = 1 ORDER BY nome');
    if (!data || !inicio || !fim) return rows.map(formatarSala);

    return rows
      .filter(sala => !get(`
        SELECT id FROM solicitacoes
        WHERE sala_id = ?
          AND data_agendamento = ?
          AND status NOT IN ('cancelado', 'rejeitado')
          AND horario_inicio < ?
          AND horario_fim > ?
        LIMIT 1
      `, [sala.id, data, fim, inicio]))
      .map(formatarSala);
  },

  async delete(id) {
    await ready;
    const info = run('DELETE FROM salas WHERE id = ?', [id]);
    return info.changes > 0;
  }
};

module.exports = Salas;
