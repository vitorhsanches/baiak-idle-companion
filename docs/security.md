# Segurança

O manifest mantém apenas `sidePanel` e `storage`; o único content script usa `https://baiakidle.com/jogar/*`, `document_idle` e isolated world padrão. A build verifica fonte e artefatos contra APIs proibidas.

## Princípio

A extensão é assistiva e local. Leitura e análises permanecem read-only; a única exceção é a venda automática, desativada por padrão e habilitada somente após consentimento explícito.

## Threat model

Principais ameaças: vazamento de sessão, captura acidental de credenciais, privilégios excessivos, alteração do gameplay, exfiltração por telemetria, armazenamento inseguro e quebra por mudanças no DOM. Uma futura injeção na página também compartilha riscos com scripts de terceiros e com o contexto não confiável da página.

## Dados proibidos

Nunca coletar, ler, copiar, registrar ou expor tokens, cookies de autenticação, credenciais, conteúdo de Local Storage/Session Storage do jogo, cabeçalhos autenticados ou frames privados de WebSocket. Não há analytics nem envio externo.

## Permissões

- `sidePanel`: hospeda a interface solicitada.
- `storage`: persiste preferências e catálogos locais validados, sem segredos.

Não existem `host_permissions`, permissões de cookies, scripting, tabs, webRequest ou `<all_urls>`. O content script já é limitado no manifest às rotas exatas do jogo; a automação não requer nova permissão.

## Scripts de página

O content script usa isolated world. É proibido sobrescrever WebSocket, usar `WebSocket.send`, interceptar requests ou disparar outros eventos. A exceção estreita é `HTMLButtonElement.click()` em `#sell-all`, somente quando o toggle está ligado, a contagem visível excede o limite, o botão não está disabled nem em `.cd`, não há venda em processamento e o guard de cinco segundos expirou. O texto do botão nunca autoriza o clique.

O guard é persistido localmente para sobreviver a reloads. A transição para disabled/`.cd` é apenas confirmação visual de cooldown, não prova de sucesso da venda. Configurações são globais à extensão; múltiplas abas permanecem uma limitação a validar antes de release.

## Armazenamento

Guardar somente preferências não sensíveis e, futuramente, snapshots minimizados e com retenção explícita. Nunca armazenar segredos ou conteúdo autenticado. Limpeza deve ser local e acionada pelo usuário. Dados devem ser validados ao ler.
