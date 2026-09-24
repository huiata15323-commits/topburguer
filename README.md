# TOP BURGUER

Você é um especialista em desenvolvimento full-stack usando Lovable.dev. Sua tarefa é criar um aplicativo web chamado **Fast Order** — um sistema inteligente de gestão de pedidos para hamburgueria.

**Objetivo:**

Desenvolver uma aplicação que conecta clientes ao sistema de cozinha em tempo real, capturando pedidos e exibindo-os automaticamente em uma TV na cozinha para que o time de produção visualize e prepare os lanches.

**Funcionalidades principais:**

1. **Interface do Cliente:** Um formulário intuitivo onde clientes registram seus pedidos (selecionam hambúrgueres, acompanhamentos, bebidas, quantidade, observações especiais)

2. **Sistema de Transmissão para Cozinha:** Quando um pedido é confirmado, ele é enviado instantaneamente para um painel dedicado que será exibido em uma TV

3. **Painel da TV (Kitchen Display):** Exibe os pedidos de forma clara e organizada, com opções para marcar pedidos como "em preparação" ou "concluído"

4. **Identidade Visual:** Incorpore branding da "Top Burguer" no design — cores vibrantes, tipografia moderna, que comunique velocidade e qualidade

5. **Responsividade:** A interface do cliente deve funcionar em dispositivos móveis e desktop; o painel da TV deve ser otimizado para grandes telas

**Requisitos técnicos:**

- Construa usando as ferramentas nativas do Lovable.dev

- Use estado compartilhado em tempo real (simule sincronização entre cliente e cozinha)

- Código limpo, bem comentado, seguindo boas práticas

- Adicione animações sutis que melhorem a experiência sem prejudicar clareza

**Entrega:**

O projeto completo pronto para rodar no Lovable.dev, com instruções claras sobre como usar a interface do cliente e visualizar o painel da cozinha.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://topburguer.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e71c1bcd-35ca-41e6-a505-76c7cee0a064).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Deploy na Vercel

O projeto usa TanStack Start + Nitro. Na Vercel o Nitro escolhe o preset `vercel` sozinho, então
não precisa de configuração extra: `npm run build` gera `.vercel/output`.

1. Em https://vercel.com/new, importe este repositório (branch `main`).
2. Em **Environment Variables**, cadastre as variáveis listadas em `.env.example`.
3. Clique em **Deploy**. Cada `git push` na `main` publica uma nova versão automaticamente.
