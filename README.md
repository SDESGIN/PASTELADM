# Pastel Diferente — pronto para GitHub + Netlify

Este pacote é específico para a Netlify. Contém a interface pronta em HTML/CSS/JS, as funções de login e gravação e o armazenamento integrado Netlify Blobs. Não precisa de servidor Node separado, Docker ou instalação manual de banco.

## 1. Colocar no GitHub pelo navegador

1. Extraia o ZIP no computador.
2. Crie um repositório novo no GitHub, preferencialmente privado, para não misturar com a versão anterior.
3. Clique em **Add file → Upload files** (em um repositório vazio, use o link de upload).
4. Abra a pasta extraída, selecione **o conteúdo dentro dela** e arraste para a área de upload. Arraste também as pastas; não tente selecionar as pastas pelo botão de escolher arquivos.
5. Confirme o envio com **Commit changes**.

O arquivo `netlify.toml` e o arquivo `package.json` devem aparecer logo na primeira página do repositório, junto com as pastas `site`, `server`, `netlify`, `scripts` e `tests`. Não envie o ZIP fechado. Não deixe todo o conteúdo dentro de uma pasta extra no repositório. Não achate as subpastas: os caminhos são necessários.

## 2. Publicar na Netlify

1. Na Netlify, clique em **Add new project → Import an existing project → GitHub**.
2. Autorize o acesso e selecione o repositório criado.
3. O `netlify.toml` já configura o deploy. Se aparecerem campos para preencher, use:

| Campo | Valor |
|---|---|
| Branch | main, ou a branch em que enviou os arquivos |
| Base directory | deixe vazio |
| Build command | npm run build |
| Publish directory | site |
| Functions directory | netlify/functions |

4. Clique em **Publish/Deploy** e aguarde terminar.
5. Abra a URL `.netlify.app` exibida pela Netlify.

Use importação do GitHub, não o arraste de uma pasta no Netlify Drop. As funções precisam ser empacotadas durante o deploy.

## 3. Acessar e usar

A conta inicial é `admin`, com a senha combinada na conversa. Ela já está preparada no servidor como hash; não precisa criar usuário nem configurar variáveis para começar. Troque a senha em **Configurações** após validar o acesso. Se preferir substituir a senha inicial antes do primeiro acesso, configure a variável de função `ADMIN_PASSWORD` (10 a 200 caracteres) e publique novamente. Depois que o administrador existir no armazenamento, mudanças nessa variável não alteram a senha; use o painel.

1. Confira os produtos e preços. O cardápio inclui 41 variações, sem lanche de pernil.
2. Em **Estoque**, cadastre as quantidades reais. Produtos começam em controle manual; configure estoque por unidade ou receita quando necessário.
3. Em **Vendas**, toque nos produtos, confira o pedido, escolha o pagamento e confirme.
4. Registre despesas no financeiro. O saldo é entradas menos saídas, não lucro contábil.
5. Em **Configurações**, exporte cópias dos dados periodicamente.

## Dados e atualizações

Os dados ficam no armazenamento do projeto Netlify, protegidos pelo servidor, e sobrevivem a novos deploys do mesmo projeto. Não ficam no GitHub nem somente no navegador. Este pacote começa com o cardápio e sem vendas; não transfere os lançamentos do endereço anterior automaticamente. Não exclua o projeto nem seu armazenamento para atualizar: envie mudanças ao mesmo repositório/projeto.

O armazenamento utiliza leitura consistente e gravação condicional por versão. Duas vendas simultâneas não devem substituir uma à outra; solicitações repetidas usam identificador para evitar duplicação. Esta edição foi dimensionada para operação pequena e mantém o histórico em um documento de até 4 MB. Ao atingir esse limite, bloqueia novos registros com mensagem de orientação, preservando os dados e a exportação; a ampliação exige evolução da estrutura. Não há arquivamento ou restauração JSON automática. Os limites e cobranças da Netlify dependem do plano da sua conta.

A URL deve permitir visitantes na configuração de acesso da Netlify para que a dona chegue à tela de login. Se a hospedagem mostrar uma tela de acesso da própria Netlify antes do painel, revise essa configuração. As APIs de dados continuam exigindo a sessão administrativa.

## Arquivos

- `netlify.toml`: configuração automática de build e publicação.
- `site/`: interface e logo, única pasta exposta como arquivos públicos.
- `netlify/functions/api.mjs`: entrada do servidor Netlify.
- `server/`: regras, armazenamento e autenticação; não é publicado como pasta estática.
- `package.json` e `package-lock.json`: dependência do armazenamento, instalada automaticamente.
- `tests/`: testes das regras e da API.

## Validação realizada

Build de verificação, sintaxe e testes locais passaram. Os testes cobrem login, sessão, senha, logout, vendas simultâneas, repetição de requisição, conflito de gravação, estoque, despesas, cancelamentos e indisponibilidade do armazenamento. Os testes da persistência usam um armazenamento isolado que implementa o contrato de gravação condicional. O deploy na sua conta Netlify ainda precisa ser executado; não foi validado em um projeto Netlify real nesta entrega.

Para conferir localmente com Node 22+: `npm ci`, `npm test` e `npm run build`. Abrir apenas `site/index.html` por duplo clique não executa as funções. Para testar pela internet, faça o deploy acima.

Referências: https://docs.netlify.com/build/data-and-storage/netlify-blobs/ e https://docs.netlify.com/start/quickstarts/deploy-from-repository/
