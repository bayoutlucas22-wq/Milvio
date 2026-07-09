import React, { useState } from 'react'
import { ArrowRight, ArrowLeft, Ghost, FileWarning, TrendingDown, Clock, Skull } from 'lucide-react'

const STEPS = [
  {
    id: 'bait',
    title: 'Passo 1: A Isca',
    icon: Ghost,
    color: '#10b981', // green
    description: 'A plataforma acena com uma promessa irresistível: "Venda muito, gire seu estoque rápido e tenha 20% de margem no catálogo Ambev". Você olha o volume de pedidos no app e entra no jogo achando que o lucro é garantido.',
    loss: 'R$ 0,00'
  },
  {
    id: 'contract',
    title: 'Passo 2: O Contrato',
    icon: FileWarning,
    color: '#f59e0b', // yellow
    description: 'Você assina o modelo "Entregador do PDV". Com uma única cláusula, o aplicativo se isenta completamente do problema da logística e joga a bomba no seu colo: "Você é exclusivamente responsável por pagar o motoboy".',
    loss: 'R$ 0,00'
  },
  {
    id: 'choke',
    title: 'Passo 3: A Asfixia (Frete)',
    icon: TrendingDown,
    color: '#ef4444', // red
    description: 'Para vender muito, o app cobra uma taxa de entrega minúscula do cliente (ou dá frete grátis) e te repassa apenas R$ 2,49 por pedido. Mas você tem que pagar cerca de R$ 10 pro motoboy. A diferença sai direto do seu lucro bruto.',
    loss: '- R$ 240.000,00'
  },
  {
    id: 'illusion',
    title: 'Passo 4: A Ilusão (Incentivo)',
    icon: Clock,
    color: '#a855f7', // purple
    description: 'Eles dizem: "Trabalhe perfeito e ganhe R$ 3,50 de bônus por pedido!". Mas a régua é impossível. Se chover, se a cerveja gelar 1 grau a menos, ou se o motoboy atrasar 1 minuto, o bônus é cortado. Você ganhou só 11 centavos por pedido na média.',
    loss: '- R$ 125.000,00'
  },
  {
    id: 'end',
    title: 'Passo 5: O Fim da Linha',
    icon: Skull,
    color: '#64748b', // slate
    description: 'A armadilha se fecha. O aplicativo fica com a base de clientes, a Ambev gira o estoque, o motoboy ganha a diária, e você trabalha de graça pagando o déficit de R$ 365 mil do próprio bolso. Você virou um escravo do volume.',
    loss: '- R$ 365.000,00'
  }
]

export default function TrapTour() {
  const [step, setStep] = useState(0)
  
  const current = STEPS[step]
  const Icon = current.icon

  return (
    <div style={{
      background: 'var(--surface-2)',
      border: `1px solid ${current.color}`,
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '32px',
      boxShadow: `0 8px 30px ${current.color}20`,
      transition: 'all 0.5s ease',
      overflow: 'hidden'
    }}>
      <style>
        {`
          @keyframes float-bot {
            0% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-10px) rotate(5deg); }
            100% { transform: translateY(0px) rotate(0deg); }
          }
          @keyframes slide-in {
            from { opacity: 0; transform: translateX(20px); }
            to { opacity: 1; transform: translateX(0); }
          }
          .tour-bot {
            animation: float-bot 3s ease-in-out infinite;
          }
          .animate-step {
            animation: slide-in 0.4s ease-out forwards;
          }
        `}
      </style>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <div style={{ flex: 1, height: '4px', background: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            background: current.color,
            width: `${((step + 1) / STEPS.length) * 100}%`,
            transition: 'width 0.4s ease, background 0.4s ease'
          }} />
        </div>
        <span style={{ color: 'var(--muted)', fontSize: '13px', fontWeight: 600 }}>
          Passo {step + 1} de {STEPS.length}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '32px', minHeight: '200px' }}>
        <div style={{
          width: '120px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div 
            className="tour-bot"
            style={{
              background: `${current.color}20`,
              border: `2px solid ${current.color}`,
              borderRadius: '50%',
              width: '80px',
              height: '80px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 20px ${current.color}40`,
              transition: 'all 0.5s ease'
            }}
          >
            <Icon size={40} color={current.color} style={{ transition: 'all 0.5s ease' }} />
          </div>
        </div>

        <div key={step} className="animate-step" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h2 style={{ color: current.color, margin: '0 0 16px 0', fontSize: '32px', transition: 'color 0.4s ease', fontWeight: 800 }}>
            {current.title}
          </h2>
          <p style={{ color: 'var(--text)', fontSize: '18px', lineHeight: 1.7, margin: '0 0 24px 0', minHeight: '90px' }}>
            {current.description}
          </p>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Sangria Acumulada</span>
              <div style={{ color: current.loss.includes('-') ? '#ef4444' : 'var(--muted)', fontSize: '24px', fontWeight: 700, marginTop: '4px' }}>
                {current.loss}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                disabled={step === 0}
                onClick={() => setStep(s => Math.max(0, s - 1))}
                style={{
                  background: 'var(--surface)', border: '1px solid var(--line)', padding: '8px 16px',
                  borderRadius: '8px', cursor: step === 0 ? 'not-allowed' : 'pointer', color: 'var(--text)',
                  display: 'flex', alignItems: 'center', gap: '8px', opacity: step === 0 ? 0.5 : 1
                }}
              >
                <ArrowLeft size={16} /> Voltar
              </button>
              
              {step < STEPS.length - 1 ? (
                <button 
                  onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}
                  style={{
                    background: current.color, border: 'none', padding: '8px 20px',
                    borderRadius: '8px', cursor: 'pointer', color: '#fff', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: '8px',
                    boxShadow: `0 4px 12px ${current.color}60`,
                    transition: 'all 0.3s ease'
                  }}
                >
                  Próximo <ArrowRight size={16} />
                </button>
              ) : (
                <button 
                  onClick={() => {
                    document.getElementById('golden-ticket')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }}
                  style={{
                    background: 'linear-gradient(90deg, #fbbf24, #f59e0b)', border: 'none', padding: '10px 24px',
                    borderRadius: '8px', cursor: 'pointer', color: '#78350f', fontWeight: 800,
                    display: 'flex', alignItems: 'center', gap: '8px',
                    boxShadow: '0 4px 15px rgba(251, 191, 36, 0.4)'
                  }}
                >
                  Ver Solução (Golden Ticket)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
