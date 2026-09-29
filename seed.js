require('dotenv').config();
const { ready, run } = require('./src/database/sqlite');
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    await ready;
    console.log('Limpando dados de agendamento...');

    run('DELETE FROM solicitacoes');
    run('DELETE FROM salas');
    run('DELETE FROM professores');
    run('DELETE FROM usuarios');

    try {
      run("DELETE FROM sqlite_sequence WHERE name IN ('solicitacoes','salas','professores','usuarios')");
    } catch (_) {}

    const hash = await bcrypt.hash('123456', 10);

    run(
      'INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)',
      ['Coordenador', 'coord@email.com', hash, 'Coordenador']
    );
    run(
      'INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)',
      ['Eduardo Fallabela', 'eduardofallabela@gmail.com', hash, 'Professor']
    );

    const professores = [
      ['Mariana Ayoub', '(11) 99999-1111'],
      ['Henrique Duarte', '(11) 99999-2222'],
      ['Yasmin Lopes', '(11) 99999-3333'],
      ['Raphaela Felix', '(11) 99999-4444']
    ];

    for (const [nome, telefone] of professores) {
      run(
        'INSERT INTO professores (nome, telefone) VALUES (?, ?)',
        [nome, telefone]
      );
    }

    const salas = [
      ['Sala de Informática 01', 'Laboratório', 30, 'Computadores, projetor, Wi-Fi', 'Bloco A - 1º andar'],
      ['Sala de Informática 02', 'Laboratório', 30, 'Computadores, projetor, Wi-Fi', 'Bloco A - 1º andar'],
      ['Sala de Reuniões', 'Reunião', 12, 'TV, câmera, Wi-Fi', 'Bloco A - térreo'],
      ['Sala Multimídia', 'Multimídia', 40, 'Projetor, caixas de som, Wi-Fi', 'Bloco B - 1º andar'],
      ['Laboratório de Eletrônica', 'Laboratório', 24, 'Bancadas, equipamentos técnicos, Wi-Fi', 'Bloco B - térreo'],
      ['Auditório', 'Evento', 120, 'Projetor, som, microfones, ar-condicionado', 'Bloco C - térreo']
    ];

    for (const [nome, categoria, capacidade, recursos, localizacao] of salas) {
      run(`
        INSERT INTO salas (nome, categoria, capacidade, recursos, localizacao, disponivel)
        VALUES (?, ?, ?, ?, ?, 1)
      `, [nome, categoria, capacidade, recursos, localizacao]);
    }

    console.log('======================================');
    console.log('SEED DE AGENDAMENTO EXECUTADO!');
    console.log('======================================');
    console.log('Coordenador: coord@email.com | Senha: 123456');
    console.log('Professor: eduardofallabela@gmail.com | Senha: 123456');
    console.log('======================================');
  } catch (err) {
    console.error('ERRO NO SEED:', err);
    process.exitCode = 1;
  }
}

seed().catch((err) => {
  console.error('ERRO FATAL NO SEED:', err);
  process.exitCode = 1;
});
