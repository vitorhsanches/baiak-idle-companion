# Baiak Idle Companion

Extensão Chrome assistiva e **read-only** para explorar análises simuladas de personagem, hunts, inventário e combate. O MVP não lê dados reais do jogo, não coleta credenciais e não executa ações.

## Começar

Requer Node.js 24+ e npm 11+.

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

## Carregar no Chrome

1. Execute `npm run build`.
2. Abra `chrome://extensions`.
3. Ative **Modo do desenvolvedor**.
4. Clique em **Carregar sem compactação**.
5. Selecione `dist/extension`.
6. Fixe a extensão e clique no ícone para abrir o painel lateral.

Todos os números exibidos são dados simulados. O projeto não envia dados a servidores externos.

## Workspaces

- `apps/extension`: Manifest V3, service worker mínimo e painel React.
- `packages/domain`: modelos e invariantes do negócio.
- `packages/game-adapter`: contrato de leitura e provider mock.
- `packages/optimizer-core`: cálculos puros.
- `packages/shared`: formatação compartilhada.
- `docs`: arquitetura, segurança e roadmap.

Os projetos públicos citados no briefing serviram apenas como referências conceituais; nenhum código, texto, arquivo ou recurso foi copiado.
