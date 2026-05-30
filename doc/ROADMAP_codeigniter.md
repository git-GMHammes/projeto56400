# ROADMAP — Migração para CodeIgniter 4

## projeto56400 · Chat em Tempo Real

**Status:** Planejado  
**Versão alvo:** CodeIgniter 4.5.x  
**PHP alvo:** 8.2-FPM (sem troca de imagem Docker)  
**Data de elaboração:** 2026-05-30

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Stack Atual vs Stack Alvo](#2-stack-atual-vs-stack-alvo)
3. [Mapeamento de Componentes](#3-mapeamento-de-componentes)
4. [O que Permanece Intacto](#4-o-que-permanece-intacto)
5. [Estrutura de Diretórios CI4](#5-estrutura-de-diretórios-ci4)
6. [Fase 0 — Preparação e Branch](#6-fase-0--preparação-e-branch)
7. [Fase 1 — Instalar CodeIgniter 4 via Composer](#7-fase-1--instalar-codeigniter-4-via-composer)
8. [Fase 2 — Configurar Ambiente e Banco de Dados](#8-fase-2--configurar-ambiente-e-banco-de-dados)
9. [Fase 3 — Model: MessageModel](#9-fase-3--model-messagemodel)
10. [Fase 4 — Controller: MessageController](#10-fase-4--controller-messagecontroller)
11. [Fase 5 — Rotas (Routes.php)](#11-fase-5--rotas-routesphp)
12. [Fase 6 — Ajustar NGINX e Dockerfile PHP](#12-fase-6--ajustar-nginx-e-dockerfile-php)
13. [Fase 7 — Atualizar Front-end (chat.js)](#13-fase-7--atualizar-front-end-chatjs)
14. [Fase 8 — Validação e Testes](#14-fase-8--validação-e-testes)
15. [Checklist Final](#15-checklist-final)
16. [Referências](#16-referências)

---

## 1. Visão Geral

A migração substitui os três scripts PHP planos por uma estrutura MVC completa com CodeIgniter 4. A stack Docker/Podman, o servidor WebSocket Node.js e o banco MySQL permanecem sem alteração — apenas a camada PHP é refatorada.

**Motivação:**

- Eliminar PDO manual e lógica de validação espalhada em arquivos PHP avulsos.
- Ganhar roteamento tipado, Models com Query Builder, filtros HTTP (CORS, autenticação futura) e sistema de logs nativo.
- Preparar a base para features futuras (autenticação JWT, salas de chat, moderação).

**Escopo desta migração:**

- Instalar CI4 em `app/` via Composer.
- Criar `MessageModel` e `MessageController`.
- Definir rotas de API em `Routes.php`.
- Ajustar o NGINX para rotear requisições pelo front controller do CI4.
- Adicionar Composer ao Dockerfile PHP.
- Atualizar as constantes de endpoint em `chat.js`.

**Fora de escopo desta migração:**

- Autenticação / login de usuários.
- Salas de chat ou canais.
- Testes automatizados (PHPUnit).
- Alterações no banco de dados (`messages` permanece igual).

---

## 2. Stack Atual vs Stack Alvo

| Camada              | Atual                               | Alvo (CI4)                                       |
| ------------------- | ----------------------------------- | ------------------------------------------------ |
| Framework PHP       | Nenhum (scripts planos)             | CodeIgniter 4.5.x                                |
| Acesso ao banco     | PDO manual (`getDb()` em `db.php`)  | Query Builder via `MessageModel` (CI4)           |
| Roteamento          | Arquivo `.php` no path da URL       | `app/Config/Routes.php`                          |
| Validação           | `if` manual inline                  | `$this->validate()` do CI4                       |
| Configuração DB     | `getenv()` manual em `db.php`       | `app/Config/Database.php` com `getenv()`         |
| Estrutura de pastas | Flat (`app/public/api/*.php`)       | MVC (`Controllers/`, `Models/`, `Views/`)        |
| WebSocket           | Node.js 20 + Express + ws           | **Sem alteração**                                |
| NGINX               | `try_files` para `.php` diretamente | Front controller CI4 (`index.php?$query_string`) |
| MySQL               | MySQL 8.0                           | **Sem alteração**                                |
| Docker / Podman     | Docker Compose / Podman Compose     | **Sem alteração** (ajuste mínimo no Dockerfile)  |

---

## 3. Mapeamento de Componentes

| Componente atual                   | Substituição CI4                                           |
| ---------------------------------- | ---------------------------------------------------------- |
| `app/config/db.php`                | `app/app/Config/Database.php` (lê mesmas variáveis de env) |
| `app/public/api/send.php`          | `App\Controllers\Api\MessageController::send()`            |
| `app/public/api/history.php`       | `App\Controllers\Api\MessageController::history()`         |
| PDO direto + `lastInsertId()`      | `MessageModel::insert()` (retorna o ID)                    |
| `file_get_contents` para Node      | Mantido no controller (sem alteração de lógica)            |
| Sem roteamento                     | `app/Config/Routes.php` com grupo `api`                    |
| `app/public/index.html` (estático) | Permanece estático em `public/` **ou** vira CI4 View       |
| `app/public/chat.js`               | Atualizar apenas as constantes `API_SEND` e `API_HIST`     |

### Mudança de endpoints

| Ação       | Endpoint atual            | Endpoint CI4        |
| ---------- | ------------------------- | ------------------- |
| Enviar msg | `POST /api/send.php`      | `POST /api/message` |
| Histórico  | `GET /api/history.php`    | `GET /api/messages` |
| WebSocket  | `ws://localhost:56400/ws` | **Sem alteração**   |

---

## 4. O que Permanece Intacto

Os componentes abaixo **não serão alterados** nesta migração:

| Componente               | Motivo                                               |
| ------------------------ | ---------------------------------------------------- |
| `node/server.js`         | Lógica de broadcast WS independente do PHP           |
| `node/package.json`      | Dependências Node sem alteração                      |
| `docker/mysql/init.sql`  | Tabela `messages` permanece com o mesmo schema       |
| `docker/node/Dockerfile` | Imagem Node sem alteração                            |
| `docker-compose.yml`     | Sem alteração (volume `./app:/var/www/html` mantido) |
| `.env.example` e `.env`  | Mesmas variáveis de ambiente                         |
| `app/public/chat.js`     | Apenas 2 constantes atualizadas (linha 9 e 10)       |
| `app/public/index.html`  | Permanece como arquivo estático em `public/`         |
| Portas expostas          | 56400, 56401, 56402 sem alteração                    |

---

## 5. Estrutura de Diretórios CI4

Após a migração, o diretório `app/` terá a seguinte estrutura:

```
projeto56400/
├── .env.example
├── .env                            <- não versionado
├── docker-compose.yml
├── app/                            <- raiz do projeto CI4
│   ├── composer.json               <- gerado pelo CI4
│   ├── composer.lock
│   ├── vendor/                     <- dependências Composer (não versionado)
│   ├── .env                        <- env CI4 (development/production) — não versionado
│   ├── public/                     <- document root (NGINX aponta aqui)
│   │   ├── index.php               <- front controller do CI4
│   │   ├── index.html              <- interface do chat (estático)
│   │   └── chat.js                 <- cliente WebSocket + API
│   ├── app/                        <- código da aplicação
│   │   ├── Config/
│   │   │   ├── App.php
│   │   │   ├── Database.php        <- lê DB_HOST, DB_DATABASE, etc.
│   │   │   └── Routes.php          <- define POST /api/message e GET /api/messages
│   │   ├── Controllers/
│   │   │   ├── BaseController.php  <- gerado pelo CI4
│   │   │   └── Api/
│   │   │       └── MessageController.php
│   │   ├── Models/
│   │   │   └── MessageModel.php
│   │   └── Views/                  <- opcional nesta fase
│   ├── system/                     <- core CI4 (não editar)
│   └── writable/                   <- logs e cache (não versionado)
├── docker/
│   ├── mysql/
│   │   └── init.sql                <- sem alteração
│   ├── nginx/
│   │   └── default.conf            <- ajuste mínimo
│   ├── php/
│   │   └── Dockerfile              <- adicionar Composer
│   └── node/
│       └── Dockerfile              <- sem alteração
└── node/
    ├── package.json                <- sem alteração
    └── server.js                   <- sem alteração
```

---

## 6. Fase 0 — Preparação e Branch

**Objetivo:** Isolar a migração em branch dedicada e garantir pré-requisitos.

### 6.1 Criar branch de migração

```powershell
cd C:\laragon\www\php\habilidade\projeto56400
git checkout -b feature/ci4-migration
```

### 6.2 Verificar pré-requisitos no host

Composer deve estar instalado localmente (para gerar o projeto CI4 antes do build Docker):

```powershell
composer --version
# Esperado: Composer version 2.x.x
```

Se não estiver instalado:

```powershell
# Baixar o instalador do Composer e instalar globalmente
php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
php composer-setup.php --install-dir="C:\laragon\bin\composer" --filename=composer
php -r "unlink('composer-setup.php');"
```

### 6.3 Verificar extensões PHP disponíveis no container

```powershell
docker compose exec php php -m | Select-String -Pattern "pdo_mysql|mbstring|zip|intl"
```

Esperado: `pdo_mysql`, `mbstring`, `zip` já instalados (o Dockerfile atual já os inclui). `intl` pode ser necessária — verificar.

### 6.4 Backup do app atual

```powershell
Copy-Item -Recurse app app_backup_$(Get-Date -Format 'yyyyMMddHHmmss')
```

---

## 7. Fase 1 — Instalar CodeIgniter 4 via Composer

**Objetivo:** Gerar a estrutura CI4 no diretório `app/` substituindo os arquivos PHP planos.

### 7.1 Instalar CI4 em diretório temporário

Execute no host (não dentro do container), na raiz do projeto:

```powershell
cd C:\laragon\www\php\habilidade\projeto56400

# Cria o projeto CI4 em app-ci4/
composer create-project codeigniter4/appstarter app-ci4 --no-interaction
```

### 7.2 Migrar os assets estáticos para o novo public/

```powershell
# Copiar index.html e chat.js do app atual para o public/ do CI4
Copy-Item app\public\index.html app-ci4\public\index.html
Copy-Item app\public\chat.js    app-ci4\public\chat.js
```

### 7.3 Substituir o diretório app/

```powershell
# Remover o app atual
Remove-Item -Recurse -Force app

# Renomear o CI4 para app/
Rename-Item app-ci4 app
```

### 7.4 Adicionar vendor/ e writable/ ao .gitignore

Verificar se `.gitignore` já exclui essas pastas. Adicionar se ausente:

```
/app/vendor/
/app/writable/
/app/.env
/app_backup_*/
```

### 7.5 Verificar estrutura gerada

```powershell
Get-ChildItem app -Depth 1
```

Esperado: pastas `app/`, `public/`, `system/`, `vendor/`, `writable/` e arquivo `composer.json`.

---

## 8. Fase 2 — Configurar Ambiente e Banco de Dados

**Objetivo:** Fazer o CI4 ler as variáveis de ambiente já injetadas pelo Docker Compose.

### 8.1 Configurar Database.php

Editar `app/app/Config/Database.php`. Substituir o bloco `$default` para ler as variáveis de ambiente do container:

```php
public array $default = [
    'DSN'          => '',
    'hostname'     => getenv('DB_HOST')     ?: 'mysql',
    'port'         => (int) (getenv('DB_PORT')     ?: 3306),
    'username'     => getenv('DB_USERNAME') ?: 'chat56400_user',
    'password'     => getenv('DB_PASSWORD') ?: '',
    'database'     => getenv('DB_DATABASE') ?: 'chat56400_db',
    'DBDriver'     => 'MySQLi',
    'DBPrefix'     => '',
    'pConnect'     => false,
    'DBDebug'      => true,
    'charset'      => 'utf8mb4',
    'DBCollat'     => 'utf8mb4_unicode_ci',
    'swapPre'      => '',
    'encrypt'      => false,
    'compress'     => false,
    'strictOn'     => false,
    'failover'     => [],
    'connectTimeout' => 10,
];
```

As variáveis `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME` e `DB_PASSWORD` já são injetadas pelo `docker-compose.yml` via `environment:` no serviço `php` — sem nenhuma alteração no compose.

### 8.2 Configurar App.php

Editar `app/app/Config/App.php`:

```php
public string $baseURL = 'http://localhost:56400/';
public string $appTimezone = 'America/Sao_Paulo';
public string $defaultLocale = 'pt-BR';
```

### 8.3 Criar o .env do CI4

O CI4 usa seu próprio `.env` na raiz do projeto CI4 (`app/.env`). Criar com ambiente de desenvolvimento:

```bash
# app/.env  — NÃO versionar
CI_ENVIRONMENT = development
```

Este arquivo define o modo de execução. Em produção, alterar para `production`.

> O arquivo `.env` do CI4 **não substitui** o `.env` do Docker Compose na raiz do projeto — os dois coexistem. O Docker Compose continua injetando `DB_HOST`, `DB_PASSWORD` etc. via variáveis de ambiente do container.

### 8.4 Verificar conexão com o banco

Após subir os containers (Fase 6), verificar a conexão:

```powershell
docker compose exec php php -r "
\$db = new PDO(
    'mysql:host=' . getenv('DB_HOST') . ';dbname=' . getenv('DB_DATABASE'),
    getenv('DB_USERNAME'),
    getenv('DB_PASSWORD')
);
echo 'Conexão OK: ' . \$db->getAttribute(PDO::ATTR_SERVER_INFO);
"
```

---

## 9. Fase 3 — Model: MessageModel

**Objetivo:** Criar o Model que abstrai a tabela `messages` usando o Query Builder do CI4.

### 9.1 Criar o arquivo

Criar `app/app/Models/MessageModel.php`:

```php
<?php

namespace App\Models;

use CodeIgniter\Model;

class MessageModel extends Model
{
    protected $table         = 'messages';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $allowedFields = ['username', 'message'];
    protected $useTimestamps = false; // MySQL gerencia created_at via DEFAULT

    public function findLast50(): array
    {
        return array_reverse(
            $this->orderBy('created_at', 'DESC')
                 ->limit(50)
                 ->findAll()
        );
    }
}
```

**Notas:**

- `useTimestamps = false`: a coluna `created_at` já tem `DEFAULT CURRENT_TIMESTAMP` no `init.sql` — o MySQL define o valor automaticamente no INSERT.
- `allowedFields`: impede mass assignment de campos não permitidos.
- `findLast50()`: replica exatamente a query `ORDER BY created_at DESC LIMIT 50` do `history.php` atual, com `array_reverse` para exibição cronológica.

---

## 10. Fase 4 — Controller: MessageController

**Objetivo:** Criar o Controller que replica a lógica dos scripts `send.php` e `history.php`.

### 10.1 Criar o diretório e o arquivo

```powershell
New-Item -ItemType Directory -Force app\app\Controllers\Api
```

Criar `app/app/Controllers/Api/MessageController.php`:

```php
<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\MessageModel;
use CodeIgniter\HTTP\ResponseInterface;

class MessageController extends BaseController
{
    public function send(): ResponseInterface
    {
        $this->response->setHeader('Access-Control-Allow-Origin', '*');
        $this->response->setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        $this->response->setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if ($this->request->getMethod() === 'options') {
            return $this->response->setStatusCode(204);
        }

        $body     = $this->request->getJSON(true);
        $username = trim($body['username'] ?? '');
        $message  = trim($body['message']  ?? '');

        if ($username === '' || $message === '') {
            return $this->response
                ->setStatusCode(400)
                ->setJSON(['ok' => false, 'error' => 'username e message sao obrigatorios']);
        }

        $username = mb_substr($username, 0, 50);
        $message  = mb_substr($message,  0, 1000);

        $model = new MessageModel();
        $id    = $model->insert(['username' => $username, 'message' => $message], true);

        if ($id === false) {
            return $this->response
                ->setStatusCode(500)
                ->setJSON(['ok' => false, 'error' => 'Erro ao salvar mensagem']);
        }

        // Notifica o servidor Node para broadcast via WebSocket
        $payload = json_encode([
            'id'         => (int) $id,
            'username'   => $username,
            'message'    => $message,
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        $ctx = stream_context_create(['http' => [
            'method'        => 'POST',
            'header'        => "Content-Type: application/json\r\nContent-Length: " . strlen($payload) . "\r\n",
            'content'       => $payload,
            'timeout'       => 2,
            'ignore_errors' => true,
        ]]);
        @file_get_contents('http://node:3000/internal/broadcast', false, $ctx);

        return $this->response->setJSON(['ok' => true, 'id' => (int) $id]);
    }

    public function history(): ResponseInterface
    {
        $this->response->setHeader('Access-Control-Allow-Origin', '*');

        $model    = new MessageModel();
        $messages = $model->findLast50();

        return $this->response->setJSON(['ok' => true, 'messages' => $messages]);
    }
}
```

**Notas:**

- `getJSON(true)`: lê o corpo da requisição como array associativo (equivalente ao `json_decode(..., true)` do script atual).
- `insert(..., true)`: o segundo argumento `true` faz o método retornar o ID do registro inserido.
- O broadcast para `http://node:3000/internal/broadcast` permanece idêntico ao `send.php` atual.
- CORS inline para manter paridade com o script atual. Para projetos maiores, criar um `Filter` de CORS.

---

## 11. Fase 5 — Rotas (Routes.php)

**Objetivo:** Definir as rotas de API que substituem os paths `.php` diretos.

### 11.1 Editar Routes.php

Editar `app/app/Config/Routes.php`. Adicionar antes da linha `$routes->get('/', ...)`:

```php
/*
 * API de mensagens — substitui send.php e history.php
 */
$routes->group('api', function ($routes) {
    $routes->post('message',  'Api\MessageController::send');
    $routes->get('messages',  'Api\MessageController::history');
    $routes->options('message', static function () {
        return service('response')->setStatusCode(204);
    });
});
```

### 11.2 Rota raiz (opcional)

Se a interface do chat for servida pelo CI4 em vez de HTML estático, adicionar:

```php
$routes->get('/', 'Chat::index');
```

Nesta fase, manter o `index.html` estático — a rota raiz é desnecessária.

### 11.3 Tabela de rotas definidas

| Método  | URI             | Controller::método               | Equivalente atual       |
| ------- | --------------- | -------------------------------- | ----------------------- |
| POST    | `/api/message`  | `Api\MessageController::send`    | `POST /api/send.php`    |
| GET     | `/api/messages` | `Api\MessageController::history` | `GET /api/history.php`  |
| OPTIONS | `/api/message`  | Response 204 (preflight CORS)    | `OPTIONS /api/send.php` |

---

## 12. Fase 6 — Ajustar NGINX e Dockerfile PHP

### 12.1 Atualizar docker/nginx/default.conf

A única mudança obrigatória é rotear as requisições da API pelo front controller do CI4 (`index.php`) em vez de arquivos `.php` diretos. O `root /var/www/html/public` permanece o mesmo, pois `app/public/` do CI4 coincide exatamente com o document root atual.

Substituir o conteúdo de `docker/nginx/default.conf`:

```nginx
server {
    listen 80;
    server_name localhost _;

    root /var/www/html/public;
    index index.html index.php;

    charset utf-8;

    access_log /var/log/nginx/access.log;
    error_log  /var/log/nginx/error.log;

    # WebSocket — proxy para o Node (sem alteração)
    location /ws {
        proxy_pass         http://node:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host $host;
        proxy_read_timeout 3600s;
    }

    # PHP-FPM — todas as requisições .php via front controller CI4
    location ~ \.php$ {
        try_files $uri =404;
        fastcgi_split_path_info ^(.+\.php)(/.+)$;
        fastcgi_pass  php:9000;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param PATH_INFO       $fastcgi_path_info;
        include       fastcgi_params;
        fastcgi_read_timeout 60;
    }

    # API CI4 — rotear pelo front controller
    location /api {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # Arquivos estáticos com cache
    location ~* \.(js|css|png|jpg|ico|svg|woff2?)$ {
        expires 7d;
        access_log off;
        add_header Cache-Control "public";
    }

    # Raiz — serve index.html estático primeiro; PHP CI4 como fallback
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ /\. {
        deny all;
    }
}
```

**Diferenças em relação ao conf atual:**

| Bloco            | Antes                                | Depois                                          |
| ---------------- | ------------------------------------ | ----------------------------------------------- |
| `location /api/` | `try_files ... /api/index.php?$args` | `try_files ... /index.php?$query_string`        |
| `location /`     | `try_files $uri $uri/ /index.html`   | `try_files $uri $uri/ /index.php?$query_string` |

O bloco `location ~ \.php$` permanece idêntico.

### 12.2 Atualizar docker/php/Dockerfile

Adicionar o Composer ao container PHP para que `vendor/` possa ser instalado dentro do container (ou para rodar `composer install` durante o build):

```dockerfile
FROM php:8.2-fpm

# Dependências do sistema e extensões PHP
RUN apt-get update && apt-get install -y \
    curl \
    zip \
    unzip \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libzip-dev \
    libicu-dev \
    && docker-php-ext-install \
        pdo_mysql \
        mysqli \
        mbstring \
        zip \
        intl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Configurações PHP
RUN echo "date.timezone=America/Sao_Paulo" > /usr/local/etc/php/conf.d/timezone.ini \
    && echo "upload_max_filesize=16M" > /usr/local/etc/php/conf.d/limits.ini \
    && echo "post_max_size=16M" >> /usr/local/etc/php/conf.d/limits.ini \
    && echo "memory_limit=128M" >> /usr/local/etc/php/conf.d/limits.ini

# Garantir que variáveis de ambiente do container cheguem ao PHP-FPM
RUN sed -i 's/;clear_env = no/clear_env = no/' /usr/local/etc/php-fpm.d/www.conf

# Composer (copiado da imagem oficial)
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

EXPOSE 9000

CMD ["php-fpm"]
```

**Alterações em relação ao Dockerfile atual:**

- Adicionado `libicu-dev` nas dependências do sistema.
- Adicionada extensão `intl` (requerida pelo CI4).
- Adicionada linha `COPY --from=composer:latest` para incluir o Composer.

### 12.3 Instalar dependências do Composer no container

Após o build dos containers, executar dentro do container PHP:

```powershell
docker compose exec php composer install --working-dir=/var/www/html --no-dev --optimize-autoloader
```

Em desenvolvimento, omitir `--no-dev` para incluir ferramentas de debug do CI4.

### 12.4 Rebuild dos containers

```powershell
cd C:\laragon\www\php\habilidade\projeto56400

docker compose down
docker compose up -d --build
```

---

## 13. Fase 7 — Atualizar Front-end (chat.js)

**Objetivo:** Atualizar os dois endpoints da API no `chat.js` para apontar para as novas rotas CI4.

### 13.1 Alterar as constantes de endpoint

Editar `app/public/chat.js`, linhas 9–10:

```js
// Antes
const API_SEND = "/api/send.php";
const API_HIST = "/api/history.php";

// Depois
const API_SEND = "/api/message";
const API_HIST = "/api/messages";
```

Nenhuma outra alteração é necessária no `chat.js`. A estrutura do JSON de requisição e resposta permanece idêntica:

| Campo          | send (POST) — sem alteração   | history (GET) — sem alteração   |
| -------------- | ----------------------------- | ------------------------------- |
| Request body   | `{ username, message }`       | —                               |
| Response ok    | `{ ok: true, id: 42 }`        | `{ ok: true, messages: [...] }` |
| Response error | `{ ok: false, error: "..." }` | `{ ok: false, error: "..." }`   |

### 13.2 Compatibilidade backward (opcional)

Se precisar manter os paths antigos funcionando durante uma transição, adicionar aliases em `Routes.php`:

```php
// Aliases temporários — remover após validação
$routes->post('api/send.php',    'Api\MessageController::send');
$routes->get('api/history.php',  'Api\MessageController::history');
```

---

## 14. Fase 8 — Validação e Testes

### 14.1 Verificar status dos containers

```powershell
docker ps
# Todos os 5 containers devem estar Up: mysql, php, node, nginx, adminer
```

### 14.2 Testar GET /api/messages

```powershell
Invoke-RestMethod -Uri "http://localhost:56400/api/messages" -Method GET | ConvertTo-Json
```

Resposta esperada:

```json
{ "ok": true, "messages": [ ... ] }
```

### 14.3 Testar POST /api/message

```powershell
$body = '{"username":"Teste","message":"Mensagem de validação CI4"}'
Invoke-RestMethod -Uri "http://localhost:56400/api/message" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body | ConvertTo-Json
```

Resposta esperada:

```json
{ "ok": true, "id": 1 }
```

### 14.4 Verificar broadcast WebSocket

Após o POST, o Node deve receber o broadcast. Verificar nos logs:

```powershell
docker logs chat56400_node --tail 10
```

Esperado: linha indicando `clients: N` no response do `/internal/broadcast`.

### 14.5 Testar o chat no browser

1. Abrir **http://localhost:56400** no Chrome.
2. Verificar indicador verde (WebSocket ativo).
3. Verificar carregamento do histórico (últimas 50 mensagens).
4. Enviar uma mensagem.
5. Abrir **http://localhost:56400** no Firefox.
6. Confirmar que a mensagem enviada aparece em tempo real.

### 14.6 Verificar logs do PHP-FPM

```powershell
docker logs chat56400_php --tail 20
```

Não deve haver erros de `Class not found`, `Database connection refused` ou `Permission denied`.

### 14.7 Verificar rota CI4 no container

```powershell
docker compose exec php php spark routes
```

Saída esperada deve incluir as rotas `/api/message` e `/api/messages`.

---

## 15. Checklist Final

### Arquivos criados / alterados

- [ ] `app/app/Config/Database.php` — `hostname`, `username`, `password`, `database` lendo de `getenv()`
- [ ] `app/app/Config/App.php` — `baseURL`, `appTimezone`, `defaultLocale`
- [ ] `app/app/Config/Routes.php` — grupo `api` com `message` (POST) e `messages` (GET)
- [ ] `app/app/Models/MessageModel.php` — criado
- [ ] `app/app/Controllers/Api/MessageController.php` — criado
- [ ] `app/public/chat.js` — `API_SEND` e `API_HIST` atualizados
- [ ] `docker/nginx/default.conf` — blocos `location /api` e `location /` atualizados
- [ ] `docker/php/Dockerfile` — `intl`, `libicu-dev` e Composer adicionados
- [ ] `app/.env` — `CI_ENVIRONMENT = development` criado (não versionado)
- [ ] `.gitignore` — `app/vendor/`, `app/writable/`, `app/.env` excluídos

### Arquivos não alterados (confirmar)

- [ ] `docker-compose.yml` — sem alterações
- [ ] `docker/mysql/init.sql` — sem alterações
- [ ] `docker/node/Dockerfile` — sem alterações
- [ ] `node/server.js` — sem alterações
- [ ] `node/package.json` — sem alterações
- [ ] `.env.example` — sem alterações

### Testes funcionais

- [ ] `GET /api/messages` retorna `{ ok: true, messages: [...] }`
- [ ] `POST /api/message` retorna `{ ok: true, id: N }`
- [ ] `OPTIONS /api/message` retorna HTTP 204
- [ ] WebSocket conecta e indicador fica verde
- [ ] Histórico carrega ao abrir o chat
- [ ] Mensagem enviada aparece em tempo real em segundo browser
- [ ] Logs do PHP-FPM sem erros
- [ ] `php spark routes` lista as rotas CI4 corretamente

---

## 16. Referências

| Recurso                      | URL                                                            |
| ---------------------------- | -------------------------------------------------------------- |
| CodeIgniter 4 — Instalação   | https://codeigniter.com/user_guide/installation/index.html     |
| CI4 — Database Configuration | https://codeigniter.com/user_guide/database/configuration.html |
| CI4 — Models                 | https://codeigniter.com/user_guide/models/model.html           |
| CI4 — Controllers            | https://codeigniter.com/user_guide/incoming/controllers.html   |
| CI4 — Routing                | https://codeigniter.com/user_guide/incoming/routing.html       |
| CI4 — Responses              | https://codeigniter.com/user_guide/outgoing/response.html      |
| CI4 — Filters (CORS futuro)  | https://codeigniter.com/user_guide/incoming/filters.html       |
| NGINX + PHP-FPM + CI4        | https://codeigniter.com/user_guide/installation/running.html   |
| Composer create-project      | https://getcomposer.org/doc/03-cli.md#create-project           |

---

## 📌 Metadados do Autor

| Campo               | Informação                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Nome**            | Gustavo Hammes                                                                                                           |
| **Projeto**         | Registro e Cálculo de Diárias                                                                                            |
| **E-mail**          | [gustavo.hammes@loglabdigital.com.br](mailto:gustavo.hammes@loglabdigital.com.br)                                        |
| **Linkedin**        | [https://www.linkedin.com/in/gustavo-hammes](https://wa.me/5521980558545)                                                                          |
| **Stack principal** | PHP 8.2-FPM, Node.js 20 (Express + ws), NGINX Alpine, MySQL 8.0, Docker Compose / Podman |

> 🧠 *Este documento faz parte do projeto **Agente Social** – desenvolvido por Gustavo Hammes.*
