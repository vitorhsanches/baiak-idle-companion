# Segurança

O manifest mantém apenas `sidePanel` e `storage`; o único content script usa `https://baiakidle.com/jogar/*`, `document_idle` e isolated world padrão. A build verifica fonte e artefatos contra APIs proibidas.

## Princípio

A extensão é assistiva, local e read-only. O MVP usa mocks e não acessa páginas do jogo.

## Threat model

Principais ameaças: vazamento de sessão, captura acidental de credenciais, privilégios excessivos, alteração do gameplay, exfiltração por telemetria, armazenamento inseguro e quebra por mudanças no DOM. Uma futura injeção na página também compartilha riscos com scripts de terceiros e com o contexto não confiável da página.

## Dados proibidos

Nunca coletar, ler, copiar, registrar ou expor tokens, cookies de autenticação, credenciais, conteúdo de Local Storage/Session Storage do jogo, cabeçalhos autenticados ou frames privados de WebSocket. Não há analytics nem envio externo.

## Permissões

- `sidePanel`: hospeda a interface solicitada.
- `storage`: persiste preferências e catálogos locais validados, sem segredos.

Não existem `host_permissions`, permissões de cookies, scripting, tabs, webRequest ou `<all_urls>`. Nenhuma permissão de host foi adicionada porque o domínio real não foi validado neste ambiente; um provider conectado exigirá revisão independente e host exato.

## Scripts de página

Código executado no contexto da página pode sofrer adulteração, expor dados e criar capacidade de mutação. Uma futura leitura DOM deve usar content script isolado, seletores centralizados, mensagens tipadas e allowlist de campos. É proibido sobrescrever WebSocket, usar `WebSocket.send`, interceptar requests, disparar eventos ou cliques.

## Armazenamento

Guardar somente preferências não sensíveis e, futuramente, snapshots minimizados e com retenção explícita. Nunca armazenar segredos ou conteúdo autenticado. Limpeza deve ser local e acionada pelo usuário. Dados devem ser validados ao ler.
