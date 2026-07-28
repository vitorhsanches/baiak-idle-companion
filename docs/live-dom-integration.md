# Integração Live DOM read-only

Status em ambiente real: **não comprovado**.

## Escopo e permissão

A origem foi confirmada na página pública oficial e a constante `/jogar/` no bundle público servido em 27/07/2026. O manifest autoriza somente `https://baiakidle.com/jogar/*`, sem variante `www`, host genérico ou `host_permissions`. O impacto é executar `content.js` nessa rota após `document_idle`; ele fica inativo até consentimento explícito. Para rollback, remova `content_scripts`, a entrada `content` do Vite e os módulos de integração.

## Fluxo e consentimento

`content script (isolated world) → mensagens v1 validadas → service worker → estado sanitizado → side panel`.

O React nunca consulta o DOM do jogo. Mensagens têm versão, tipo, timestamp, origem e payload; são rejeitadas por versão, tipo, origem, propriedades inesperadas, profundidade, strings ou tamanho. O background valida também `sender.url` e ignora mensagens antigas.

“Enable live read-only game data” começa `false` e exige confirmação. Desabilitar desconecta observer, cancela debounce e encerra leituras. Há no máximo uma leitura a cada dois segundos e snapshots idênticos não são reenviados.

Estados: disabled, waiting-for-game-tab, game-page-detected, reading-visible-dom, snapshot-available, partial-snapshot, dom-structure-unsupported, permission-unavailable e error.

## Dados, seletores e limites

Somente elementos já visíveis: nome, vocação, level, hunt, equipamentos, imbuements e pontos de talento. Inventário só será usado quando seu painel e seletor forem comprovados; caso contrário fica indisponível. A rota é salva sem query string.

O registro `gameDomSelectors` versionado prioriza `data-*` e `aria-label`; não usa índices, `nth-child`, classes com hash ou HTML bruto. A versão 2 é candidata defensiva baseada no bundle público, ainda sem validação autenticada. Falhas são independentes por campo.

Nunca são acessados cookies, tokens, credenciais, storage do jogo, headers, requests, APIs do jogo, payloads de rede, WebSocket, chat, inputs sensíveis ou HTML arbitrário. Não existem cliques, eventos sintéticos, preenchimento ou ações de gameplay.

## Diagnóstico e persistência

O diagnóstico JSON opcional contém versão, nome lógico, contagem, motivo, tag e presença de uma lista fechada de atributos semânticos. Não contém valores, texto arbitrário ou HTML.

`chrome.storage.local` mantém estado e até cinco snapshots, com ID, schema, timestamp, origem, versão dos seletores, confiança, ausências, warnings e referência opcional de catálogo. Novos snapshots não são persistidos quando desabilitada. A limpeza real exige confirmação.

## Validação e rollback

Compile e recarregue; abra `https://baiakidle.com/jogar/`; confirme ausência de leitura desabilitada; habilite; abra manualmente personagem/equipamentos; atualize; confira Live DOM e ausências; feche um painel; exporte e revise o diagnóstico; desabilite; limpe dados reais; confira console e ausência de ações.

Até o roteiro ser executado no Chrome autenticado: **não comprovado em ambiente real**.
