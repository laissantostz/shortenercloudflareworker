# URL Shortener Worker

Este projeto é um URL Shortener implementado como um Cloudflare Worker, utilizando Cloudflare Workers KV para armazenamento dos dados.

## Pré-requisitos

- Cloudflare account
- Node.js e npm
- Wrangler CLI

## Configuração

### Criação do Worker

Siga a documentação em https://developers.cloudflare.com/workers/

### Criação do KV

Siga a documentação em https://developers.cloudflare.com/kv/reference/how-kv-works/

### Configuração do Projeto

Após a criação do Worker, acesse as configurações do mesmo, clique em Variables no menu lateral esquerdo e defina as variáveis de ambiente:

![Exemplo 1](https://dev.ingage.com.br/sensia/wp-content/uploads/2024/05/Screenshot_1.jpg)

Crie a variável BD_ID e associe ao seu KV criado para que seu Worker possa se comunicar com o KV.

![Exemplo 2](https://dev.ingage.com.br/sensia/wp-content/uploads/2024/05/Screenshot_2.jpg)

Em triggers, no menu lateral esquerdo, adicione seu custom domain a ser utilizado nas URLs encurtadas:

![Exemplo 3](https://dev.ingage.com.br/sensia/wp-content/uploads/2024/05/Screenshot_3.jpg)

Use o wrangler para acessar a raiz seu worker localmente e clone este repositório para obter o código-fonte inicial:

```bash
git clone https://github.com/laissantostz/shortenercloudflareworker.git
```

Faça o deploy do código para o seu worker usando

```bash
wrangler deploy
```
