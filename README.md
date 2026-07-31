# TV Eletropel — Painel de rotação de conteúdo

Sistema de rotação de conteúdo (sites e imagens) para as TVs da loja, com painel de
administração organizado por categorias (pastas). Tudo hospedado gratuitamente no GitHub.

## Arquivos

- **index.html / style.css / script.js** → o "player" que roda na TV (fica público)
- **admin.html / admin.css / admin.js** → o painel de controle (use só localmente, no seu PC)

## Passo a passo

### 1. Criar o repositório
- Crie um repositório novo no GitHub (público — precisa ser público pra TV ler sem senha)
- Suba todos os arquivos desta pasta pra ele

### 2. Configurar o `script.js`
Abra o arquivo `script.js` e troque:
```js
const OWNER = "SEU_USUARIO_GITHUB";
const REPO = "SEU_REPOSITORIO";
```
pelos dados reais do seu usuário e repositório. Depois de editar, suba a alteração de novo pro GitHub.

### 3. Ativar o GitHub Pages
No repositório: **Settings → Pages → Branch: main → Save**
Você vai receber um link tipo `https://seuusuario.github.io/seurepositorio/index.html` — esse é o link que vai na TV.

### 4. Criar o token de acesso (pro painel de admin)
Vá em **github.com → Settings → Developer settings → Fine-grained tokens → Generate new token**
- Dê acesso apenas ao repositório desse projeto
- Permissão: **Contents** → Read and write
- **Nunca compartilhe esse token com ninguém, nem cole ele em conversas/e-mails.**

### 5. Usar o painel
Abra o `admin.html` **direto do seu computador** (dois cliques no arquivo, sem precisar de servidor).
Cole usuário, repositório, branch (`main`) e o token. Daí é só criar categorias, subir imagens
e adicionar sites — ao clicar em "Salvar", tudo é publicado direto no repositório.

**Importante:** não hospede o `admin.html` publicamente (nem no GitHub Pages). Use-o só localmente,
já que ele pede o token de escrita.

### 6. Configurar a TV (Philips / Android TV)
- Instale o **Fully Kiosk Browser** (grátis, via Play Store)
- Em **Start URL**, cole o link do GitHub Pages (passo 3)
- Ative **Start on boot** e **Kiosk mode**

### 7. Panasonic (My Home Screen)
Esse sistema não permite instalar apps extras. Configure a página inicial do navegador
embutido da TV pra apontar pro mesmo link — não abre 100% sozinho, mas fica só um clique
no app "Internet" pra carregar direto.

## Como funciona por trás

- As imagens ficam salvas em `imagens/<categoria>/` dentro do repositório
- Um arquivo `config.json` (criado automaticamente pelo painel) guarda a ordem, duração
  e categoria de cada item
- A TV verifica esse `config.json` a cada 5 minutos e atualiza sozinha

## Dashboard e QR code

- Ao abrir o `admin.html`, a primeira tela é um **dashboard**: total de itens, total de
  categorias, última atualização, e um **preview ao vivo** (a própria página da TV rodando
  em miniatura dentro do painel — é o que está passando lá agora, de verdade)
- A tela da TV mostra um **QR code discreto no canto inferior esquerdo** — é só um atalho
  opcional pra abrir o admin rápido pelo celular quando você estiver perto da TV sem PC por
  perto. No dia a dia, continue usando o admin pelo computador normalmente; o QR não muda nada
  no seu fluxo.

## Onde guardar os arquivos

| Arquivo | Precisa estar no GitHub? | Precisa estar no PC? |
|---|---|---|
| `index.html` + `style.css` + `script.js` | ✅ Sim, obrigatório (é o que a TV lê) | Não precisa |
| `admin.html` + `admin.css` + `admin.js` | Opcional | ✅ Sim, os 3 juntos na mesma pasta |

Recomendação: suba a pasta inteira pro GitHub (não faz mal ter o admin lá também) **e** guarde
uma cópia da pasta inteira em um lugar fixo no seu PC (ex: `Documentos/tv-eletropel/`) — é dali
que você vai abrir e favoritar o admin no dia a dia. Os três arquivos do admin (`admin.html`,
`admin.css`, `admin.js`) precisam ficar sempre juntos na mesma pasta, senão o painel abre sem
estilo e sem funcionar.

## Favoritar o admin no PC

1. Dê dois cliques no `admin.html` pra abrir no navegador
2. Vai aparecer um endereço tipo `file:///C:/Users/SeuNome/Documentos/tv-eletropel/admin.html`
3. Aperte a estrelinha da barra de endereço (ou `Ctrl + D`) e favorite normalmente
4. **Não mova nem renomeie a pasta depois** — o link salvo aponta pro caminho exato do arquivo,
   e quebra se o arquivo mudar de lugar
