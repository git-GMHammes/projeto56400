# Chat em Tempo Real — projeto56400

Chat simples sem login com mensagens em tempo real via WebSocket.
Stack completa em Docker Compose: PHP 8.2, NGINX, Node.js 20, MySQL 8 e Adminer.

---

## Stack

| Camada       | Tecnologia                |
| ------------ | ------------------------- |
| Front-end    | HTML + CSS + JS vanilla   |
| Back-end API | PHP 8.2-FPM               |
| WebSocket    | Node.js 20 + ws + Express |
| Banco        | MySQL 8.0                 |
| Proxy        | NGINX Alpine              |
| DB Admin     | Adminer                   |
| Orquestração | Docker Compose            |

---

## Mapeamento de portas

| Serviço        | Porta externa | Porta interna | Acesso                             |
| -------------- | ------------- | ------------- | ---------------------------------- |
| NGINX (HTTP)   | 56400         | 80            | http://localhost:56400             |
| MySQL          | 56401         | 3306          | localhost:56401 (cliente SQL)      |
| Adminer        | 56402         | 8080          | http://localhost:56402             |
| Node/WebSocket | interno       | 3000          | via NGINX /ws (não exposto direto) |

---

## Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) >= 24 (ou Docker Engine + Compose plugin)
- Git

---

## Instalação

```bash
# 1. Clone o repositório
git clone <url-do-repositorio> projeto56400
cd projeto56400

# 2. Crie o arquivo de variáveis de ambiente
cp .env.example .env
# Edite o .env e defina as senhas:
# MYSQL_ROOT_PASSWORD, MYSQL_PASSWORD e DB_PASSWORD

# 3. Suba todos os serviços
docker compose up -d --build

# 4. Aguarde o MySQL ficar saudável (aprox. 30 s na primeira vez)
docker compose ps
```

O banco é inicializado automaticamente pelo script `docker/mysql/init.sql`
na primeira execução — a tabela `messages` é criada via `CREATE TABLE IF NOT EXISTS`.

---

## Utilização

Acesse o chat em: **http://localhost:56400**

1. Digite seu **nome** no campo à esquerda.
2. Digite a **mensagem** e pressione **Enter** ou clique **Enviar**.
3. As últimas 50 mensagens são carregadas automaticamente ao abrir a página.
4. Novas mensagens aparecem em tempo real via WebSocket.
5. O indicador no topo (bolinha) fica **verde** quando a conexão WebSocket está ativa.

O nome digitado é salvo no `localStorage` do navegador e recuperado na próxima visita.

---

## Teste com Dois Navegadores

Para simular dois usuários distintos e validar o fluxo em tempo real:

### Opção A — Chrome + Firefox

1. Abra **http://localhost:56400** no **Chrome** e informe o nome `Usuario_A`.
2. Abra **http://localhost:56400** no **Firefox** e informe o nome `Usuario_B`.
3. Envie uma mensagem em um browser — ela deve aparecer instantaneamente no outro.
4. O indicador de status deve estar **verde** em ambos.

### Opção B — Janela normal + Aba anônima (mesmo browser)

1. Abra **http://localhost:56400** normalmente e informe o nome `Usuario_A`.
2. Abra uma **aba anônima / privada**
   - Chrome: `Ctrl+Shift+N`
   - Firefox: `Ctrl+Shift+P`
3. Acesse **http://localhost:56400** na aba anônima e informe o nome `Usuario_B`.
4. Os nomes ficam isolados pois o `localStorage` não é compartilhado com a aba anônima.

> **Dica:** Posicione as duas janelas lado a lado para observar a entrega em
> tempo real sem precisar alternar entre elas.

---

## Estrutura de arquivos

```
projeto56400/
├── .env.example                    <- modelo de variáveis de ambiente
├── docker-compose.yml
├── app/
│   ├── config/
│   │   └── db.php                  <- conexão PDO via env vars
│   └── public/
│       ├── index.html              <- interface do chat
│       ├── chat.js                 <- WebSocket client + chamadas à API
│       └── api/
│           ├── send.php            <- POST: persiste mensagem + dispara broadcast
│           └── history.php         <- GET: retorna últimas 50 mensagens
├── docker/
│   ├── mysql/
│   │   └── init.sql                <- cria tabela messages
│   ├── nginx/
│   │   └── default.conf            <- proxy /ws -> Node; PHP-FPM para .php
│   ├── php/
│   │   └: Dockerfile               <- PHP 8.2-FPM + pdo_mysql
│   └── node/
│       └── Dockerfile              <- Node 20 Alpine
├── node/
│   ├── package.json
│   └── server.js                   <- servidor WS + endpoint /internal/broadcast
└── doc/
    ├── docker.txt
    └── podman.txt
```

---

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha os valores:

| Variável              | Descrição                       | Exemplo           |
| --------------------- | ------------------------------- | ----------------- |
| `MYSQL_ROOT_PASSWORD` | Senha do root do MySQL          | `SenhaRootForte!` |
| `MYSQL_DATABASE`      | Nome do banco                   | `chat56400_db`    |
| `MYSQL_USER`          | Usuário da aplicação            | `chat56400_user`  |
| `MYSQL_PASSWORD`      | Senha do usuário da aplicação   | `SenhaAppForte!`  |
| `DB_HOST`             | Host do MySQL (Docker: `mysql`) | `mysql`           |
| `DB_PORT`             | Porta interna do MySQL          | `3306`            |
| `WS_PORT`             | Porta interna do servidor Node  | `3000`            |

> **Importante:** o arquivo `.env` nunca deve ser commitado — ele já está no `.gitignore`.

---

## Endpoints da API

| Método | Endpoint                  | Descrição                                               |
| ------ | ------------------------- | ------------------------------------------------------- |
| GET    | `/api/history.php`        | Retorna as últimas 50 mensagens em JSON                 |
| POST   | `/api/send.php`           | Persiste mensagem e dispara broadcast via Node          |
| WS     | `ws://localhost:56400/ws` | Conexão WebSocket (proxiada pelo NGINX)                 |
| GET    | `/health` (interno Node)  | Status do servidor WS — acessível apenas na rede Docker |

**Body do `POST /api/send.php`:**

```json
{ "username": "Nome", "message": "Texto da mensagem" }
```

**Resposta de sucesso:**

```json
{ "ok": true, "id": 42 }
```

---

## Comandos úteis

```bash
# Ver logs em tempo real (todos os serviços)
docker compose logs -f

# Logs de um serviço específico
docker compose logs -f node
docker compose logs -f php
docker compose logs -f nginx

# Verificar status dos containers
docker compose ps

# Parar os serviços (mantém volumes)
docker compose down

# Parar e remover volumes — apaga dados do MySQL
docker compose down -v

# Reconstruir imagens após alterar Dockerfiles
docker compose up -d --build
```

---

## Administração do banco

Acesse o Adminer em **http://localhost:56402**:

| Campo    | Valor             |
| -------- | ----------------- |
| Sistema  | MySQL             |
| Servidor | `mysql`           |
| Usuário  | `chat56400_user`  |
| Senha    | (valor do `.env`) |
| Banco    | `chat56400_db`    |

---

## Roadmap — Futura integração com CodeIgniter 4

A migração para CodeIgniter 4 substituirá os scripts PHP planos por uma estrutura
MVC completa, mantendo a stack Docker e o servidor WebSocket Node.js intactos.

### O que muda

| Componente atual             | Substituição com CI4                                        |
| ---------------------------- | ----------------------------------------------------------- |
| `app/public/api/send.php`    | `App\Controllers\Api\MessageController::send()`             |
| `app/public/api/history.php` | `App\Controllers\Api\MessageController::history()`          |
| `app/config/db.php`          | `app/Config/Database.php` com leitura de env vars           |
| PDO direto                   | `App\Models\MessageModel` (Query Builder CI4)               |
| Sem roteamento               | `app/Config/Routes.php` com grupo `/api`                    |
| `index.html` estático        | `App\Views\chat\index.php` (ou manter HTML puro no public/) |

### O que permanece

- `node/server.js` e o endpoint `/internal/broadcast` — sem alteração.
- `docker/nginx/default.conf` — ajuste mínimo no `root` e no `fastcgi_param`.
- `docker/mysql/init.sql` — tabela `messages` sem mudança.
- Toda a stack Docker Compose.

### Estrutura de diretórios prevista (app/)

```
app/
├── public/                    <- document root (index.php do CI4 + assets)
│   ├── index.php
│   ├── chat.js
│   └── index.html
├── app/
│   ├── Config/
│   │   ├── Database.php
│   │   └── Routes.php
│   ├── Controllers/
│   │   └── Api/
│   │       └── MessageController.php
│   ├── Models/
│   │   └── MessageModel.php
│   └── Views/
│       └── chat/
│           └── index.php
└── writable/                  <- logs e cache (excluído do versionamento)
```

### Passos de migração

1. Instalar CI4 via Composer no diretório `app/` (`composer create-project codeigniter4/appstarter app`).
2. Configurar `app/Config/Database.php` para ler as variáveis de ambiente do container.
3. Criar `MessageModel` com `$table = 'messages'` e validação nativa.
4. Criar `MessageController` com métodos `send()` e `history()`, replicando a lógica atual.
5. Definir rotas em `Routes.php`: `$routes->group('api', function($routes) { ... })`.
6. Atualizar `docker/nginx/default.conf` — apontar `root` e `SCRIPT_FILENAME` para `app/public/`.
7. Manter `node/server.js` sem alteração; o PHP continuará chamando `/internal/broadcast`.
