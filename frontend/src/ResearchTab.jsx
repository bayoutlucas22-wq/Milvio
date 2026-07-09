import React, { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Line, Area
} from 'recharts'
import { BookOpen, TrendingDown, Target, Zap, AlertTriangle, Truck } from 'lucide-react'
import MilvioBot from './MilvioBot'
import TrapTour from './TrapTour'

const money = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function ResearchTab() {
  // Frozen snapshot for study (up to today)
  const totalFaturamento = 524325.35
  const totalPedidos = 39390
  const totalIncentivos = 4353.50
  const totalFrete = 77568.09
  const totalMarkup = 128052.82

  // Benchmarks vs Reality
  const ticketMedio = totalPedidos > 0 ? totalFaturamento / totalPedidos : 0
  const markupPercent = totalFaturamento > 0 ? (totalMarkup / totalFaturamento) * 100 : 0
  
  const idealIncentivo = totalPedidos * 3.35 // mid point between 3.20 and 3.50
  const lostIncentivo = idealIncentivo - totalIncentivos
  
  const idealFrete = totalPedidos * 8.00 // average 8.00 per drop
  const lostFrete = idealFrete - totalFrete

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', paddingBottom: '64px' }}>
      
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '24px', color: '#f8fafc' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '20px', margin: '0 0 16px 0' }}>
          <BookOpen size={24} color="#60a5fa" />
          Teoria (Documentação Zé) vs Realidade
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
          Com base na documentação operacional do Zé Delivery, o lucro do depósito é garantido por Markup alto (~20%), bônus logísticos e bônus de excelência. 
          Vamos cruzar o prometido pelo algoritmo com a realidade dos <strong>39.390 pedidos processados</strong> nos últimos 3 anos.
        </p>
      </div>

      <MilvioBot />
      <TrapTour />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        
        {/* PANEL A: MARKUP */}
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Target size={20} color="#10b981" />
            <strong style={{ fontSize: '16px', color: 'var(--text)' }}>Product Markup (Margem)</strong>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px', lineHeight: 1.5 }}>
            <strong>Promessa:</strong> O Zé garante markup entre <strong>18% a 20%</strong> sobre os produtos Ambev para proteger a margem do depósito.
          </div>
          <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '8px', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Markup Repassado Total:</span>
              <strong style={{ color: '#10b981' }}>{money(totalMarkup)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Faturamento Bruto Total:</span>
              <strong>{money(totalFaturamento)}</strong>
            </div>
            
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ color: 'var(--muted)' }}>Realidade Atingida</span>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>20% (Alvo)</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                <div style={{ width: '20%', height: '100%', background: 'var(--line)', position: 'absolute', left: 0 }} />
                <div style={{ width: `${markupPercent}%`, height: '100%', background: '#10b981', position: 'absolute', left: 0, transition: 'width 1s' }} />
              </div>
              <div style={{ textAlign: 'center', marginTop: '8px', fontWeight: 800, color: '#10b981', fontSize: '24px' }}>
                {markupPercent.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* PANEL B: INCENTIVOS */}
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Zap size={20} color="#eab308" />
            <strong style={{ fontSize: '16px', color: 'var(--text)' }}>Bônus de Excelência (Incentivos)</strong>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px', lineHeight: 1.5 }}>
            <strong>Promessa:</strong> O parceiro ganha um bônus entre <strong>R$ 3,20 e R$ 3,50 por pedido</strong> se bater a meta de Gelada, Rápida (35 min) e Sem Ruptura.
          </div>
          <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Incentivo Recebido:</span>
              <strong style={{ color: '#eab308' }}>{money(totalIncentivos)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px dashed var(--line)', paddingBottom: '16px' }}>
              <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Gasto por Pedido (Média):</span>
              <strong style={{ color: '#ef4444' }}>{money(totalIncentivos / totalPedidos)} / ped</strong>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '4px' }}>
              <AlertTriangle size={24} color="#ef4444" style={{ marginBottom: '4px' }} />
              <strong style={{ color: '#ef4444', fontSize: '20px' }}>{money(lostIncentivo)}</strong>
              <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: 500 }}>Dinheiro deixado na mesa</span>
              <p style={{ color: 'var(--muted)', fontSize: '11px', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                Se todos os {totalPedidos} pedidos estivessem no padrão Ouro do Zé (R$ 3,35/ped), esse seria o bônus recebido.
              </p>
            </div>
          </div>
        </div>

        {/* PANEL C: LOGISTICA */}
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <TrendingDown size={20} color="#3b82f6" />
            <strong style={{ fontSize: '16px', color: 'var(--text)' }}>Custo Logístico (Fretes)</strong>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px', lineHeight: 1.5 }}>
            <strong>Promessa:</strong> O Zé repassa as taxas de entrega para custear os motoboys, com média esperada de <strong>R$ 8,00 por corrida</strong>.
          </div>
          <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Repasse de Frete (Zé):</span>
              <strong style={{ color: '#3b82f6' }}>{money(totalFrete)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px dashed var(--line)', paddingBottom: '16px' }}>
              <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Repasse por Corrida (Média):</span>
              <strong style={{ color: '#ef4444' }}>{money(totalFrete / totalPedidos)} / ped</strong>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '4px' }}>
              <AlertTriangle size={24} color="#ef4444" style={{ marginBottom: '4px' }} />
              <strong style={{ color: '#ef4444', fontSize: '20px' }}>{money(lostFrete)}</strong>
              <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: 500 }}>Subsídio invisível do depósito</span>
              <p style={{ color: 'var(--muted)', fontSize: '11px', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                Se os motoboys recebem R$ 8/corrida, o depósito precisou tirar essa diferença (Gap) do próprio bolso (lucro).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* PANEL D: GOLDEN RULES (DIAGNÓSTICO) */}
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: '12px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Zap size={20} color="#f59e0b" />
          <strong style={{ fontSize: '16px', color: 'var(--text)' }}>As 4 Regras de Ouro (Causa Raiz do Gap de Incentivos)</strong>
        </div>
        <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '20px' }}>
          O algoritmo do Zé Delivery pune o parceiro tirando o volume de pedidos e cortando os bônus se estas métricas não forem seguidas. Como vimos acima que **R$ 127 mil em incentivos foram perdidos**, a causa raiz certamente está na quebra destas 4 regras operacionais:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '8px', border: '1px solid var(--line)' }}>
            <h4 style={{ margin: '0 0 8px 0', color: 'var(--text)', fontSize: '14px', display: 'flex', justifyContent: 'space-between' }}>
              <span>⏱️ Regra dos 35 Minutos</span>
              <span style={{ color: '#ef4444', fontSize: '12px' }}>Falhando</span>
            </h4>
            <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
              Do aceite à entrega na porta, o pedido não pode estourar 35 min. A falta do bônus indica alto índice de atrasos da frota de motoboys.
            </p>
          </div>
          <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '8px', border: '1px solid var(--line)' }}>
            <h4 style={{ margin: '0 0 8px 0', color: 'var(--text)', fontSize: '14px', display: 'flex', justifyContent: 'space-between' }}>
              <span>❄️ Temperatura Perfeita</span>
              <span style={{ color: '#ef4444', fontSize: '12px' }}>Risco de Auditoria</span>
            </h4>
            <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
              Cerveja quente gera reclamação no app e corta repasses. Freezer subdimensionado na alta demanda (fds) pode estar matando o lucro.
            </p>
          </div>
          <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '8px', border: '1px solid var(--line)' }}>
            <h4 style={{ margin: '0 0 8px 0', color: 'var(--text)', fontSize: '14px', display: 'flex', justifyContent: 'space-between' }}>
              <span>📦 Ruptura de Estoque</span>
              <span style={{ color: '#eab308', fontSize: '12px' }}>Atenção</span>
            </h4>
            <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
              80% do mix deve ser Ambev. Ruptura de carro-chefe (Brahma/Skol) faz o algoritmo parar de mandar grandes volumes.
            </p>
          </div>
          <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '8px', border: '1px solid var(--line)' }}>
            <h4 style={{ margin: '0 0 8px 0', color: 'var(--text)', fontSize: '14px', display: 'flex', justifyContent: 'space-between' }}>
              <span>🌙 Operação Noturna</span>
              <span style={{ color: 'var(--muted)', fontSize: '12px' }}>Ponto de Lucro</span>
            </h4>
            <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
              O pico do algoritmo é fds, jogos e madrugada. Fechar cedo derruba o ranking do parceiro na praça.
            </p>
          </div>
        </div>
      </div>
      
      {/* PANEL E: TIPOS DE ENTREGA (INVESTIGAÇÃO) */}
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: '12px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Truck size={20} color="#a855f7" />
          <strong style={{ fontSize: '16px', color: 'var(--text)' }}>Auditoria: Tipos de Entrega (Retirada vs Comum)</strong>
        </div>
        <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '16px' }}>
          Ao analisar os JSONs brutos, identificamos que abas auxiliares do Excel (como "Pedidos por Entregador") estavam sendo contadas erroneamente como tipos de entrega nas antigas extrações, gerando valores "vazios" no dashboard.
        </p>
        <div style={{ background: 'var(--surface)', padding: '20px', borderRadius: '8px', border: '1px solid var(--line)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div>
            <h4 style={{ margin: '0 0 8px 0', color: 'var(--text)', fontSize: '15px' }}>🚚 Entrega Comum</h4>
            <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '0 0 12px 0' }}>Pedidos levados até o cliente pelo motoboy. O Zé subsidia o frete.</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--line)', paddingBottom: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Volume:</span>
              <strong>~ 60% dos Pedidos</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Restituição de Frete:</span>
              <strong style={{ color: '#10b981' }}>Positiva (Aplicável)</strong>
            </div>
          </div>
          <div>
            <h4 style={{ margin: '0 0 8px 0', color: 'var(--text)', fontSize: '15px' }}>📦 Retirada no Balcão</h4>
            <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '0 0 12px 0' }}>Cliente compra no app mas retira no seu depósito. Não há custo de motoboy.</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--line)', paddingBottom: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Volume:</span>
              <strong>~ 40% dos Pedidos</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Restituição de Frete:</span>
              <strong style={{ color: 'var(--muted)' }}>R$ 0,00 (Não aplicável)</strong>
            </div>
          </div>
        </div>
      </div>

      {/* PANEL F: RISCO LOGÍSTICO (TERMOS DE USO) */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <BookOpen size={20} color="#f43f5e" />
          <strong style={{ fontSize: '16px', color: '#f8fafc' }}>Análise Contratual: A Armadilha do "Entregador do PDV"</strong>
        </div>
        <p style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '16px' }}>
          Ao cruzar os Termos de Uso (Cláusula 7.2) com os nossos dados financeiros, desvendamos como a plataforma blinda o próprio caixa e transfere o risco da inflação logística para o depósito:
        </p>
        <div style={{ background: 'rgba(244, 63, 94, 0.1)', padding: '20px', borderRadius: '8px', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ color: '#f8fafc', fontSize: '14px', margin: '0 0 4px 0' }}>📄 O que diz o contrato (Cláusula 7.2):</h4>
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0, fontStyle: 'italic', lineHeight: 1.5 }}>
              "Os valores referentes às entregas serão pagos (...) aos Pontos de Venda e estes serão <strong>exclusivamente responsáveis por remunerar o Entregador do PDV de acordo com os critérios acordados diretamente entre eles</strong>. O Zé Entregador não tem qualquer ingerência na forma ou valores pagos."
            </p>
          </div>
          <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '8px', border: '1px solid var(--line)' }}>
            <h4 style={{ color: 'var(--text)', fontSize: '14px', margin: '0 0 8px 0' }}>💡 A Tradução Prática no Caixa do PDV:</h4>
            <ul style={{ color: 'var(--muted)', fontSize: '13px', margin: 0, paddingLeft: '20px', lineHeight: 1.6 }}>
              <li>A plataforma cobra do cliente final uma taxa fixa e baixa (ex: R$ 4,00 a R$ 8,00) para incentivar a venda.</li>
              <li>Esse valor baixo é repassado integralmente para você (PDV), gerando o total de <strong>{money(totalFrete)}</strong> que vimos acima.</li>
              <li>No entanto, o <strong>custo real de mercado</strong> de um motoboy hoje é muito maior (diárias + taxas por corrida + intempéries).</li>
              <li>O contrato isenta o Zé de cobrir essa diferença. A conta final desse déficit ("Subsídio Invisível") sai compulsoriamente da margem bruta dos seus produtos (Markup).</li>
            </ul>
          </div>
        </div>
      </div>

      {/* PRÓXIMOS PASSOS */}
      <div style={{ background: 'var(--surface-2)', border: '1px solid #10b981', borderRadius: '12px', padding: '24px', marginTop: '16px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '20px', margin: '0 0 16px 0', color: '#10b981' }}>
          <Zap size={24} color="#10b981" />
          Próximos Passos: Como Virar o Jogo
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '15px', lineHeight: 1.6, marginBottom: '24px' }}>
          Você não precisa ser refém dessa armadilha logística. As alternativas para virar esse jogo incluem:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: 'var(--surface)', padding: '20px', borderRadius: '8px', border: '1px solid var(--line)' }}>
            <h3 style={{ fontSize: '15px', color: '#60a5fa', marginBottom: '8px' }}>1. Mudar para Entregador Autônomo</h3>
            <p style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
              Solicite a alteração do seu contrato para que a gestão logística seja centralizada e o pagamento do frete seja feito diretamente pelo aplicativo, tirando o peso do custo fixo das suas costas.
            </p>
          </div>
          <div style={{ background: 'var(--surface)', padding: '20px', borderRadius: '8px', border: '1px solid var(--line)' }}>
            <h3 style={{ fontSize: '15px', color: '#a855f7', marginBottom: '8px' }}>2. Repassar o Custo Invisível</h3>
            <p style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
              Aumente a sua taxa de entrega e reajuste a margem de lucro dos rótulos de cerveja que não são curva A. Equilibrar o preço de venda é fundamental para compensar a logística.
            </p>
          </div>
          <div style={{ background: 'var(--surface)', padding: '20px', borderRadius: '8px', border: '1px solid var(--line)' }}>
            <h3 style={{ fontSize: '15px', color: '#f59e0b', marginBottom: '8px' }}>3. Revisar seu Painel de Parceiro</h3>
            <p style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
              Acesse a página do Zé Delivery para Parceiros para obter suporte, verificar as condições do seu contrato atual ou checar o modelo de taxas praticadas na sua região.
            </p>
          </div>
        </div>

        <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <p style={{ color: '#d1fae5', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
            <strong>💡 Reflexão Estratégica:</strong> Tomando as rédeas da logística e parando de sangrar margem no frete, o seu lucro bruto voltará a ser real. Dependendo da quantidade de rotas e da sua base fiel de clientes, fechar a torneira do "frete grátis subsidiado pelo dono" pode fazer a operação retornar ao ponto de equilíbrio <strong>em apenas 2 ou 3 meses de ajuste fino</strong>.
          </p>
        </div>
      </div>

    </div>
  )
}
