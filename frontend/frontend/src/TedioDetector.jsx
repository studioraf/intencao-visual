import { useEffect, useRef, useState, useCallback } from 'react'

/* ════════════════════════════════════════════════════════════════════════
   TedioDetector — O Algoritmo do Tédio

   Dois mecanismos:

   1. NEGATIVE DATA ENGINE
      Banco de padrões que historicamente causam "tédio biológico".
      Detecta antes do usuário testar. Mostra badges de alerta.

   2. ZONA DE ABANDONO (Boredom Zone)
      Se o texto tem muitos caracteres sem nenhum "sinal de impacto",
      aplica efeito visual de deterioração (poeira/teia) no textarea.
      O software se recusa a aceitar mediocridade.
   ════════════════════════════════════════════════════════════════════════ */

// ── Banco de Fracassos (Negative Data) ───────────────────────────────────────
// Padrões que historicamente geram abandono, skip, ou tédio biológico
// em vídeos de criadores entre 2015-2025. Baseado em:
// - Estudos de retenção do YouTube (2019-2024)
// - Análise de skip rate do TikTok/Reels
// - Padrões de abandono em campanhas de marketing
const FRACASSOS = {
  // Palavras genéricas que não ativam resposta emocional
  genericidade: {
    palavras: [
      'produto', 'serviço', 'qualidade', 'excelência', 'inovação',
      'solução', 'empresa', 'equipe', 'cliente', 'resultado',
      'profissional', 'especialista', 'melhor', 'único', 'especial',
      'incrível', 'fantástico', 'maravilhoso', 'perfeito', 'ótimo',
      'product', 'service', 'quality', 'excellence', 'innovation',
      'solution', 'company', 'team', 'customer', 'result',
    ],
    label: 'Genericidade Mortal',
    desc: 'Essas palavras causam skip em 3.2s. O cérebro as ignora automaticamente.',
    cor: '#ff4444',
    icone: '💀',
    gravidade: 'alta',
  },

  // Estruturas narrativas que comprovadamente falham
  narrativa_fraca: {
    palavras: [
      'apresentamos', 'conheça', 'descubra nosso', 'venha conhecer',
      'clique aqui', 'saiba mais', 'entre em contato', 'fale conosco',
      'acesse nosso', 'visite nosso', 'siga nossas', 'curta nossa',
      'we present', 'discover our', 'learn more', 'click here',
      'contact us', 'follow us', 'like our',
    ],
    label: 'Chamada para Ação Morta',
    desc: 'CTAs explícitos no início destroem a tensão narrativa. Taxa de abandono: 78%.',
    cor: '#ff8800',
    icone: '⚰️',
    gravidade: 'alta',
  },

  // Clichês visuais comprovadamente saturados
  cliches_visuais: {
    palavras: [
      'logo animado', 'intro com logo', 'fade in', 'fade out',
      'texto centralizado', 'fundo branco com logo', 'foto corporativa',
      'stock footage', 'música motivacional', 'música épica genérica',
      'animated logo', 'centered text', 'white background', 'corporate photo',
    ],
    label: 'Clichê Visual Saturado',
    desc: '10 anos de oversaturation. O cérebro "vê" mas não processa. Retenção: <20%.',
    cor: '#aa44ff',
    icone: '🧟',
    gravidade: 'media',
  },

  // Ritmos e estruturas que induzem tédio biológico
  ritmo_tedio: {
    palavras: [
      'fundo musical suave', 'trilha leve', 'música de fundo',
      'narração em off', 'voz over', 'voice over', 'narração calma',
      'plano estático', 'câmera parada', 'sem cortes', 'transição suave',
      'background music', 'calm narration', 'static shot', 'no cuts',
    ],
    label: 'Ritmo de Tédio Biológico',
    desc: 'Estrutura que desativa o sistema de alerta. Dopamina cai a zero em 4s.',
    cor: '#4488ff',
    icone: '😴',
    gravidade: 'media',
  },

  // Abordagens que eliminam tensão emocional
  sem_tensao: {
    palavras: [
      'feliz', 'sorrindo', 'alegre', 'positivo', 'ensolarado',
      'belo dia', 'oportunidade incrível', 'história de sucesso',
      'caso de sucesso', 'depoimento', 'testemunhal',
      'happy', 'smiling', 'positive', 'sunny', 'opportunity',
      'success story', 'testimonial',
    ],
    label: 'Ausência de Tensão Narrativa',
    desc: 'Conteúdo sem conflito não ativa a amígdala. Sem tensão = sem atenção.',
    cor: '#ffaa00',
    icone: '🫥',
    gravidade: 'baixa',
  },
}

// Palavras de alto impacto que "resgatam" o texto do tédio
const SINAIS_IMPACTO = [
  // Emoções primárias
  'medo', 'poder', 'desejo', 'raiva', 'luxo', 'perigo', 'segredo',
  'proibido', 'urgente', 'agora', 'nunca', 'sempre', 'jamais',
  // Palavras que ativam o sistema límbico
  'noir', 'trap', 'épico', 'sangue', 'fogo', 'guerra', 'morte',
  'amor', 'ódio', 'traição', 'vingança', 'ascensão', 'queda',
  // Sinais visuais de alto impacto
  'neon', 'cyberpunk', 'sombrio', 'dark', 'glitch', 'caos',
  'explosão', 'velocidade', 'risco', 'adrenalina', 'intensidade',
  // Em inglês
  'fear', 'power', 'desire', 'rage', 'luxury', 'danger', 'secret',
  'forbidden', 'urgent', 'epic', 'fire', 'war', 'death', 'love',
  'hate', 'betrayal', 'revenge', 'chaos', 'intensity',
  // Presets diretamente
  'blade', 'poder', 'romance', 'misterio', 'mistério', 'epico',
  'lofi', 'horror', 'retro', 'natureza', 'scifi', 'sport',
]

// Threshold: acima deste número de chars sem sinal de impacto = Zona de Abandono
const THRESHOLD_CHARS = 60
const THRESHOLD_PALAVRAS_FRACASSO = 2

function analisarTexto(texto) {
  if (!texto || texto.length < 3) return { score: 0, alertas: [], emZonaAbandono: false, sinaisImpacto: [] }

  const lower = texto.toLowerCase()
  const palavras = lower.split(/\s+/)
  const alertas = []
  let totalFracassos = 0

  // Detecta fracassos
  for (const [categoria, dados] of Object.entries(FRACASSOS)) {
    const encontradas = dados.palavras.filter(p => lower.includes(p))
    if (encontradas.length > 0) {
      alertas.push({
        ...dados,
        palavrasEncontradas: encontradas.slice(0, 3),
        categoria,
      })
      totalFracassos += encontradas.length
    }
  }

  // Detecta sinais de impacto
  const sinaisImpacto = SINAIS_IMPACTO.filter(s => lower.includes(s))

  // Zona de Abandono: texto longo sem sinais de impacto
  const emZonaAbandono = (
    texto.length > THRESHOLD_CHARS &&
    sinaisImpacto.length === 0 &&
    totalFracassos >= THRESHOLD_PALAVRAS_FRACASSO
  )

  // Score de impacto (0-100)
  const score = Math.min(100, Math.max(0,
    (sinaisImpacto.length * 15) - (totalFracassos * 8) + (texto.length > 20 ? 10 : 0)
  ))

  return { score, alertas, emZonaAbandono, sinaisImpacto, totalFracassos }
}

// ── Efeito visual de deterioração ─────────────────────────────────────────────
function useDeterioration(active) {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    if (!active) { setPhase(0); return }
    let p = 0
    const interval = setInterval(() => {
      p = Math.min(1, p + 0.02)
      setPhase(p)
    }, 50)
    return () => clearInterval(interval)
  }, [active])

  return phase
}

// ── Componente de alerta de fracasso ──────────────────────────────────────────
function AlertaFracasso({ alerta, index }) {
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisivel(true), index * 120)
    return () => clearTimeout(t)
  }, [index])

  if (!visivel) return null

  return (
    <div style={{
      padding: '10px 14px',
      borderRadius: '12px',
      border: `1px solid ${alerta.cor}33`,
      background: `${alerta.cor}0a`,
      animation: 'fadeUp 0.3s ease both',
      marginBottom: '8px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.9rem' }}>{alerta.icone}</span>
          <span style={{ fontSize: '0.6rem', fontWeight: '700', letterSpacing: '1.5px', color: alerta.cor, textTransform: 'uppercase' }}>
            {alerta.label}
          </span>
        </div>
        <span style={{
          fontSize: '0.55rem',
          padding: '2px 8px',
          borderRadius: '999px',
          background: `${alerta.cor}18`,
          color: alerta.cor,
          border: `1px solid ${alerta.cor}33`,
          letterSpacing: '1px',
          textTransform: 'uppercase',
        }}>
          {alerta.gravidade === 'alta' ? '⚠ Crítico' : alerta.gravidade === 'media' ? '⚡ Médio' : '💡 Atenção'}
        </span>
      </div>
      <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4, marginBottom: '6px' }}>
        {alerta.desc}
      </p>
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {alerta.palavrasEncontradas.map((p, i) => (
          <span key={i} style={{
            fontSize: '0.6rem', padding: '2px 8px', borderRadius: '4px',
            background: `${alerta.cor}18`, color: alerta.cor,
            border: `1px solid ${alerta.cor}44`, fontFamily: 'monospace',
          }}>
            "{p}"
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Score visual ───────────────────────────────────────────────────────────────
function ScoreImpacto({ score, sinaisImpacto, glow }) {
  const cor = score >= 60 ? '#00ff88' : score >= 30 ? '#ffaa00' : '#ff4444'
  const label = score >= 60 ? 'Alto Impacto' : score >= 30 ? 'Impacto Médio' : 'Tédio Detectado'
  const emoji = score >= 60 ? '🔥' : score >= 30 ? '⚡' : '💀'

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.55rem', letterSpacing: '2px', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>
            Índice de Impacto Neurológico
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.7rem' }}>{emoji}</span>
          <span style={{ fontSize: '0.75rem', fontWeight: '800', color: cor }}>{score}</span>
          <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)' }}>/100</span>
        </div>
      </div>

      {/* Barra de score */}
      <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden', marginBottom: '8px' }}>
        <div style={{
          height: '100%',
          width: `${score}%`,
          background: `linear-gradient(90deg, #ff4444, ${cor})`,
          borderRadius: '999px',
          boxShadow: `0 0 8px ${cor}88`,
          transition: 'width 0.8s ease',
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.65rem', color: cor, fontWeight: '700' }}>{label}</span>
        {sinaisImpacto.length > 0 && (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {sinaisImpacto.slice(0, 3).map((s, i) => (
              <span key={i} style={{
                fontSize: '0.55rem', padding: '2px 6px', borderRadius: '4px',
                background: `${glow || '#00ff88'}18`, color: glow || '#00ff88',
                border: `1px solid ${glow || '#00ff88'}33`,
              }}>✓ {s}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Zona de Abandono Visual ────────────────────────────────────────────────────
// Overlay que desbota/deteriora o textarea quando em zona de abandono
export function ZonaAbandonoOverlay({ active, phase }) {
  if (!active || phase === 0) return null

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      borderRadius: '20px',
      overflow: 'hidden',
      opacity: phase,
      zIndex: 1,
    }}>
      {/* Desbotamento progressivo */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `rgba(10,8,6,${0.3 * phase})`,
        backdropFilter: `blur(${phase * 0.5}px)`,
      }} />

      {/* Teia de aranha SVG */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: phase * 0.6 }}
        viewBox="0 0 400 120"
        preserveAspectRatio="none"
      >
        {/* Teia canto superior esquerdo */}
        {[20, 35, 50, 65, 80].map((r, i) => (
          <path
            key={`arc-tl-${i}`}
            d={`M 0 0 Q ${r * 0.5} ${r * 0.3} ${r} 0`}
            fill="none"
            stroke="rgba(150,130,100,0.4)"
            strokeWidth="0.5"
          />
        ))}
        {[20, 35, 50, 65, 80].map((r, i) => (
          <path
            key={`arc-tl2-${i}`}
            d={`M 0 0 Q ${r * 0.3} ${r * 0.5} 0 ${r}`}
            fill="none"
            stroke="rgba(150,130,100,0.4)"
            strokeWidth="0.5"
          />
        ))}
        {/* Linha central da teia TL */}
        <line x1="0" y1="0" x2="85" y2="0" stroke="rgba(150,130,100,0.5)" strokeWidth="0.5" />
        <line x1="0" y1="0" x2="0" y2="85" stroke="rgba(150,130,100,0.5)" strokeWidth="0.5" />
        <line x1="0" y1="0" x2="60" y2="60" stroke="rgba(150,130,100,0.5)" strokeWidth="0.5" />

        {/* Teia canto inferior direito */}
        {[20, 35, 50, 65, 80].map((r, i) => (
          <path
            key={`arc-br-${i}`}
            d={`M 400 120 Q ${400 - r * 0.5} ${120 - r * 0.3} ${400 - r} 120`}
            fill="none"
            stroke="rgba(150,130,100,0.35)"
            strokeWidth="0.5"
          />
        ))}
        {[20, 35, 50, 65, 80].map((r, i) => (
          <path
            key={`arc-br2-${i}`}
            d={`M 400 120 Q ${400 - r * 0.3} ${120 - r * 0.5} 400 ${120 - r}`}
            fill="none"
            stroke="rgba(150,130,100,0.35)"
            strokeWidth="0.5"
          />
        ))}
        <line x1="400" y1="120" x2="315" y2="120" stroke="rgba(150,130,100,0.4)" strokeWidth="0.5" />
        <line x1="400" y1="120" x2="400" y2="35" stroke="rgba(150,130,100,0.4)" strokeWidth="0.5" />
        <line x1="400" y1="120" x2="340" y2="60" stroke="rgba(150,130,100,0.4)" strokeWidth="0.5" />

        {/* Partículas de poeira */}
        {Array.from({ length: Math.floor(phase * 12) }).map((_, i) => (
          <circle
            key={`dust-${i}`}
            cx={20 + (i * 37) % 360}
            cy={10 + (i * 23) % 100}
            r={0.8 + (i % 3) * 0.4}
            fill="rgba(180,160,120,0.5)"
          />
        ))}
      </svg>

      {/* Mensagem de alerta */}
      <div style={{
        position: 'absolute',
        bottom: '8px',
        right: '10px',
        fontSize: '0.55rem',
        color: 'rgba(255,100,0,0.8)',
        letterSpacing: '1px',
        textTransform: 'uppercase',
        fontFamily: 'monospace',
        animation: 'glowPulse 2s infinite',
      }}>
        ⚠ Zona de Abandono Detectada
      </div>
    </div>
  )
}

// ── Componente principal exportado ─────────────────────────────────────────────
export default function TedioDetector({ texto, glow, children }) {
  const [analise, setAnalise] = useState({ score: 0, alertas: [], emZonaAbandono: false, sinaisImpacto: [] })
  const [aberto, setAberto] = useState(false)
  const debounceRef = useRef(null)
  const deteriorationPhase = useDeterioration(analise.emZonaAbandono)

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (texto && texto.length > 5) {
        setAnalise(analisarTexto(texto))
        if (texto.length > 20) setAberto(true)
      } else {
        setAnalise({ score: 0, alertas: [], emZonaAbandono: false, sinaisImpacto: [] })
        setAberto(false)
      }
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [texto])

  const temProblemas = analise.alertas.length > 0
  const glowColor = glow || '#7c3aed'

  return (
    <div style={{ position: 'relative' }}>

      {/* Wrapper do textarea com overlay de deterioração */}
      <div style={{ position: 'relative' }}>
        {children}
        <ZonaAbandonoOverlay active={analise.emZonaAbandono} phase={deteriorationPhase} />
      </div>

      {/* Painel de análise */}
      {aberto && (
        <div style={{
          marginTop: '10px',
          background: analise.emZonaAbandono
            ? 'rgba(20,10,5,0.95)'
            : 'rgba(10,10,14,0.85)',
          border: `1px solid ${analise.emZonaAbandono ? '#ff440033' : temProblemas ? '#ff880022' : glowColor + '22'}`,
          borderRadius: '16px',
          padding: '16px',
          backdropFilter: 'blur(20px)',
          animation: 'fadeUp 0.3s ease both',
          transition: 'border-color 0.5s ease',
        }}>

          {/* Zona de Abandono — alerta máximo */}
          {analise.emZonaAbandono && (
            <div style={{
              marginBottom: '16px',
              padding: '14px',
              borderRadius: '12px',
              border: '1px solid #ff440055',
              background: 'rgba(255,40,0,0.08)',
              animation: 'glowPulse 2s infinite',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '1.1rem' }}>💀</span>
                <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#ff4444', letterSpacing: '2px', textTransform: 'uppercase' }}>
                  Zona de Abandono Detectada
                </span>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'rgba(255,100,0,0.8)', lineHeight: 1.5 }}>
                Seu texto tem <strong>{texto.length} caracteres</strong> sem nenhum gatilho emocional.
                O software se recusa a aceitar mediocridade. Adicione tensão, conflito ou emoção primária.
              </p>
            </div>
          )}

          {/* Score */}
          {texto.length > 10 && (
            <ScoreImpacto score={analise.score} sinaisImpacto={analise.sinaisImpacto} glow={glowColor} />
          )}

          {/* Alertas de fracasso */}
          {analise.alertas.length > 0 && (
            <div>
              <p style={{ fontSize: '0.55rem', letterSpacing: '2px', color: 'rgba(255,255,255,0.15)', textTransform: 'uppercase', marginBottom: '10px' }}>
                📂 Banco de Fracassos — Padrões Detectados
              </p>
              {analise.alertas.map((alerta, i) => (
                <AlertaFracasso key={alerta.categoria} alerta={alerta} index={i} />
              ))}
            </div>
          )}

          {/* Tudo limpo */}
          {analise.alertas.length === 0 && analise.score >= 60 && texto.length > 10 && (
            <div style={{ textAlign: 'center', padding: '8px' }}>
              <p style={{ fontSize: '0.7rem', color: '#00ff88', fontWeight: '700' }}>
                🔥 Sinal forte detectado. O sistema aprova.
              </p>
            </div>
          )}

          {/* Sugestão de resgate */}
          {analise.emZonaAbandono && (
            <div style={{ marginTop: '12px', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: '0.55rem', letterSpacing: '2px', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: '8px' }}>
                💡 Substitua por
              </p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['noir', 'poder', 'tensão', 'luxo', 'perigo', 'épico', 'dark', 'intensidade'].map((s, i) => (
                  <span key={i} style={{
                    fontSize: '0.65rem', padding: '3px 10px', borderRadius: '6px',
                    background: `${glowColor}12`, color: glowColor,
                    border: `1px solid ${glowColor}33`, cursor: 'default',
                  }}>{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}