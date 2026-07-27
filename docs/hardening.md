# Hardening e auditoria de dependências

## Auditoria atual

Em 27 de julho de 2026, `npm install`, `npm audit` e `npm audit --json` retornaram **zero vulnerabilidades**. A árvore instalada possui 14 dependências de produção e 317 de desenvolvimento (330 no total, incluindo opcionais e peers).

O relatório histórico da etapa anterior mencionava cinco vulnerabilidades altas, mas não incluiu os identificadores, versões afetadas nem as cadeias de dependência. Por isso, não é possível atribuir com segurança cada uma a um pacote ou classificar sua alcançabilidade retrospectiva. Essa parte é **não comprovada**. A auditoria atual, feita sobre `package-lock.json`, é **comprovada** e não lista pacotes vulneráveis.

Nenhuma atualização manual, override, remoção ou `npm audit fix --force` foi aplicada nesta etapa. O `npm install` confirmou que o lockfile já está atualizado. Não existe vulnerabilidade restante conhecida na auditoria atual.

## Risco para o artefato

As dependências de build e teste (Vite, Vitest, ESLint, TypeScript e Testing Library) não são incluídas como dependências executadas pela extensão. A build final inclui React, React DOM e o código local do painel. A verificação pós-build confirma que os cinco arquivos produzidos não contêm source maps, `eval`, `new Function`, importações remotas de script ou assets HTML remotos.

Isso comprova as propriedades verificadas no artefato atual, mas não substitui uma revisão de segurança de dependências futuras nem um teste manual no Chrome.

## Controles automatizados

`npm run build` chama `scripts/verify-build.mjs` após o Vite. O script falha quando:

- o manifest não é V3;
- as permissões não são exatamente `sidePanel` e `storage`;
- existe `host_permissions`, `cookies`, `tabs`, `scripting`, `webRequest` ou `<all_urls>`;
- entradas declaradas no manifest não existem;
- source maps são emitidos;
- o bundle contém `eval`, `new Function`, importação dinâmica/remota de script ou asset HTML remoto.

O roteiro de inspeção humana está em `docs/manual-smoke-test.md`.
