// ============================================================
// Peca.js — Model de Peca (sql.js)
// ============================================================


const { ready, query, run, get } = require('../database/sqlite'); //Parte que organiza os dados do banco para: registrar, atualizar, buscar e deletar. Realizado
                                                                  //isso por meio do requerimento da rota do banco de dados.


//Tabela do banco de dados para organizar e registrar os dados usado SQLite da Peca
function formatarPeca(row) {
  if (!row) return null;
  return {
    _id:         row.id,
    id:          row.id,
    nome:        row.nome,
    precos:      (() => { try { return JSON.parse(row.precos || '{}'); } catch { return {}; } })(),
    disponivel:  row.disponivel === 1,
    categoria:   row.categoria,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  };
}


//Bloco com os dados da Peca
const Peca = {


  //Busca todas as pecas do menu , organizadas por categoria e nome
  async findAll() {
    await ready;  //Executa quando o banco de dados estiver conectado, para evitar erros
    return query('SELECT * FROM pecas ORDER BY categoria, nome').map(formatarPeca); // Ele vai retornar
  },


  //Procura a Peca atraves do ID
  async findById(id) {
    await ready;  //Executa quando o banco de dados estiver conectado, para evitar erros
    return formatarPeca(get('SELECT * FROM pecas WHERE id = ?', [id])); // Retorna a buscado da peca pelo ID, usado o map como forma de deixar os dados prontos para o JSOM
  },


  //Adiciona no menu uma nova Peca a partir das categorias
  async create({ nome, precos = {}, disponivel = true, categoria = '' }) {
    await ready;  //Executa quando o banco de dados estiver conectado, para evitar erros
    const info = run(
      'INSERT INTO pecas (nome, precos, disponivel, categoria) VALUES (?, ?, ?, ?)',
      [nome.trim(), JSON.stringify(precos), disponivel ? 1 : 0, categoria]
    );
    return this.findById(info.lastInsertRowid); //Retorna as informações para conferir os dados inseridos da nova Peca
  },
 //Atualiza os dados de uma Peca que ja existe no menu
  async update(id, { nome, precos, disponivel, categoria }) {
    await ready;  //Executa quando o banco de dados estiver conectado, para evitar erros
    const atual = get('SELECT * FROM pecas WHERE id = ?', [id]);
    if (!atual) return null; //Caso não encontre a peca , ela não dará prosseguimento

    const precosAtuais = JSON.parse(atual.precos || '{}');
    const precosFinal  = precos !== undefined ? precos : precosAtuais;

    run(`
      UPDATE pecas SET
        nome         = ?,
        precos       = ?,
        disponivel   = ?,
        categoria    = ?,
        updated_at   = datetime('now')
      WHERE id = ?
    `, [
      nome         ?? atual.nome,
      JSON.stringify(precosFinal),
      disponivel   !== undefined ? (disponivel ? 1 : 0) : atual.disponivel,
      categoria    ?? atual.categoria,
      id
    ]);


    return this.findById(id); // Retorna com as novas informações inseridas
  },
  //Delta uma Peca através do ID
  async delete(id) {
    await ready;
    const info = run('DELETE FROM pecas WHERE id = ?', [id]); // seleciona o ID da Peca que será eliminada do menu
    return info.changes > 0; // Se houver alguma alteração no banco de dados , ela voltara o dado como true
  },
};


module.exports = Peca; // Modulo para executar a Peca