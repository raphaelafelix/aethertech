const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const auth = require('../middlewares/auth');

const Usuario = require('../models/Usuario');
const Salas = require('../models/Salas');
const professor = require('../models/Professor');
const solicitacao = require('../models/Solicitacao');

router.post('/auth/login', async (req, res) => {
    try {
        const { email, senha, perfil } = req.body;

        if (!email || !senha || !perfil)
            return res.status(400).json({ erro: 'Perfil, e-mail e senha são obrigatórios' });

        if (!['Coordenador', 'Professor'].includes(perfil))
            return res.status(400).json({ erro: 'Perfil inválido' });

        const usuario = await Usuario.findByEmail(email);

        if (!usuario)
            return res.status(401).json({ erro: 'Credenciais inválidas' });

        const ok = await Usuario.verificarSenha(senha, usuario.senha);

        if (!ok)
            return res.status(401).json({ erro: 'Credenciais inválidas' });

        if (usuario.ativo !== 1)
            return res.status(403).json({ erro: 'Este usuário está inativo' });

        if (usuario.perfil !== perfil)
            return res.status(403).json({
                erro: `Este login pertence ao perfil ${usuario.perfil}. Selecione o perfil correto.`
            });

        const token = jwt.sign(
            {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                perfil: usuario.perfil
            },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            token,
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                perfil: usuario.perfil
            }
        });
    } catch (e) {
        res.status(500).json({ erro: e.message });
    }
});

router.get('/salas', auth, async (req, res) => {
    try {
        const todas = await Salas.findAll();

        if (req.usuario.perfil === 'Professor')
            return res.json(todas.filter(s => s.disponivel));

        res.json(todas);
    } catch (e) {
        res.status(500).json({ erro: e.message });
    }
});

router.get('/salas/disponiveis', auth, async (req, res) => {
    try {
        const { data, inicio, fim } = req.query;

        if (!data || !inicio || !fim)
            return res.status(400).json({
                erro: 'Data, horário inicial e horário final são obrigatórios'
            });

        if (inicio >= fim)
            return res.status(400).json({
                erro: 'O horário final deve ser depois do horário inicial'
            });

        res.json(await Salas.findDisponiveis({ data, inicio, fim }));
    } catch (e) {
        res.status(500).json({ erro: e.message });
    }
});

router.get('/salas/:id', auth, async (req, res) => {
    try {
        const sala = await Salas.findById(req.params.id);

        if (!sala)
            return res.status(404).json({ erro: 'Sala não encontrada' });

        res.json(sala);
    } catch (e) {
        res.status(500).json({ erro: e.message });
    }
});

router.post('/salas', auth, async (req, res) => {
    try {
        if (req.usuario.perfil !== 'Coordenador')
            return res.status(403).json({
                erro: 'Apenas o Coordenador pode criar salas'
            });

        if (!req.body.nome)
            return res.status(400).json({ erro: 'Nome é obrigatório' });

        res.status(201).json(await Salas.create(req.body));
    } catch (e) {
        res.status(500).json({ erro: e.message });
    }
});

router.put('/salas/:id', auth, async (req, res) => {
    try {
        if (req.usuario.perfil !== 'Coordenador')
            return res.status(403).json({
                erro: 'Apenas o Coordenador pode editar salas'
            });

        const sala = await Salas.update(req.params.id, req.body);

        if (!sala)
            return res.status(404).json({ erro: 'Sala não encontrada' });

        res.json(sala);
    } catch (e) {
        res.status(500).json({ erro: e.message });
    }
});

router.delete('/salas/:id', auth, async (req, res) => {
    try {
        if (req.usuario.perfil !== 'Coordenador')
            return res.status(403).json({
                erro: 'Apenas o Coordenador pode excluir salas'
            });

        const ok = await Salas.delete(req.params.id);

        if (!ok)
            return res.status(404).json({ erro: 'Sala não encontrada' });

        res.json({ mensagem: 'Sala deletada' });
    } catch (e) {
        res.status(500).json({ erro: e.message });
    }
});

router.get('/professores', auth, async (req, res) => {
    try {
        res.json(await professor.findAll(req.query.busca));
    } catch (e) {
        res.status(500).json({ erro: e.message });
    }
});

router.get('/professores/:id', auth, async (req, res) => {
    try {
        const p = await professor.findById(req.params.id);

        if (!p)
            return res.status(404).json({ erro: 'Professor não encontrado' });

        res.json(p);
    } catch (e) {
        res.status(500).json({ erro: e.message });
    }
});

router.post('/professores', auth, async (req, res) => {
    try {
        if (req.usuario.perfil !== 'Coordenador')
            return res.status(403).json({
                erro: 'Apenas o Coordenador pode criar professores'
            });

        if (!req.body.nome || !req.body.telefone)
            return res.status(400).json({
                erro: 'Nome e telefone são obrigatórios'
            });

        res.status(201).json(await professor.create(req.body));
    } catch (e) {
        res.status(500).json({ erro: e.message });
    }
});

router.put('/professores/:id', auth, async (req, res) => {
    try {
        if (req.usuario.perfil !== 'Coordenador')
            return res.status(403).json({
                erro: 'Apenas o Coordenador pode editar professores'
            });

        const p = await professor.update(req.params.id, req.body);

        if (!p)
            return res.status(404).json({ erro: 'Professor não encontrado' });

        res.json(p);
    } catch (e) {
        res.status(500).json({ erro: e.message });
    }
});

router.delete('/professores/:id', auth, async (req, res) => {
    try {
        if (req.usuario.perfil !== 'Coordenador')
            return res.status(403).json({
                erro: 'Apenas o Coordenador pode excluir professores'
            });

        const ok = await professor.delete(req.params.id);

        if (!ok)
            return res.status(404).json({ erro: 'Professor não encontrado' });

        res.json({ mensagem: 'Professor deletado' });
    } catch (e) {
        res.status(500).json({ erro: e.message });
    }
});

router.get('/solicitacoes', auth, async (req, res) => {
    try {
        const filtros = {};

        if (req.query.gestor)
            filtros.gestorId = req.query.gestor;

        if (req.query.data)
            filtros.data = req.query.data;

        if (req.query.sala)
            filtros.salaId = req.query.sala;

        res.json(await solicitacao.findAll(filtros));
    } catch (e) {
        res.status(500).json({ erro: e.message });
    }
});

router.get('/solicitacoes/:id', auth, async (req, res) => {
    try {
        const reserva = await solicitacao.findById(req.params.id);

        if (!reserva)
            return res.status(404).json({
                erro: 'Agendamento não encontrado'
            });

        res.json(reserva);
    } catch (e) {
        res.status(500).json({ erro: e.message });
    }
});

router.post('/solicitacoes', auth, async (req, res) => {
    try {
        if (!['Coordenador', 'Professor'].includes(req.usuario.perfil))
            return res.status(403).json({
                erro: 'Apenas Coordenador ou Professor pode criar agendamentos'
            });

        const {
            professor,
            sala,
            dataAgendamento,
            horarioInicio,
            horarioFim,
            finalidade,
            participantes,
            observacoes
        } = req.body;

        if (!professor || !sala || !dataAgendamento || !horarioInicio || !horarioFim)
            return res.status(400).json({
                erro: 'Professor, sala, data, horário inicial e horário final são obrigatórios'
            });

        const novo = await solicitacao.create({
            professorId: professor,
            salaId: sala,
            dataAgendamento,
            horarioInicio,
            horarioFim,
            finalidade,
            participantes,
            observacoes,
            origem: 'sistema',
            gestorId: req.usuario?.id || null
        });

        res.status(201).json(novo);
    } catch (e) {
        res.status(400).json({ erro: e.message });
    }
});

router.patch('/solicitacoes/:id/status', auth, async (req, res) => {
    try {
        if (req.usuario.perfil !== 'Coordenador')
            return res.status(403).json({
                erro: 'Apenas o Coordenador pode alterar o status do agendamento'
            });

        const p = await solicitacao.updateStatus(
            req.params.id,
            req.body.status
        );

        if (!p)
            return res.status(404).json({
                erro: 'Agendamento não encontrado'
            });

        res.json(p);
    } catch (e) {
        res.status(400).json({ erro: e.message });
    }
});

router.delete('/solicitacoes/:id', auth, async (req, res) => {
    try {
        if (req.usuario.perfil !== 'Coordenador')
            return res.status(403).json({
                erro: 'Apenas o Coordenador pode excluir agendamentos'
            });

        const ok = await solicitacao.delete(req.params.id);

        if (!ok)
            return res.status(404).json({
                erro: 'Agendamento não encontrado'
            });

        res.json({ mensagem: 'Agendamento excluído' });
    } catch (e) {
        res.status(500).json({ erro: e.message });
    }
});

router.get('/usuarios', auth, async (req, res) => {
    try {
        if (req.usuario.perfil !== 'Coordenador')
            return res.status(403).json({
                erro: 'Acesso restrito a Coordenadores'
            });

        res.json(await Usuario.findAll());
    } catch (e) {
        res.status(500).json({ erro: e.message });
    }
});

router.post('/usuarios', auth, async (req, res) => {
    try {
        if (req.usuario.perfil !== 'Coordenador')
            return res.status(403).json({
                erro: 'Acesso restrito a Coordenadores'
            });

        const {
            nome,
            email,
            senha,
            perfil = 'Professor'
        } = req.body;

        if (!['Coordenador', 'Professor'].includes(perfil))
            return res.status(400).json({
                erro: 'Perfil inválido. Use Coordenador ou Professor'
            });

        if (!nome || !email || !senha)
            return res.status(400).json({
                erro: 'Nome, email e senha são obrigatórios'
            });

        if (senha.length < 6)
            return res.status(400).json({
                erro: 'A senha deve ter pelo menos 6 caracteres'
            });

        const novoUsuario = await Usuario.create({
            nome,
            email,
            senha,
            perfil
        });

        if (perfil === 'Professor') {
            const existentes = await professor.findAll(nome);

            const mesmoNome = existentes.some(
                p => p.nome.trim().toLowerCase() === nome.trim().toLowerCase()
            );

            if (!mesmoNome) {
                await professor.create({
                    nome,
                    telefone: '',
                    observacoes: 'Professor vinculado ao login criado pelo Coordenador.'
                });
            }
        }

        res.status(201).json(novoUsuario);
    } catch (e) {
        if (e.message?.includes('UNIQUE'))
            return res.status(400).json({
                erro: 'E-mail já cadastrado'
            });

        res.status(500).json({ erro: e.message });
    }
});

router.put('/usuarios/:id', auth, async (req, res) => {
    try {
        if (req.usuario.perfil !== 'Coordenador')
            return res.status(403).json({
                erro: 'Acesso restrito a Coordenadores'
            });

        const u = await Usuario.update(req.params.id, req.body);

        if (!u)
            return res.status(404).json({
                erro: 'Usuário não encontrado'
            });

        res.json(u);
    } catch (e) {
        res.status(500).json({ erro: e.message });
    }
});

router.delete('/usuarios/:id', auth, async (req, res) => {
    try {
        if (req.usuario.perfil !== 'Coordenador')
            return res.status(403).json({
                erro: 'Acesso restrito a Coordenadores'
            });

        const ok = await Usuario.delete(req.params.id);

        if (!ok)
            return res.status(404).json({
                erro: 'Usuário não encontrado'
            });

        res.json({ mensagem: 'Usuário deletado' });
    } catch (e) {
        res.status(500).json({ erro: e.message });
    }
});

/* MONITOR DO ESP32 */
router.get('/monitor/salas', async (req, res) => {
    try {
        if (req.headers['x-monitor-key'] !== '1273871')
            return res.status(401).json({ erro: 'Chave inválida' });

        const salas = await Salas.findAll();
        const agendamentos = await solicitacao.findAll();

        const agora = new Date();
        const hoje = agora.toISOString().slice(0, 10);
        const hora = agora.toTimeString().slice(0, 5);

        const resultado = salas.map(sala => {
            const agenda = agendamentos
                .filter(a => Number(a.sala?.id) === Number(sala.id))
                .filter(a => a.dataAgendamento >= hoje)
                .sort((a, b) =>
                    `${a.dataAgendamento}${a.horarioInicio}`.localeCompare(
                        `${b.dataAgendamento}${b.horarioInicio}`
                    )
                );

            const atual = agenda.find(a =>
                a.dataAgendamento === hoje &&
                a.horarioInicio <= hora &&
                a.horarioFim > hora
            );

            const proximo = agenda.find(a =>
                `${a.dataAgendamento}${a.horarioInicio}` >
                `${hoje}${hora}`
            );

            return {
                id: sala.id,
                nome: sala.nome,
                status: atual
                    ? 'ocupada'
                    : sala.disponivel
                        ? 'livre'
                        : 'indisponivel',

                atual: atual ? {
                    horarioInicio: atual.horarioInicio,
                    horarioFim: atual.horarioFim,
                    professor: atual.professor?.nome || '',
                    finalidade: atual.finalidade || ''
                } : null,

                proximo: proximo ? {
                    horarioInicio: proximo.horarioInicio,
                    horarioFim: proximo.horarioFim,
                    professor: proximo.professor?.nome || '',
                    finalidade: proximo.finalidade || ''
                } : null
            };
        });

        res.json({ salas: resultado });
    } catch (e) {
        res.status(500).json({ erro: e.message });
    }
});

module.exports = router;