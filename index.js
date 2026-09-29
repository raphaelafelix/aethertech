// =================================================
// Requisições de pacotes instalados via npm install
require('dotenv').config()

const express = require('express')
const cors = require('cors')
const path = require('path')

// Definição de variáveis referente ao express e a porta utilizada (respectivamente)
const app = express()
const PORT = process.env.PORT || 3001
//==================================================

//==================================================
// Uso do cors através do express (app)
app.use(cors())

// Uso do express.json através do express (app)
app.use(express.json())

// Direcionamento para a pasta "public"
app.use(express.static(path.join(__dirname, 'public')))

// Variável que receberá como requisito o arquivo do sqlite presente no caminho abaixo
const { ready } = require('./src/database/sqlite')

// Acessará o outro arquivo index.js que contêm as rotas do site
const routes = require('./src/routes/index')
//==================================================

// Por meio da variável que recebeu o "sqlite" (ready)
// será então exercida uma arrow function que é executada instantaneamente
ready.then(() => {

    app.use('/api', routes)

    app.get('/teste', (req, res) => {
        res.json({
            mensagem: 'API da Empresa funcionando!',
            status: 'online',
            porta: PORT
        })
    })

    app.use((req, res) => {
        res.sendFile(
            path.join(__dirname, 'public', 'index.html')
        )
    })

    // =================================================
    // SERVIDOR
    // 0.0.0.0 permite conexões de outros dispositivos,
    // como o ESP32, pela rede
    // =================================================
    app.listen(PORT, '0.0.0.0', () => {

        console.log('================================')
        console.log('Servidor rodando na porta ' + PORT)
        console.log('API: http://localhost:' + PORT + '/api')
        console.log('Front-end: http://localhost:' + PORT)
        console.log('================================')

    })

}).catch(err => {

    console.error('Erro ao inicializar banco:', err)

    process.exit(1)

})