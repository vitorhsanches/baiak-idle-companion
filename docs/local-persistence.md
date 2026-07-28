# Persistência e backup local

`companion.live-dom.v1` guarda o estado sanitizado e até cinco snapshots reais. Usa somente `chrome.storage.local`, não aceita novas leituras desabilitada e oferece limpeza manual confirmada.

O schema atual é `1` e fica em `companion.local-data.v1`. Ele persiste catálogo ativo/histórico (até 10 entradas), perfil de dano e origem, regras/overrides de inventário, snapshots e recomendações. Nenhum dado de cookies, credenciais, tokens ou storage do jogo é aceito.

Um backup possui `formatVersion: 1`, data de exportação e todo o estado local, inclusive catálogo ativo. O backup é JSON passivo: é validado e nunca executado. Uma versão incompatível ou JSON corrompido é rejeitado antes de substituir o estado. A limpeza pede confirmação na interface.
