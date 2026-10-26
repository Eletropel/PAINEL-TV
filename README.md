# TV Eletropel — Painel de rotação de conteúdo

Sistema de exibição de sites e imagens nas TVs da loja, com painel administrativo, categorias personalizadas e seleção centralizada do conteúdo exibido. O projeto usa GitHub Pages para disponibilizar o player e `config.json` para sincronizar todas as TVs.

## Arquivos do projeto

- **`index.html` / `style.css` / `script.js`** — player que deve ser aberto nas TVs.
- **`admin.html` / `admin.css` / `admin.js`** — painel administrativo para editar conteúdos e publicar as configurações.
- **`config.json`** — lista compartilhada de conteúdos, categorias, seleção de categorias ativas e data da última atualização.
- **`imagens/`** — arquivos de imagem organizados por categoria.

## Como publicar e configurar

### 1. Repositório

Mantenha os arquivos do projeto no repositório GitHub `Eletropel/PAINEL-TV`. O repositório precisa ser público para que as TVs consigam ler o player, o arquivo de configuração e as imagens sem autenticação.

### 2. Player

No `script.js`, confira se `OWNER`, `REPO` e `BRANCH` correspondem ao repositório e à branch usados. Neste projeto, os valores são `Eletropel`, `PAINEL-TV` e `main`.

### 3. GitHub Pages

No repositório, acesse **Settings → Pages** e configure a publicação a partir da branch `main`. O endereço do player será:

`https://eletropel.github.io/PAINEL-TV/`

Use esse endereço como página inicial do navegador de cada TV.

### 4. Token de acesso para o painel

O painel precisa de um token para gravar alterações no repositório. Crie um **Fine-grained personal access token** nas configurações do GitHub:

- Selecione somente o repositório `PAINEL-TV`.
- Conceda a permissão **Contents: Read and write**.
- Defina uma validade adequada e não compartilhe o token.

**Segurança:** o campo do token no painel é mascarado, e o código não deve guardar o token em `localStorage` nem incluí-lo em arquivos do repositório. O token permanece em memória enquanto o painel está aberto e é enviado ao GitHub para autenticar as operações. A máscara esconde os caracteres na tela, mas não transforma um token exposto em seguro. Não coloque o token em código, arquivos, capturas de tela ou commits. Se suspeitar que foi exposto, revogue-o no GitHub e gere outro.

Como o repositório é público, qualquer segredo incluído em um arquivo publicado pode ser visto por qualquer pessoa. O painel pode estar hospedado publicamente, mas use-o com cuidado: só conecte com seu token em um dispositivo confiável e encerre a sessão/limpe o campo ao terminar.

### 5. Abrir e usar o painel

Abra `admin.html` no navegador. Para funcionar corretamente, mantenha `admin.html`, `admin.css` e `admin.js` juntos na mesma pasta. Informe o usuário/organização, o repositório, a branch (`main`) e o token; depois clique em **Conectar ao GitHub**.

No painel você pode:

- Criar suas próprias categorias, com os nomes que desejar.
- Adicionar imagens e sites a essas categorias.
- Organizar os conteúdos e definir a duração de cada item.
- Selecionar uma ou várias categorias para determinar o que será exibido nas TVs.
- Publicar as alterações em `config.json` pelo botão **Salvar alterações nas TVs**.

### 6. Categorias ativas e sincronização das TVs

A lista de categorias não é fixa: ela é formada pelas categorias criadas no painel e pelas categorias presentes nos conteúdos. Marque as categorias que deseja exibir e salve as alterações. Todas as TVs que usam este mesmo repositório recebem a mesma seleção e exibem os conteúdos pertencentes às categorias ativas.

Desativar uma categoria **não apaga** os conteúdos nem as imagens; apenas os oculta temporariamente da programação exibida. Ao ativá-la novamente e salvar, seus conteúdos voltam a aparecer. A ordem dos conteúdos dentro da configuração é preservada.

Em configurações antigas que ainda não tenham `activeCategories`, o player exibe todos os itens, mantendo a compatibilidade. O painel impede salvar uma seleção sem categorias ativas ou sem conteúdo correspondente.

### 7. Configurar as TVs

**Philips / Android TV**

- Instale o Fully Kiosk Browser, se disponível para o modelo.
- Configure a URL inicial para `https://eletropel.github.io/PAINEL-TV/`.
- Ative as opções de inicialização automática e modo quiosque, conforme necessário.

**Panasonic (My Home Screen)**

O navegador integrado pode ter limitações para iniciar automaticamente. Configure a página inicial para o endereço do player; dependendo do modelo, pode ser necessário abrir o navegador manualmente.

### Criar, renomear e excluir categorias

- Em **Alterar conteúdo**, crie uma categoria digitando o nome no cartão **Nova categoria**.
- Categorias vazias podem ser renomeadas ou excluídas pelos botões no cartão da categoria.
- Por segurança, os botões de renomear e excluir ficam desativados quando a categoria contém itens. Remova os itens primeiro para evitar referências quebradas ou perda acidental de imagens.
- Essas alterações ficam pendentes no painel até clicar em **Salvar alterações nas TVs**.
- Excluir uma categoria vazia remove sua entrada da configuração; não apaga imagens, pois não há itens cadastrados nela.

## Atualização e funcionamento

- O player carrega a programação de `config.json`.
- Por padrão, as TVs verificam a configuração novamente a cada **5 minutos**.
- Quando uma nova seleção de categorias é salva, todas as TVs que usam essa configuração passam a seguir a mesma programação na próxima atualização.
- As imagens ficam em `imagens/<categoria>/` e são referenciadas pela configuração.
- O player mostra um QR code que aponta para o painel administrativo.

## Arquivos que precisam ser enviados ao GitHub

| Arquivo | Necessário para as TVs? | Finalidade |
|---|---:|---|
| `index.html` | Sim | Página do player |
| `style.css` | Sim | Estilo do player |
| `script.js` | Sim | Reprodução, leitura da configuração e filtro por categoria |
| `config.json` | Sim | Programação compartilhada entre as TVs |
| `imagens/` | Conforme os conteúdos usados | Imagens da programação |
| `admin.html` | Para hospedar o painel; também pode ser usado localmente | Interface administrativa |
| `admin.css` | Junto com o painel | Estilo administrativo |
| `admin.js` | Junto com o painel | Conexão com GitHub e gerenciamento do conteúdo |
| `README.md` | Recomendado | Documentação do projeto |

Mantenha uma cópia de segurança do projeto no computador. Os três arquivos do painel (`admin.html`, `admin.css` e `admin.js`) devem permanecer juntos.
