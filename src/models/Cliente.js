// ============================================================
// Cliente.js — Model de Cliente (sql.js)
// ============================================================

// Define as seguintes variáveis através dos dados no arquivo sqlite
const { ready, query, run, get } = require('../database/sqlite');

// função que formatará os clientes
function formatarCliente(row) { // função recebe o "row"
  if (!row) return null; // se "row" for falso retorna "nulo"

  return { // Também retorna os seguintes dados dos clientes
    _id:         row.id,
    id:          row.id,
    nome:        row.nome,
    telefone:    row.telefone,
    // Endereço é salvo como string JSON no banco, precisamos transformar de volta em Objeto
    endereco:    row.endereco ? JSON.parse(row.endereco) : {},
    observacoes: row.observacoes,
    ativo:       row.ativo === 1, // Retorna true se for 1, false se for 0
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  };
}

const Cliente = { // Variável Cliente recebe:

  async findAll(busca = '') { // de forma assíncrona busca tudo
    await ready; // Espera ficar pronto
    let rows;
    if (busca) { // Se busca for true seleciona tudo da tabela clientes em ordem pelo nome
      const t = `%${busca}%`;
      rows = query(
        'SELECT * FROM clientes WHERE ativo = 1 AND (nome LIKE ? OR telefone LIKE ?) ORDER BY nome',
        [t, t]
      ); // rows recebe o query acima
    } else { // Caso o contrário
      rows = query('SELECT * FROM clientes WHERE ativo = 1 ORDER BY nome'); //Seleciona todos os clientes ativos
    }
    return rows.map(formatarCliente); // Retorna o "rows" junto do mapeamento da função formatarCliente
  },

  async findById(id) { // De forma assíncrona procura por id
    await ready;
    return formatarCliente(get('SELECT * FROM clientes WHERE id = ?', [id])); // Retorna tudo da tabela cliente onde o id foi selecionado
  },

  async create({ nome, telefone, endereco = {}, observacoes = '' }) { // De forma assícrona cria um novo cliente
    await ready;
    const info = run(
      'INSERT INTO clientes (nome, telefone, endereco, observacoes) VALUES (?, ?, ?, ?)',
      [nome.trim(), telefone.trim(), JSON.stringify(endereco), observacoes]
    );
    return this.findById(info.lastInsertRowid); // Retorna o novo cliente
  },

  async update(id, { nome, telefone, endereco, observacoes, ativo }) { // De forma assíncrona atualiza por id as informações
    await ready;
    const atual = get('SELECT * FROM clientes WHERE id = ?', [id]);
    if (!atual) return null;

    const endAtual = JSON.parse(atual.endereco || '{}');
    const endFinal = endereco ? { ...endAtual, ...endereco } : endAtual;

    run(`
      UPDATE clientes SET
        nome        = ?,
        telefone    = ?,
        endereco    = ?,
        observacoes = ?,
        ativo       = ?,
        updated_at  = datetime('now')
      WHERE id = ?
    `, [
      nome        ?? atual.nome,
      telefone    ?? atual.telefone,
      JSON.stringify(endFinal),
      observacoes ?? atual.observacoes,
      ativo !== undefined ? (ativo ? 1 : 0) : atual.ativo,
      id
    ]);

    return this.findById(id);
  },

  async delete(id) { // De forma assíncrona deleta um id
    await ready;
    const info = run('DELETE FROM clientes WHERE id = ?', [id]);
    return info.changes > 0;
  },
};

module.exports = Cliente; // Através de um módulo exporta a variável cliente