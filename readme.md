# Inteligencia dos JSONs

Este repositório agora guarda só os dados brutos e normalizados extraídos das planilhas.
Não é mais um app. A ideia aqui é usar os JSONs para entender o negócio de forma simples.

## O que tem aqui

- `artifacts/raw/`
  - 90 arquivos JSON
  - cada arquivo representa um relatório de uma semana
  - os dados vêm das planilhas semanais de:
    - comissões
    - fretes
    - incentivos
    - markup
    - pagamentos manuais
    - descontos e promoções

- `airflow_dbt/sql/dump_xlsl/`
  - as planilhas originais em Excel
  - é a fonte bruta que gerou os JSONs

## Leitura rápida do negócio

Pelo que os JSONs mostram, o padrão principal é este:

1. Houve um pico forte entre novembro e dezembro de 2025.
2. Depois do Natal e Ano Novo, os valores caem bastante.
3. Os pagamentos manuais mudam de comportamento em 2026 e passam a ficar negativos.
4. Os incentivos são muito pequenos perto das outras linhas, então quase não mexem no resultado.
5. O parceiro que mais aparece nos arquivos é `Mercearia e Deposito da Lagoa`.

## O que os números dizem

### Volume dos dados

- 90 arquivos JSON
- 15 arquivos por tipo de relatório
- 14 semanas únicas de amostra por tipo

### Resumo agregado dos JSONs

Somando os valores principais que aparecem nos arquivos:

- Comissões: `-44.817,83`
- Frete: `20.700,70`
- Markup: `58.727,03`
- Promoções: `69.634,04`
- Pagamentos manuais: `-3.166,94`
- Incentivos: `-2.730,80`

Resultado proxy total:

- `98.346,20`

## O que isso sugere

### 1. Pico sazonal forte

O comportamento bate com fim de ano:

- novembro e dezembro sobem juntos
- frete, markup, promoções e comissões crescem na mesma janela
- isso aponta para período de maior giro

### 2. Queda depois do pico

Depois da virada do ano:

- os números caem rápido
- a semana de transição entre dezembro e janeiro parece fraca

### 3. Pagamento manual virou ponto de atenção

Os JSONs indicam mudança de comportamento nos pagamentos manuais:

- em parte da série eles aparecem positivos
- em 2026 passam a ficar negativos

Isso merece revisão porque pode significar:

- estorno
- ajuste
- retenção
- mudança operacional

### 4. Incentivos não pesam muito

Os incentivos ficam muito pequenos perto das outras linhas.

Na prática:

- não parecem ser o principal motor do resultado
- não são o primeiro lugar para buscar explicação do pico

## O que um dono de depósito pode perguntar

Se a ideia é usar isso para tocar o negócio, as perguntas mais úteis são:

- Qual semana vendeu mais?
- Qual mês foi mais forte?
- O que explica o pico de novembro/dezembro?
- Quem puxou mais frete e comissão?
- Quais produtos mais apareceram nas semanas fortes?
- Por que os pagamentos manuais ficaram negativos?

## Minha leitura simples

Se eu tivesse que explicar isso para alguém do depósito, eu diria:

> O negócio cresce forte no fim do ano, cai depois da virada, e vale olhar com atenção os pagamentos manuais. Os incentivos quase não mudam o jogo.

## Como usar esses JSONs agora

- análise semanal
- análise mensal
- comparação entre períodos
- busca pelos parceiros que puxam pico
- investigação de produtos mais vendidos nas semanas fortes

## Observação

Esses JSONs são bons para inteligência de negócio, mas ainda não fecham lucro total de ponta a ponta.
Eles mostram muito bem:

- repasses
- comissões
- fretes
- promoções
- markup
- pagamentos manuais

Para fechar o lucro completo, ainda faltariam outros custos e algumas informações operacionais externas.

