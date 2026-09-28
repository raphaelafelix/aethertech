// Model de solicitações/reservas de salas.
const { ready, query, run, get } = require('../database/sqlite');

const SELECT = `
  SELECT
    s.*,
    p.nome AS professor_nome,
    p.telefone AS professor_telefone,
    r.nome AS sala_nome,
    r.categoria AS sala_categoria,
    r.capacidade AS sala_capacidade
  FROM solicitacoes s
  LEFT JOIN professores p ON p.id = s.professor_id
  LEFT JOIN salas r ON r.id = s.sala_id
`;

function formatar(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    numeroSolicitacao: row.numero_solicitacao,
    professor: {
      _id: row.professor_id,
      id: row.professor_id,
      nome: row.professor_nome,
      telefone: row.professor_telefone
    },
    sala: {
      id: row.sala_id,
      nome: row.sala_nome,
      categoria: row.sala_categoria,
      capacidade: row.sala_capacidade
    },
    dataAgendamento: row.data_agendamento,
    horarioInicio: row.horario_inicio,
    horarioFim: row.horario_fim,
    finalidade: row.finalidade,
    participantes: row.participantes,
    status: row.status,
    observacoes: row.observacoes,
    origem: row.origem,
    gestor: row.gestor_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const Solicitacao = {
  async findAll({ gestorId, data, salaId } = {}) {
    await ready;
    const conditions = [];
    const params = [];
    if (gestorId) { conditions.push('s.gestor_id = ?'); params.push(gestorId); }
    if (data) { conditions.push('s.data_agendamento = ?'); params.push(data); }
    if (salaId) { conditions.push('s.sala_id = ?'); params.push(salaId); }

    const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
    return query(`${SELECT}${where} ORDER BY s.data_agendamento, s.horario_inicio`, params).map(formatar);
  },

  async findById(id) {
    await ready;
    return formatar(get(`${SELECT} WHERE s.id = ?`, [id]));
  },

  async verificarConflito({ salaId, dataAgendamento, horarioInicio, horarioFim, ignorarId = null }) {
    await ready;
    const params = [salaId, dataAgendamento, horarioFim, horarioInicio];
    let sql = `
      SELECT id FROM solicitacoes
      WHERE sala_id = ?
        AND data_agendamento = ?
        AND status NOT IN ('cancelado', 'rejeitado')
        AND horario_inicio < ?
        AND horario_fim > ?
    `;
    if (ignorarId) {
      sql += ' AND id <> ?';
      params.push(ignorarId);
    }
    return !!get(sql, params);
  },

  async create({
    professorId, salaId, dataAgendamento, horarioInicio, horarioFim,
    finalidade = '', participantes = 1, observacoes = '', origem = 'sistema', gestorId = null
  }) {
    await ready;

    if (!professorId || !salaId || !dataAgendamento || !horarioInicio || !horarioFim) {
      throw new Error('Professor, sala, data, horário inicial e horário final são obrigatórios');
    }
    if (horarioInicio >= horarioFim) {
      throw new Error('O horário final deve ser depois do horário inicial');
    }

    const sala = get('SELECT * FROM salas WHERE id = ?', [salaId]);
    if (!sala) throw new Error('Sala não encontrada');
    if (!sala.disponivel) throw new Error('A sala está indisponível para agendamento');

    const professor = get('SELECT * FROM professores WHERE id = ? AND ativo = 1', [professorId]);
    if (!professor) throw new Error('Professor não encontrado');

    const qtd = Number(participantes) || 1;
    if (sala.capacidade > 0 && qtd > sala.capacidade) {
      throw new Error(`A sala comporta no máximo ${sala.capacidade} participantes`);
    }

    if (await this.verificarConflito({ salaId, dataAgendamento, horarioInicio, horarioFim })) {
      throw new Error('Já existe um agendamento para essa sala nesse horário');
    }

    const contagem = get('SELECT COALESCE(MAX(numero_solicitacao), 0) + 1 AS numero FROM solicitacoes');
    const numero = contagem.numero;

    const info = run(`
      INSERT INTO solicitacoes
        (numero_solicitacao, professor_id, sala_id, data_agendamento,
         horario_inicio, horario_fim, finalidade, participantes, status,
         observacoes, origem, gestor_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendente', ?, ?, ?)
    `, [
      numero, professorId, salaId, dataAgendamento, horarioInicio, horarioFim,
      finalidade, qtd, observacoes, origem, gestorId
    ]);

    return this.findById(info.lastInsertRowid);
  },

  async updateStatus(id, status) {
    await ready;
    const validos = ['pendente', 'aprovado', 'rejeitado', 'em_uso', 'concluido', 'cancelado'];
    if (!validos.includes(status)) throw new Error('Status inválido');

    const info = run(
      "UPDATE solicitacoes SET status = ?, updated_at = datetime('now') WHERE id = ?",
      [status, id]
    );
    return info.changes > 0 ? this.findById(id) : null;
  },

  async delete(id) {
    await ready;
    const info = run('DELETE FROM solicitacoes WHERE id = ?', [id]);
    return info.changes > 0;
  }
};

module.exports = Solicitacao;
