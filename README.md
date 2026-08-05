# Baiak Idle Companion

Inclui integração experimental Live DOM e venda automática opt-in, ambas locais e desativadas por padrão, restritas a `https://baiakidle.com/jogar/*`. A venda automática é a única exceção ao modo read-only: quando explicitamente ativada, pode chamar `click()` somente no botão visível `#sell-all`. A compatibilidade autenticada e as regras do jogo ainda precisam de validação manual.

Extensão Chrome assistiva para análises locais. O modo demo continua padrão; a integração não coleta credenciais nem usa APIs internas, rede ou storage do jogo. A única ação suportada é a venda automática opt-in descrita acima.

O MVP inclui contratos para leitura DOM passiva opt-in, importação manual de catálogos JSON versão 1 com checksum e cálculos locais. Nenhum dado é enviado a servidores externos.

Catálogos, perfil de dano manual, regras locais de inventário e backups são mantidos localmente e versionados. A exportação inclui os catálogos ativos para permitir restauração offline; o limite de importação de catálogo individual é 1 MB.

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

Os números do modo demo são simulados. O projeto não envia dados a servidores externos. Não habilite a venda automática antes de confirmar as regras do jogo e concluir o teste manual.

## Workspaces

- `apps/extension`: Manifest V3, service worker mínimo e painel React.
- `packages/domain`: modelos e invariantes do negócio.
- `packages/game-adapter`: contrato de leitura e provider mock.
- `packages/optimizer-core`: cálculos puros.
- `packages/shared`: formatação compartilhada.
- `docs`: arquitetura, segurança e roadmap.

Os projetos públicos citados no briefing serviram apenas como referências conceituais; nenhum código, texto, arquivo ou recurso foi copiado.
