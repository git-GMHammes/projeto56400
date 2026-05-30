# ROADMAP — Migração para Laravel 11

## projeto56400 · Chat em Tempo Real

**Status:** Planejado  
**Versão alvo:** Laravel 11.x (PHP 8.2+)  
**PHP alvo:** 8.2-FPM (sem troca de imagem Docker)  
**Data de elaboração:** 2026-05-30

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Stack Atual vs Stack Alvo](#2-stack-atual-vs-stack-alvo)
3. [Mapeamento de Componentes](#3-mapeamento-de-componentes)
4. [O que Permanece Intacto](#4-o-que-permanece-intacto)
5. [Estrutura de Diretórios Laravel](#5-estrutura-de-diretórios-laravel)
6. [Fase 0 — Preparação e Branch](#6-fase-0--preparação-e-branch)
7. [Fase 1 — Instalar Laravel via Composer](#7-fase-1--instalar-laravel-via-composer)
8. [Fase 2 — Configurar Ambiente (.env e Database)](#8-fase-2--configurar-ambiente-env-e-database)
9. [Fase 3 — Migration: tabela messages](#9-fase-3--migration-tabela-messages)
10. [Fase 4 — Model: Message (Eloquent)](#10-fase-4--model-message-eloquent)
11. [Fase 5 — FormRequest: SendMessageRequest](#11-fase-5--formrequest-sendmessagerequest)
12. [Fase 6 — Controller: MessageController](#12-fase-6--controller-messagecontroller)
13. [Fase 7 — Rotas (routes/api.php)](#13-fase-7--rotas-routesapiphp)
14. [Fase 8 — CORS (config/cors.php)](#14-fase-8--cors-configcorsphp)
15. [Fase 9 — Ajustar NGINX e Dockerfile PHP](#15-fase-9--ajustar-nginx-e-dockerfile-php)
16. [Fase 10 — Atualizar Front-end (chat.js)](#16-fase-10--atualizar-front-end-chatjs)
17. [Fase 11 — Validação e Testes](#17-fase-11--validação-e-testes)
18. [Checklist Final](#18-checklist-final)
19. [Comparativo: Laravel vs CodeIgniter 4](#19-comparativo-laravel-vs-codeigniter-4)
20. [Referências](#20-referências)

---

## 1. Visão Geral

A migração substitui os três scripts PHP planos por uma aplicação Laravel 11 completa com Eloquent ORM, roteamento de API nativo, validação via FormRequest e configuração CORS centralizada. A stack Docker/Podman, o servidor WebSocket Node.js e o banco MySQL permanecem sem alteração.

**Motivação:**

- Eliminar PDO manual, validação inline e roteamento via nome de arquivo `.php`.
- Ganhar Eloquent ORM, migrations versionadas, FormRequest com regras tipadas e CORS gerenciado pelo framework.
- Aproveitar o ecossistema Laravel: Artisan CLI, middleware de autenticação (futura), filas, eventos e broadcasting nativo.
- Preparar a base para autenticação Sanctum, salas de chat com Broadcasting/Echo e testes com Pest/PHPUnit.

**Escopo desta migração:**

- Instalar Laravel 11 em `app/` via Composer.
- Criar Migration, Model (`Message`), FormRequest (`SendMessageRequest`) e Controller (`MessageController`).
- Definir rotas de API em `routes/api.php` (auto-prefixadas com `/api`).
- Configurar CORS nativo (`config/cors.php`).
- Ajustar NGINX para o front controller Laravel (`public/index.php`).
- Adicionar Composer e extensão `intl` ao Dockerfile PHP.
- Atualizar as constantes de endpoint em `chat.js`.

**Fora de escopo desta migração:**

- Autenticação / Sanctum / Passport.
- Broadcasting nativo do Laravel (substituiria o Node.js atual).
- Filas e jobs assíncronos.
- Testes automatizados (Pest / PHPUnit).
- Alterações no banco de dados (`messages` permanece igual).

---

## 2. Stack Atual vs Stack Alvo

| Camada              | Atual                               | Alvo (Laravel 11)                                       |
| ------------------- | ----------------------------------- | ------------------------------------------------------- |
| Framework PHP       | Nenhum (scripts planos)             | Laravel 11.x                                            |
| Acesso ao banco     | PDO manual (`getDb()` em `db.php`)  | Eloquent ORM (`Message` model)                          |
| Roteamento          | Arquivo `.php` no path da URL       | `routes/api.php` (auto-prefixo `/api`)                  |
| Validação           | `if` manual inline                  | `SendMessageRequest` (FormRequest tipado)               |
| Configuração DB     | `getenv()` manual em `db.php`       | `config/database.php` + variáveis de ambiente do Docker |
| CORS                | `header()` manual em cada script    | `config/cors.php` + middleware `HandleCors`             |
| Estrutura de pastas | Flat (`app/public/api/*.php`)       | MVC (`Http/Controllers/`, `Models/`, `Http/Requests/`)  |
| CLI                 | Nenhuma                             | `php artisan` (make, migrate, route:list, key:generate) |
| WebSocket           | Node.js 20 + Express + ws           | **Sem alteração**                                       |
| NGINX               | `try_files` para `.php` diretamente | Front controller Laravel (`index.php?$query_string`)    |
| MySQL               | MySQL 8.0                           | **Sem alteração**                                       |
| Docker / Podman     | Docker Compose / Podman Compose     | **Sem alteração** (ajuste mínimo no Dockerfile)         |

---

## 3. Mapeamento de Componentes

| Componente atual                   | Substituição Laravel                                          |
| ---------------------------------- | ------------------------------------------------------------- |
| `app/config/db.php`                | `config/database.php` (lê `DB_*` vars do ambiente Docker)     |
| `app/public/api/send.php`          | `App\Http\Controllers\Api\MessageController::send()`          |
| `app/public/api/history.php`       | `App\Http\Controllers\Api\MessageController::history()`       |
| PDO direto + prepared statement    | `Message::create(['username' => ..., 'message' => ...])`      |
| `$pdo->lastInsertId()`             | ID retornado por `Message::create()` em `$msg->id`            |
| `file_get_contents` para Node      | Mantido no controller (sem alteração de lógica)               |
| Sem roteamento                     | `routes/api.php` — `Route::post/get(...)` prefixado em `/api` |
| `header('Access-Control-...')`     | Middleware `HandleCors` configurado em `config/cors.php`      |
| `app/public/index.html` (estático) | Permanece estático em `public/` ou vira Blade View            |
| `app/public/chat.js`               | Atualizar apenas as constantes `API_SEND` e `API_HIST`        |

### Mudança de endpoints

| Ação       | Endpoint atual            | Endpoint Laravel    |
| ---------- | ------------------------- | ------------------- |
| Enviar msg | `POST /api/send.php`      | `POST /api/message` |
| Histórico  | `GET /api/history.php`    | `GET /api/messages` |
| WebSocket  | `ws://localhost:56400/ws` | **Sem alteração**   |

---

## 4. O que Permanece Intacto

| Componente               | Motivo                                               |
| ------------------------ | ---------------------------------------------------- |
| `node/server.js`         | Lógica de broadcast WS independente do PHP           |
| `node/package.json`      | Dependências Node sem alteração                      |
| `docker/mysql/init.sql`  | Tabela `messages` permanece com o mesmo schema       |
| `docker/node/Dockerfile` | Imagem Node sem alteração                            |
| `docker-compose.yml`     | Sem alteração (volume `./app:/var/www/html` mantido) |
| `.env.example` e `.env`  | Mesmas variáveis de ambiente DB\_\*                  |
| `app/public/chat.js`     | Apenas 2 constantes atualizadas (linhas 9–10)        |
| `app/public/index.html`  | Permanece como arquivo estático em `public/`         |
| Portas expostas          | 56400, 56401, 56402 sem alteração                    |

---

## 5. Estrutura de Diretórios Laravel

Após a migração, o diretório `app/` terá a seguinte estrutura:

```
projeto56400/
├── .env.example
├── .env                                <- Docker Compose (DB_*, WS_PORT)
├── docker-compose.yml
├── app/                                <- raiz do projeto Laravel
│   ├── composer.json
│   ├── composer.lock
│   ├── artisan                         <- Artisan CLI
│   ├── vendor/                         <- dependências Composer (não versionado)
│   ├── .env                            <- Laravel .env (APP_KEY, APP_ENV, etc.) — não versionado
│   ├── public/                         <- document root (NGINX aponta aqui)
│   │   ├── index.php                   <- front controller Laravel
│   │   ├── index.html                  <- interface do chat (estático)
│   │   └── chat.js                     <- cliente WebSocket + API
│   ├── app/                            <- código da aplicação
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   │   └── Api/
│   │   │   │       └── MessageController.php
│   │   │   └── Requests/
│   │   │       └── SendMessageRequest.php
│   │   └── Models/
│   │       └── Message.php
│   ├── bootstrap/
│   │   ├── app.php                     <- ponto de entrada (rotas, middleware, providers)
│   │   └── cache/                      <- não versionado
│   ├── config/
│   │   ├── database.php                <- lê DB_* do ambiente Docker
│   │   └── cors.php                    <- publicado via artisan
│   ├── database/
│   │   └── migrations/
│   │       └── xxxx_create_messages_table.php
│   ├── routes/
│   │   ├── api.php                     <- criado via php artisan install:api
│   │   └── web.php
│   └── storage/                        <- logs e cache (não versionado)
│       ├── app/
│       ├── framework/
│       └── logs/
├── docker/
│   ├── mysql/
│   │   └── init.sql                    <- sem alteração
│   ├── nginx/
│   │   └── default.conf                <- ajuste mínimo
│   ├── php/
│   │   └── Dockerfile                  <- adicionar intl + Composer
│   └── node/
│       └── Dockerfile                  <- sem alteração
└── node/
    ├── package.json                    <- sem alteração
    └── server.js                       <- sem alteração
```

---

## 6. Fase 0 — Preparação e Branch

**Objetivo:** Isolar a migração em branch dedicada e verificar pré-requisitos.

### 6.1 Criar branch de migração

```powershell
cd C:\laragon\www\php\habilidade\projeto56400
git checkout -b feature/laravel-migration
```

### 6.2 Verificar pré-requisitos no host

```powershell
# Composer >= 2.x
composer --version

# PHP >= 8.2 (para rodar Artisan localmente, opcional)
php --version

# Extensões requeridas pelo Laravel
php -m | Select-String "pdo_mysql|mbstring|openssl|tokenizer|xml|ctype|bcmath|intl"
```

**Extensões obrigatórias para Laravel 11:**

| Extensão    | Status no Dockerfile atual  |
| ----------- | --------------------------- |
| `pdo_mysql` | Instalada                   |
| `mbstring`  | Instalada                   |
| `openssl`   | Já disponível no PHP base   |
| `tokenizer` | Já disponível no PHP base   |
| `xml`       | Já disponível no PHP base   |
| `ctype`     | Já disponível no PHP base   |
| `bcmath`    | **Adicionar ao Dockerfile** |
| `intl`      | **Adicionar ao Dockerfile** |

### 6.3 Backup do app atual

```powershell
Copy-Item -Recurse app app_backup_$(Get-Date -Format 'yyyyMMddHHmmss')
```

---

## 7. Fase 1 — Instalar Laravel via Composer

**Objetivo:** Gerar a estrutura Laravel 11 no diretório `app/`, substituindo os scripts PHP planos.

### 7.1 Instalar Laravel em diretório temporário

Execute no host (não dentro do container), na raiz do projeto:

```powershell
cd C:\laragon\www\php\habilidade\projeto56400

# Cria o projeto Laravel em app-laravel/
composer create-project laravel/laravel app-laravel --no-interaction
```

### 7.2 Migrar os assets estáticos para o novo public/

```powershell
# Copiar index.html e chat.js para o public/ do Laravel
Copy-Item app\public\index.html app-laravel\public\index.html
Copy-Item app\public\chat.js    app-laravel\public\chat.js
```

### 7.3 Substituir o diretório app/

```powershell
# Remover o app atual
Remove-Item -Recurse -Force app

# Renomear o projeto Laravel para app/
Rename-Item app-laravel app
```

### 7.4 Adicionar vendor/, storage/ e bootstrap/cache/ ao .gitignore

Verificar se `.gitignore` já exclui essas pastas. Adicionar se ausente:

```
/app/vendor/
/app/storage/
/app/bootstrap/cache/
/app/.env
/app_backup_*/
```

### 7.5 Verificar estrutura gerada

```powershell
Get-ChildItem app -Depth 1
```

Esperado: `app/`, `bootstrap/`, `config/`, `database/`, `public/`, `resources/`, `routes/`, `storage/`, `vendor/`, `artisan`, `composer.json`.

---

## 8. Fase 2 — Configurar Ambiente (.env e Database)

**Objetivo:** Gerar APP_KEY, apontar o Laravel para as variáveis do Docker Compose e configurar o acesso ao banco.

### 8.1 Criar o .env do Laravel

O arquivo `app/.env` é criado automaticamente pelo `composer create-project`. Ele contém as configurações base que serão substituídas pelas variáveis de ambiente do Docker Compose em runtime.

Editar `app/.env` com os valores do projeto:

```dotenv
APP_NAME="Chat 56400"
APP_ENV=local
APP_KEY=           # será gerado na Fase 2.2
APP_DEBUG=true
APP_URL=http://localhost:56400

LOG_CHANNEL=stack
LOG_LEVEL=debug

# Estas variáveis são injetadas pelo docker-compose.yml no container PHP.
# Os valores abaixo são fallback para execução local (fora do Docker).
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=chat56400_db
DB_USERNAME=chat56400_user
DB_PASSWORD=

CACHE_STORE=file
QUEUE_CONNECTION=sync
SESSION_DRIVER=file
SESSION_LIFETIME=120
```

> **Importante:** as variáveis `DB_HOST=mysql`, `DB_DATABASE`, `DB_USERNAME` e `DB_PASSWORD`
> são injetadas pelo `docker-compose.yml` via `environment:` no serviço `php`. Como o
> Laravel usa `Dotenv::createImmutable()`, variáveis de ambiente do sistema operacional
> **têm precedência** sobre o `app/.env` — portanto, dentro do container Docker, o
> `DB_HOST=mysql` do Compose sobrescreve o `DB_HOST=127.0.0.1` do `.env`.

### 8.2 Gerar o APP_KEY

O `APP_KEY` é obrigatório no Laravel (usado para criptografia de sessão e cookies). Gerar dentro do container PHP após o build:

```powershell
docker compose exec php php artisan key:generate
```

Ou, se o Composer estiver instalado no host:

```powershell
cd app
php artisan key:generate
```

O comando atualiza automaticamente a linha `APP_KEY=` no `app/.env`.

### 8.3 Verificar config/database.php

O arquivo `app/config/database.php` já lê as variáveis `DB_*` via `env()` por padrão. Verificar a conexão `mysql`:

```php
'mysql' => [
    'driver'    => 'mysql',
    'host'      => env('DB_HOST', '127.0.0.1'),
    'port'      => env('DB_PORT', '3306'),
    'database'  => env('DB_DATABASE', 'laravel'),
    'username'  => env('DB_USERNAME', 'root'),
    'password'  => env('DB_PASSWORD', ''),
    'charset'   => 'utf8mb4',
    'collation' => 'utf8mb4_unicode_ci',
    'prefix'    => '',
    'strict'    => true,
    'engine'    => null,
],
```

Os nomes das variáveis coincidem exatamente com o `.env.example` do projeto — nenhuma alteração adicional é necessária no `config/database.php`.

### 8.4 Registrar rotas de API (Laravel 11)

No Laravel 11, `routes/api.php` não existe por padrão. Criá-lo via Artisan:

```powershell
docker compose exec php php artisan install:api
```

Este comando:

1. Cria o arquivo `routes/api.php`.
2. Registra o arquivo no `bootstrap/app.php`.
3. Publica a migration do `personal_access_tokens` (para Sanctum — pode ser ignorada por ora).

### 8.5 Testar conexão com o banco

```powershell
docker compose exec php php artisan db:show
```

Saída esperada: informações sobre o banco `chat56400_db` com a tabela `messages`.

---

## 9. Fase 3 — Migration: tabela messages

**Objetivo:** Criar uma migration Laravel que representa a tabela `messages`, tornando o schema versionado pelo framework.

### 9.1 Gerar a migration via Artisan

```powershell
docker compose exec php php artisan make:migration create_messages_table --create=messages
```

### 9.2 Editar a migration gerada

Localizar o arquivo em `app/database/migrations/xxxx_xx_xx_xxxxxx_create_messages_table.php` e substituir pelo conteúdo abaixo:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('messages')) {
            return; // Tabela já criada pelo init.sql do Docker — pular
        }

        Schema::create('messages', function (Blueprint $table) {
            $table->unsignedInteger('id')->autoIncrement();
            $table->string('username', 50);
            $table->text('message');
            $table->dateTime('created_at')->useCurrent();
            $table->index('created_at', 'idx_created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
};
```

**Notas:**

- `$table->unsignedInteger('id')->autoIncrement()`: garante `INT UNSIGNED AUTO_INCREMENT`, idêntico ao `init.sql` atual. O `$table->id()` padrão do Laravel cria `BIGINT UNSIGNED`, que divergiria do schema existente.
- `if (Schema::hasTable('messages')) return;`: o `init.sql` do Docker já criou a tabela na primeira execução — a migration apenas registra o estado sem recriar.
- `useCurrent()`: mapeia para `DEFAULT CURRENT_TIMESTAMP`, idêntico ao `init.sql`.

### 9.3 Executar a migration

```powershell
docker compose exec php php artisan migrate
```

Saída esperada: `Nothing to migrate.` (tabela já existe) ou `Ran: create_messages_table`.

### 9.4 Verificar o estado das migrations

```powershell
docker compose exec php php artisan migrate:status
```

Todas as migrations devem aparecer como `Ran`.

---

## 10. Fase 4 — Model: Message (Eloquent)

**Objetivo:** Criar o Eloquent Model que representa a tabela `messages`.

### 10.1 Gerar o Model via Artisan

```powershell
docker compose exec php php artisan make:model Message
```

### 10.2 Editar o Model gerado

Substituir o conteúdo de `app/app/Models/Message.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Message extends Model
{
    protected $table = 'messages';

    /**
     * Laravel não gerencia timestamps automaticamente.
     * MySQL define created_at via DEFAULT CURRENT_TIMESTAMP no init.sql.
     */
    public $timestamps = false;

    protected $fillable = ['username', 'message'];

    protected $casts = [
        'id'         => 'integer',
        'created_at' => 'datetime:Y-m-d H:i:s',
    ];

    /**
     * Retorna as últimas 50 mensagens em ordem cronológica crescente.
     * Equivale à query: SELECT ... ORDER BY created_at DESC LIMIT 50 + array_reverse().
     */
    public static function findLast50(): array
    {
        return static::query()
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get()
            ->reverse()
            ->values()
            ->toArray();
    }
}
```

**Notas:**

- `$timestamps = false`: impede que o Eloquent tente gerenciar `created_at` e `updated_at` — a coluna é gerenciada pelo MySQL via `DEFAULT CURRENT_TIMESTAMP`.
- `$casts['created_at']`: garante que o campo seja retornado no formato `Y-m-d H:i:s`, idêntico ao retorno atual da API.
- `findLast50()`: `->reverse()->values()` mantém a ordem cronológica crescente para exibição no chat, replicando o `array_reverse($stmt->fetchAll())` do `history.php` atual.

---

## 11. Fase 5 — FormRequest: SendMessageRequest

**Objetivo:** Centralizar as regras de validação do endpoint `POST /api/message` em uma classe FormRequest tipada.

### 11.1 Gerar o FormRequest via Artisan

```powershell
docker compose exec php php artisan make:request SendMessageRequest
```

### 11.2 Editar o FormRequest gerado

Substituir o conteúdo de `app/app/Http/Requests/SendMessageRequest.php`:

```php
<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class SendMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Sem autenticação nesta fase
    }

    public function rules(): array
    {
        return [
            'username' => ['required', 'string', 'max:50'],
            'message'  => ['required', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'username.required' => 'username e message sao obrigatorios',
            'message.required'  => 'username e message sao obrigatorios',
        ];
    }

    /**
     * Retorna erro no mesmo formato JSON da API atual: { ok: false, error: "..." }
     * em vez do formato padrão do Laravel (422 com "errors": {...}).
     */
    protected function failedValidation(Validator $validator): never
    {
        throw new HttpResponseException(
            response()->json(
                ['ok' => false, 'error' => $validator->errors()->first()],
                400
            )
        );
    }
}
```

**Notas:**

- `failedValidation()`: garante que erros de validação retornem `{ "ok": false, "error": "..." }` com HTTP 400, mantendo paridade com o `send.php` atual. Sem isso, o Laravel retornaria HTTP 422 com estrutura `{ "errors": {...} }`.
- `authorize()`: retorna `true` pois não há autenticação nesta fase. Em versões futuras com Sanctum, verificar `$this->user()` aqui.

---

## 12. Fase 6 — Controller: MessageController

**Objetivo:** Criar o controller de API que substitui `send.php` e `history.php`.

### 12.1 Gerar o Controller via Artisan

```powershell
docker compose exec php php artisan make:controller Api/MessageController
```

### 12.2 Editar o Controller gerado

Substituir o conteúdo de `app/app/Http/Controllers/Api/MessageController.php`:

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SendMessageRequest;
use App\Models\Message;
use Illuminate\Http\JsonResponse;

class MessageController extends Controller
{
    /**
     * POST /api/message
     * Persiste a mensagem e dispara broadcast via Node.js.
     * Substitui: app/public/api/send.php
     */
    public function send(SendMessageRequest $request): JsonResponse
    {
        $username = mb_substr(trim($request->validated('username')), 0, 50);
        $message  = mb_substr(trim($request->validated('message')),  0, 1000);

        $msg = Message::create([
            'username' => $username,
            'message'  => $message,
        ]);

        // Notifica o servidor Node para broadcast via WebSocket.
        // Mantém a mesma lógica do send.php atual.
        $payload = json_encode([
            'id'         => $msg->id,
            'username'   => $username,
            'message'    => $message,
            'created_at' => now()->format('Y-m-d H:i:s'),
        ]);

        $ctx = stream_context_create(['http' => [
            'method'        => 'POST',
            'header'        => "Content-Type: application/json\r\nContent-Length: " . strlen($payload) . "\r\n",
            'content'       => $payload,
            'timeout'       => 2,
            'ignore_errors' => true,
        ]]);
        @file_get_contents('http://node:3000/internal/broadcast', false, $ctx);

        return response()->json(['ok' => true, 'id' => $msg->id]);
    }

    /**
     * GET /api/messages
     * Retorna as últimas 50 mensagens em ordem cronológica crescente.
     * Substitui: app/public/api/history.php
     */
    public function history(): JsonResponse
    {
        return response()->json([
            'ok'       => true,
            'messages' => Message::findLast50(),
        ]);
    }
}
```

**Notas:**

- `$request->validated('username')`: retorna apenas os campos validados pelo `SendMessageRequest`, prevenindo mass assignment de campos extras.
- O `mb_substr` após `validated()` reforça o limite de caracteres no nível da aplicação (as regras `max:50` e `max:1000` do FormRequest já garantem isso — os `mb_substr` são uma defesa adicional mantida para paridade com o script atual).
- O `@file_get_contents` para `http://node:3000/internal/broadcast` é idêntico ao `send.php` atual. Em versões futuras, substituir por `Http::post()` do Laravel HTTP Client com tratamento de exceções.
- `now()->format('Y-m-d H:i:s')`: como `$timestamps = false` no Model, `$msg->created_at` será `null` após o insert — usar `now()` garante o timestamp correto no payload do broadcast.

---

## 13. Fase 7 — Rotas (routes/api.php)

**Objetivo:** Definir as rotas de API que substituem os paths `.php` diretos.

### 13.1 Editar routes/api.php

O arquivo `routes/api.php` foi criado na Fase 2.4 via `php artisan install:api`.
Substituir seu conteúdo por:

```php
<?php

use App\Http\Controllers\Api\MessageController;
use Illuminate\Support\Facades\Route;

/*
 * Rotas de API do Chat 56400.
 * Auto-prefixadas com /api pelo bootstrap/app.php.
 *
 * POST /api/message  → substitui POST /api/send.php
 * GET  /api/messages → substitui GET  /api/history.php
 */

Route::post('/message',  [MessageController::class, 'send']);
Route::get('/messages',  [MessageController::class, 'history']);
```

### 13.2 Como o prefixo /api é aplicado no Laravel 11

No Laravel 11, o `bootstrap/app.php` registra o prefixo `/api` para o arquivo `routes/api.php`. Verificar a seção relevante em `app/bootstrap/app.php`:

```php
->withRouting(
    web: __DIR__ . '/../routes/web.php',
    api: __DIR__ . '/../routes/api.php',
    // ...
)
```

O prefixo `/api` é automático — não é necessário envolvê-las em `Route::prefix('api')->group(...)`.

### 13.3 Preflight OPTIONS (CORS)

O middleware `HandleCors` (configurado na Fase 8) responde automaticamente às requisições `OPTIONS` — não é necessário definir uma rota `OPTIONS` manual.

### 13.4 Tabela de rotas definidas

| Método | URI             | Controller::método           | Equivalente atual      |
| ------ | --------------- | ---------------------------- | ---------------------- |
| POST   | `/api/message`  | `MessageController::send`    | `POST /api/send.php`   |
| GET    | `/api/messages` | `MessageController::history` | `GET /api/history.php` |

### 13.5 Verificar rotas registradas

```powershell
docker compose exec php php artisan route:list --path=api
```

Saída esperada:

```
GET|HEAD  api/messages  MessageController@history
POST      api/message   MessageController@send
```

---

## 14. Fase 8 — CORS (config/cors.php)

**Objetivo:** Substituir os headers `Access-Control-*` manuais de cada script por configuração centralizada no middleware CORS do Laravel.

### 14.1 Publicar a configuração CORS

```powershell
docker compose exec php php artisan config:publish cors
```

Isso cria `app/config/cors.php`.

### 14.2 Editar config/cors.php

```php
<?php

return [
    /*
     * Paths que receberão os headers CORS.
     * api/* cobre todos os endpoints de /api/message e /api/messages.
     */
    'paths' => ['api/*'],

    'allowed_methods' => ['GET', 'POST', 'OPTIONS'],

    'allowed_origins' => ['*'],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['Content-Type', 'Accept', 'X-Requested-With'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,
];
```

### 14.3 Verificar que HandleCors está ativo nas rotas de API

No Laravel 11, o middleware `HandleCors` é global por padrão (configurado em `bootstrap/app.php`). Confirmar em `app/bootstrap/app.php`:

```php
->withMiddleware(function (Middleware $middleware) {
    // HandleCors já está no grupo global por padrão no Laravel 11
})
```

Se não estiver ativo para rotas de API, adicionar explicitamente:

```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->api(prepend: [
        \Illuminate\Http\Middleware\HandleCors::class,
    ]);
})
```

### 14.4 Remover headers CORS manuais do controller

Com o middleware configurado, os `header('Access-Control-...')` manuais devem ser **removidos** do `MessageController` — eles serão injetados automaticamente.

---

## 15. Fase 9 — Ajustar NGINX e Dockerfile PHP

### 15.1 Atualizar docker/nginx/default.conf

A mudança principal é rotear as requisições pelo front controller Laravel (`index.php`). O `root /var/www/html/public` permanece idêntico, pois o `public/` do Laravel coincide com o document root atual.

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

    # PHP-FPM — todas as requisições .php via front controller Laravel
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

    # API Laravel — rotear pelo front controller
    location /api {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # Arquivos estáticos com cache
    location ~* \.(js|css|png|jpg|ico|svg|woff2?)$ {
        expires 7d;
        access_log off;
        add_header Cache-Control "public";
    }

    # Raiz — serve index.html estático primeiro; fallback para front controller Laravel
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

O bloco `location ~ \.php$` e o bloco `/ws` permanecem idênticos.

### 15.2 Atualizar docker/php/Dockerfile

Adicionar as extensões `bcmath` e `intl` (obrigatórias pelo Laravel), e incluir o Composer:

```dockerfile
FROM php:8.2-fpm

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
        bcmath \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN echo "date.timezone=America/Sao_Paulo" > /usr/local/etc/php/conf.d/timezone.ini \
    && echo "upload_max_filesize=16M" > /usr/local/etc/php/conf.d/limits.ini \
    && echo "post_max_size=16M" >> /usr/local/etc/php/conf.d/limits.ini \
    && echo "memory_limit=256M" >> /usr/local/etc/php/conf.d/limits.ini

RUN sed -i 's/;clear_env = no/clear_env = no/' /usr/local/etc/php-fpm.d/www.conf

# Composer (copiado da imagem oficial)
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

EXPOSE 9000

CMD ["php-fpm"]
```

**Alterações em relação ao Dockerfile atual:**

- Adicionado `libicu-dev` nas dependências do sistema.
- Adicionadas extensões `intl` e `bcmath` (obrigatórias pelo Laravel).
- `memory_limit` aumentado de `128M` para `256M` (Laravel consome mais memória que PHP plano).
- Adicionada linha `COPY --from=composer:latest`.

### 15.3 Configurar permissões do storage

O Laravel precisa de permissão de escrita nas pastas `storage/` e `bootstrap/cache/`:

```powershell
docker compose exec php chmod -R 775 storage bootstrap/cache
docker compose exec php chown -R www-data:www-data storage bootstrap/cache
```

### 15.4 Instalar dependências do Composer no container

```powershell
docker compose exec php composer install `
    --working-dir=/var/www/html `
    --no-dev `
    --optimize-autoloader `
    --no-interaction
```

Em desenvolvimento, omitir `--no-dev` para incluir pacotes de debug.

### 15.5 Rebuild dos containers

```powershell
cd C:\laragon\www\php\habilidade\projeto56400

docker compose down
docker compose up -d --build
```

### 15.6 Otimizações de produção (opcional nesta fase)

```powershell
# Cachear configurações (acelera leitura de config)
docker compose exec php php artisan config:cache

# Cachear rotas (acelera resolução de rotas)
docker compose exec php php artisan route:cache

# Cachear views (opcional — sem views Blade nesta fase)
# docker compose exec php php artisan view:cache

# Gerar autoload otimizado
docker compose exec php composer dump-autoload --optimize
```

> **Atenção:** após qualquer alteração em `.env`, `config/` ou `routes/`, limpar o cache:
>
> ```powershell
> docker compose exec php php artisan optimize:clear
> ```

---

## 16. Fase 10 — Atualizar Front-end (chat.js)

**Objetivo:** Atualizar os dois endpoints da API no `chat.js` para apontar para as novas rotas Laravel.

### 16.1 Alterar as constantes de endpoint

Editar `app/public/chat.js`, linhas 9–10:

```js
// Antes
const API_SEND = "/api/send.php";
const API_HIST = "/api/history.php";

// Depois
const API_SEND = "/api/message";
const API_HIST = "/api/messages";
```

Nenhuma outra alteração é necessária no `chat.js`. O contrato JSON permanece idêntico:

| Campo          | send (POST) — sem alteração               | history (GET) — sem alteração       |
| -------------- | ----------------------------------------- | ----------------------------------- |
| Request body   | `{ "username": "...", "message": "..." }` | —                                   |
| Response ok    | `{ "ok": true, "id": 42 }`                | `{ "ok": true, "messages": [...] }` |
| Response error | `{ "ok": false, "error": "..." }`         | `{ "ok": false, "error": "..." }`   |

### 16.2 Compatibilidade backward (opcional)

Se precisar manter os paths antigos funcionando durante uma transição, adicionar aliases em `routes/api.php`:

```php
// Aliases temporários — remover após validação completa
Route::post('/send.php',    [MessageController::class, 'send']);
Route::get('/history.php',  [MessageController::class, 'history']);
```

---

## 17. Fase 11 — Validação e Testes

### 17.1 Verificar status dos containers

```powershell
docker ps
# Todos os 5 containers devem estar Up: mysql, php, node, nginx, adminer
```

### 17.2 Verificar APP_KEY

```powershell
docker compose exec php php artisan key:show
# Deve exibir uma chave base64 de 32 bytes
```

### 17.3 Verificar status das migrations

```powershell
docker compose exec php php artisan migrate:status
```

Todas as migrations devem aparecer como `Ran`.

### 17.4 Listar rotas registradas

```powershell
docker compose exec php php artisan route:list --path=api
```

Esperado: rotas `GET /api/messages` e `POST /api/message`.

### 17.5 Testar GET /api/messages

```powershell
Invoke-RestMethod -Uri "http://localhost:56400/api/messages" -Method GET |
    ConvertTo-Json -Depth 5
```

Resposta esperada:

```json
{ "ok": true, "messages": [ ... ] }
```

### 17.6 Testar POST /api/message

```powershell
$body = '{"username":"Teste","message":"Validação Laravel 11"}'
Invoke-RestMethod -Uri "http://localhost:56400/api/message" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body | ConvertTo-Json
```

Resposta esperada:

```json
{ "ok": true, "id": 1 }
```

### 17.7 Testar validação de erro

```powershell
$body = '{"username":"","message":""}'
try {
    Invoke-RestMethod -Uri "http://localhost:56400/api/message" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body
} catch {
    $_.Exception.Response.StatusCode
    $_.ErrorDetails.Message
}
```

Resposta esperada: HTTP 400 com `{ "ok": false, "error": "username e message sao obrigatorios" }`.

### 17.8 Testar preflight OPTIONS (CORS)

```powershell
Invoke-WebRequest -Uri "http://localhost:56400/api/message" `
    -Method OPTIONS `
    -Headers @{
        "Origin"                         = "http://localhost:56400"
        "Access-Control-Request-Method"  = "POST"
        "Access-Control-Request-Headers" = "Content-Type"
    } | Select-Object StatusCode, Headers
```

Resposta esperada: HTTP 204 com header `Access-Control-Allow-Origin: *`.

### 17.9 Verificar broadcast WebSocket

```powershell
docker logs chat56400_node --tail 10
```

Após o POST da Fase 17.6, o log deve conter: `{ ok: true, clients: N }`.

### 17.10 Testar o chat no browser

1. Abrir **http://localhost:56400** no Chrome.
2. Indicador de status deve ficar **verde** (WebSocket ativo).
3. Histórico das últimas 50 mensagens deve carregar.
4. Enviar uma mensagem — deve aparecer em amarelo (própria).
5. Abrir **http://localhost:56400** no Firefox.
6. A mensagem enviada deve aparecer em verde em tempo real.

### 17.11 Verificar logs do Laravel

```powershell
docker compose exec php tail -n 30 storage/logs/laravel.log
```

Não deve haver erros de `Class not found`, `Database connection refused` ou `Permission denied`.

---

## 18. Checklist Final

### Arquivos criados / alterados

- [ ] `app/.env` — `APP_NAME`, `APP_ENV`, `APP_URL`, variáveis `DB_*` como fallback
- [ ] `app/config/cors.php` — publicado e configurado com `allowed_origins: ['*']`
- [ ] `app/config/database.php` — verificado (já usa `env('DB_*')` por padrão)
- [ ] `app/database/migrations/xxxx_create_messages_table.php` — criado com `IF NOT EXISTS` e schema idêntico ao `init.sql`
- [ ] `app/app/Models/Message.php` — criado com `$timestamps = false` e `findLast50()`
- [ ] `app/app/Http/Requests/SendMessageRequest.php` — criado com `failedValidation()` customizado
- [ ] `app/app/Http/Controllers/Api/MessageController.php` — criado com `send()` e `history()`
- [ ] `app/routes/api.php` — criado via `php artisan install:api` e editado com as rotas
- [ ] `app/public/chat.js` — `API_SEND` e `API_HIST` atualizados (linhas 9–10)
- [ ] `docker/nginx/default.conf` — `location /api` e `location /` atualizados
- [ ] `docker/php/Dockerfile` — `bcmath`, `intl`, `libicu-dev` e Composer adicionados
- [ ] `.gitignore` — `app/vendor/`, `app/storage/`, `app/bootstrap/cache/`, `app/.env` excluídos

### Arquivos não alterados (confirmar)

- [ ] `docker-compose.yml` — sem alterações
- [ ] `docker/mysql/init.sql` — sem alterações
- [ ] `docker/node/Dockerfile` — sem alterações
- [ ] `node/server.js` — sem alterações
- [ ] `node/package.json` — sem alterações
- [ ] `.env.example` — sem alterações

### Comandos Artisan executados

- [ ] `php artisan key:generate` — APP_KEY gerado
- [ ] `php artisan install:api` — routes/api.php criado
- [ ] `php artisan migrate` — migration executada
- [ ] `php artisan config:publish cors` — cors.php publicado
- [ ] `php artisan route:list --path=api` — rotas verificadas

### Permissões

- [ ] `chmod -R 775 storage bootstrap/cache` executado
- [ ] `chown -R www-data:www-data storage bootstrap/cache` executado

### Testes funcionais

- [ ] `GET /api/messages` retorna `{ ok: true, messages: [...] }`
- [ ] `POST /api/message` retorna `{ ok: true, id: N }`
- [ ] `POST /api/message` com campos vazios retorna HTTP 400 com `{ ok: false, error: "..." }`
- [ ] `OPTIONS /api/message` retorna HTTP 204 com `Access-Control-Allow-Origin: *`
- [ ] WebSocket conecta e indicador fica verde
- [ ] Histórico carrega ao abrir o chat
- [ ] Mensagem enviada aparece em tempo real em segundo browser
- [ ] `php artisan migrate:status` — todas as migrations como `Ran`
- [ ] `php artisan route:list` — rotas `/api/message` e `/api/messages` listadas
- [ ] `storage/logs/laravel.log` sem erros críticos

---

## 19. Comparativo: Laravel vs CodeIgniter 4

Para projetos futuros, a tabela abaixo resume as diferenças de abordagem entre as duas opções de migração documentadas neste projeto.

| Aspecto                  | CodeIgniter 4                            | Laravel 11                                     |
| ------------------------ | ---------------------------------------- | ---------------------------------------------- |
| Roteamento de API        | `Routes.php` com `$routes->group('api')` | `routes/api.php` (auto-prefixo `/api`)         |
| ORM                      | Query Builder nativo (leve)              | Eloquent ORM (completo, mais expressivo)       |
| Validação                | `$this->validate()` inline               | FormRequest (classe dedicada, reutilizável)    |
| CORS                     | Manual (`header()`) ou filtros           | `config/cors.php` + middleware automático      |
| CLI                      | `php spark`                              | `php artisan`                                  |
| Migrations               | Opcional (sem gerador padrão)            | Nativo com `php artisan make:migration`        |
| APP_KEY                  | Não necessária                           | Obrigatória (segurança de sessão/cookies)      |
| Broadcasting nativo      | Não                                      | Sim (Laravel Echo + Reverb/Pusher)             |
| Curva de aprendizado     | Menor                                    | Maior (mais convenções e abstrações)           |
| Ecossistema              | Compacto                                 | Mais amplo (Sanctum, Horizon, Telescope, etc.) |
| Footprint de memória     | ~30–40 MB                                | ~50–80 MB por requisição                       |
| Extensões PHP adicionais | `intl`                                   | `intl`, `bcmath`                               |
| Permissões de pastas     | `writable/`                              | `storage/`, `bootstrap/cache/`                 |

**Recomendação:** se o objetivo for apenas estruturar o PHP atual com MVC sem grandes mudanças de paradigma, CodeIgniter 4 tem menor overhead. Se houver planos de autenticação, filas, eventos em tempo real com Broadcasting nativo ou API REST completa com recursos, Laravel é mais adequado.

---

## 20. Referências

| Recurso                             | URL                                                              |
| ----------------------------------- | ---------------------------------------------------------------- |
| Laravel 11 — Instalação             | https://laravel.com/docs/11.x/installation                       |
| Laravel 11 — Configuration          | https://laravel.com/docs/11.x/configuration                      |
| Laravel 11 — Eloquent ORM           | https://laravel.com/docs/11.x/eloquent                           |
| Laravel 11 — FormRequest Validation | https://laravel.com/docs/11.x/validation#form-request-validation |
| Laravel 11 — Routing (API)          | https://laravel.com/docs/11.x/routing                            |
| Laravel 11 — CORS                   | https://laravel.com/docs/11.x/routing#cors                       |
| Laravel 11 — Migrations             | https://laravel.com/docs/11.x/migrations                         |
| Laravel 11 — Artisan Console        | https://laravel.com/docs/11.x/artisan                            |
| Laravel 11 — HTTP Client            | https://laravel.com/docs/11.x/http-client                        |
| Composer create-project             | https://getcomposer.org/doc/03-cli.md#create-project             |
| NGINX + PHP-FPM + Laravel           | https://laravel.com/docs/11.x/deployment#nginx                   |

---

## 📌 Metadados do Autor

| Campo               | Informação                                                                               |
| ------------------- | ---------------------------------------------------------------------------------------- |
| **Nome**            | Gustavo Hammes                                                                           |
| **Projeto**         | Registro e Cálculo de Diárias                                                            |
| **E-mail**          | [gustavo.hammes@loglabdigital.com.br](mailto:gustavo.hammes@loglabdigital.com.br)        |
| **Linkedin**        | [https://www.linkedin.com/in/gustavo-hammes](https://wa.me/5521980558545)                |
| **Stack principal** | PHP 8.2-FPM, Node.js 20 (Express + ws), NGINX Alpine, MySQL 8.0, Docker Compose / Podman |

> 🧠 _Este documento faz parte do projeto **Agente Social** – desenvolvido por Gustavo Hammes._
