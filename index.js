
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
// Acessará o outro arquivo index.js que contêm as rotas do site (visíveis através da url)
const routes = require('./src/routes/index')
//==================================================

// Por meio da variável que recebeu o "sqlite" (ready) será então exercida uma "air function" que é executada instantaneamente
ready.then(() => {
    app.use('/api', routes) // definição do /api na url e usp das rotas por meio do express (app)

    app.get('/teste', (req, res) => { // Teste de funcionamento com uma "air function" que enviará uma resposta como resultado do funcionamento devido
        res.json({ mensagem: 'API da Empresa funcionando!', status: 'online', porta: PORT}) // Mensagem que incluí status e porta utilizada como resposta
    })

    app.use((req, res) => { // Ocorre a coleta de tudo ("*") que será enviado para esta função
        res.sendFile(path.join(__dirname, 'public', 'index.html')) // Envio do arquivo em html (que incçuí o css através de um <link>) como resposta
    })

    app.listen(PORT, () => { // O express estará esperanado pela coleta da informação do PORT, que em seguida, utilizará o console.log para informar o funcionamento do site no console
        console.log('================================')
        console.log('Servidor rodando na porta ' + PORT)
        console.log('API: http://localhost:' + PORT + '/api')
        console.log('Front-end: http://localhost:' + PORT)
        console.log('================================')
    })
}).catch(err => { // Aqui haverá a coleta de um possível erro
    console.error('Erro ao inicializar banco:', err) // Caso ele ocorra, tal mensagem será enviada
    process.exit(1) // Em seguida haverá um processo de saída
})