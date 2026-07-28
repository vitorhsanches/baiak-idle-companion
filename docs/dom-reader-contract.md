# Contrato de leitura DOM

`DomGameAdapter` é uma fronteira passiva que recebe um `Document`. Os seletores versionados ficam somente no adapter, nunca no React. Ele pode ler texto visível para nome, vocação, level, talentos, hunt e equipamentos. Cada resultado informa origem, confiança, campos indisponíveis e erros sanitizados.

Ele não acessa cookies, credenciais, tokens, Local/Session Storage, rede ou WebSocket; não escreve no DOM nem dispara eventos. DOM ausente ou inválido não lança exceção. A compatibilidade com a página real não foi comprovada.
> Seletores na versão 2; compatibilidade autenticada **não comprovada em ambiente real**.
