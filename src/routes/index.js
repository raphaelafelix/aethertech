// Requisições inseridas nas variáveis
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const auth = require('../middlewares/auth');

// Variáveis que vão receber os caminhos para os respectivos arquivos
const Usuario = require('../models/Usuario');
const Pecas = require('../models/Pecas');
const Cliente = require('../models/Cliente');
const Pedido = require('../models/Pedido');

// Adquire de forma assíncrona 
router.post('/auth/login', async (req, res) => {
    try { // Tentativa
        const { email, senha } = req.body; // Recebe a requisição do body
        if (!email || !senha) return res.status(400).json({ erro: 'E-mail e senha são obrigatórios'}); // Se o email e a senha forem falsos, há o retorno de um status e um json informando a situação

        const usuario = await Usuario.findByEmail(email); // A variável vai esperar com que o usuário seja achado por email
        if (!usuario) return res.status(401).json({ erro: 'Credenciais inválidas'}); // Se o usuário for falso, há o retorno de um status e um json informando a situação

        const ok = await Usuario.verificarSenha(senha, usuario.senha); // A variável espera a verificaçãp da senha e do usuário e depois recebe ambos
        if (!ok) return res.status(401).json({ erro: 'Credenciais inválidas'}) // Se a variável for falsa, há o retorno de um status e um json informando a situação

        const token = jwt.sign( // Recebe as informações do token e do login 
            { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil },
            process.env.JWT_SECRET,
            {expiresIn: '8h'}
        );

        res.json({ token, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil}}); // Resposta do json
    } catch (e) { res.status(500).json({ erro: e.message}); } // Captura o erro e mostra a mensagem de erro
});

router.get('/pecas', auth, async (req, res) => { // Rota que coleta e mostra todas as peças
    try { res.json(await Pecas.findAll())}
    catch (e) { res.status(500).json({ erro: e.message}); }
});

router.get('/pecas/:id', auth, async (req, res) => { // Rota que pesquisa pecas pelo id,, com um try para captar erros
    try {
        const p = await Pecas.findById(req.params.id);
        if (!p) return res.status(404).json({ erro: 'Peça não encontrada'});
        res.json(p);
    } catch (e) { res.status(500).json({ erro: e.message }); }
});









router.post('/pecas', auth, async (req, res) => { // Rota para criação de uma nova peça
    try {
        if (!req.body.nome)
            return res.status(400).json({ erro: 'Nome é obrigatório' });
        res.status(201).json(await Pecas.create(req.body));
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.put('/pecas/:id', auth, async (req, res) => { //Rota que atualiza os dados de uma peça existente
    try {
        const p = await Pecas.update(req.params.id, req.body);
        if (!p) return res.status(404).json({ erro: 'Peça não encontrada' });
        res.json(p);
    } catch (e) { res.status(500).json({ erro: e.message }); } 
});

router.delete('/pecas/:id', auth, async (req, res) => { // Rota que deleta uma peça existente
    try {
        const ok = await Pecas.delete(req.params.id);
        if (!ok) return res.status(404).json({ erro: 'Peça não encontrada'});
        res.json({ mensagem: 'Peça deletada'});
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.get('/clientes', auth, async (req, res) => { // Rota que coleta e mostra todos os clientes
    try { res.json(await Cliente.findAll(req.query.busca)); }
    catch (e) { res.status(500).json({ erro: e.message }); }
});

router.get('/clientes/:id', auth, async (req, res) => { // Rota que pesquisa clientes pelo id, com um try para captar erros
    try {
        const c = await Cliente.findById(req.params.id);
        if (!c) return res.status(404).json({ erro: 'Cliente não encontrado'})
            res.json(c);
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.post('/clientes', auth, async (req, res) => { // Rota para a criação de um cliente, com um try para captar erros
    try {
        if (!req.body.nome || !req.body.telefone)
            return res.status(400).json({ erro: 'Nome e telefone são obrigatórios'});
        res.status(201).json(await Cliente.create(req.body));
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.put('/clientes/:id', auth, async (req, res) => { // Rota que atualiza um cliente existente
    try {
        const c = await Cliente.update(req.params.id, req.body);
        if (!c) return res.status(404).json({ erro: 'Cliente não encontrado' });
        res.json(c);
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.delete('/clientes/:id', auth, async (req, res) => { // Rota que deleta um cliente já existente
    try {
        const ok = await Cliente.delete(req.params.id);
        if (!ok) return res.status(404).json({ erro: 'Cliente não encontrado' });
        res.json({ mensagem: 'Cleinte deletado' });
    } catch (e) { res.status(500).json({erro: e.message}); }
});

router.get('/pedidos', auth, async (req, res) => { // Rota que coleta e mostra todos os pedidos
    try {
        const filtros = {};
        if (req.query.gestor) filtros.gestorId = req.query.gestor;
        res.json(await Pedido.findAll(filtros));
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.get('/pedidos/:id', auth, async (req, res) => { // Rota que pesquisa pedidos pelo id, com um try para captar erros
    try {
        const p = await Pedido.findByID(req.params.id);
        if (!p) return res.status(404).json({ erro: 'Pedido não encontrado' });
        res.json(p);
    } catch (e) { res.status(500).json({ erro: e.message}); }
});

router.post('/pedidos', auth, async (req, res) => { // Rota para criação de um novo pedido, com um try para captar erros
    try {
        const {cliente, itens, formaPagamento } = req.body;
        if (!cliente || !itens?.length || !formaPagamento)
            return res.status(400).json({ erro: 'cliente, itens e formaPagamento são obrigatórios'});

        const novo = await Pedido.create({
            clienteId: cliente,
            itens,
            taxaEntrega:    req.body.taxaEntrega,
            formaPagamento,
            troco:          req.body.troco,
            observacoes:    req.body.observacoes,
            setor:          req.body.setor,
            origem:         req.body.origem,
            gestorId:       req.body.gestor || req.usuario?.id,
        });
        res.status(201).json(novo);
    } catch (e) { res.status(400).json({ erro: e.message}); }
});

router.patch('/pedidos/:id/status', auth, async (req,res) => { // Rota que altera o status do pedido, com um try para a coleta de erros
    try{
        const validos = ['recebido','em_producao','saiu_entrega','entregue','cancelado'];
        if (!validos.includes(req.body.status))
            return res.status(400).json({ erro: 'Status inválido'});
        const p = await Pedido.updateStatus(req.params.id, req.body.status);
        if (!p) return res.status(404).json({ erro: 'Pedido não encontrado'});
        res.json(p);
    } catch (e) { res.status(500).json({ erro: e.message}); }
});

router.delete('/pedidos/:id', auth, async (req, res) => { // Rota que deletea um cliente existente
    try {
        const ok = await Pedido.delete(req.params.id);
        if (!ok) return res.status(404).json({ erro: 'Pedido não encontrado'});
        res.json({ mensagem: 'Pedido deletado'})
    } catch (e) { res.status(500).json({ erro: e.message});}
});

router.get('/usuarios', auth, async (req, res) => { // Rota que coleta e mostra todos os usuários (acesso apenas para administradores)
    try {
        if (req.usuario.perfil !== 'Administrador')
            return res.status(403).json({ erro: 'Acesso restrito a Administradores'});
        res.json(await Usuario.findAll());
    } catch (e) { res.status(500).json({ erro: e.message}); }
});

router.post('/usuarios', auth, async (req, res) => {
    try {
        if (req.usuario.perfil !== 'Administrador')
            return res.status(403).json({ erro: 'Acesso restrito a Administradores'});
        const { nome, email, senha, perfil } = req.body;
        if(!nome || !email || !senha)
            return res.status(400).json({ erro: 'Nome, email e senha são obrigatórios'});
        res.status(201).json(await Usuario.create({nome, email, senha, perfil}));
    } catch (e) {
        if (e.message?.includes('UNIQUE')) return res.status(400).json({ erro: 'E-mail já cadastrado'});
        res.status(500).json({ erro: e.message});
    }
});

router.put('/usuarios/:id', auth, async (req, res) => { // Rota que pesquisa usuarios pelo id (acesso apenas para administradores)
    try {
        if (req.usuario.perfil !== 'Administrador')
            return res.status(403).json({ erro: 'Acesso restrito a Administradores'});
        const u = await Usuario.update(req.params.id, req.body);
        if (!u) return res.status(404).json({ erro: 'Usuário não encontrado' });
        res.json(u);
    } catch (e) { res.status(500).json({erro: e.message}); }
});

router.delete('/usuarios/:id', auth, async (req, res ) => { // Rota que deleta um usuário existente (acesso apenas para administradores)
    try {
        if (req.usuario.perfil !== 'Administrador')
            return res.status(403).json({ erro: 'Acesso restrito a Administradores'});
        const ok = await Usuario.delete(req.params.id);
        if (!ok) return res.status(404).json({ erro: 'Usuário não encontrado'});
        res.json({ mensagem: 'Usuário deletado'});
    } catch (e) { res.status(500).json({ erro: e.message});}
});

module.exports = router; // Módulo que exportará as rotas