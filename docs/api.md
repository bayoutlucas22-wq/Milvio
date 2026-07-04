# Pesquisa API do Zé Delivery

Este documento organiza a análise da API pública do Zé Delivery e mostra como ela se encaixa no sistema `Delivery Margin Control`.

## 1. Objetivo

O objetivo do projeto não é apenas mostrar vendas.
O objetivo é responder, de forma simples, se a loja realmente lucra.

A pergunta principal é:

```text
quanto entrou - quanto saiu - quanto se perdeu = lucro
```

Para isso, o sistema precisa juntar dados de venda, custo, entrega, restituição e operação em uma leitura única.

## 2. Visão de negócio

O Zé Delivery, com suporte da Ambev, oferece a estrutura de venda e distribuição.
A loja entra com a operação do dia a dia.

O problema real do dono não é só vender mais.
O problema real é entender:

- quanto vendeu
- quanto gastou
- quanto perdeu
- quanto sobrou

É isso que o `Delivery Margin Control` abstrai para o dono.

## 3. O que a API pode trazer

### 3.1 Reports

São os dados mais importantes para análise financeira.

- `Get Merchant KPIs`
  - mostra indicadores da loja
  - ajuda a medir saúde operacional

- Resumo de repasses por pedido
  - mostra quanto cada pedido gerou
  - ajuda a ver receita e deduções

- Resumo de repasses de incentivos operacionais
  - mostra valores adicionais
  - ajuda a entender o impacto na margem

### 3.2 Orders

Os dados de pedidos ajudam a entender o fluxo de venda.

- detalhes do pedido
- itens vendidos
- status do pedido
- histórico de pedidos finalizados

### 3.3 Products

Os dados de produto ajudam na margem.

- atualização de promoções
- atualização de oferta
- atualização de preço do catálogo

### 3.4 Merchants

Os dados da loja ajudam a controlar a operação.

- disponibilidade da loja
- dados cadastrais
- momento certo de abrir ou fechar a operação

### 3.5 Events e Webhooks

Esses dados servem para agir mais rápido.

- atualização de status em tempo real
- acompanhamento do ciclo do pedido
- resposta mais rápida a atraso, cancelamento ou mudança de status

## 4. Como o sistema funciona hoje

Hoje o `Delivery Margin Control` funciona com arquivos Excel exportados do Zé Delivery.

O fluxo atual é:

1. o arquivo XLS é importado
2. o sistema identifica o tipo do relatório
3. os dados são normalizados
4. os dados são salvos no MySQL
5. o painel monta a leitura executiva

O sistema já faz isso para:

- pedidos
- entregadores
- restituição
- fechamento diário

## 5. Como a API entra nessa arquitetura

A API pode complementar ou, em parte, substituir os XLS.

### Hoje

- o dado chega por planilha
- o sistema lê e organiza no banco
- o painel mostra lucro, margem e custo

### Futuro com API

- o dado pode chegar direto da origem
- menos trabalho manual
- menos erro de upload
- leitura mais rápida
- chance maior de agir no mesmo dia

## 6. API x XLS

### XLS

Vantagens:

- fácil de começar
- bom para auditoria
- já funciona com o sistema atual

Limitações:

- depende de importação manual
- pode atrasar a leitura
- aumenta risco de erro humano

### API

Vantagens:

- mais rápida
- mais automática
- mais próxima da origem
- melhor para rotina diária

Limitações:

- exige integração
- depende de acesso estável aos endpoints
- precisa de mais validação técnica

## 7. Regra de negócio

A regra central do sistema é:

```text
lucro = dinheiro que entra - gastos - perdas
```

Isso significa:

- receita não é lucro
- muito pedido não é lucro
- lucro só existe depois de custo, entrega, taxa, desconto e perda

## 8. O que melhora a lucratividade

Com a API e o sistema de margem, a operação pode melhorar em quatro frentes:

### 8.1 Reduzir trabalho manual

Menos planilha, menos retrabalho, menos dependência de upload.

### 8.2 Enxergar o lucro mais cedo

Se os dados chegam mais rápido, o dono reage antes de fechar o mês.

### 8.3 Controlar custo

O sistema ajuda a observar:

- custo da loja
- custo de entrega
- comissão
- desconto
- restituição

### 8.4 Reduzir perda

O lucro aumenta quando a loja perde menos por:

- cancelamento
- atraso
- erro operacional
- ruptura de estoque

## 9. Fluxo ideal de dados

1. O Zé Delivery gera os dados.
2. A API ou o XLS envia esses dados para o sistema.
3. O backend organiza tudo no MySQL.
4. O dashboard mostra o que entrou, o que saiu e o que sobrou.
5. O dono decide o que corrigir primeiro.

## 10. Como falar isso para o dono

O dono não precisa ouvir termos técnicos.

Ele precisa entender:

- quanto entrou
- quanto gastou
- quanto sobrou
- onde está perdendo dinheiro
- o que precisa mudar agora

Se a leitura estiver incompleta, o sistema deve avisar isso.
Não deve inventar zero falso como se fosse verdade.

## 11. Conclusão

A API pública do Zé Delivery pode deixar a leitura do negócio mais rápida, mais confiável e mais útil para o dono.

O `Delivery Margin Control` já faz a base com XLS e MySQL.
A API entra como o próximo passo para automatizar a leitura e aproximar o sistema da verdade operacional.

O valor final não está em “ver relatório”.
O valor final está em entender, de forma simples, como fazer sobrar mais dinheiro no caixa.

