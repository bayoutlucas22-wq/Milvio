# Delivery Margin System - TODO

## Fase 1: Estrutura e Banco de Dados

### Banco de Dados
- [x] Tabela `users` - Usuários do sistema
- [x] Tabela `products` - Produtos com preço, custo, estoque
- [x] Tabela `drivers` - Motoboys com status e limite de pedidos
- [x] Tabela `orders` - Pedidos com SLA e cálculo de margem
- [x] Tabela `orderItems` - Itens de pedido
- [x] Tabela `deliveries` - Entregas com rastreamento de tempo
- [x] Tabela `feeRules` - Regras de taxa por categoria/produto
- [x] Tabela `dailyClosings` - Fechamento diário
- [x] Tabela `cancellations` - Registro de cancelamentos
- [x] Tabela `systemSettings` - Configurações do sistema

## Fase 2: Backend (tRPC Procedures)

### Procedures Existentes
- [x] CRUD de produtos
- [x] CRUD de motoboys
- [x] CRUD de pedidos
- [x] Procedures de dashboard
- [x] Procedures de taxas
- [x] Cálculo de margens

### Procedures a Adicionar
- [ ] Importação de Excel (Zé Delivery)
- [ ] Procedures de cancelamentos
- [ ] Procedures de fechamento diário

## Fase 3: Frontend - Layout e Design

### Estrutura de Navegação
- [ ] DashboardLayout com sidebar
- [ ] Paleta de cores elegante e profissional
- [ ] Tipografia refinada
- [ ] Componentes reutilizáveis

## Fase 4: Dashboard Operacional

### Métricas em Tempo Real
- [ ] Faturamento bruto do dia
- [ ] Margem líquida total
- [ ] Pedidos ativos
- [ ] Pedidos atrasados
- [ ] Pedidos críticos
- [ ] Capacidade de entrega (%)
- [ ] Status de motoboys (disponível, 1 pedido, 2 pedidos)

### Alertas Visuais
- [ ] Alertas de pedidos com risco de prejuízo
- [ ] Alertas de estoque gelado crítico
- [ ] Alertas de motoboys atrasados
- [ ] Alertas de ruptura de estoque

## Fase 5: Módulo de Pedidos

### Funcionalidades
- [ ] Listagem de pedidos com filtros
- [ ] Visualização detalhada de pedido
- [ ] Registro de tempos (entrada, aceitação, separação, pronto, despacho, entrega)
- [ ] SLA countdown timer
- [ ] Detecção automática de atraso
- [ ] Visualização de margem por pedido
- [ ] Status: pending → accepted → picking → ready → dispatched → delivered

## Fase 6: Módulo de Motoboys

### Funcionalidades
- [ ] Cadastro de motoboys
- [ ] Listagem com status (available, 1 order, 2 orders, paused)
- [ ] Despacho inteligente com sugestão automática
- [ ] Regra de limite de 2 pedidos ativos
- [ ] Métricas: tempo médio, taxa de atraso, confiabilidade
- [ ] Visualização de pedidos ativos por motoboy

## Fase 7: Módulo de Estoque

### Funcionalidades
- [ ] Cadastro de produtos com categorias
- [ ] Controle separado de estoque total e estoque gelado
- [ ] Alertas de ruptura de estoque gelado
- [ ] Listagem de produtos críticos
- [ ] Listagem de produtos sem estoque
- [ ] Visualização de custo e preço de venda

## Fase 8: Configuração de Taxas e Margens

### Funcionalidades
- [ ] Configuração de comissão padrão (20%)
- [ ] Tabela de taxas por categoria
- [ ] Tabela de taxas extras por produto
- [ ] Taxas de pagamento
- [ ] Cálculo automático de margem

## Fase 9: Fechamento Diário

### Funcionalidades
- [ ] Resumo financeiro do dia
- [ ] Faturamento bruto total
- [ ] Comissões totais
- [ ] Taxas extras totais
- [ ] Custo dos produtos total
- [ ] Custo de entrega total
- [ ] Descontos e reembolsos
- [ ] Margem líquida total
- [ ] Listagem de pedidos com prejuízo
- [ ] Exportação de relatório

## Fase 10: Importação de Excel

### Funcionalidades
- [ ] Upload de arquivo Excel
- [ ] Parser para formato Zé Delivery
- [ ] Mapeamento de colunas
- [ ] Cálculo automático de margens
- [ ] Validação de dados
- [ ] Importação em lote

## Fase 11: Rastreamento de Cancelamentos

### Funcionalidades
- [ ] Registro de cancelamentos com motivo
- [ ] Cálculo de valor perdido
- [ ] Registro de produtos retornados/perdidos
- [ ] Cálculo de custo de entrega perdido
- [ ] Identificação de responsável provável
- [ ] Alertas automáticos de risco de prejuízo

## Fase 12: Testes e Refinamentos

### Testes
- [ ] Testes unitários das procedures tRPC
- [ ] Testes de cálculo de margem
- [ ] Testes de importação de Excel
- [ ] Testes de UI críticas

### Refinamentos
- [ ] Validação de dados
- [ ] Tratamento de erros
- [ ] Performance de queries
- [ ] Responsividade mobile
- [ ] Acessibilidade
- [ ] Refinamento visual e UX

---

## Status Geral

**Fase Atual:** 1 - Extrair e analisar projeto existente
**Progresso:** 0%
