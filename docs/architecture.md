# Arquitetura

A integração real segue `content script isolado → protocolo validado → background → side panel`. O adapter é a única camada com seletores; a UI recebe snapshots sanitizados.

## Componentes e dependências

`domain` define também `CharacterSnapshot`, origem, confiança, catálogos e recomendações. `game-adapter` define `GameDataProvider`, `GameAdapterResult`, adapters mock/DOM e os seletores versionados; `optimizer-core` contém cálculos puros. A extensão mantém apenas UI e dados locais.

```text
Chrome side panel → React UI → GameDataProvider → Domain
                         ├──→ Optimizer Core → Domain
                         └──→ Local settings storage
```

O fluxo atual começa no provider mock, que devolve um clone do snapshot com origem `demo`. O adapter DOM recebe um `Document` e não está conectado à página até validação do domínio e revisão de permissões. Preferências e catálogos validados ficam em `chrome.storage.local`; nenhum dado sai do dispositivo.

`localDataStore` é uma abstração versionada (schema 1) sobre `chrome.storage.local`, com fallback para `localStorage` nos testes. Ela agrupa catálogo ativo/histórico, perfil de dano, regras e overrides, snapshots e recomendações. Leitura corrompida volta a defaults seguros; backups só substituem o estado depois de schema/version válidos.

## Fronteiras

- Domínio: regras e linguagem do produto, sem DOM ou Chrome.
- Adapter: única fronteira autorizada para futura leitura do jogo.
- Optimizer: cálculos determinísticos, sem efeitos colaterais.
- Extensão: renderização, navegação, preferências e comunicação com providers.

Seletores do site devem existir apenas em uma implementação de provider DOM. Não podem aparecer em componentes, hooks, domínio ou optimizer.

## Decisões técnicas

- npm workspaces evita ferramenta extra de monorepo.
- Vite gera o painel e o service worker, emitindo o manifest no artefato.
- Manifest sem host permissions enquanto só existem mocks.
- CSS nativo reduz superfície de dependências e mantém responsividade.
- MV3 e `sidePanel` oferecem uma superfície persistente sem injeção na página.

## Adicionar um provider

1. Implemente `GameDataProvider` em `packages/game-adapter`.
2. Mantenha seletores em um módulo privado e específico do provider.
3. Retorne somente os tipos de `GameSnapshot`.
4. Não leia cookies, tokens, storage da página, payload autenticado ou WebSocket.
5. Não modifique DOM, requests ou estado do jogo.
6. Adicione testes com fixtures sanitizadas.
7. Solicite somente host permissions exatas e documente a justificativa.
8. Injete o provider na UI sem alterar o domínio.
