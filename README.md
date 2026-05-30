# Chat Simples com Docker Compose — projeto56400

## Objetivo

Montar stack completa para um chat simples sem login, usando PHP, NGINX, Node.js, MySQL e WebSocket.

---

## Estrutura de portas (baseada em 56400)

| Serviço        | Porta externa | Porta interna |
|----------------|---------------|---------------|
| NGINX (HTTP)   | 56400         | 80            |
| MySQL          | 56401         | 3306          |
| Adminer        | 56402         | 8080          |
| Node/WebSocket | 56403         | 3000          |

---

## Passos planejados

1. Criar `docker-compose.yml` na raiz do projeto
2. Criar `docker/nginx/default.conf` — proxy para PHP e WebSocket
3. Criar `docker/php/Dockerfile` — PHP 8.2-FPM
4. Criar `docker/node/Dockerfile` — Node 20 Alpine
5. Criar `app/` — código PHP do chat (index, send, history via API)
6. Criar `node/` — servidor WebSocket (`ws` + Express) em Node
7. Criar `.env.example` com variáveis de ambiente (sem credenciais em texto puro)

---

## Critérios de sucesso

- `docker compose up` sobe todos os serviços sem erro
- Página do chat abre em `http://localhost:56400`
- Mensagens enviadas aparecem em tempo real via WebSocket

---

## Estratégia de rollback

A pasta `projeto56400` já existe mas está vazia, sem risco de sobrescrita.

---

## Riscos / Observações

- Credenciais MySQL ficam no `.env` (nunca no `docker-compose.yml` hardcoded)
- O `docker-compose.yml` usará `${VAR}` referenciando o `.env`

---

## Estrutura de arquivos

```
projeto56400/
├── .env.example
├── docker-compose.yml
├── app/
│   ├── api/
│   │   ├── history.php       ← GET histórico (últimas 50 msgs)
│   │   └── send.php          ← POST salva + notifica Node
│   ├── config/
│   │   └── db.php            ← conexão PDO via env vars
│   └── public/
│       ├── index.html        ← interface do chat
│       └── chat.js           ← WebSocket client + API calls
├── docker/
│   ├── mysql/init.sql        ← cria tabela messages
│   ├── nginx/default.conf    ← proxy /ws → Node, PHP-FPM para .php
│   ├── php/Dockerfile        ← PHP 8.2-FPM + pdo_mysql
│   └── node/Dockerfile       ← Node 20 Alpine
└── node/
    ├── package.json
    └── server.js             ← servidor WS + endpoint /internal/broadcast
```

---

## Para subir

```bash
# 1. copie o .env e defina as senhas
cp .env.example .env

# 2. suba
docker compose up -d --build
```
