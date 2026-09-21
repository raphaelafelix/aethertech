// Requisições inseridas nas variáveis
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const auth = require('../middlewares/auth');

// Variáveis que vão receber os caminhos para os respectivos arquivos
const Usuario = require('../models/Usuario');
const Salas = require('../models/Salas');
const professor = require('../models/Professor');
const solicitacao = require('../models/Solicitacao');

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

router.get('/salas', auth, async (req, res) => { // Rota que coleta e mostra todas as salas
    try { res.json(await Salas.findAll())}
    catch (e) { res.status(500).json({ erro: e.message}); }
});

router.get('/salas/:id', auth, async (req, res) => { // Rota que pesquisa salas pelo id,, com um try para captar erros
    try {
        const p = await Salas.findById(req.params.id);
        if (!p) return res.status(404).json({ erro: 'Sala não encontrada'});
        res.json(p);
    } catch (e) { res.status(500).json({ erro: e.message }); }
});









router.post('/salas', auth, async (req, res) => { // Rota para criação de uma nova sala
    try {
        if (!req.body.nome)
            return res.status(400).json({ erro: 'Nome é obrigatório' });
        res.status(201).json(await Salas.create(req.body));
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.put('/salas/:id', auth, async (req, res) => { //Rota que atualiza os dados de uma sala existente
    try {
        const p = await Salas.update(req.params.id, req.body);
        if (!p) return res.status(404).json({ erro: 'Sala não encontrada' });
        res.json(p);
    } catch (e) { res.status(500).json({ erro: e.message }); } 
});

router.delete('/salas/:id', auth, async (req, res) => { // Rota que deleta uma sala existente
    try {
        const ok = await Salas.delete(req.params.id);
        if (!ok) return res.status(404).json({ erro: 'Sala não encontrada'});
        res.json({ mensagem: 'sala deletada'});
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.get('/professores', auth, async (req, res) => { // Rota que coleta e mostra todos os professores
    try { res.json(await professor.findAll(req.query.busca)); }
    catch (e) { res.status(500).json({ erro: e.message }); }
});

router.get('/professores/:id', auth, async (req, res) => { // Rota que pesquisa professores pelo id, com um try para captar erros
    try {
        const c = await professor.findById(req.params.id);
        if (!c) return res.status(404).json({ erro: 'Professor não encontrado'})
            res.json(c);
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.post('/professores', auth, async (req, res) => { // Rota para a criação de um professor, com um try para captar erros
    try {
        if (!req.body.nome || !req.body.telefone)
            return res.status(400).json({ erro: 'Nome e telefone são obrigatórios'});
        res.status(201).json(await professor.create(req.body));
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.put('/professores/:id', auth, async (req, res) => { // Rota que atualiza um professor existente
    try {
        const c = await professor.update(req.params.id, req.body);
        if (!c) return res.status(404).json({ erro: 'Professor não encontrado' });
        res.json(c);
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.delete('/professores/:id', auth, async (req, res) => { // Rota que deleta um professor já existente
    try {
        const ok = await professor.delete(req.params.id);
        if (!ok) return res.status(404).json({ erro: 'Professor não encontrado' });
        res.json({ mensagem: 'Professor deletado' });
    } catch (e) { res.status(500).json({erro: e.message}); }
});

router.get('/solicitacoes', auth, async (req, res) => { // Rota que coleta e mostra todos os solicitacoes
    try {
        const filtros = {};
        if (req.query.gestor) filtros.gestorId = req.query.gestor;
        res.json(await solicitacao.findAll(filtros));
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.get('/solicitacoes/:id', auth, async (req, res) => { // Rota que pesquisa solicitacoes pelo id, com um try para captar erros
    try {
        const p = await solicitacao.findById(req.params.id);
        if (!p) return res.status(404).json({ erro: 'Solicitação não encontrada' });
        res.json(p);
    } catch (e) { res.status(500).json({ erro: e.message}); }
});

router.post('/solicitacoes', auth, async (req, res) => { // Rota para criação de um novo solicitacao, com um try para captar erros
    try {
        const {professor, itens, formaPagamento } = req.body;
        if (!professor || !itens?.length || !formaPagamento)
            return res.status(400).json({ erro: 'professor, itens e formaPagamento são obrigatórios'});

        const novo = await solicitacao.create({
            professorId: professor,
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

router.patch('/solicitacoes/:id/status', auth, async (req,res) => { // Rota que altera o status do solicitacao, com um try para a coleta de erros
    try{
        const validos = ['recebido','em_producao','saiu_entrega','entregue','cancelado'];
        if (!validos.includes(req.body.status))
            return res.status(400).json({ erro: 'Status inválido'});
        const p = await solicitacao.updateStatus(req.params.id, req.body.status);
        if (!p) return res.status(404).json({ erro: 'Solicitação não encontrada' });
        res.json(p);
    } catch (e) { res.status(500).json({ erro: e.message}); }
});

router.delete('/solicitacoes/:id', auth, async (req, res) => { // Rota que deletea um professor existente
    try {
        const ok = await solicitacao.delete(req.params.id);
        if (!ok) return res.status(404).json({ erro: 'Solicitação não encontrada'});
        res.json({ mensagem: 'Solicitação deletada'})
    } catch (e) { res.status(500).json({ erro: e.message});}
});

router.get('/usuarios', auth, async (req, res) => { // Rota que coleta e mostra todos os usuários (acesso apenas para administradores)
    try {
        if (req.usuario.perfil !== 'Coordenador')
            return res.status(403).json({ erro: 'Acesso restrito a Coordenadores'});
        res.json(await Usuario.findAll());
    } catch (e) { res.status(500).json({ erro: e.message}); }
});

router.post('/usuarios', auth, async (req, res) => {
    try {
        if (req.usuario.perfil !== 'Coordenador')
            return res.status(403).json({ erro: 'Acesso restrito a Coordenadores'});
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
        if (req.usuario.perfil !== 'Coordenador')
            return res.status(403).json({ erro: 'Acesso restrito a Coordenadores'});
        const u = await Usuario.update(req.params.id, req.body);
        if (!u) return res.status(404).json({ erro: 'Usuário não encontrado' });
        res.json(u);
    } catch (e) { res.status(500).json({erro: e.message}); }
});

router.delete('/usuarios/:id', auth, async (req, res ) => { // Rota que deleta um usuário existente (acesso apenas para administradores)
    try {
        if (req.usuario.perfil !== 'Coordenador')
            return res.status(403).json({ erro: 'Acesso restrito a Coordenadores'});
        const ok = await Usuario.delete(req.params.id);
        if (!ok) return res.status(404).json({ erro: 'Usuário não encontrado'});
        res.json({ mensagem: 'Usuário deletado'});
    } catch (e) { res.status(500).json({ erro: e.message});}
});

module.exports = router; // Módulo que exportará as rotas