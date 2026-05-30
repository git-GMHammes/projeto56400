(() => {
    const elMessages = document.getElementById('messages');
    const elStatus   = document.getElementById('status');
    const elName     = document.getElementById('inp-name');
    const elMsg      = document.getElementById('inp-msg');
    const elBtn      = document.getElementById('btn-send');

    const WS_URL     = `ws://${location.host}/ws`;
    const API_SEND   = '/api/send.php';
    const API_HIST   = '/api/history.php';

    let ws         = null;
    let reconnectT = null;

    // Recupera nome salvo
    elName.value = localStorage.getItem('chat56400_name') || '';

    function renderMsg(msg, isSelf) {
        const div  = document.createElement('div');
        div.classList.add('msg', isSelf ? 'self' : 'other');

        const meta = document.createElement('div');
        meta.className = 'meta';
        const ts = msg.created_at ? msg.created_at.replace('T', ' ').substring(0, 16) : '';
        meta.textContent = `${msg.username}  ${ts}`;

        const text = document.createElement('div');
        text.textContent = msg.message;

        div.appendChild(meta);
        div.appendChild(text);
        elMessages.appendChild(div);
        elMessages.scrollTop = elMessages.scrollHeight;
    }

    async function loadHistory() {
        try {
            const r    = await fetch(API_HIST);
            const data = await r.json();
            if (data.ok) {
                data.messages.forEach(m => renderMsg(m, m.username === elName.value));
            }
        } catch (e) {
            console.warn('Erro ao carregar historico:', e);
        }
    }

    function connect() {
        ws = new WebSocket(WS_URL);

        ws.addEventListener('open', () => {
            elStatus.classList.add('online');
            clearTimeout(reconnectT);
        });

        ws.addEventListener('message', (ev) => {
            try {
                const msg = JSON.parse(ev.data);
                // Evita duplicar mensagem própria (já renderizada ao enviar)
                if (msg.username !== elName.value) {
                    renderMsg(msg, false);
                }
            } catch (_) {}
        });

        ws.addEventListener('close', () => {
            elStatus.classList.remove('online');
            reconnectT = setTimeout(connect, 3000);
        });

        ws.addEventListener('error', () => ws.close());
    }

    async function send() {
        const name = elName.value.trim();
        const msg  = elMsg.value.trim();

        if (!name || !msg) return;

        localStorage.setItem('chat56400_name', name);

        elBtn.disabled = true;
        try {
            const r    = await fetch(API_SEND, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ username: name, message: msg }),
            });
            const data = await r.json();

            if (data.ok) {
                renderMsg({ username: name, message: msg, created_at: new Date().toISOString() }, true);
                elMsg.value = '';
            } else {
                alert('Erro: ' + (data.error || 'desconhecido'));
            }
        } catch (e) {
            alert('Falha ao enviar mensagem.');
        } finally {
            elBtn.disabled = false;
            elMsg.focus();
        }
    }

    elBtn.addEventListener('click', send);
    elMsg.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    });

    loadHistory().then(connect);
})();
