# Smoke test manual da extensÃ£o

## Status de automaÃ§Ã£o

**NÃ£o comprovado automaticamente.** O projeto nÃ£o inclui Playwright nem um Chromium controlÃ¡vel jÃ¡ instalado. Adicionar essa infraestrutura apenas para o painel lateral aumentaria o escopo e as dependÃªncias do MVP. Os testes Vitest continuam cobrindo renderizaÃ§Ã£o, navegaÃ§Ã£o e persistÃªncia de componentes; `npm run build` verifica o artefato final.

## Roteiro humano

Confirme o selo Demo mode, navegue por todas as páginas e verifique que não existem controles de venda, movimento ou uso de itens. Quando a importação de catálogo for exposta na interface, valide JSON versão 1 menor que 1 MB e confirme que JSON inválido não substitui o catálogo anterior. Inspecione o console e a rede: não deve haver requests externos, leitura de cookies/storage do jogo ou uso de WebSocket.

**Leitura DOM real: não comprovado em ambiente real.** O adapter foi validado apenas com fixtures sintéticas e não recebe permissão de host nesta versão.

No Settings, importe um JSON de catálogo menor que 1 MB, abra Hunts para verificar a origem `Imported catalog`, ajuste o perfil Physical e recarregue a extensão. Exporte os dados, limpe-os após confirmação e importe o backup para confirmar a restauração local. O teste manual completo permanece pendente.

1. Execute `npm run build` na raiz do repositÃ³rio.
2. Abra `chrome://extensions`, habilite **Modo do desenvolvedor** e clique em **Carregar sem compactaÃ§Ã£o**.
3. Selecione `dist/extension` e confirme que nÃ£o hÃ¡ erros na ficha da extensÃ£o.
4. Clique no Ã­cone da extensÃ£o; confirme que o painel lateral abre com `Demo mode` e o personagem `Aegis Knight`.
5. Navegue por Overview, Hunts, Inventory, Combat e Settings; confira que cada pÃ¡gina renderiza os dados demonstrativos.
6. Em Settings, altere o tema e desmarque uma preferÃªncia visual. Feche e reabra o painel; confirme a persistÃªncia.
7. Clique em **Restaurar padrÃµes** e confirme a volta aos valores iniciais.
8. Abra as ferramentas do painel, recarregue-o e confirme a ausÃªncia de erros nÃ£o tratados no console.
9. Em `chrome://extensions`, confirme que as Ãºnicas permissÃµes listadas sÃ£o armazenamento e painel lateral.

Essas verificaÃ§Ãµes dependem de interaÃ§Ã£o humana: carregamento pelo Chrome, abertura fÃ­sica do side panel, persistÃªncia atravÃ©s do ciclo de vida do navegador e inspeÃ§Ã£o do console da extensÃ£o.
