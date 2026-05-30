# Chat em Tempo Real — projeto56400

Chat simples sem login com mensagens em tempo real via WebSocket.
Stack completa em Docker Compose: PHP 8.2, NGINX, Node.js 20, MySQL 8 e Adminer.
Compatível com **Docker Desktop** e **Podman** no Windows.

> Scripts completos de operação: [`doc/docker.txt`](doc/docker.txt) e [`doc/podman.txt`](doc/podman.txt)

---

## Stack

| Camada        | Tecnologia                 |
|---------------|----------------------------|
| Front-end     | HTML + CSS + JS vanilla    |
| Back-end API  | PHP 8.2-FPM                |
| WebSocket     | Node.js 20 + ws + Express  |
| Banco         | MySQL 8.0                  |
| Proxy         | NGINX Alpine               |
| DB Admin      | Adminer                    |
| Orquestração  | Docker Compose / Podman Compose |

---

## Mapeamento de portas

| Serviço        | Porta externa | Porta interna | Acesso                              |
|----------------|---------------|---------------|-------------------------------------|
| NGINX (HTTP)   | 56400         | 80            | http://localhost:56400              |
| MySQL          | 56401         | 3306          | localhost:56401 (cliente SQL)       |
| Adminer        | 56402         | 8080          | http://localhost:56402              |
| Node/WebSocket | interno       | 3000          | via NGINX /ws (não exposto direto)  |

---

## Pré-requisitos

- Git
- **Docker Desktop** >= 24 (ou Docker Engine + Compose plugin), **ou**
- **Podman** + **podman-compose** (alternativa sem Docker Desktop)

### Liberar a porta 80 no Windows (executar antes de subir os containers)

O IIS e o serviço HTTP do Windows ocupam a porta 80. Execute no PowerShell como Administrador:

```powershell
net stop W3SVC /y; net stop WAS /y; net stop HTTP /y
```

---

## Instalação

### Passo comum (Docker e Podman)

```powershell
# 1. Clone o repositório
git clone <url-do-repositorio> projeto56400
cd C:\laragon\www\php\habilidade\projeto56400

# 2. Crie o arquivo de variáveis de ambiente
cp .env.example .env
# Edite o .env e defina as senhas:
# MYSQL_ROOT_PASSWORD, MYSQL_PASSWORD e DB_PASSWORD
```

O banco é inicializado automaticamente pelo script `docker/mysql/init.sql`
na primeira execução — a tabela `messages` é criada via `CREATE TABLE IF NOT EXISTS`.

---

### Com Docker

#### Script 1 — Uso diário

```powershell
cd C:\laragon\www\php\habilidade\projeto56400
docker logout
docker compose up -d --build
```

#### Script 1B — Corrigir PATH corrompida + reiniciar

Use se aparecer erro com `docker-compose.exe`. Feche e abra um novo PowerShell antes.

```powershell
cd C:\laragon\www\php\habilidade\projeto56400

# Parar tudo
docker compose down

# Limpar a PATH corrompida
$paths = $env:PATH -split ';' | Select-Object -Unique | Where-Object {$_ -ne ""}
$env:PATH = $paths -join ';'

# Subir os containers
docker compose up -d --build
```

#### Script 2 — Primeira vez / máquina nova

Faz o pull de todas as imagens antes de subir (evita timeout no build):

```powershell
cd C:\laragon\www\php\habilidade\projeto56400
docker logout

docker pull mysql:8.0
docker pull nginx:alpine
docker pull adminer:latest
docker pull php:8.2-fpm
docker pull composer:latest

docker compose up -d --build
```

---

### Com Podman

#### Script 1 — Uso diário

```powershell
cd C:\laragon\www\php\habilidade\projeto56400
podman logout --all
podman compose up -d --build
```

#### Script 1B — Corrigir PATH corrompida + reiniciar

Feche e abra um novo PowerShell antes de executar:

```powershell
cd C:\laragon\www\php\habilidade\projeto56400

# Parar tudo
podman compose down

# Limpar a PATH corrompida
$paths = $env:PATH -split ';' | Select-Object -Unique | Where-Object {$_ -ne ""}
$env:PATH = $paths -join ';'

# Subir os containers
podman compose up -d --build
```

#### Script 2 — Primeira vez / máquina nova

```powershell
cd C:\laragon\www\php\habilidade\projeto56400
podman logout --all

podman pull docker.io/library/mysql:8.0
podman pull docker.io/library/nginx:alpine
podman pull docker.io/library/adminer:latest
podman pull docker.io/library/php:8.2-fpm
podman pull docker.io/library/composer:latest

podman compose up -d --build
```

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
2. Abra uma **aba anônima / privada**:
   - Chrome: `Ctrl+Shift+N`
   - Firefox: `Ctrl+Shift+P`
3. Acesse **http://localhost:56400** na aba anônima e informe o nome `Usuario_B`.
4. Os nomes ficam isolados pois o `localStorage` não é compartilhado com a aba anônima.

> **Dica:** Posicione as duas janelas lado a lado para observar a entrega em
> tempo real sem precisar alternar entre elas.

---

## Comandos de operação

### Docker

#### Script 3 — Limpeza completa + reinstalar do zero

> **ATENÇÃO:** remove todos os containers, imagens e volumes do Docker na máquina.

```powershell
cd C:\laragon\www\php\habilidade\projeto56400

docker stop $(docker ps -aq)
docker rm -f $(docker ps -aq)
docker rmi -f $(docker images -q)
docker volume prune -f
docker network prune -f
docker system prune -af --volumes

docker logout

docker pull mysql:8.0
docker pull nginx:alpine
docker pull adminer:latest
docker pull php:8.2-fpm
docker pull composer:latest

docker compose up -d --build
```

#### Script 3B — Limpeza completa + corrigir PATH corrompida

Feche e abra um novo PowerShell antes de executar:

```powershell
cd C:\laragon\www\php\habilidade\projeto56400

docker stop $(docker ps -aq)
docker rm -f $(docker ps -aq)
docker rmi -f $(docker images -q)
docker volume prune -f
docker network prune -f
docker system prune -af --volumes

docker logout

$paths = $env:PATH -split ';' | Select-Object -Unique | Where-Object {$_ -ne ""}
$env:PATH = $paths -join ';'

docker pull mysql:8.0
docker pull nginx:alpine
docker pull adminer:latest
docker pull php:8.2-fpm
docker pull composer:latest

docker compose up -d --build
```

#### Script 4 — Parar containers

```powershell
cd C:\laragon\www\php\habilidade\projeto56400
docker compose down
```

#### Script 5 — Ver status dos containers

```powershell
docker ps
```

#### Script 6 — Ver logs

```powershell
# Todos os serviços
docker compose logs

# Container específico
docker logs chat56400_mysql
docker logs chat56400_php
docker logs chat56400_nginx
docker logs chat56400_adminer
```

---

### Podman

#### Script 3 — Limpeza completa + reinstalar do zero

> **ATENÇÃO:** remove todos os containers, imagens e volumes do Podman na máquina.

```powershell
cd C:\laragon\www\php\habilidade\projeto56400

podman stop -a
podman rm -af
podman pod rm -af
podman rmi -af
podman volume rm -af
podman network prune -f
podman system prune -af --volumes

podman logout --all

podman pull docker.io/library/mysql:8.0
podman pull docker.io/library/nginx:alpine
podman pull docker.io/library/adminer:latest
podman pull docker.io/library/php:8.2-fpm
podman pull docker.io/library/composer:latest

podman compose up -d --build
```

#### Script 3B — Limpeza completa + corrigir PATH corrompida

Feche e abra um novo PowerShell antes de executar:

```powershell
cd C:\laragon\www\php\habilidade\projeto56400

podman stop -a
podman rm -af
podman pod rm -af
podman rmi -af
podman volume rm -af
podman network prune -f
podman system prune -af --volumes

podman logout --all

$paths = $env:PATH -split ';' | Select-Object -Unique | Where-Object {$_ -ne ""}
$env:PATH = $paths -join ';'

podman pull docker.io/library/mysql:8.0
podman pull docker.io/library/nginx:alpine
podman pull docker.io/library/adminer:latest
podman pull docker.io/library/php:8.2-fpm
podman pull docker.io/library/composer:latest

podman compose up -d --build
```

#### Script 4 — Parar containers

```powershell
cd C:\laragon\www\php\habilidade\projeto56400
podman compose down
```

#### Script 5 — Ver status dos containers

```powershell
podman ps
```

#### Script 6 — Ver logs

```powershell
# Todos os serviços
podman compose logs

# Container específico
podman logs chat56400_mysql
podman logs chat56400_php
podman logs chat56400_nginx
podman logs chat56400_adminer
```

---

## Uso offline — salvar e carregar imagens

Útil para ambientes sem internet ou para compartilhar imagens entre máquinas.

### Docker

```powershell
# Salvar cada imagem em um arquivo .tar
cd C:\laragon\www\php\habilidade\projeto56400\doc\docker
docker save -o mysql-8.0.tar      mysql:8.0
docker save -o nginx-alpine.tar   nginx:alpine
docker save -o adminer-latest.tar adminer:latest
docker save -o php-8.2-fpm.tar    php:8.2-fpm
docker save -o composer-latest.tar composer:latest

# Carregar imagens salvas separadamente
docker load -i mysql-8.0.tar
docker load -i nginx-alpine.tar
docker load -i adminer-latest.tar
docker load -i php-8.2-fpm.tar
docker load -i composer-latest.tar

# Carregar se tiver salvo tudo em um arquivo só
docker load -i todas-imagens.tar
```

### Podman

```powershell
# Salvar cada imagem em um arquivo .tar
cd C:\laragon\www\php\habilidade\projeto56400\doc\podman
podman save -o mysql-8.0.tar       docker.io/library/mysql:8.0
podman save -o nginx-alpine.tar    docker.io/library/nginx:alpine
podman save -o adminer-latest.tar  docker.io/library/adminer:latest
podman save -o php-8.2-fpm.tar     docker.io/library/php:8.2-fpm
podman save -o composer-latest.tar docker.io/library/composer:latest

# Carregar imagens salvas separadamente
podman load -i mysql-8.0.tar
podman load -i nginx-alpine.tar
podman load -i adminer-latest.tar
podman load -i php-8.2-fpm.tar
podman load -i composer-latest.tar

# Carregar se tiver salvo tudo em um arquivo só
podman load -i todas-imagens.tar
```

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
│   │   └── Dockerfile              <- PHP 8.2-FPM + pdo_mysql
│   └── node/
│       └── Dockerfile              <- Node 20 Alpine
├── node/
│   ├── package.json
│   └── server.js                   <- servidor WS + endpoint /internal/broadcast
└── doc/
    ├── docker.txt                  <- scripts completos para Docker (PowerShell)
    └── podman.txt                  <- scripts completos para Podman (PowerShell)
```

---

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha os valores:

| Variável               | Descrição                           | Exemplo               |
|------------------------|-------------------------------------|-----------------------|
| `MYSQL_ROOT_PASSWORD`  | Senha do root do MySQL              | `SenhaRootForte!`     |
| `MYSQL_DATABASE`       | Nome do banco                       | `chat56400_db`        |
| `MYSQL_USER`           | Usuário da aplicação                | `chat56400_user`      |
| `MYSQL_PASSWORD`       | Senha do usuário da aplicação       | `SenhaAppForte!`      |
| `DB_HOST`              | Host do MySQL (Docker: `mysql`)     | `mysql`               |
| `DB_PORT`              | Porta interna do MySQL              | `3306`                |
| `WS_PORT`              | Porta interna do servidor Node      | `3000`                |

> **Importante:** o arquivo `.env` nunca deve ser commitado — ele já está no `.gitignore`.

---

## Endpoints da API

| Método | Endpoint                     | Descrição                                                |
|--------|------------------------------|----------------------------------------------------------|
| GET    | `/api/history.php`           | Retorna as últimas 50 mensagens em JSON                  |
| POST   | `/api/send.php`              | Persiste mensagem e dispara broadcast via Node           |
| WS     | `ws://localhost:56400/ws`    | Conexão WebSocket (proxiada pelo NGINX)                  |
| GET    | `/health` (interno Node)     | Status do servidor WS — acessível apenas na rede Docker  |

**Body do `POST /api/send.php`:**
```json
{ "username": "Nome", "message": "Texto da mensagem" }
```

**Resposta de sucesso:**
```json
{ "ok": true, "id": 42 }
```

---

## Administração do banco

Acesse o Adminer em **http://localhost:56402**:

| Campo    | Valor             |
|----------|-------------------|
| Sistema  | MySQL             |
| Servidor | `mysql`           |
| Usuário  | `chat56400_user`  |
| Senha    | (valor do `.env`) |
| Banco    | `chat56400_db`    |

---

## Roadmap — Futura integração com CodeIgniter 4

A migração para CodeIgniter 4 substituirá os scripts PHP planos por uma estrutura
MVC completa, mantendo a stack Docker/Podman e o servidor WebSocket Node.js intactos.

### O que muda

| Componente atual              | Substituição com CI4                                          |
|-------------------------------|---------------------------------------------------------------|
| `app/public/api/send.php`     | `App\Controllers\Api\MessageController::send()`              |
| `app/public/api/history.php`  | `App\Controllers\Api\MessageController::history()`           |
| `app/config/db.php`           | `app/Config/Database.php` com leitura de env vars            |
| PDO direto                    | `App\Models\MessageModel` (Query Builder CI4)                |
| Sem roteamento                | `app/Config/Routes.php` com grupo `/api`                     |
| `index.html` estático         | `App\Views\chat\index.php` (ou manter HTML puro no public/)  |

### O que permanece

- `node/server.js` e o endpoint `/internal/broadcast` — sem alteração.
- `docker/nginx/default.conf` — ajuste mínimo no `root` e no `fastcgi_param`.
- `docker/mysql/init.sql` — tabela `messages` sem mudança.
- Toda a stack Docker Compose / Podman Compose.

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

---