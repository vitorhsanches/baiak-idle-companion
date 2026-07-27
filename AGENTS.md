# AGENTS.md

## Visão

Baiak Idle Companion é uma extensão Chrome assistiva para apresentar análises locais. A versão atual usa apenas dados simulados e opera estritamente em modo read-only.

## Comandos

- Instalação: `npm install`
- Desenvolvimento: `npm run dev`
- Lint: `npm run lint`
- Tipos: `npm run typecheck`
- Testes: `npm test`
- Build: `npm run build`
- Formatação: `npm run format`

## Arquitetura

- Domínio não depende de browser, React, Chrome ou DOM.
- `game-adapter` concentra providers e futuros seletores.
- `optimizer-core` contém somente funções puras.
- UI consome contratos dos packages e mantém apenas estado de apresentação.
- Dependências apontam para dentro: UI → adapter/optimizer/domain; adapter → domain.

## Segurança

- A operação é read-only.
- Nunca ler tokens, cookies, Local/Session Storage do jogo ou credenciais.
- Nunca interceptar ou alterar requests, injetar frames, chamar `WebSocket.send` ou automatizar cliques.
- Nunca vender, mover, comprar ou usar itens, nem controlar personagem, party, bosses ou hunts.
- Nunca enviar dados para servidores externos ou adicionar telemetria.
- Não usar `<all_urls>`; toda permissão futura precisa de justificativa e escopo mínimo.
- Automações de gameplay são proibidas sem autorização explícita em tarefa futura e revisão das regras do jogo.

## Convenções

- TypeScript estrito; evite `any`.
- Componentes pequenos, nomes explícitos e funções puras quando possível.
- Seletor específico do jogo pertence exclusivamente a um provider.
- Testes terminam em `.test.ts` ou `.test.tsx`.
- Formatação por Prettier e qualidade por ESLint.
- Não duplicar tipos de domínio na UI.

## Definição de pronto

- Critérios funcionais atendidos e estados loading/vazio/erro considerados.
- Lint, typecheck, testes e build passam.
- Manifest revisado quanto a permissões.
- Documentação e testes atualizados.
- Nenhuma ação real, coleta sensível ou tráfego externo introduzido.
