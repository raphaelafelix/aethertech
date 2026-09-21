# **Sistema de Gestão de Peças | EM GRUPO**

## **Descrição**

Este projeto é um sistema desenvolvido para gerenciar pedidos, clientes e produtos de uma fabrica de peças de carro. Ele permite realizar operações como cadastro, edição, listagem e exclusão de dados, além de autenticação de usuários.

## **Tecnologias utilizadas**

- HTML
- CSS
- JAVASCRIPT
- JSON(JAVASCRIPT OBJECT NOTATION)
- SQLITE
- NODE.JS
- EXPRESS

## **Pré‑requisitos**

É preciso já ter instalado Node.js e o npm(gerenciador de pacotes) através do comando no cmd (prompt de comando): “npm install”.

Ademais, será preciso a instalação dos seguintes pacotes:

- express
- sql.js
- jsonwebtoken
- bcryptjs
- cors
- dotenv.

## **Passo a passo**

1. Clonar o repositório:
    
    ```
    git clone https://github.com/DuartedeSousa/Metaltech-FactoryTrack.git
    ```
    
2. Acessar a pasta:
    
    ```
    atraves do cmd ou do vscode
    ```
    
3. Instalar as dependências:
    
    ```
    npm install express 
    npm install sql.js 
    npm install jsonwebtoken 
    npm install bcryptjs
    npm install cors 
    npm install dotenv
    ```
    
4. Configure o arquivo.env
5. Executar o projeto(cada comando em uma janela cmd):
    
    ```
    node seed.js
    ```
    ```
    node index.js
    ```
    

## **Estrutura de pastas**

```jsx
/.vscode
/node_modules
/public
****├── index.html
├── script.js
└── style.css
/src
├── database/
│    └── sqlite.js
├── routes/
│    └── index.js
├── middleware/
│    └── sqlite.js
└── models/
├── Cliente.js
├── Pedido.js
├── Pizza.js
└── Usuario.js
.env
index.js
package-lock.json
package.json
pizzaria.db
seed.js
```

- index.js: inicialização do servidor
- sqlite.js: conexão e manipulação do banco
- auth.js: autenticação com JWT
- models/: funções CRUD e tratamento de dados
- routes/: definição das rotas e endpoints
- public/script.js: interação com o front-end

## **Funcionalidades**

- Cadastro de usuários
- Login com autenticação JWT
- CRUD de dados (criar, ler, atualizar e deletar)
- Integração com banco de dados

## **Credenciais de teste**

- Utilize ferramentas como Postman ou o próprio front-end
- Teste login, cadastro e operações CRUD

## **Desafios encontrados**

- Interpredação de códigos muito extensos
- Organização das pasta

**Soluções:**

-  analisamos o código em etapas traçando uma lógica através dele verificando as rotas e arquivos e pelo que cada componente é responsável

## **Possíveis melhorias futuras**

- como estudantes devemos prestar mais atenção sobre a lógica por trás de sistemas como esse, sendo possível traçar um raciocínio por trás do funcionamento do código


# **Análise Inicial**

# Dependências do `package.json`

## **Backend / API**

- **Express:** É um framework para Node.js que fornece recursos mínimos para construção de servidores web.

## **Banco de dados**

- **sql.js:** Biblioteca JavaScript que permite criar e consultar um banco de dados relacional inteiramente no navegador. Ela utiliza um arquivo de banco de dados virtual armazenado na memória do navegador, portanto, as alterações feitas no banco de dados não são persistidas.

## **Autenticação e segurança**

- **jsonwebtoken:** É um padrão aberto ( [RFC 7519](https://tools.ietf.org/html/rfc7519) ) para transmitir informações de forma segura entre duas partes — normalmente um **cliente** e um **servidor** . Cada JWT é assinado digitalmente para evitar adulteração e contém declarações (informações) sobre o usuário ou a sessão.
- **bcryptjs:** É um algoritmo de hash que cria hashes para senhas, permitindo armazená-las em caso de violação de dados. Este algoritmo de hash avançado utiliza salts, o que dificulta sua quebra por ataques como força bruta. BcryptJS é a implementação em JavaScript do hash `Bcrypt hashing algorithm`, permitindo que você use a criptografia sem precisar lidar com funções de hash complexas.

## Utilidades

- **cors:** É um mecanismo de segurança dos navegadores que permite que recursos de uma página web (como APIs) sejam solicitados por outro domínio diferente do que carregou o conteúdo inicial.
- **dotenv:** É um pacote que serve justamente para gerenciar as variáveis de ambiente dentro de um projeto Node.js. Essa ferramenta armazena a configuração dessas variáveis em um ambiente separado do código da aplicação.

# 2. Como o SQLite é usado com `sql.js`

### Funcionamento

- O banco roda **em memória**
- Pode ser salvo em arquivo (`.db`) manualmente
- Você executa SQL diretamente via código JS

### Fluxo típico:

1. Inicializa o banco:
    
    ```
    constSQL=awaitinitSqlJs();
    constdb=newSQL.Database();
    ```
    
2. Cria tabelas:
    
    ```
    CREATETABLE users (id, email, password);
    ```
    
3. Executa queries:
    
    ```
    db.run("INSERT INTO users VALUES (?, ?)", [email,senha]);
    ```
    
4. Consulta dados:
    
    ```
    constresult=db.exec("SELECT * FROM users");
    ```
    

# 3. Relações entre os arquivos(arquitetura comum)

```
/.vscode
/node_modules
/public
 ├── index.html
 ├── script.js
 └── style.css
/src
 ├── database/
 │    └── sqlite.js
 ├── routes/
 │    └── index.js
 ├── middleware/
 │    └── auth.js
 └── models/
      ├── Cliente.js
      ├── Pedido.js
      ├── Pizza.js
      └── Usuario.js
.env
index.js
package-lock.json
package.json
pizzaria.db
seed.js
```
# Feito por: 
- Arthur Marques
- Henrique Duarte
