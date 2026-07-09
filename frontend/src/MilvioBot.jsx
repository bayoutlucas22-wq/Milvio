import React, { useState, useEffect } from 'react'
import { Bot, Play, Square, Volume2 } from 'lucide-react'

export default function MilvioBot() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [utterance, setUtterance] = useState(null)
  
  const text = "Fala tu, Milvio, tranquilidade? Mermão, presta atenção nos números dessa tela. A plataforma manda aquele papo de que tu vai ter 20% de margem, mas isso é caô puro. Sabe quanto de grana tu já sangrou nessa brincadeira? Mais de 360 mil reais foram pro ralo nos últimos anos. Só de incentivo de performance, tu deixou 125 mil na mesa por causa das regras implacáveis de atraso. E no frete, o buraco é pior: tu bancou do teu bolso quase 240 mil reais pra manter os motoboys rodando, porque o Zé só te repassou uma merreca de 77 mil. \n\nQuer uma sugestão de ouro pra sair dessa armadilha? Tu tem dois caminhos: O primeiro é ligar lá e exigir a mudança do teu contrato pro modelo Entregador Autônomo. Assim, o próprio Zé paga o frete direto pro motoboy e assume a bronca da logística. O segundo caminho é repassar esse custo invisível agora mesmo: aumenta a tua taxa de entrega e sobe a margem das cervejas que não são curva A. Ficar do jeito que tá, é trabalhar de graça pra Ambev, parceiro. Pega a visão!"

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return

    const u = new SpeechSynthesisUtterance(text)
    u.rate = 1.05 // slightly faster, carioca style
    u.pitch = 0.9 

    u.onend = () => setIsPlaying(false)
    u.onerror = () => setIsPlaying(false)
    
    // Attempt to set voice immediately if available
    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices()
      // Prioritize Google's cloud voice or macOS premium voices (Felipe/Luciana)
      const ptVoice = voices.find(v => v.name.includes('Google') && v.lang.includes('pt'))
        || voices.find(v => v.name.includes('Felipe') && v.lang.includes('pt'))
        || voices.find(v => v.name.includes('Luciana') && v.lang.includes('pt'))
        || voices.find(v => v.name.includes('Joana') && v.lang.includes('pt'))
        || voices.find(v => v.lang === 'pt-BR' || v.lang === 'pt_BR' || v.lang.includes('pt'))
      
      if (ptVoice) {
        u.voice = ptVoice
        u.lang = ptVoice.lang
      } else {
        u.lang = 'pt-BR' // fallback
      }
    }
    
    setVoice()
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = setVoice
    }

    setUtterance(u)

    return () => {
      window.speechSynthesis.cancel()
    }
  }, [])

  const togglePlay = () => {
    if (!window.speechSynthesis || !utterance) return

    if (isPlaying) {
      window.speechSynthesis.cancel()
      setIsPlaying(false)
    } else {
      window.speechSynthesis.speak(utterance)
      setIsPlaying(true)
    }
  }

  return (
    <div style={{
      background: 'linear-gradient(145deg, #1e293b, #0f172a)',
      border: '1px solid #334155',
      borderRadius: '16px',
      padding: '24px',
      display: 'flex',
      gap: '20px',
      alignItems: 'flex-start',
      marginBottom: '32px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {isPlaying && (
        <style>
          {`
            @keyframes pulse-bar {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(100%); }
            }
          `}
        </style>
      )}
      {isPlaying && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
          background: 'linear-gradient(90deg, transparent, #3b82f6, #8b5cf6, transparent)',
          animation: 'pulse-bar 2s infinite linear'
        }} />
      )}
      
      <div style={{
        background: isPlaying ? 'rgba(59, 130, 246, 0.1)' : '#1e293b',
        border: `2px solid ${isPlaying ? '#3b82f6' : '#475569'}`,
        borderRadius: '50%',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'all 0.3s ease',
        transform: isPlaying ? 'scale(1.05)' : 'scale(1)'
      }}>
        <Bot size={32} color={isPlaying ? '#3b82f6' : '#94a3b8'} />
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '18px' }}>MilvioBot (O Carioca)</h3>
            {isPlaying && <Volume2 size={16} color="#3b82f6" />}
          </div>
          
          <button 
            onClick={togglePlay}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: isPlaying ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
              border: `1px solid ${isPlaying ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
              color: isPlaying ? '#ef4444' : '#3b82f6',
              padding: '6px 16px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px',
              transition: 'all 0.2s ease'
            }}
          >
            {isPlaying ? (
              <><Square size={14} fill="currentColor" /> Parar</>
            ) : (
              <><Play size={14} fill="currentColor" /> Manda a real</>
            )}
          </button>
        </div>

        <div style={{
          background: 'rgba(0,0,0,0.2)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '12px',
          padding: '16px',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute', top: '24px', left: '-8px',
            width: 0, height: 0,
            borderTop: '8px solid transparent',
            borderBottom: '8px solid transparent',
            borderRight: '8px solid rgba(255,255,255,0.05)'
          }} />
          
          <p style={{ 
            margin: 0, color: '#cbd5e1', fontSize: '14px', lineHeight: 1.6, fontStyle: 'italic',
            opacity: isPlaying ? 1 : 0.7, transition: 'opacity 0.3s', whiteSpace: 'pre-wrap'
          }}>
            "Fala tu, Milvio, tranquilidade? Mermão, presta atenção nos números dessa tela. A plataforma manda aquele papo de que tu vai ter 20% de margem, mas isso é caô puro. Sabe quanto de grana tu já sangrou nessa brincadeira? Mais de 360 mil reais foram pro ralo nos últimos anos. Só de incentivo de performance, tu deixou 125 mil na mesa por causa das regras implacáveis de atraso. E no frete, o buraco é pior: tu bancou do teu bolso quase 240 mil reais pra manter os motoboys rodando, porque o Zé só te repassou uma merreca de 77 mil. 
            
Quer uma sugestão de ouro pra sair dessa armadilha? Tu tem dois caminhos: O primeiro é ligar lá e exigir a mudança do teu contrato pro modelo Entregador Autônomo. Assim, o próprio Zé paga o frete direto pro motoboy e assume a bronca da logística. O segundo caminho é repassar esse custo invisível agora mesmo: aumenta a tua taxa de entrega e sobe a margem das cervejas que não são curva A. Ficar do jeito que tá, é trabalhar de graça pra Ambev, parceiro. Pega a visão!"
          </p>
        </div>
      </div>
    </div>
  )
}
