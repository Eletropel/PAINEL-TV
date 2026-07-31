/*
  Esta página lê a lista de conteúdos direto de um arquivo config.json
  guardado no repositório do GitHub (o mesmo que o painel de admin edita).

  Preencha OWNER, REPO e BRANCH com os dados do seu repositório.
  Não precisa de token aqui — leitura de repositório público é livre.

  Formato esperado do config.json:
  {
    "configReloadIntervalMinutes": 5,
    "items": [
      { "type": "url",   "src": "https://exemplo.com", "duration": 15, "category": "Geral" },
      { "type": "image", "src": "https://raw.githubusercontent.com/.../banner.jpg", "duration": 10, "category": "Promocao" }
    ]
  }
*/

const OWNER = "SEU_USUARIO_GITHUB";
const REPO = "SEU_REPOSITORIO";
const BRANCH = "main";
const CONFIG_URL = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/config.json`;

// URL do painel de admin (assume GitHub Pages padrão: usuario.github.io/repositorio)
const ADMIN_URL = `https://${OWNER}.github.io/${REPO}/admin.html`;
const QR_IMAGE_URL = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(ADMIN_URL)}`;

const container = document.getElementById('frame-container');
const statusEl = document.getElementById('status');
const errorBox = document.getElementById('error-box');

let items = [];
let currentIndex = 0;
let rotationTimer = null;
let configReloadIntervalMinutes = 5;
let elements = [];

async function loadConfig() {
  try {
    const res = await fetch(CONFIG_URL + "?t=" + Date.now(), { cache: "no-store" });
    if (!res.ok) throw new Error("Falha ao buscar config: " + res.status);
    const data = await res.json();

    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      throw new Error("Config sem itens válidos");
    }

    configReloadIntervalMinutes = data.configReloadIntervalMinutes || 5;
    items = data.items;
    errorBox.style.display = 'none';
    statusEl.textContent = 'ok - ' + items.length + ' itens';
    buildElements();
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'erro ao carregar config';
    if (items.length === 0) {
      errorBox.style.display = 'block';
      errorBox.textContent = 'Não foi possível carregar a configuração. Verificando conexão...';
    }
  }
}

function buildElements() {
  container.innerHTML = '';
  elements = [];

  items.forEach((item) => {
    let el;
    if (item.type === 'image') {
      el = document.createElement('img');
      el.className = 'slide-image';
      el.src = item.src;
    } else {
      el = document.createElement('iframe');
      el.src = item.src;
    }
    container.appendChild(el);
    elements.push(el);
  });

  currentIndex = 0;
  showCurrent();
  scheduleNext();
}

function showCurrent() {
  elements.forEach((el, i) => el.classList.toggle('active', i === currentIndex));
}

function scheduleNext() {
  if (rotationTimer) clearTimeout(rotationTimer);
  const durationSec = items[currentIndex] && items[currentIndex].duration ? items[currentIndex].duration : 15;
  rotationTimer = setTimeout(() => {
    currentIndex = (currentIndex + 1) % items.length;
    showCurrent();
    scheduleNext();
  }, durationSec * 1000);
}

function requestFullscreen() {
  const el = document.documentElement;
  if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
}

document.body.addEventListener('click', requestFullscreen, { once: true });

function setupQrCode() {
  const qrImg = document.getElementById('qr-image');
  if (qrImg) qrImg.src = QR_IMAGE_URL;
}

setupQrCode();
loadConfig();
setInterval(loadConfig, configReloadIntervalMinutes * 60 * 1000);
window.addEventListener('online', loadConfig);
