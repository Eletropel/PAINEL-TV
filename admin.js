let owner = '', repo = '', branch = 'main', token = '';
let items = [];
let categories = [];
let activeCategories = [];
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
      categories = [];
      activeCategories = [];
      configSha = null;
      setConnStatus('ok', 'conectado (novo config.json)');
    } else if (res.ok) {
      const data = await res.json();
      configSha = data.sha;
      const decoded = JSON.parse(b64ToUtf8(data.content));
      items = decoded.items || [];
      categories = Array.isArray(decoded.categories) ? decoded.categories.slice() : [];
      items.forEach(item => { if (item.category && !categories.includes(item.category)) categories.push(item.category); });
      // Configuração antiga: todas as categorias ficam ativas por padrão.
      activeCategories = Array.isArray(decoded.activeCategories)
        ? decoded.activeCategories.filter(cat => categories.includes(cat))
        : categories.slice();
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
    // Não publicar uma configuração que deixaria todas as TVs sem conteúdo.
    const normalizedCategories = getCategories();
    const normalizedActive = activeCategories.filter(cat => normalizedCategories.includes(cat));
    if (normalizedActive.length === 0) {
      showToast('Ative pelo menos uma categoria antes de salvar.', 'error');
      return;
    }
    if (!items.some(item => normalizedActive.includes(item.category))) {
      showToast('Ative uma categoria que tenha conteúdo cadastrado.', 'error');
      return;
    }
    const payload = {
      configReloadIntervalMinutes: 5,
      categories: normalizedCategories,
      activeCategories: normalizedActive,
      items,
      updatedAt: nowIso
    };
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
  const cats = new Set([...(categories || []), ...items.map(i => i.category).filter(Boolean)]);
  return Array.from(cats).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function renderActiveCategories() {
  const list = el('active-category-list');
  if (!list) return;
  list.innerHTML = '';
  const cats = getCategories();
  if (!cats.length) {
    list.innerHTML = '<p class="setup-note">Crie uma categoria em “Alterar conteúdo” para configurar a exibição.</p>';
    return;
  }
  cats.forEach(cat => {
    const label = document.createElement('label');
    label.className = 'active-category-option';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = activeCategories.includes(cat);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        if (!activeCategories.includes(cat)) activeCategories.push(cat);
      } else {
        activeCategories = activeCategories.filter(name => name !== cat);
      }
      renderActiveCategories();
    });
    const name = document.createElement('span');
    name.textContent = cat;
    const count = document.createElement('small');
    const total = items.filter(item => item.category === cat).length;
    count.textContent = `${total} item${total === 1 ? '' : 's'}`;
    label.append(checkbox, name, count);
    list.appendChild(label);
  });
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
  renderActiveCategories();

  const viewerUrl = `https://${owner}.github.io/${repo}/index.html`;
  el('live-preview-iframe').src = viewerUrl;
}

el('btn-select-all-categories').addEventListener('click', () => {
  activeCategories = getCategories();
  renderActiveCategories();
});
el('btn-clear-categories').addEventListener('click', () => {
  activeCategories = [];
  renderActiveCategories();
});

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

    if (firstImage) {
      const thumb = document.createElement('img');
      thumb.className = 'folder-thumb';
      thumb.src = firstImage.src;
      thumb.alt = `Prévia da categoria ${cat}`;
      card.appendChild(thumb);
    } else {
      const thumb = document.createElement('div');
      thumb.className = 'folder-thumb placeholder';
      thumb.textContent = '📁';
      card.appendChild(thumb);
    }

    const name = document.createElement('div');
    name.className = 'folder-name';
    name.textContent = cat;
    card.appendChild(name);

    const count = document.createElement('div');
    count.className = 'folder-count';
    count.textContent = `${catItems.length} item${catItems.length === 1 ? '' : 's'}`;
    card.appendChild(count);

    const actions = document.createElement('div');
    actions.className = 'folder-actions';
    const renameBtn = document.createElement('button');
    renameBtn.className = 'btn secondary small';
    renameBtn.type = 'button';
    renameBtn.textContent = 'Renomear';
    renameBtn.title = catItems.length ? 'Para renomear, remova ou mova primeiro os conteúdos desta categoria.' : 'Renomear categoria vazia';
    renameBtn.disabled = catItems.length > 0;
    renameBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      if (catItems.length) {
        showToast('Por segurança, só é possível renomear categorias vazias. Remova ou mova os conteúdos primeiro.', 'error');
        return;
      }
      renameCategory(cat);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn danger small';
    deleteBtn.type = 'button';
    deleteBtn.textContent = 'Excluir';
    deleteBtn.title = catItems.length ? 'Para excluir, remova primeiro os conteúdos desta categoria.' : 'Excluir categoria vazia';
    deleteBtn.disabled = catItems.length > 0;
    deleteBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      if (catItems.length) {
        showToast('Essa categoria tem conteúdos. Remova-os primeiro para evitar perder referências.', 'error');
        return;
      }
      deleteCategory(cat);
    });
    actions.append(renameBtn, deleteBtn);
    card.appendChild(actions);
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
    if (!name) return;
    if (!categories.includes(name)) categories.push(name);
    if (!activeCategories.includes(name)) activeCategories.push(name);
    openCategory(name);
  };
  grid.appendChild(newCard);
}

function renameCategory(oldName) {
  const proposed = window.prompt(`Novo nome para a categoria "${oldName}":`, oldName);
  if (proposed === null) return;
  const newName = proposed.trim();
  if (!newName) { showToast('O nome da categoria não pode ficar vazio.', 'error'); return; }
  if (newName === oldName) return;
  if (getCategories().some(cat => cat.toLocaleLowerCase('pt-BR') === newName.toLocaleLowerCase('pt-BR'))) {
    showToast('Já existe uma categoria com esse nome.', 'error');
    return;
  }

  categories = categories.map(cat => cat === oldName ? newName : cat);
  activeCategories = activeCategories.map(cat => cat === oldName ? newName : cat);
  showToast(`Categoria renomeada para "${newName}". Clique em Salvar para publicar.`, 'success');
  renderFolders();
  renderActiveCategories();
}

function deleteCategory(name) {
  const hasItems = items.some(item => item.category === name);
  if (hasItems) {
    showToast('A categoria não está vazia. Remova seus conteúdos antes de excluí-la.', 'error');
    return;
  }
  if (!window.confirm(`Excluir a categoria vazia "${name}"? Essa ação só será publicada nas TVs quando você clicar em Salvar.`)) return;

  categories = categories.filter(cat => cat !== name);
  activeCategories = activeCategories.filter(cat => cat !== name);
  showToast(`Categoria "${name}" excluída. Clique em Salvar para publicar.`, 'success');
  renderFolders();
  renderActiveCategories();
  el('dash-categories').textContent = getCategories().length;
}

function openCategory(cat) {
  if (!categories.includes(cat)) categories.push(cat);
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
      if (action === 'remove') {
        const removedItem = items[idx];
        items.splice(idx, 1);
        renderItems();
        if (removedItem.type === 'image') deleteImageFromRepo(removedItem.src, btn);
      }
      else if (action === 'up' && idx > 0) { [items[idx - 1], items[idx]] = [items[idx], items[idx - 1]]; renderItems(); }
      else if (action === 'down' && idx < items.length - 1) { [items[idx + 1], items[idx]] = [items[idx], items[idx + 1]]; renderItems(); }
    });
  });
}

// Converte a URL raw.githubusercontent.com salva no item de volta pro
// caminho do arquivo dentro do repositório (ex: imagens/categoria/foto.png)
function extractPathFromRawUrl(rawUrl) {
  const prefix = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/`;
  if (!rawUrl.startsWith(prefix)) return null;
  return rawUrl.slice(prefix.length);
}

// Apaga o arquivo de imagem de verdade do repositório (não só da lista de rotação)
async function deleteImageFromRepo(rawUrl) {
  const path = extractPathFromRawUrl(rawUrl);
  if (!path) return; // não bate com o padrão esperado, não mexe em nada por segurança

  try {
    const infoRes = await fetch(ghApi(`contents/${path}?ref=${branch}`), { headers: ghHeaders() });
    if (!infoRes.ok) {
      console.warn('Não achei o arquivo no repositório pra apagar (talvez já tenha sido removido).');
      return;
    }
    const info = await infoRes.json();

    const delRes = await fetch(ghApi(`contents/${path}`), {
      method: 'DELETE',
      headers: ghHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        message: `Remove imagem: ${path}`,
        sha: info.sha,
        branch
      })
    });
    if (!delRes.ok) throw new Error('HTTP ' + delRes.status);
    showToast('Imagem removida do repositório também.', 'success');
  } catch (err) {
    console.error(err);
    showToast('A imagem saiu da lista, mas não consegui apagar o arquivo do GitHub. Apague manualmente se quiser liberar espaço.', 'error');
  }
}

/* --- Dados de conexão: salvar token neste navegador para facilitar o uso --- */
const STORAGE_KEY = 'tv-eletropel-admin-conn';

function saveConnection() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ owner, repo, branch, token }));
  } catch (e) {
    showToast('Não foi possível salvar os dados neste navegador. Confira as permissões de armazenamento.', 'error');
  }
}

function loadSavedConnection() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    el('cfg-owner').value = data.owner || '';
    el('cfg-repo').value = data.repo || '';
    el('cfg-branch').value = data.branch || 'main';
    el('cfg-token').value = data.token || '';
  } catch (e) {
    // Ignora dados locais inválidos; o usuário pode preencher novamente.
  }
}

loadSavedConnection();

/* --- Conectar --- */
el('btn-connect').addEventListener('click', () => {
  owner = el('cfg-owner').value.trim();
  repo = el('cfg-repo').value.trim();
  branch = el('cfg-branch').value.trim() || 'main';
  token = el('cfg-token').value.trim();
  if (!owner || !repo || !token) { showToast('Preencha usuário, repositório e token.', 'error'); return; }
  saveConnection();
  el('setup-details').open = false;
  loadConfig();
});

el('btn-reload').addEventListener('click', loadConfig);
el('btn-save').addEventListener('click', saveConfig);

el('btn-forget').addEventListener('click', () => {
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignora */ }
  token = '';
  el('cfg-owner').value = '';
  el('cfg-repo').value = '';
  el('cfg-branch').value = 'main';
  el('cfg-token').value = '';
  showToast('Token e dados de conexão apagados deste navegador.', 'success');
});

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

    if (!res.ok) {
      let detail = '';
      try {
        const errData = await res.json();
        detail = errData.message || '';
      } catch (e) { /* resposta sem JSON, ignora */ }
      throw new Error(`HTTP ${res.status}${detail ? ' - ' + detail : ''}`);
    }

    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
    const duration = parseInt(el('new-duration').value, 10) || 15;

    items.push({ type: 'image', src: rawUrl, duration, category: currentCategory });
    previewImg.classList.remove('uploading');
    renderItems();
    showToast('Imagem enviada ao GitHub e adicionada. Clique em "Salvar" para publicar.', 'success');
  } catch (err) {
    console.error(err);
    previewImg.remove();
    showToast('Falha ao enviar: ' + err.message, 'error');
  }
}
