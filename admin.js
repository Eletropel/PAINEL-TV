let owner = '', repo = '', branch = 'main', token = '';
let items = [];
let configSha = null;
let currentCategory = null;
let lastUpdated = null;
const el = (id) => document.getElementById(id);

function showToast(msg, type) {
  const t = el('toast');
  t.textContent = msg;
  t.className = 'toast show ' + (type || '');
  setTimeout(() => t.classList.remove('show'), 3500);
}
function setConnStatus(state, label) {
  const s = el('conn-status');
  s.className = state;
  s.textContent = label;
}
function ghHeaders(extra) {
  return Object.assign({ 'Authorization': 'token ' + token, 'Accept': 'application/vnd.github+json' }, extra || {});
}
function ghApi(path) {
  return `https://api.github.com/repos/${owner}/${repo}/${path}`;
}

/* --- Base64 helpers que lidam com UTF-8 corretamente --- */
function utf8ToB64(str) { return btoa(unescape(encodeURIComponent(str))); }
function b64ToUtf8(str) { return decodeURIComponent(escape(atob(str.replace(/\n/g, '')))); }

/* --- Carregar config.json --- */
async function loadConfig() {
  if (!owner || !repo || !token) return;
  setConnStatus('', 'carregando...');
  try {
    const res = await fetch(ghApi(`contents/config.json?ref=${branch}`), { headers: ghHeaders() });
    if (res.status === 404) {
      items = [];
      configSha = null;
      setConnStatus('ok', 'conectado (novo config.json)');
    } else if (res.ok) {
      const data = await res.json();
      configSha = data.sha;
      const decoded = JSON.parse(b64ToUtf8(data.content));
      items = decoded.items || [];
      lastUpdated = decoded.updatedAt || null;
      setConnStatus('ok', 'conectado');
    } else {
      throw new Error('HTTP ' + res.status);
    }
    renderDashboard();
  } catch (err) {
    console.error(err);
    setConnStatus('err', 'erro de conexão');
    showToast('Não consegui conectar. Confira usuário, repositório e token.', 'error');
  }
}

/* --- Salvar config.json --- */
async function saveConfig() {
  if (!owner || !repo || !token) { showToast('Configure a conexão primeiro.', 'error'); return; }
  el('btn-save').disabled = true;
  el('btn-save').textContent = 'Salvando...';
  try {
    const nowIso = new Date().toISOString();
    const payload = { configReloadIntervalMinutes: 5, items, updatedAt: nowIso };
    const body = {
      message: 'Atualiza config.json via painel',
      content: utf8ToB64(JSON.stringify(payload, null, 2)),
      branch
    };
    if (configSha) body.sha = configSha;

    const res = await fetch(ghApi('contents/config.json'), {
      method: 'PUT',
      headers: ghHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    configSha = data.content.sha;
    lastUpdated = nowIso;
    showToast('Salvo! As TVs atualizam em poucos minutos.', 'success');
    if (el('view-dashboard').style.display === 'block') renderDashboard();
  } catch (err) {
    console.error(err);
    showToast('Erro ao salvar. Tente novamente.', 'error');
  } finally {
    el('btn-save').disabled = false;
    el('btn-save').textContent = 'Salvar alterações nas TVs';
  }
}

/* --- Categorias / pastas --- */
function getCategories() {
  const cats = new Set(items.map(i => i.category).filter(Boolean));
  return Array.from(cats).sort();
}

function formatUpdatedAt(iso) {
  if (!iso) return 'nunca salvo';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function renderDashboard() {
  el('view-dashboard').style.display = 'block';
  el('view-folders').style.display = 'none';
  el('view-category').style.display = 'none';
  el('btn-back').style.display = 'none';
  el('btn-back-dashboard').style.display = 'none';

  const cats = getCategories();
  el('dash-total').textContent = items.length;
  el('dash-categories').textContent = cats.length;
  el('dash-updated').textContent = formatUpdatedAt(lastUpdated);

  const viewerUrl = `https://${owner}.github.io/${repo}/index.html`;
  el('live-preview-iframe').src = viewerUrl;
}

el('btn-goto-folders').addEventListener('click', renderFolders);
el('btn-back-dashboard').addEventListener('click', renderDashboard);

function renderFolders() {
  el('view-dashboard').style.display = 'none';
  el('view-folders').style.display = 'block';
  el('view-category').style.display = 'none';
  el('btn-back').style.display = 'none';
  el('btn-back-dashboard').style.display = 'inline-block';

  const cats = getCategories();
  el('folder-count').textContent = cats.length ? `(${cats.length})` : '';
  const grid = el('folder-grid');
  grid.innerHTML = '';

  cats.forEach(cat => {
    const catItems = items.filter(i => i.category === cat);
    const firstImage = catItems.find(i => i.type === 'image');
    const card = document.createElement('div');
    card.className = 'folder-card';
    card.innerHTML = `
      ${firstImage ? `<img class="folder-thumb" src="${firstImage.src}">` : `<div class="folder-thumb placeholder">📁</div>`}
      <div class="folder-name">${cat}</div>
      <div class="folder-count">${catItems.length} item${catItems.length === 1 ? '' : 's'}</div>
    `;
    card.onclick = () => openCategory(cat);
    grid.appendChild(card);
  });

  const newCard = document.createElement('div');
  newCard.className = 'folder-card new-folder-card';
  newCard.innerHTML = `
    <span style="font-size:22px;">＋</span>
    <input id="new-folder-name" placeholder="Nova categoria" onclick="event.stopPropagation()">
  `;
  newCard.onclick = () => {
    const name = el('new-folder-name').value.trim();
    if (name) openCategory(name);
  };
  grid.appendChild(newCard);
}

function openCategory(cat) {
  currentCategory = cat;
  el('view-dashboard').style.display = 'none';
  el('view-folders').style.display = 'none';
  el('view-category').style.display = 'block';
  el('btn-back').style.display = 'inline-block';
  el('btn-back-dashboard').style.display = 'none';
  el('category-title').textContent = cat;
  renderItems();
}

el('btn-back').addEventListener('click', renderFolders);

function renderItems() {
  const list = el('items-list');
  list.innerHTML = '';
  const visible = items.filter(i => i.category === currentCategory);
  el('category-count').textContent = visible.length ? `(${visible.length})` : '';
  el('empty-msg').style.display = visible.length ? 'none' : 'block';

  visible.forEach((item) => {
    const realIdx = items.indexOf(item);
    const card = document.createElement('div');
    card.className = 'item-card';
    const thumb = item.type === 'image' ? `<img class="item-thumb" src="${item.src}">` : `<div class="item-thumb url-icon">🔗</div>`;
    card.innerHTML = `
      ${thumb}
      <span class="badge ${item.type}">${item.type === 'image' ? 'Imagem' : 'Site'}</span>
      <div class="item-info">
        <div class="src">${item.src}</div>
        <div class="duration">${item.duration}s na tela</div>
      </div>
      <div class="item-actions">
        <button class="btn secondary small" data-action="up" data-idx="${realIdx}">↑</button>
        <button class="btn secondary small" data-action="down" data-idx="${realIdx}">↓</button>
        <button class="btn danger small" data-action="remove" data-idx="${realIdx}">Remover</button>
      </div>
    `;
    list.appendChild(card);
  });

  list.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx, 10);
      const action = btn.dataset.action;
      if (action === 'remove') items.splice(idx, 1);
      else if (action === 'up' && idx > 0) [items[idx - 1], items[idx]] = [items[idx], items[idx - 1]];
      else if (action === 'down' && idx < items.length - 1) [items[idx + 1], items[idx]] = [items[idx], items[idx + 1]];
      renderItems();
    });
  });
}

/* --- Conectar --- */
el('btn-connect').addEventListener('click', () => {
  owner = el('cfg-owner').value.trim();
  repo = el('cfg-repo').value.trim();
  branch = el('cfg-branch').value.trim() || 'main';
  token = el('cfg-token').value.trim();
  if (!owner || !repo || !token) { showToast('Preencha usuário, repositório e token.', 'error'); return; }
  el('setup-details').open = false;
  loadConfig();
});

el('btn-reload').addEventListener('click', loadConfig);
el('btn-save').addEventListener('click', saveConfig);

/* --- Tabs --- */
el('tab-image').addEventListener('click', () => switchTab('image'));
el('tab-url').addEventListener('click', () => switchTab('url'));
function switchTab(tab) {
  el('tab-image').classList.toggle('active', tab === 'image');
  el('tab-url').classList.toggle('active', tab === 'url');
  el('panel-image').style.display = tab === 'image' ? 'block' : 'none';
  el('panel-url').style.display = tab === 'url' ? 'block' : 'none';
  el('btn-add-url').style.display = tab === 'url' ? 'inline-block' : 'none';
}

/* --- Adicionar site por URL --- */
el('btn-add-url').addEventListener('click', () => {
  const src = el('new-url-src').value.trim();
  const duration = parseInt(el('new-duration').value, 10) || 15;
  if (!src) { showToast('Coloque o endereço (URL).', 'error'); return; }
  items.push({ type: 'url', src, duration, category: currentCategory });
  el('new-url-src').value = '';
  renderItems();
  showToast('Site adicionado. Clique em "Salvar" para publicar nas TVs.', 'success');
});

/* --- Upload de imagem direto pro GitHub --- */
const dropZone = el('drop-zone');
const fileInput = el('file-input');
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); handleFiles(e.dataTransfer.files); });
fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function sanitizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/-+/g, '-');
}

async function handleFiles(fileList) {
  if (!owner || !repo || !token) { showToast('Conecte no GitHub primeiro.', 'error'); return; }
  const files = Array.from(fileList);
  for (const file of files) await uploadOne(file);
}

async function uploadOne(file) {
  const previewImg = document.createElement('img');
  previewImg.className = 'uploading';
  previewImg.src = URL.createObjectURL(file);
  el('upload-preview').appendChild(previewImg);

  try {
    const base64Content = await fileToBase64(file);
    const filename = `${Date.now()}-${sanitizeName(file.name)}`;
    const path = `imagens/${sanitizeName(currentCategory)}/${filename}`;

    const res = await fetch(ghApi(`contents/${path}`), {
      method: 'PUT',
      headers: ghHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        message: `Upload imagem: ${filename}`,
        content: base64Content,
        branch
      })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);

    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
    const duration = parseInt(el('new-duration').value, 10) || 15;

    items.push({ type: 'image', src: rawUrl, duration, category: currentCategory });
    previewImg.classList.remove('uploading');
    renderItems();
    showToast('Imagem enviada ao GitHub e adicionada. Clique em "Salvar" para publicar.', 'success');
  } catch (err) {
    console.error(err);
    previewImg.remove();
    showToast('Falha ao enviar a imagem. Confira o token e as permissões.', 'error');
  }
}
