# Arquitetura

## Componentes e dependências

`domain` define Character, Equipment, InventoryItem, Hunt, Monster, CombatSession e Recommendation. Não conhece infraestrutura. `game-adapter` define `GameDataProvider` e entrega snapshots tipados; o MVP fornece `MockGameDataProvider`. `optimizer-core` recebe objetos do domínio e retorna resultados puros. `shared` reúne utilitários neutros. `extension` contém service worker, UI, estado e armazenamento de preferências.

```text
Chrome side panel → React UI → GameDataProvider → Domain
                         ├──→ Optimizer Core → Domain
                         └──→ Local settings storage
```

O fluxo atual começa no provider mock, que devolve um clone do snapshot. O React controla loading, sucesso e erro, e transforma os dados em apresentação. Preferências são carregadas de `chrome.storage.local`; no navegador de desenvolvimento/testes, a mesma interface usa `localStorage`. Nenhum dado sai do dispositivo.

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
