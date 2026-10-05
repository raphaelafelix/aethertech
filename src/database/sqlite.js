// Banco SQLite do sistema de agendamento de salas.
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'salas.db');
const state = { db: null };

const ready = (async () => {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    state.db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    state.db = new SQL.Database();
  }

  const db = state.db;
  db.run('PRAGMA foreign_keys = ON');

  // Usuários do sistema.
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha TEXT NOT NULL,
      perfil TEXT NOT NULL DEFAULT 'Professor',
      ativo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Professores que realizam as reservas.
  db.run(`
    CREATE TABLE IF NOT EXISTS professores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      telefone TEXT NOT NULL,
      endereco TEXT NOT NULL DEFAULT '{}',
      observacoes TEXT NOT NULL DEFAULT '',
      ativo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Migração: versões antigas usavam "preços" e "itens de compra".
  // Esses dados não fazem parte do novo domínio de agendamento.
  const tableInfo = (table) => {
    try { return query(`PRAGMA table_info(${table})`); } catch { return []; }
  };

  const solicitacaoCols = tableInfo('solicitacoes');
  if (solicitacaoCols.some(c => c.name === 'forma_pagamento' || c.name === 'subtotal')) {
    db.run('DROP TABLE IF EXISTS itens_solicitacoes');
    db.run('DROP TABLE IF EXISTS solicitacoes');
  }

  const salaCols = tableInfo('salas');
  if (salaCols.some(c => c.name === 'precos')) {
    db.run('DROP TABLE IF EXISTS salas');
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS salas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      categoria TEXT NOT NULL DEFAULT '',
      capacidade INTEGER NOT NULL DEFAULT 0,
      recursos TEXT NOT NULL DEFAULT '',
      localizacao TEXT NOT NULL DEFAULT '',
      descricao TEXT NOT NULL DEFAULT '',
      disponivel INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Migração para projetos já existentes: adiciona a descrição das salas sem apagar os dados.
  const salaColsAtual = tableInfo('salas');
  if (!salaColsAtual.some(c => c.name === 'descricao')) {
    db.run("ALTER TABLE salas ADD COLUMN descricao TEXT NOT NULL DEFAULT ''");
  }

  // Uma solicitação = uma reserva de sala.
  db.run(`
    CREATE TABLE IF NOT EXISTS solicitacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero_solicitacao INTEGER,
      professor_id INTEGER NOT NULL REFERENCES professores(id),
      sala_id INTEGER NOT NULL REFERENCES salas(id),
      data_agendamento TEXT NOT NULL,
      horario_inicio TEXT NOT NULL,
      horario_fim TEXT NOT NULL,
      finalidade TEXT NOT NULL DEFAULT '',
      participantes INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'pendente',
      observacoes TEXT NOT NULL DEFAULT '',
      origem TEXT NOT NULL DEFAULT 'sistema',
      gestor_id INTEGER REFERENCES usuarios(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  salvar();
  console.log('SQLite conectado:', DB_PATH);
  return db;
})();

function salvar() {
  if (!state.db) return;
  fs.writeFileSync(DB_PATH, Buffer.from(state.db.export()));
}

function query(sql, params = []) {
  const stmt = state.db.prepare(sql);
  const results = [];
  stmt.bind(params);
  while (stmt.step()) results.push(stmt.getAsObject());
  stmt.free();
  return results;
}

function run(sql, params = []) {
  state.db.run(sql, params);
  const meta = query('SELECT last_insert_rowid() AS id, changes() AS changes');
  salvar();
  return { lastInsertRowid: meta[0]?.id, changes: meta[0]?.changes };
}

function get(sql, params = []) {
  return query(sql, params)[0] || null;
}

module.exports = { ready, query, run, get, salvar };
