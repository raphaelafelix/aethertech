// Definição da variável jwt (token da web json)
const jwt = require('jsonwebtoken');

// Utilização de uma função para autenticação
function autenticar(req, res, next) { // Recebe os parâmetros
    const authHeader = req.headers['authorization']; // A variável receberá uma requisição de autorização
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
        return res.status(401).json({ erro: 'Token não fornecido. Faça login.'});
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = payload;
        next();
    } catch (erro) {
        return res.status(401).json({ erro: 'Token inválido ou expirado.'});
    }
}

module.exports = autenticar; 