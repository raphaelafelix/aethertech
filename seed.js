require('dotenv').config();
const { ready, run, query } = require('./src/database/sqlite');
const bcrypt = require('bcryptjs');

async function seed() {
    try {
        await ready;
        console.log('Limpando banco...');

        run('DELETE FROM pedidos');
        run('DELETE FROM pecas');
        run('DELETE FROM clientes');
        run('DELETE FROM usuarios');

        try {
            run("DELETE FROM sqlite_sequence WHERE name IN ('itens_pedido','pedidos','pecas','clientes','usuarios')");
        } catch(_) { }

        console.log('Banco limpo');

        const hash = await bcrypt.hash('123456', 10);

        run('INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)',
            ['Administrador', 'admin@email.com', hash, 'Administrador']);
        run('INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)',
            ['Funcionario', 'funcionario@email.com', hash, 'Funcionario']);
        run('INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)',
            ['Gestor', 'gestor@email.com', hash, 'Gestor']);

        console.log('3 usuario criadas');


        const pecas = [
            ['Pistões e Virabrequim','Motor e Transmissão', {P:1500}],
            ['Correia Dentada', 'Motor e Transmissão', {P:250}],
            ['Embreagem e Câmbio', 'Motor e Transmissão', {P:400}],
            ['Bomba d Água', 'Motor e Transmissão', {P:180}],
            ['Válvula Termostática', 'Motor e Transmissão', {P:100}],
            ['Radiador', 'Motor e Transmissão', {P:400}],
            ['Amortecedores', 'Suspensão e Direção', {P:500}],
            ['Molas', 'Suspensão e Direção', {P:300}],
            ['Pivôs e Buchas', 'Suspensão e Direção', {P:300}],
            ['Terminal de Direção', 'Suspensão e Direção', {P:80}],
            ['Discos e Pastilhas', 'Freios', {P:350}],
            ['Tambores e Sapatas', 'Freios', {P:300}],
            ['Cilindro Mestre', 'Freios', {P:250}],
            ['Velas de Ignição', 'Sistema Elétrico e Iluminação', {P:80}],
            ['Bateria', 'Sistema Elétrico e Iluminação', {P:350}],
            ['Alternador', 'Sistema Elétrico e Iluminação', {P:800}],
            ['Motor de Partida', 'Sistema Elétrico e Iluminação', {P:450}],
            ['Módulo de Injeção (ECU)', 'Sistema Elétrico e Iluminação', {P:1200}],
            ['Para-choque Dianteiro', 'Carroceria e Acabamento', {P:400}],
            ['Capô', 'Carroceria e Acabamento', {P:600}],
            ['Portas', 'Carroceria e Acabamento', {P:800}],
            ['Retrovisor Lateral', 'Carroceria e Acabamento', {P:200}],
            ['Faróis', 'Carroceria e Acabamento', {P:500}],
            ['Lanternas Traseiras', 'Carroceria e Acabamento', {P:300}],
            ['Para-lama', 'Carroceria e Acabamento', {P:250}]
        ];

        for (const [nome, cat, precos] of pecas) {
            run('INSERT INTO pecas (nome, categoria, precos) VALUES (?, ?, ?)',
                [nome, cat, JSON.stringify(precos)]);
        }
        console.log('20 pecas criadas')

        console.log('======================================');
        console.log('SEED EXECUTADO COM SUCESSO!');
        console.log('======================================');
        console.log('Login: admin@email.com | Senha: 123456');
        console.log('======================================');
    } catch (err) {
        console.error('ERRO NO SEED:', err);
    }
}

seed();