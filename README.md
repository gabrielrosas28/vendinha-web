# Vendinha (versão para computador)

O caixa de vendas da **Feirinha do Empreendedorismo** do Colégio Santa Chiara (Aracaju-SE), agora como **site que funciona sem internet** (PWA).

Cada grupo usa um computador. A criança clica na foto do produto (ou aperta o número dele no teclado) para montar o pedido, clica nas notas e moedas que o cliente entregou, e o sistema mostra o troco **desenhado em notas e moedas**.

É a mesma coisa que o app Android `Vendinha`: as mesmas regras, telas e frases. O app Android continua sendo a referência.

- Os **4 computadores não conversam entre si**. Cada um guarda os próprios dados **no navegador**.
- O site fica de graça no **GitHub Pages**. Quando você sobe uma atualização, os computadores recebem a versão nova.
- **Depois de aberto uma vez, funciona sem internet.**
- Pagamento **só em dinheiro**.

---

## 1. Rodar no seu computador (para desenvolver)

Precisa do **Node.js 22 ou mais novo** (https://nodejs.org, versão LTS).

Abra o terminal na pasta `vendinha-web` e rode:

```bash
npm install      # baixa as bibliotecas (só na primeira vez)
npm run dev      # abre em http://localhost:5173/vendinha-web/
npm test         # roda os testes (dinheiro, troco, estoque, senha e banco)
```

Outros comandos úteis:

```bash
npm run lint       # confere o estilo do código
npm run typecheck  # confere os tipos (TypeScript)
npm run build      # gera a versão final na pasta dist/
npm run preview    # abre a versão final em http://localhost:4173/vendinha-web/
```

> No `npm run dev` o modo offline fica desligado. Para testar offline e a faixa "Tem versão nova", use `npm run build` e depois `npm run preview`.

---

## 2. Publicar no GitHub Pages

Faça isso **uma vez**:

1. Entre em https://github.com/new e crie um repositório chamado **`vendinha-web`** (pode ser público ou privado; no plano grátis o Pages só funciona com repositório **público**).
   - Se usar outro nome, troque o `BASE` em `vite.config.ts` para `'/NOME-DO-REPOSITORIO/'`.
2. No terminal, dentro da pasta `vendinha-web`:
   ```bash
   git remote add origin https://github.com/USUARIO/vendinha-web.git
   git push -u origin main
   ```
3. No GitHub, abra o repositório e vá em **Settings › Pages**. Em **Source**, escolha **GitHub Actions**.
4. Vá na aba **Actions** e espere o "Publicar no GitHub Pages" ficar verde (uns 2 minutos). Se ele rodou antes de você ativar o Pages e deu erro, clique nele e em **Re-run all jobs**.
5. O endereço final é:

   **https://USUARIO.github.io/vendinha-web/**

   (troque `USUARIO` pelo seu nome de usuário do GitHub).

O workflow (`.github/workflows/deploy.yml`) roda **lint, testes e build** a cada push na `main`. Se algum teste falhar, nada é publicado.

---

## 3. Preparar os 4 computadores

Em **cada** computador (com internet, só desta vez):

1. Abra o endereço `https://USUARIO.github.io/vendinha-web/` no **Chrome** ou no **Edge**.
2. Clique em **Instalar app**: é o ícone de computador com uma setinha (⊕) no fim da barra de endereço. No Edge também fica em **⋯ › Aplicativos › Instalar este site como um aplicativo**.
   - Instalado, o Vendinha ganha um ícone na área de trabalho e abre numa janela própria, sem barra de endereço.
   - O app instalado também ajuda o navegador a **proteger os dados** (veja "Armazenamento" na Área do Organizador).
3. Na primeira abertura, **crie a senha do Organizador** (4 a 8 números) e confirme. Use a mesma senha nos 4 computadores.
4. **Teste sem internet**: desligue o Wi-Fi, feche e abra o Vendinha de novo, escolha um grupo, cadastre um item, abra o caixa e faça uma venda. Tem que funcionar normalmente.
5. Depois do teste, entre na Área do Organizador e use **Zerar computador** para começar limpo.

### ⚠️ Importante: os dados ficam no navegador

As vendas ficam guardadas **dentro do navegador daquele computador**. Por isso:

- **Não use aba anônima**: ao fechar, tudo some.
- **Não limpe os dados de navegação** (histórico, cookies, "dados de sites") desses computadores.
- Use **sempre o mesmo navegador e o mesmo usuário do Windows**. Chrome e Edge não enxergam os dados um do outro.
- **Exporte o backup ao fim de cada turno** (Área do Organizador › Exportar backup) e guarde o arquivo `.json` num pendrive, no Drive ou mande por e-mail.

---

## 4. Como atualizar

1. Mude o código, rode `npm test` e dê **push** na `main`.
2. Espere a aba **Actions** ficar verde.
3. Nos computadores, quando tiverem internet, aparece a faixa **"Tem versão nova do Vendinha. Atualizar"** (o app confere ao abrir e a cada 30 minutos). Clique em **Atualizar**.
   - Se houver uma venda pela metade, a faixa pede para **terminar a venda antes**. Nenhum pedido se perde.
   - As vendas, os produtos e os relatórios **continuam** depois da atualização.

---

## 5. Passo a passo do dia da feira

### Antes da feira (organizador)

1. Prepare os 4 computadores (seção 3). Deixe-os carregados ou na tomada.
2. Abra o Vendinha **instalado** (ou deixe o navegador em **tela cheia com F11**), para os alunos não saírem do app.
3. Confira as turmas em **Área do Organizador › Turmas e grupos**.

### Começar um grupo

1. Na tela **"Qual é o seu grupo?"**, clique na aba da turma e no card colorido do grupo. Confirme em **Começar**.
   - Turma ou grupo fora da lista? Clique em **Outro grupo**, escreva a turma e o nome e escolha uma cor.
   - O nome do grupo pode ser mudado depois no lápis ✏️ do Painel.
2. Abre o **Painel** do grupo.

### Cadastrar os produtos

1. No Painel, clique em **Produtos › Novo item**.
2. A **foto é opcional**: clique em **Usar a webcam** (aparece a imagem da câmera; clique em **Capturar**) ou em **Escolher arquivo**. A foto é recortada em quadrado sozinha. Sem foto, o card mostra a **inicial do nome** na cor do grupo.
3. Escreva o **nome** e o **preço** (ex.: `2,50`). O preço precisa terminar em 0 ou 5 centavos.
   - Sabores e tamanhos viram itens separados: "Geladinho de morango", "Geladinho de uva".
4. **Controlar quantidade?**
   - **Ligado**: escreva quantos vocês têm. O sistema desconta a cada venda, avisa "Acabando" com 3 ou menos e bloqueia em "Esgotado".
   - **Desligado**: vende sem limite (bom para fatias de bolo e pipoca a granel).
5. **Salvar item**. Para mudar o preço, repor ou desativar, clique no item na lista.

### Abrir o caixa

1. Clique em **Vender**. Na primeira vez abre **Abrir o caixa**.
2. Clique nas notas e moedas do troco que está na caixinha e em **Começar com R$ …**. Ou clique em **Começar sem troco**.

### Vender

1. **Clique na foto** do produto (ou aperte o **número** dele no teclado: `1` é o primeiro, `2` o segundo…). Cada clique soma 1. O pedido aparece à direita, com **−** e **+**.
2. O **Total** aparece no visor escuro.
3. Errou? **Limpar** (ou `Esc`) zera o pedido.
4. Clique em **Cobrar** (ou `Enter`).
5. **Quanto o cliente deu?** Clique nas notas e moedas que o cliente entregou. Ou **digite o valor** no teclado (ex.: `20` ou `7,50`) e aperte `Enter`. O visor mostra **Falta** (em salmão) ou **Troco** (em verde). Clicar numa peça da bandeja tira uma.
   - Pagou o valor exato? **Valor certinho**.
6. **Confirmar venda** (ou `Enter`). A venda é salva na hora.
7. A tela fica verde: **Venda feita!** O troco aparece desenhado em notas e moedas. Entregue e clique em **Próximo cliente** (ou `Enter`).

### Durante a feira

- **Estoque**: quanto vendeu de cada item e quanto ainda tem.
- **Histórico**: todas as vendas, da mais recente para a mais antiga.
- **Estornar** (o cliente desistiu): no Histórico, abra a venda e clique em **Estornar venda**. O organizador digita a senha. A venda fica marcada como estornada (nunca é apagada) e os produtos voltam para o estoque.

### Fechar o caixa

1. No Painel, clique em **Fechar caixa**. Aparece o resumo: total ganho, número de vendas, quanto vendeu de cada item e o **campeão de vendas**.
2. Clique em **Contar o dinheiro** e conte a caixinha clicando nas notas e moedas, ou digite o valor. O sistema compara com o **dinheiro esperado** (troco inicial + total ganho) e diz se **bateu certinho**, **sobrou** ou **faltou**. Dá para pular em **Fechar sem contar**.
3. **Fechar e salvar no histórico** e confirme.
4. Aparece o **Relatório**: **Baixar imagem** (PNG), **Imprimir** ou **Compartilhar** (quando o navegador permite).

### Trocar de grupo (rodízio)

1. Com o caixa fechado, o organizador **segura o cadeado 🔒 por 2 segundos** (canto de cima do Painel ou da tela inicial) ou aperta **Ctrl+Shift+O**, e digita a senha.
2. **Exportar backup** (recomendado).
3. **Zerar computador** e confirme. Apaga grupo, produtos, fotos, caixa e vendas; **os relatórios salvos e o registro de vendas ficam**.
4. O computador volta para **"Qual é o seu grupo?"**.

### Área do Organizador (cadeado 2 s ou Ctrl+Shift+O, + senha)

- **Este computador**: grupo atual, estado do caixa e do **armazenamento** (se o navegador está protegendo os dados e quanto espaço está em uso).
- **Reabrir caixa**: se o grupo fechou sem querer. Ao fechar de novo, o mesmo relatório é atualizado.
- **Zerar computador**: para o próximo grupo.
- **Turmas e grupos**: cadastre as turmas (ex.: "4º B") e os grupos de cada uma. Já vem com as turmas do 2º ano.
- **Registro de vendas**: todas as compras feitas neste computador, com **Total**, **Recebido** e **Troco**, e totais no topo. Filtra por **turma** e por **grupo**. Continua salvo depois do "Zerar".
- **Som de caixa registradora**: liga ou desliga o "ka-ching".
- **Relatórios salvos**: todos os caixas fechados aqui.
- **Exportar backup**: baixa um `.json` com todos os relatórios e o registro de vendas (mesmo formato do app Android).
- **Importar backup**: lê um `.json` exportado (deste ou de outro computador, ou do app Android) e **só acrescenta** o que ainda não existe. Nada é apagado nem duplicado. Serve para juntar os relatórios dos 4 computadores num só.
- **Apagar histórico**: apaga relatórios e registro. Pede **duas** confirmações.

### Atalhos de teclado

| Tela | Tecla | O que faz |
|---|---|---|
| Painel | `Enter` | Vender |
| Vender | `1` a `9` | soma o produto daquela posição |
| Vender | `Enter` | Cobrar |
| Vender | `Esc` | limpa o pedido (vazio: volta) |
| Pagamento | `20`, `7,50`… + `Enter` | soma o valor ao recebido |
| Pagamento | `Enter` | Confirmar venda |
| Pagamento | `Esc` | apaga o que digitou / o recebido / volta |
| Venda feita! | `Enter` | Próximo cliente |
| Contar o dinheiro (Digitar) | números e `Backspace` | digita o valor contado |
| Senha | números, `Backspace`, `Enter` | digita e entra |
| Qualquer tela | `Ctrl+Shift+O` | Área do Organizador |

As dicas aparecem pequenas no rodapé das telas (somem em telas só de toque).

---

## 6. Dica: deixar os alunos só no Vendinha

- Use o **app instalado** (seção 3): abre em janela própria, sem barra de endereço.
- Ou aperte **F11** no navegador para a **tela cheia**. Para sair, F11 de novo.
- Se uma criança tentar fechar ou recarregar a página **com um pedido pela metade**, o navegador pergunta antes.

---

## 7. Alternativa sem GitHub (rede local)

Se não quiser usar o GitHub, em **cada computador** (precisa do Node.js instalado):

```bash
npm install
npm run build:local
npx serve dist -l 4173
```

e abra **http://localhost:4173/** no Chrome/Edge. O `localhost` também permite **instalar o app** e funciona offline depois da primeira abertura.

> Use `build:local` (e não `build`): ele monta o site na raiz `/`. O `build` normal é para o endereço do GitHub Pages (`/vendinha-web/`).
>
> O `serve` precisa estar rodando para abrir o Vendinha pela primeira vez. Depois de instalado, o app abre mesmo com o `serve` desligado.

---

## 8. Decisões tomadas (onde a web é diferente do Android)

1. **Foto opcional**: no Android era obrigatória. Aqui, sem foto, o card mostra a inicial do nome num quadrado com a cor do grupo. Foto pela **webcam** (`getUserMedia`, com prévia e botão Capturar) ou **arquivo**. Recorte quadrado no centro, no máximo 800 px, JPEG ~80% (reduz até ~250 KB), guardado como Blob no IndexedDB. A prévia da webcam mostra exatamente o quadrado que vira a foto.
2. **Senha**: PBKDF2 com **SHA-256** pela Web Crypto API (120 mil iterações), salt aleatório de 16 bytes e comparação em tempo constante. No Android era SHA-1 só porque o Android 7 não tinha outro.
3. **Valor digitado no Pagamento** (ex.: `7,50`) vira peças pelo guloso (R$ 5 + R$ 2 + R$ 0,50) e entra na bandeja, como se a criança tivesse clicado nelas. Precisa ser múltiplo de 5 centavos.
4. **Imagem do relatório**: desenhada à mão num `<canvas>` (sem html2canvas) e gerada na hora em que se clica, sem ficar salva. Por isso o Fechamento não tem a coluna `imagemPath` do Android.
5. **Sair do app**: o diálogo do Android não existe na web. No lugar, o navegador pergunta antes de fechar/recarregar **só quando há pedido em andamento** (`beforeunload`).
6. **"Venda feita!"**: as teclas `Enter`/`Esc` só passam para o próximo cliente depois de 0,8 s, e segurar `Enter` não atravessa telas. Assim a criança sempre vê o troco.
7. **Registro de vendas** filtra por **turma** e por **grupo** (no Android só por grupo).
8. **Importar backup** é novo: acrescenta fechamentos e registros sem duplicar. Um item igual é reconhecido por turma, grupo, data e valores. Os registros importados não apontam para nenhuma venda deste computador (`vendaId = 0`).
9. **Exportar backup** fica liberado quando há relatório **ou** registro (no Android, só com relatório).
10. **Senha do Organizador** é pedida ao entrar na Área do Organizador e vale enquanto a pessoa estiver nela (Turmas, Registro, Relatórios). Saiu, pede de novo. Turmas e Registro não abrem direto pelo endereço sem a senha.
11. **Armazenamento**: na primeira abertura o app chama `navigator.storage.persist()`. O Chrome costuma conceder a proteção para o **app instalado**; a Área do Organizador mostra o estado e tem um botão para pedir de novo.
12. **Atualização**: o service worker usa o modo "prompt": a versão nova só entra quando alguém clica em **Atualizar**, e só sem pedido em andamento.
13. **Rotas com `HashRouter`** (`/#/venda`), porque o GitHub Pages não sabe redirecionar rotas.
14. **Banco Dexie** com versão explícita (`db.version(1)`). Para mudar o banco no futuro, crie `db.version(2)` com `.upgrade()`; o Dexie nunca apaga dados sozinho.
15. **IDs de venda não se repetem** depois do "Zerar" (o IndexedDB continua contando), então o estorno sempre marca o registro certo.
16. **Layout**: na Venda, produtos à esquerda e visor/pedido/Cobrar à direita, tudo visível sem rolar a página; Pagamento, Abrir caixa e Contar o dinheiro em duas colunas (informação × teclado de dinheiro). Telas estreitas (< 980 px) voltam ao layout em coluna do Android. Teclas com pelo menos 56 px, funcionam com mouse e com toque.

---

## 9. Organização do código

```
vendinha-web/
├── src/
│   ├── domain/      regras puras: dinheiro (centavos, R$ pt-BR, troco guloso), contaCaixa,
│   │                estoque, resumo, registro, grupos (semente e cores), senha (PBKDF2)
│   ├── data/        db.ts (Dexie, versão 1, semente das turmas), repositorios.ts (transações:
│   │                confirmar venda, estornar, fechar, zerar), relatorio.ts, backup.ts, fotos.ts, som.ts
│   ├── ui/          tema.css + layout.css, componentes/ (tecla com beiço, visor, notas e moedas
│   │                em SVG, teclado numérico, diálogos), telas/, rotas.tsx, sessao.tsx (pedido em andamento)
│   └── main.tsx
├── public/          som da venda, fontes Nunito + licença OFL, logo, ícones do PWA
├── tests/           Vitest: domínio e banco (fake-indexeddb)
├── scripts/         gerar-icones.mjs (refaz os ícones a partir da fonte, se quiser mudar)
└── .github/workflows/deploy.yml
```

**Dinheiro** é sempre um número **inteiro de centavos**. Não há contas com frações de real em lugar nenhum.

---

## 10. Créditos e licenças

- Fonte **Nunito**, © The Nunito Project Authors, sob a SIL Open Font License 1.1 (`licencas/OFL-Nunito.txt`, também em `public/fontes/`). Servida junto com o site, sem Google Fonts.
- Marca **Feirinha do Empreendedorismo** © Colégio Santa Chiara.
- Som da venda sintetizado para o app Android (sem direitos de terceiros).
- Cores das notas e moedas inspiradas na 2ª família do Real, desenhadas de forma simplificada.
