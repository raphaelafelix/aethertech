const { ready, query, run, get } = require('../database/sqlite'); // As variáveis constantes recebem os dados presentes no arquivo em requisição

// Variável que seleciona (através dos comandos seguintes) o solicitacao
const SELECT_solicitacao = `
  SELECT
    p.*,
    c.nome     AS professor_nome,
    c.telefone AS professor_telefone
  FROM solicitacoes p
  LEFT JOIN professores c ON c.id = p.professor_id
`;

// Funçõa que formatará o solicitacao
function formatarsolicitacao(row, itens = []) { // Recebe row e um array com os itens selecionados
  if (!row) return null;
  return {
    _id:           row.id,
    id:            row.id,
    numerosolicitacao:  row.numero_solicitacao,
    professor: {
      _id:      row.professor_id,
      id:       row.professor_id,
      nome:     row.professor_nome,
      telefone: row.professor_telefone,
    },
    itens: itens.map(it => ({
      _id:           it.id,
      sala:         it.sala_id,
      nomesala:     it.nome_sala,
      quantidade:    it.quantidade,
      precoUnitario: it.preco_unitario,
      subtotal:      it.subtotal,
    })),
    subtotal:       row.subtotal,
    taxaEntrega:    row.taxa_entrega,
    total:          row.total,
    formaPagamento: row.forma_pagamento,
    troco:          row.troco,
    status:         row.status,
    observacoes:    row.observacoes,
    setor:           row.setor,
    origem:         row.origem,
    gestor:         row.gestor_id,
    createdAt:      row.created_at,
    updatedAt:      row.updated_at,
  };
}

const solicitacao = { // Variável solicitacao recebe:

  async findAll({ gestorId } = {}) { // De forma assíncrona procura tudo dentro de gestorId
    await ready; // Espera estar pronto
    let rows;
    if (gestorId) { // Se for verdadeiro:
      rows = query(`${SELECT_solicitacao} WHERE p.gestor_id = ? ORDER BY p.created_at DESC`, [gestorId]);
    } else {
      rows = query(`${SELECT_solicitacao} ORDER BY p.created_at DESC`);
    }
    return rows.map(row => {
      const itens = query('SELECT * FROM itens_solicitacoes WHERE solicitacao_id = ?', [row.id]);
      return formatarsolicitacao(row, itens);
    });
  },

  async findById(id) { // De forma assíncrona procura um solicitacao por id
    await ready;
    const row = get(`${SELECT_solicitacao} WHERE p.id = ?`, [id]);
    if (!row) return null;
    const itens = query('SELECT * FROM itens_solicitacoes WHERE solicitacao_id = ?', [id]);
    return formatarsolicitacao(row, itens);
  },

  // De forma assíncrona cria um novo solicitacao
  async create({ professorId, itens, taxaEntrega = 0, formaPagamento, troco = 0, observacoes = '', setor = null, origem = 'balcao', gestorId = null }) {
    await ready;

    const Salas = require('./Salas');

    for (const item of itens) {
    const sala = await Salas.findById(item.sala);

    if (!sala) {
        throw new Error(`Sala ID ${item.sala} não encontrada`);
    }

    const tamanho = (item.tamanho || 'P').toUpperCase();
    const precos = sala.precos || {};

    const preco = typeof precos === 'object'
        ? Number(precos[tamanho] ?? precos.P ?? precos.M ?? precos.G ?? 0)
        : Number(precos || 0);

    const subItem = preco * item.quantidade;

    subtotal += subItem;

    itensProcessados.push({
        salaId: sala.id,
        nomesala: sala.nome,
        quantidade: item.quantidade,
        tamanho,
        precoUnitario: preco,
        subtotal: subItem,
    });
}

    const total        = subtotal + (taxaEntrega || 0);
    const contagem     = get('SELECT COUNT(*) as total FROM solicitacoes');
    const numerosolicitacao = (contagem?.total || 0) + 1;

    const infosolicitacao = run(`
      INSERT INTO solicitacoes
        (numero_solicitacao, professor_id, subtotal, taxa_entrega, total,
         forma_pagamento, troco, observacoes, setor, origem, gestor_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [numerosolicitacao, professorId, subtotal, taxaEntrega || 0, total,
        formaPagamento, troco || 0, observacoes, setor, origem, gestorId]);

    const solicitacaoId = infosolicitacao.lastInsertRowid;

    for (const it of itensProcessados) {
      run(`
        INSERT INTO itens_solicitacoes
          (solicitacao_id, sala_id, nome_sala, quantidade, preco_unitario, subtotal)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [solicitacaoId, it.salaId, it.nomesala, it.quantidade, it.precoUnitario, it.subtotal]);
    }

    return this.findById(solicitacaoId);
  },

  async updateStatus(id, status) { // De forma assíncrona atualiza o status do solicitacao por id
    await ready;
    const info = run(
      "UPDATE solicitacoes SET status = ?, update_at = datetime('now') WHERE id = ?",
      [status, id]
    );
    return info.changes > 0 ? this.findById(id) : null;
  },

  async delete(id) { // De forma assíncrona deleta o solicitacao por id
    await ready;
    // Deleta itens primeiro (sem CASCADE no sql.js)
    run('DELETE FROM itens_solicitacoes WHERE solicitacao_id = ?', [id]);
    const info = run('DELETE FROM solicitacoes WHERE id = ?', [id]);
    return info.changes > 0;
  },
};

module.exports = solicitacao; // Através de um módulo exporta a variável solicitacao