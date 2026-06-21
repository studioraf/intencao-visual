import { useState, useEffect, useRef } from 'react'
import * as Tone from 'tone'
import { useT, detectLang } from './i18n'
import MiniPlayer3D from './MiniPlayer3D'
import ExportCard from './ExportCard'

const API = 'https://intencao-visual-production.up.railway.app'

function useAuth() {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('token')
    const nome = localStorage.getItem('nome')
    return token ? { token, nome } : null
  })
  function login(token, nome) {
    localStorage.setItem('token', token)
    localStorage.setItem('nome', nome)
    setUser({ token, nome })
  }
  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('nome')
    setUser(null)
  }
  return { user, login, logout }
}

function ParticleField({ color = '#7c3aed', count = 60 }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let w = canvas.width = window.innerWidth
    let h = canvas.height = window.innerHeight
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.5 + 0.5, alpha: Math.random() * 0.5 + 0.1,
    }))
    let raf
    function draw() {
      ctx.clearRect(0, 0, w, h)
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = color + Math.floor(p.alpha * 255).toString(16).padStart(2, '0')
        ctx.fill()
      })
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = color + Math.floor((1 - dist / 120) * 40).toString(16).padStart(2, '0')
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    const resize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight }
    window.addEventListener('resize', resize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [color, count])
  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />
}

function OrbField() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: '600px', height: '600px', borderRadius: '50%', left: '-100px', top: '-100px', background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)', animation: 'orbFloat1 12s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', width: '500px', height: '500px', borderRadius: '50%', right: '-80px', top: '30%', background: 'radial-gradient(circle, rgba(233,69,96,0.12) 0%, transparent 70%)', animation: 'orbFloat2 15s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', width: '400px', height: '400px', borderRadius: '50%', left: '30%', bottom: '-100px', background: 'radial-gradient(circle, rgba(0,255,247,0.08) 0%, transparent 70%)', animation: 'orbFloat3 10s ease-in-out infinite' }} />
      <style>{`
        @keyframes orbFloat1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(80px,60px) scale(1.1)} }
        @keyframes orbFloat2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-60px,80px) scale(0.9)} }
        @keyframes orbFloat3 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(40px,-60px) scale(1.15)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(-20px)} to{opacity:1;transform:translateX(0)} }
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(124,58,237,0.4)} 50%{box-shadow:0 0 0 12px rgba(124,58,237,0)} }
        @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes tiltIn { from{opacity:0;transform:perspective(800px) rotateX(20deg) translateY(40px)} to{opacity:1;transform:perspective(800px) rotateX(0deg) translateY(0)} }
        @keyframes glowPulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes glitchA { 0%,94%,100%{opacity:0;transform:none} 95%{opacity:0.8;transform:translateX(-3px) skewX(-5deg)} 97%{opacity:0.6;transform:translateX(3px) skewX(3deg)} 99%{opacity:0;transform:none} }
        @keyframes scanline { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
        @keyframes colorShift { 0%{filter:hue-rotate(0deg)} 100%{filter:hue-rotate(360deg)} }
        @keyframes cameraMove { 0%{transform:scale(1) translate(0,0)} 25%{transform:scale(1.05) translate(-2%,-1%)} 50%{transform:scale(1.08) translate(1%,2%)} 75%{transform:scale(1.03) translate(2%,-2%)} 100%{transform:scale(1) translate(0,0)} }
        @keyframes flashCut { 0%,90%{opacity:1} 91%,95%{opacity:0} 96%,100%{opacity:1} }
        @keyframes bokeh { 0%,100%{filter:blur(8px) brightness(1.2)} 50%{filter:blur(12px) brightness(1.5)} }
        @keyframes neonFlicker { 0%,100%{opacity:1} 92%{opacity:1} 93%{opacity:0.4} 94%{opacity:1} 97%{opacity:0.6} 98%{opacity:1} }
        @keyframes filmGrain { 0%{opacity:0.03} 50%{opacity:0.08} 100%{opacity:0.03} }
        @keyframes previewSlide { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
      `}</style>
    </div>
  )
}

function TiltCard({ children, style, glowColor = '#7c3aed' }) {
  const ref = useRef(null)
  function handleMove(e) {
    const el = ref.current
    const rect = el.getBoundingClientRect()
    const rx = ((e.clientY - rect.top) / rect.height - 0.5) * -16
    const ry = ((e.clientX - rect.left) / rect.width - 0.5) * 16
    el.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.02)`
    el.style.boxShadow = `0 20px 60px ${glowColor}33`
  }
  function handleLeave() {
    const el = ref.current
    el.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)'
    el.style.boxShadow = '0 4px 24px rgba(0,0,0,0.3)'
  }
  return (
    <div ref={ref} onMouseMove={handleMove} onMouseLeave={handleLeave}
      style={{ transition: 'transform 0.15s ease, box-shadow 0.15s ease', willChange: 'transform', ...style }}>
      {children}
    </div>
  )
}

function GlitchText({ text, style }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block', ...style }}>
      {text}
      <span style={{ position: 'absolute', inset: 0, color: '#00fff7', opacity: 0, animation: 'glitchA 4s infinite', clipPath: 'inset(40% 0 50% 0)' }}>{text}</span>
    </span>
  )
}

// ── Pré-visualização interativa em tempo real ─────────────────────────────────

// ── Base de neurocinematografia por preset ────────────────────────────────────
const NEURO_DATA = {
  'Cyberpunk': {
    cerebro: 'Córtex pré-frontal + Amígdala',
    reacao: 'Hipervigilância e desorientação controlada',
    gatilho: 'Luz estroboscópica e cortes rápidos ativam o sistema de alerta primitivo',
    janela: '0–2s',
    retencao: '89%',
    hormonio: 'Adrenalina + Cortisol',
    tecnica: 'Sobrecarga sensorial calibrada — o espectador não consegue desviar os olhos',
  },
  'Luxo Cinematográfico': {
    cerebro: 'Núcleo Accumbens + Córtex Orbito-frontal',
    reacao: 'Ativação do circuito de recompensa e status social',
    gatilho: 'Ângulo baixo + luz dourada ativam percepção de hierarquia e poder',
    janela: '0–3s',
    retencao: '94%',
    hormonio: 'Dopamina + Testosterona',
    tecnica: 'Sinalização de prestígio — o cérebro interpreta automaticamente como objeto de desejo',
  },
  'Romance Etéreo': {
    cerebro: 'Hipotálamo + Ínsula',
    reacao: 'Liberação de oxitocina e empatia visceral',
    gatilho: 'Bokeh profundo e ritmo lento sincronizam com estado de conexão emocional',
    janela: '3–8s',
    retencao: '91%',
    hormonio: 'Oxitocina + Serotonina',
    tecnica: 'Espelhamento emocional — o espectador sente o que o personagem sente',
  },
  'Noir Contemporâneo': {
    cerebro: 'Amígdala + Hipocampo',
    reacao: 'Antecipação ansiosa e fascinação pelo perigo',
    gatilho: 'Sombra absoluta ativa instinto de vigilância — o invisível é mais aterrorizante que o visível',
    janela: '1–4s',
    retencao: '87%',
    hormonio: 'Cortisol + Norepinefrina',
    tecnica: 'Tensão por ausência — o que não é mostrado cria mais suspense que o que é',
  },
  'Épico Cinematográfico': {
    cerebro: 'Córtex Pré-frontal Medial + Cerebelo',
    reacao: 'Senso de grandiosidade e pertencimento a algo maior',
    gatilho: 'Grande angular + orquestra ativam resposta de admiração (awe response)',
    janela: '2–5s',
    retencao: '96%',
    hormonio: 'Adrenalina + Dopamina',
    tecnica: 'Escala humana vs. cosmos — o espectador sente a própria pequenez de forma prazerosa',
  },
  'Minimalismo Moderno': {
    cerebro: 'Córtex Pré-frontal Dorsolateral',
    reacao: 'Redução de carga cognitiva e confiança aumentada',
    gatilho: 'Espaço negativo libera recursos cognitivos, o cérebro interpreta como competência e controle',
    janela: '0–1s',
    retencao: '82%',
    hormonio: 'Serotonina',
    tecnica: 'Princípio da fluência — quanto mais fácil de processar, mais confiável parece',
  },
}

function getNeuroPorNome(nome) {
  return NEURO_DATA[nome] || {
    cerebro: 'Sistema Límbico + Córtex Visual',
    reacao: 'Resposta emocional calibrada ao estilo',
    gatilho: 'Combinação de cor, ritmo e composição ativa resposta emocional específica',
    janela: '1–4s',
    retencao: '85%',
    hormonio: 'Dopamina',
    tecnica: 'Linguagem visual neurológica — cada elemento foi escolhido para ativar uma emoção específica',
  }
}

// ── Aha Momento #2 — Efeito Psicológico ───────────────────────────────────────
function EfeitoPsicologico({ preset, glow }) {
  const [visivel, setVisivel] = useState(false)
  const [digitando, setDigitando] = useState(true)
  const neuro = getNeuroPorNome(preset.nome)

  // Simula "digitação" do texto para criar suspense
  const textoCompleto = neuro.tecnica
  const [textoAtual, setTextoAtual] = useState('')
  useEffect(() => {
    setVisivel(false)
    setDigitando(true)
    setTextoAtual('')
    const timer = setTimeout(() => setVisivel(true), 200)
    return () => clearTimeout(timer)
  }, [preset.nome])

  useEffect(() => {
    if (!visivel) return
    let i = 0
    const interval = setInterval(() => {
      if (i <= textoCompleto.length) {
        setTextoAtual(textoCompleto.slice(0, i))
        i++
      } else {
        setDigitando(false)
        clearInterval(interval)
      }
    }, 18)
    return () => clearInterval(interval)
  }, [visivel, textoCompleto])

  if (!visivel) return null

  return (
    <div style={{ animation: 'fadeUp 0.6s ease both' }}>
      {/* Header impactante */}
      <div style={{ textAlign: 'center', padding: '28px 24px 20px', borderBottom: `1px solid ${glow}18` }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: `${glow}12`, border: `1px solid ${glow}44`, borderRadius: '999px', padding: '5px 16px', marginBottom: '16px' }}>
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: glow, animation: 'glowPulse 1.5s infinite' }} />
          <span style={{ fontSize: '0.6rem', letterSpacing: '2px', color: glow, textTransform: 'uppercase', fontWeight: '700' }}>Análise Neurocinematográfica</span>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, fontStyle: 'italic' }}>
          "{textoAtual}<span style={{ opacity: digitando ? 1 : 0, color: glow }}>|</span>"
        </p>
      </div>

      {/* Grid de dados neurológicos */}
      <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {[
          { icon: '🧠', label: 'Área Ativada', valor: neuro.cerebro },
          { icon: '⚡', label: 'Reação', valor: neuro.reacao },
          { icon: '🧪', label: 'Hormônio', valor: neuro.hormonio },
          { icon: '⏱', label: 'Janela de Impacto', valor: neuro.janela },
        ].map(item => (
          <div key={item.label} style={{ background: `${glow}08`, border: `1px solid ${glow}18`, borderRadius: '14px', padding: '14px' }}>
            <p style={{ fontSize: '0.55rem', letterSpacing: '2px', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: '6px' }}>{item.icon} {item.label}</p>
            <p style={{ fontSize: '0.78rem', color: '#e2e8f0', fontWeight: '600', lineHeight: 1.3 }}>{item.valor}</p>
          </div>
        ))}
      </div>

      {/* Barra de retenção */}
      <div style={{ padding: '0 24px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <p style={{ fontSize: '0.6rem', letterSpacing: '2px', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>📊 Taxa de Retenção de Atenção</p>
          <p style={{ fontSize: '0.9rem', fontWeight: '900', color: glow }}>{neuro.retencao}</p>
        </div>
        <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: neuro.retencao, background: `linear-gradient(90deg, ${glow}, #e94560)`, borderRadius: '999px', boxShadow: `0 0 12px ${glow}88`, transition: 'width 1.5s ease' }} />
        </div>
      </div>

      {/* Gatilho */}
      <div style={{ margin: '0 24px 24px', padding: '14px 18px', background: `${glow}0a`, border: `1px solid ${glow}22`, borderRadius: '14px' }}>
        <p style={{ fontSize: '0.55rem', letterSpacing: '2px', color: glow, textTransform: 'uppercase', marginBottom: '6px', fontWeight: '700' }}>🎯 Gatilho Principal</p>
        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{neuro.gatilho}</p>
      </div>
    </div>
  )
}

// ── Aha Momento #1 — Contador de palavras-chave detectadas ────────────────────
function ContadorDeteccao({ emocao, preset, glow }) {
  const [palavrasDetectadas, setPalavrasDetectadas] = useState([])
  const [animando, setAnimando] = useState(false)

  useEffect(() => {
    if (!emocao || emocao.length < 3 || !preset) { setPalavrasDetectadas([]); return }
    const lower = emocao.toLowerCase()
    const detectadas = preset.keywords.filter(k => lower.includes(k))
    if (detectadas.length !== palavrasDetectadas.length) {
      setAnimando(true)
      setPalavrasDetectadas(detectadas)
      setTimeout(() => setAnimando(false), 600)
    }
  }, [emocao, preset])

  if (!preset || palavrasDetectadas.length === 0) return null

  return (
    <div style={{ marginBottom: '16px', animation: animando ? 'fadeUp 0.4s ease both' : 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.55rem', letterSpacing: '2px', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>🧬 Sinal detectado:</span>
        {palavrasDetectadas.map((p, i) => (
          <span key={i} style={{ padding: '3px 10px', borderRadius: '999px', background: `${glow}18`, border: `1px solid ${glow}44`, color: glow, fontSize: '0.7rem', fontWeight: '700', animation: 'fadeUp 0.3s ease both', animationDelay: `${i * 0.08}s` }}>
            {p}
          </span>
        ))}
        <span style={{ fontSize: '0.65rem', color: glow, fontWeight: '700' }}>→ {preset.nome}</span>
      </div>
    </div>
  )
}

// ── Templates sugeridos ────────────────────────────────────────────────────────
const TEMPLATES = [
  { label: '⚡ Trap luxuoso', prompt: 'clipe estilo trap luxo cartier poder status', preset: 'poder' },
  { label: '🌙 Noir misterioso', prompt: 'suspense dark noir thriller crime sombrio', preset: 'misterio' },
  { label: '💜 Cyberpunk', prompt: 'cyberpunk neon futurista tech glitch matrix', preset: 'blade' },
  { label: '🌹 Romance', prompt: 'romance amor suave intimidade saudade delicado', preset: 'romance' },
  { label: '⚔️ Épico', prompt: 'épico guerra herói grandioso batalha destino', preset: 'epico' },
  { label: '◻ Minimalista', prompt: 'minimalista clean moderno elegante simples', preset: 'minimalista' },
]

// ── Feedback emocional ─────────────────────────────────────────────────────────
function FeedbackEmocional({ glow, kitId, token }) {
  const [nota, setNota] = useState(null)
  const [enviado, setEnviado] = useState(false)
  const emojis = ['😕', '😐', '🙂', '😊', '🔥']

  async function enviar(n) {
    setNota(n)
    setEnviado(true)
    // Futuramente salvar no backend
  }

  if (enviado) return (
    <div style={{ textAlign: 'center', padding: '16px', color: glow, fontSize: '0.85rem', fontWeight: '700' }}>
      ✓ Obrigado pelo feedback!
    </div>
  )

  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <p style={{ fontSize: '0.6rem', letterSpacing: '3px', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: '14px' }}>
        🎯 Esse kit capturou sua emoção?
      </p>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        {emojis.map((e, i) => (
          <button key={i} onClick={() => enviar(i + 1)}
            style={{ fontSize: '1.5rem', background: nota === i + 1 ? `${glow}22` : 'transparent', border: `1px solid ${nota === i + 1 ? glow : 'rgba(255,255,255,0.1)'}`, borderRadius: '12px', padding: '8px 12px', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >{e}</button>
        ))}
      </div>
    </div>
  )
}

// ── Múltiplas variações ────────────────────────────────────────────────────────
function VariacoesKit({ emocao, formato, onSelecionar, glow }) {
  const lower = emocao.toLowerCase()
  const matches = Object.values(PRESETS).filter(p =>
    p.keywords.some(k => lower.includes(k))
  ).slice(0, 3)

  // Se não achou nada, não mostra
  if (matches.length < 2) return null

  return (
    <div style={{ marginBottom: '20px', animation: 'fadeUp 0.4s ease both' }}>
      <p style={{ fontSize: '0.6rem', letterSpacing: '3px', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: '12px' }}>
        🎨 Variações detectadas — escolha uma:
      </p>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {matches.map((p, i) => (
          <button key={i} onClick={() => onSelecionar(p)}
            style={{ padding: '10px 18px', borderRadius: '999px', border: `1px solid ${p.glow}44`, background: `${p.glow}12`, color: p.glow, fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '1px' }}
            onMouseEnter={e => { e.currentTarget.style.background = `${p.glow}28`; e.currentTarget.style.transform = 'scale(1.05)' }}
            onMouseLeave={e => { e.currentTarget.style.background = `${p.glow}12`; e.currentTarget.style.transform = 'scale(1)' }}
          >
            {p.nome}
          </button>
        ))}
      </div>
    </div>
  )
}

function ShareToast({ url, onClose }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div style={{ position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, animation: 'fadeUp 0.4s ease both', background: 'rgba(10,10,20,0.95)', border: '1px solid rgba(124,58,237,0.4)', borderRadius: '20px', padding: '20px 24px', backdropFilter: 'blur(20px)', minWidth: '320px', maxWidth: '480px', boxShadow: '0 0 60px rgba(124,58,237,0.3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <p style={{ fontSize: '0.75rem', color: '#a78bfa', fontWeight: '700', letterSpacing: '2px', textTransform: 'uppercase' }}>🔗 Link gerado!</p>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '10px 14px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</div>
        <button onClick={copy} style={{ padding: '10px 16px', borderRadius: '10px', border: 'none', background: copied ? 'rgba(0,255,150,0.2)' : 'linear-gradient(135deg, #7c3aed, #e94560)', color: '#fff', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          {copied ? '✓ Copiado!' : 'Copiar'}
        </button>
      </div>
      <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', marginTop: '10px' }}>Qualquer pessoa com este link pode ver seu kit</p>
    </div>
  )
}

function PaginaKitPublico({ shareId }) {
  const [kit, setKit] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)
  useEffect(() => {
    fetch(`${API}/kit/${shareId}`)
      .then(r => r.json())
      .then(data => { setKit(data); setLoading(false) })
      .catch(() => { setErro(true); setLoading(false) })
  }, [shareId])
  const CORES = {
    'Cyberpunk': '#00fff7',
    'Luxo Cinematográfico': '#C8860A',
    'Romance Etéreo': '#FF6B9D',
    'Noir Contemporâneo': '#6a6aaa',
    'Épico Cinematográfico': '#DAA520',
    'Minimalismo Moderno': '#ffffff',
  }
  const glow = kit ? (CORES[kit.estilo] || '#7c3aed') : '#7c3aed'
  if (loading) return <div style={{ minHeight: '100vh', background: '#050508', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><OrbField /><p style={{ color: 'rgba(255,255,255,0.4)', position: 'relative', zIndex: 2 }}>Carregando...</p></div>
  if (erro || !kit) return (
    <div style={{ minHeight: '100vh', background: '#050508', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
      <OrbField />
      <p style={{ color: '#e94560', fontSize: '1.2rem', position: 'relative', zIndex: 2 }}>Kit não encontrado</p>
      <button onClick={() => window.location.href = '/'} style={{ padding: '12px 28px', borderRadius: '999px', border: 'none', background: 'linear-gradient(135deg, #7c3aed, #e94560)', color: '#fff', cursor: 'pointer', fontWeight: '700', position: 'relative', zIndex: 2 }}>Criar meu kit</button>
    </div>
  )
  return (
    <div style={{ minHeight: '100vh', background: '#050508', color: '#fff', fontFamily: "'Segoe UI', sans-serif" }}>
      <OrbField /><ParticleField color={glow} count={40} />
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '60px 28px', position: 'relative', zIndex: 2 }}>
        <div style={{ textAlign: 'center', marginBottom: '48px', animation: 'fadeUp 0.6s ease both' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(233,69,96,0.08)', border: '1px solid rgba(233,69,96,0.2)', borderRadius: '999px', padding: '6px 20px', fontSize: '0.65rem', letterSpacing: '3px', color: '#e94560', textTransform: 'uppercase', marginBottom: '20px' }}>Kit de Intenção Visual</div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '900', background: `linear-gradient(135deg, #fff, ${glow})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '8px' }}>{kit.estilo}</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>"{kit.emocao_input}"</p>
        </div>
        <TiltCard glowColor={glow} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${glow}22`, borderRadius: '24px', padding: '24px', marginBottom: '14px' }}>
          <p style={{ fontSize: '0.55rem', letterSpacing: '3px', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: '16px' }}>Paleta de Cores</p>
          <div style={{ display: 'flex', gap: '10px' }}>
            {kit.paleta.map(cor => (
              <div key={cor} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                <div style={{ width: '100%', height: '54px', borderRadius: '14px', background: cor, boxShadow: `0 8px 24px ${cor}55` }} />
                <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.2)' }}>{cor}</span>
              </div>
            ))}
          </div>
        </TiltCard>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
          {[['BPM', kit.bpm], ['Ritmo', kit.ritmo], ['Tipografia', kit.tipografia], ['Iluminação', kit.iluminacao], ['Enquadramento', kit.enquadramento], ['Formato', kit.formato]].map(([label, valor]) => (
            <TiltCard key={label} glowColor={glow} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${glow}14`, borderRadius: '18px', padding: '18px' }}>
              <p style={{ fontSize: '0.55rem', letterSpacing: '2px', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: '6px' }}>{label}</p>
              <p style={{ fontSize: '0.88rem', color: '#e2e8f0', fontWeight: '600' }}>{valor}</p>
            </TiltCard>
          ))}
        </div>
        <div style={{ textAlign: 'center', padding: '40px', background: `${glow}08`, border: `1px solid ${glow}22`, borderRadius: '24px' }}>
          <p style={{ fontSize: '0.7rem', letterSpacing: '3px', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: '12px' }}>Gerado com</p>
          <p style={{ fontSize: '1.2rem', fontWeight: '900', color: glow, marginBottom: '8px', textShadow: `0 0 20px ${glow}` }}>Kit de Intenção Visual</p>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', marginBottom: '24px' }}>Neurocinematografia para criadores de vídeo</p>
          <button onClick={() => window.location.href = '/'}
            style={{ padding: '14px 36px', borderRadius: '999px', border: 'none', background: 'linear-gradient(135deg, #7c3aed, #e94560)', color: '#fff', fontSize: '0.9rem', fontWeight: '700', cursor: 'pointer', letterSpacing: '2px', textTransform: 'uppercase', boxShadow: '0 0 40px rgba(124,58,237,0.4)' }}
            onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.target.style.transform = 'scale(1)'}
          >Criar meu kit grátis →</button>
        </div>
      </div>
    </div>
  )
}

function TelaLanding({ onEntrar }) {
  const t = useT()
  const isRTL = detectLang() === 'ar'
  const estilos = [
    { nome: 'Luxo Cinematográfico', emocao: 'Poder · Status · Inevitabilidade', cor: '#C8860A', bg: '#1a0800', icon: '◈' },
    { nome: 'Cyberpunk', emocao: 'Tensão · Adrenalina · Desorientação', cor: '#00fff7', bg: '#0d1f3c', icon: '◆' },
    { nome: 'Romance Etéreo', emocao: 'Nostalgia · Vulnerabilidade · Conexão', cor: '#FF6B9D', bg: '#2d0020', icon: '◉' },
    { nome: 'Noir Contemporâneo', emocao: 'Ansiedade · Fascínio · Perigo', cor: '#6a6aaa', bg: '#0a0a1a', icon: '▣' },
    { nome: 'Épico Cinematográfico', emocao: 'Grandiosidade · Sacrifício · Destino', cor: '#DAA520', bg: '#1a0800', icon: '◈' },
    { nome: 'Minimalismo Moderno', emocao: 'Clareza · Confiança · Sofisticação', cor: '#ffffff', bg: '#111111', icon: '□' },
  ]
  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: '#050508', color: '#fff', fontFamily: "'Segoe UI', sans-serif", overflowX: 'hidden' }}>
      <OrbField /><ParticleField color="#7c3aed" count={50} />
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '20px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(5,5,8,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #7c3aed, #e94560)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>◈</div>
          <div>
            <div style={{ fontSize: '0.6rem', letterSpacing: '3px', color: '#e94560', textTransform: 'uppercase' }}>{t.badge}</div>
            <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#fff' }}>Kit de Intenção Visual</div>
          </div>
        </div>
        <button onClick={onEntrar} style={{ padding: '10px 28px', borderRadius: '999px', border: '1px solid rgba(124,58,237,0.5)', background: 'rgba(124,58,237,0.1)', color: '#a78bfa', fontSize: '0.85rem', cursor: 'pointer' }}>{t.enter}</button>
      </nav>
      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 32px 80px', textAlign: 'center', position: 'relative', zIndex: 2 }}>
        <div style={{ animation: 'fadeUp 1s ease both', marginBottom: '24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(233,69,96,0.08)', border: '1px solid rgba(233,69,96,0.2)', borderRadius: '999px', padding: '6px 20px', fontSize: '0.7rem', letterSpacing: '3px', color: '#e94560', textTransform: 'uppercase' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#e94560', animation: 'glowPulse 2s infinite' }} />{t.tagline}
          </div>
        </div>
        <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', fontWeight: '900', lineHeight: 1.05, margin: '0 0 32px', maxWidth: '800px', animation: 'fadeUp 1s ease both', animationDelay: '0.4s' }}>
          <GlitchText text={t.hero1} style={{ background: 'linear-gradient(135deg, #fff 0%, #c4b5fd 40%, #e94560 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }} />
          <br /><span style={{ color: 'rgba(255,255,255,0.9)' }}>{t.hero2}</span>
          <br /><span style={{ background: 'linear-gradient(135deg, #7c3aed, #00fff7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t.hero3}</span>
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.1rem', maxWidth: '520px', margin: '0 auto 56px', lineHeight: 1.7, animation: 'fadeUp 1s ease both', animationDelay: '0.6s' }}>{t.heroDesc}</p>
        <button onClick={onEntrar} style={{ padding: '18px 52px', borderRadius: '999px', border: 'none', background: 'linear-gradient(135deg, #7c3aed, #e94560)', color: '#fff', fontSize: '1rem', fontWeight: '700', letterSpacing: '2px', cursor: 'pointer', textTransform: 'uppercase', boxShadow: '0 0 60px rgba(124,58,237,0.4)', animation: 'pulse 3s infinite' }}
          onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
          onMouseLeave={e => e.target.style.transform = 'scale(1)'}
        >{t.startFree}</button>
        <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.75rem', marginTop: '20px' }}>{t.noCard}</p>
      </section>
      <section style={{ padding: '80px 32px 120px', maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '900', color: '#fff' }}>{t.stylesTitle}</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {estilos.map((e, i) => (
            <TiltCard key={e.nome} glowColor={e.cor} style={{ background: `linear-gradient(135deg, ${e.bg}, rgba(0,0,0,0.8))`, border: `1px solid ${e.cor}22`, borderRadius: '24px', padding: '28px', cursor: 'pointer' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${e.cor}22`, border: `1px solid ${e.cor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: e.cor, marginBottom: '16px' }}>{e.icon}</div>
              <p style={{ fontSize: '1rem', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>{e.nome}</p>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>{e.emocao}</p>
            </TiltCard>
          ))}
        </div>
      </section>
      <footer style={{ textAlign: 'center', padding: '32px', borderTop: '1px solid rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.15)', fontSize: '0.75rem', position: 'relative', zIndex: 2 }}>{t.footer}</footer>
    </div>
  )
}

function TelaAuth({ onLogin }) {
  const t = useT()
  const [modo, setModo] = useState('login')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const inp = { width: '100%', background: 'rgba(255,255,255,0.04)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '15px 18px', fontSize: '0.95rem', marginBottom: '12px', boxSizing: 'border-box', outline: 'none' }
  async function submeter() {
    setLoading(true); setErro('')
    try {
      const url = modo === 'login' ? `${API}/login` : `${API}/cadastro`
      const body = modo === 'login' ? { email, senha } : { nome, email, senha }
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) { setErro(data.detail || 'Erro'); setLoading(false); return }
      onLogin(data.token, data.nome)
    } catch { setErro(t.connectionError) }
    setLoading(false)
  }
  return (
    <div style={{ minHeight: '100vh', background: '#050508', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI', sans-serif" }}>
      <OrbField /><ParticleField color="#7c3aed" count={30} />
      <div style={{ width: '100%', maxWidth: '420px', padding: '0 24px', position: 'relative', zIndex: 2, animation: 'tiltIn 0.8s ease both' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #7c3aed, #e94560)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>◈</div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', background: 'linear-gradient(135deg, #fff, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '8px' }}>Kit de Intenção Visual</h1>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>{modo === 'login' ? t.loginTitle : t.registerTitle}</p>
        </div>
        <TiltCard glowColor="#7c3aed" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '28px', padding: '36px', backdropFilter: 'blur(20px)' }}>
          {modo === 'cadastro' && <input value={nome} onChange={e => setNome(e.target.value)} placeholder={t.namePlaceholder} style={inp} />}
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder={t.emailPlaceholder} type="email" style={inp} />
          <input value={senha} onChange={e => setSenha(e.target.value)} placeholder={t.passwordPlaceholder} type="password" style={{ ...inp, marginBottom: '20px' }} />
          {erro && <p style={{ color: '#e94560', fontSize: '0.8rem', marginBottom: '12px', textAlign: 'center' }}>{erro}</p>}
          <button onClick={submeter} disabled={loading} style={{ width: '100%', padding: '16px', borderRadius: '999px', border: 'none', background: loading ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #7c3aed, #e94560)', color: loading ? 'rgba(255,255,255,0.3)' : '#fff', fontSize: '0.95rem', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', textTransform: 'uppercase' }}>
            {loading ? t.loading : modo === 'login' ? t.loginBtn : t.registerBtn}
          </button>
          <p style={{ textAlign: 'center', marginTop: '20px', color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem' }}>
            {modo === 'login' ? t.noAccount : t.hasAccount}{' '}
            <span onClick={() => setModo(modo === 'login' ? 'cadastro' : 'login')} style={{ color: '#a78bfa', cursor: 'pointer', fontWeight: '600' }}>{modo === 'login' ? t.signUp : t.signIn}</span>
          </p>
        </TiltCard>
      </div>
    </div>
  )
}

const PRESETS = {
  blade: { keywords: ['blade','cyberpunk','neon','futurista','tech','matrix','cyber'], nome: 'Cyberpunk', emocao: 'Tensão · Adrenalina · Desorientação', paleta: ['#0a0a0f','#00fff7','#7c3aed','#ff006e'], tipografia: 'Rajdhani Bold', ritmo: '32 cortes/min', bpm: 140, iluminacao: 'Neon lateral · Chuva de luz', enquadramento: 'Close extremo', bg: ['#0a0a0f','#0d1f3c','#1a0533'], glow: '#00fff7', cenas: [{desc:'Silhueta contra neon',luz:'Contraluz ciano',cam:'Close extremo'},{desc:'Chuva em slow motion',luz:'Reflexo no asfalto',cam:'Travelling lateral'},{desc:'Olhar direto câmera',luz:'LED lateral duro',cam:'Close olhos'}], audio: {tipo:'cyberpunk',descricao:'Sintetizador metálico',efeito:'Gera tensão'} },
  poder: { keywords: ['poder','luxo','cartier','sdm','rap','trap','gold','golden','luxury','power'], nome: 'Luxo Cinematográfico', emocao: 'Poder · Status · Inevitabilidade', paleta: ['#0d0500','#8B3A00','#C8860A','#F5D78E'], tipografia: 'Montserrat Black', ritmo: '22 cortes/min', bpm: 95, iluminacao: 'Tungstênio quente · Sombra épica', enquadramento: 'Ângulo baixo', bg: ['#0d0500','#1a0800','#2d1200'], glow: '#C8860A', cenas: [{desc:'Detalhe relógio dourado',luz:'Luz dourada lateral',cam:'Macro extremo'},{desc:'Artista em ambiente luxuoso',luz:'Tungstênio + fill suave',cam:'Ângulo baixo'},{desc:'Fumaça em slow motion',luz:'Backlight dourado',cam:'Travelling lateral'}], audio: {tipo:'trap',descricao:'Kick 808 grave',efeito:'Ativa poder e status'} },
  romance: { keywords: ['romance','amor','suave','delicado','intimidade','saudade','love','soft'], nome: 'Romance Etéreo', emocao: 'Nostalgia · Vulnerabilidade · Conexão', paleta: ['#1a0010','#8B0050','#FF6B9D','#FFD6E8'], tipografia: 'Cormorant Garamond', ritmo: '12 cortes/min', bpm: 72, iluminacao: 'Luz difusa · Bokeh profundo', enquadramento: 'Plano aberto', bg: ['#1a0010','#2d0020','#1a0a1a'], glow: '#FF6B9D', cenas: [{desc:'Mãos se tocando',luz:'Janela natural difusa',cam:'Close olhos'},{desc:'Olhar perdido na distância',luz:'Golden hour',cam:'Plano aberto'},{desc:'Detalhe — lágrima',luz:'Rim light suave',cam:'Macro extremo'}], audio: {tipo:'romance',descricao:'Pad suave + piano',efeito:'Ativa oxitocina'} },
  misterio: { keywords: ['mistério','sombrio','dark','noir','suspense','thriller','crime','mystery'], nome: 'Noir Contemporâneo', emocao: 'Ansiedade · Fascínio · Perigo', paleta: ['#000000','#0a0a0a','#1a1a2e','#4a4a6a'], tipografia: 'Playfair Display', ritmo: '18 cortes/min', bpm: 85, iluminacao: 'Contraluz duro · Sombra absoluta', enquadramento: 'Plano médio', bg: ['#000000','#0a0a1a','#050510'], glow: '#6a6aaa', cenas: [{desc:'Rosto metade na sombra',luz:'Single key lateral',cam:'Close extremo'},{desc:'Corredor com névoa',luz:'Luz de fundo fraca',cam:'Plano médio'},{desc:'Detalhe — mão nervosa',luz:'Sem fill, só key',cam:'Close olhos'}], audio: {tipo:'noir',descricao:'Baixo profundo',efeito:'Ativa amígdala'} },
  epico: { keywords: ['épico','guerra','batalha','herói','dune','grandioso','epic','war','hero'], nome: 'Épico Cinematográfico', emocao: 'Grandiosidade · Sacrifício · Destino', paleta: ['#0a0500','#3d1a00','#8B4513','#DAA520'], tipografia: 'Cinzel Bold', ritmo: '18 cortes/min', bpm: 88, iluminacao: 'Luz épica lateral · Névoa dramática', enquadramento: 'Grande angular', bg: ['#0a0500','#1a0800','#2d1500'], glow: '#DAA520', cenas: [{desc:'Exército no horizonte',luz:'Pôr do sol épico',cam:'Plano aberto'},{desc:'Herói de costas',luz:'Backlight dourado',cam:'Ângulo baixo'},{desc:'Olhar determinado',luz:'Luz lateral dura',cam:'Close extremo'}], audio: {tipo:'noir',descricao:'Orquestra épica',efeito:'Grandiosidade'} },
  minimalista: { keywords: ['minimalista','clean','simples','moderno','elegante','minimal','simple','modern'], nome: 'Minimalismo Moderno', emocao: 'Clareza · Confiança · Sofisticação', paleta: ['#ffffff','#f5f5f5','#333333','#000000'], tipografia: 'Helvetica Neue Light', ritmo: '15 cortes/min', bpm: 80, iluminacao: 'Luz difusa branca · Alto key', enquadramento: 'Plano médio', bg: ['#0a0a0a','#111111','#1a1a1a'], glow: '#ffffff', cenas: [{desc:'Produto em fundo branco',luz:'Softbox frontal',cam:'Plano médio'},{desc:'Detalhe de textura',luz:'Luz rasante lateral',cam:'Macro extremo'},{desc:'Pessoa em ambiente clean',luz:'Natural difusa',cam:'Plano aberto'}], audio: {tipo:'romance',descricao:'Piano minimalista',efeito:'Clareza e foco'} },
}
const FORMATOS = { youtube:{label:'YouTube',ratio:'16:9',icon:'▶',w:320,h:180}, instagram:{label:'Instagram',ratio:'1:1',icon:'◈',w:240,h:240}, filme:{label:'Filme',ratio:'2.39:1',icon:'◻',w:320,h:134}, clipe:{label:'Clipe',ratio:'9:16',icon:'◆',w:150,h:267} }
const DEFAULT = PRESETS.poder

function detectPreset(text) {
  const lower = text.toLowerCase()
  for (const [,p] of Object.entries(PRESETS)) { if (p.keywords.some(k => lower.includes(k))) return p }
  return null
}

class AudioEngine {
  constructor() { this.loop = null; this.synths = [] }
  async start(tipo, bpm) {
    await Tone.start(); this.stop()
    Tone.getTransport().bpm.value = bpm
    if (tipo==='trap') this.playTrap()
    else if (tipo==='cyberpunk') this.playCyberpunk()
    else if (tipo==='romance') this.playRomance()
    else this.playNoir()
    Tone.getTransport().start()
  }
  playTrap() {
    const kick = new Tone.MembraneSynth({pitchDecay:0.08,octaves:6}).toDestination()
    const hihat = new Tone.MetalSynth({frequency:400,envelope:{attack:0.001,decay:0.05,release:0.01},harmonicity:5.1,modulationIndex:32,resonance:4000,octaves:1.5}).toDestination()
    hihat.volume.value = -18
    const bass = new Tone.Synth({oscillator:{type:'sine'},envelope:{attack:0.01,decay:0.8,sustain:0.2,release:0.5}}).toDestination()
    bass.volume.value = -6
    this.loop = new Tone.Sequence((time,step) => {
      if (step===0||step===8) kick.triggerAttackRelease('C1','8n',time)
      if (step%2===0) hihat.triggerAttackRelease('16n',time)
      if (step===4) bass.triggerAttackRelease('C2','4n',time)
      if (step===12) bass.triggerAttackRelease('G1','4n',time)
    },[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],'16n')
    this.synths=[kick,hihat,bass]; this.loop.start(0)
  }
  playCyberpunk() {
    const lead = new Tone.Synth({oscillator:{type:'sawtooth'},envelope:{attack:0.01,decay:0.1,sustain:0.3,release:0.2}})
    const dist = new Tone.Distortion(0.4); const rev = new Tone.Reverb(0.5)
    lead.chain(dist,rev,Tone.getDestination()); lead.volume.value = -14
    const kick = new Tone.MembraneSynth({pitchDecay:0.04,octaves:4}).toDestination(); kick.volume.value = -8
    const notes = ['C4','Eb4','G4','Bb4','C5','Bb4','Ab4','G4']
    this.loop = new Tone.Sequence((time,step) => {
      lead.triggerAttackRelease(notes[step%notes.length],'16n',time)
      if (step%4===0) kick.triggerAttackRelease('C1','8n',time)
    },[0,1,2,3,4,5,6,7],'16n')
    this.synths=[lead,kick,dist,rev]; this.loop.start(0)
  }
  playRomance() {
    const piano = new Tone.Synth({oscillator:{type:'triangle'},envelope:{attack:0.02,decay:1.2,sustain:0.3,release:2}})
    const rev = new Tone.Reverb(4); rev.wet.value = 0.6
    piano.chain(rev,Tone.getDestination()); piano.volume.value = -10
    const melody = ['E4','G4','B4','E5','D5','B4','G4','A4']
    this.loop = new Tone.Sequence((time,step) => {
      piano.triggerAttackRelease(melody[step%melody.length],'4n',time)
    },[0,1,2,3,4,5,6,7],'4n')
    this.synths=[piano,rev]; this.loop.start(0)
  }
  playNoir() {
    const bass = new Tone.Synth({oscillator:{type:'sine'},envelope:{attack:0.1,decay:1.5,sustain:0.4,release:2}})
    const rev = new Tone.Reverb(3); rev.wet.value = 0.5
    bass.chain(rev,Tone.getDestination()); bass.volume.value = -8
    this.loop = new Tone.Sequence((time,step) => {
      if (step===0) bass.triggerAttackRelease('C2','2n',time)
      if (step===8) bass.triggerAttackRelease('G1','2n',time)
    },[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],'16n')
    this.synths=[bass,rev]; this.loop.start(0)
  }
  stop() {
    Tone.getTransport().stop(); Tone.getTransport().cancel()
    if (this.loop) { this.loop.stop(); this.loop.dispose(); this.loop=null }
    this.synths.forEach(s => { try { s.dispose() } catch(e) {} }); this.synths=[]
  }
}
const audioEngine = new AudioEngine()

function BPMVisual({ bpm, glow, active }) {
  const [heights, setHeights] = useState([0.4,0.7,1,0.6,0.85,0.5,0.9,0.65])
  useEffect(() => {
    if (!active) return
    const ms = Math.round(60000/bpm)
    const t = setInterval(()=>setHeights([0.4,0.7,1,0.6,0.85,0.5,0.9,0.65].map(()=>0.3+Math.random()*0.7)),ms)
    return ()=>clearInterval(t)
  }, [bpm, active])
  return (
    <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
      <div style={{display:'flex',alignItems:'flex-end',gap:'3px',height:'32px'}}>
        {heights.map((h,i)=><div key={i} style={{width:'4px',borderRadius:'2px',height:`${h*32}px`,background:glow,opacity:0.5+h*0.5,transition:`height ${Math.round(60000/bpm*0.8)}ms ease`}}/>)}
      </div>
      <span style={{fontSize:'1.6rem',fontWeight:'800',color:glow,letterSpacing:'-1px'}}>{bpm}</span>
      <span style={{fontSize:'0.7rem',color:'rgba(255,255,255,0.3)',letterSpacing:'2px'}}>BPM</span>
    </div>
  )
}

function CameraView({ tipo, glow }) {
  const configs = {
    'Close extremo': (<svg viewBox="0 0 200 120" style={{width:'100%',height:'100%'}}><rect x="60" y="20" width="80" height="80" rx="40" fill="none" stroke={glow} strokeWidth="1.5" opacity="0.4"/><rect x="75" y="35" width="50" height="50" rx="25" fill="none" stroke={glow} strokeWidth="1.5" opacity="0.7"/><circle cx="100" cy="60" r="14" fill={glow} opacity="0.15"/><circle cx="100" cy="60" r="6" fill={glow} opacity="0.6"/><text x="100" y="108" textAnchor="middle" fill={glow} fontSize="7" opacity="0.5" letterSpacing="2">EXTREME CLOSE-UP</text></svg>),
    'Ângulo baixo': (<svg viewBox="0 0 200 120" style={{width:'100%',height:'100%'}}><polygon points="100,15 30,95 170,95" fill="none" stroke={glow} strokeWidth="1.5" opacity="0.5"/><circle cx="100" cy="15" r="5" fill={glow} opacity="0.8"/><text x="100" y="116" textAnchor="middle" fill={glow} fontSize="7" opacity="0.5" letterSpacing="2">LOW ANGLE</text></svg>),
    'Macro extremo': (<svg viewBox="0 0 200 120" style={{width:'100%',height:'100%'}}><circle cx="100" cy="55" r="35" fill="none" stroke={glow} strokeWidth="1.5" opacity="0.3"/><circle cx="100" cy="55" r="20" fill="none" stroke={glow} strokeWidth="1.5" opacity="0.5"/><circle cx="100" cy="55" r="8" fill={glow} opacity="0.2"/><circle cx="100" cy="55" r="3" fill={glow} opacity="0.9"/><text x="100" y="108" textAnchor="middle" fill={glow} fontSize="7" opacity="0.5" letterSpacing="2">MACRO LENS</text></svg>),
    'Plano aberto': (<svg viewBox="0 0 200 120" style={{width:'100%',height:'100%'}}><rect x="15" y="25" width="170" height="70" rx="4" fill="none" stroke={glow} strokeWidth="1.5" opacity="0.4"/><rect x="85" y="45" width="30" height="30" fill="none" stroke={glow} strokeWidth="1" opacity="0.6"/><text x="100" y="108" textAnchor="middle" fill={glow} fontSize="7" opacity="0.5" letterSpacing="2">WIDE SHOT</text></svg>),
    'Travelling lateral': (<svg viewBox="0 0 200 120" style={{width:'100%',height:'100%'}}><rect x="70" y="45" width="60" height="30" rx="3" fill="none" stroke={glow} strokeWidth="1.5" opacity="0.5"/><polygon points="20,55 5,60 20,65" fill={glow} opacity="0.6"/><line x1="20" y1="60" x2="70" y2="60" stroke={glow} strokeWidth="1.5" opacity="0.4" strokeDasharray="5 3"/><text x="100" y="108" textAnchor="middle" fill={glow} fontSize="7" opacity="0.5" letterSpacing="2">TRACKING SHOT</text></svg>),
    'Plano médio': (<svg viewBox="0 0 200 120" style={{width:'100%',height:'100%'}}><rect x="40" y="15" width="120" height="90" rx="4" fill="none" stroke={glow} strokeWidth="1.5" opacity="0.4"/><rect x="75" y="25" width="50" height="45" fill="none" stroke={glow} strokeWidth="1" opacity="0.6"/><text x="100" y="112" textAnchor="middle" fill={glow} fontSize="7" opacity="0.5" letterSpacing="2">MEDIUM SHOT</text></svg>),
    'Close olhos': (<svg viewBox="0 0 200 120" style={{width:'100%',height:'100%'}}><path d="M30,60 Q100,20 170,60 Q100,100 30,60" fill="none" stroke={glow} strokeWidth="1.5" opacity="0.5"/><ellipse cx="100" cy="60" rx="22" ry="16" fill="none" stroke={glow} strokeWidth="1.5" opacity="0.7"/><circle cx="100" cy="60" r="4" fill={glow} opacity="0.7"/><text x="100" y="108" textAnchor="middle" fill={glow} fontSize="7" opacity="0.5" letterSpacing="2">INSERT SHOT</text></svg>),
    'Grande angular': (<svg viewBox="0 0 200 120" style={{width:'100%',height:'100%'}}><path d="M5,60 Q100,10 195,60 Q100,110 5,60" fill="none" stroke={glow} strokeWidth="1.5" opacity="0.4"/><rect x="20" y="30" width="160" height="60" rx="4" fill="none" stroke={glow} strokeWidth="1" opacity="0.3"/><text x="100" y="112" textAnchor="middle" fill={glow} fontSize="7" opacity="0.5" letterSpacing="2">WIDE ANGLE</text></svg>),
  }
  return <div style={{width:'100%',height:'100px'}}>{configs[tipo]||configs['Plano médio']}</div>
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const t = useT()
  const isRTL = detectLang() === 'ar'
  const { user, login, logout } = useAuth()
  const [mostrarAuth, setMostrarAuth] = useState(false)
  const [emocao, setEmocao] = useState('')
  const [formato, setFormato] = useState('clipe')
  const [resultado, setResultado] = useState(null)
  const [kitId, setKitId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [audioOn, setAudioOn] = useState(false)
  const [aba, setAba] = useState('gerar')
  const [meusKits, setMeusKits] = useState([])
  const [shareUrl, setShareUrl] = useState(null)
  const [sharingId, setSharingId] = useState(null)
  const debounceRef = useRef(null)
  const miniplayerRef = useRef(null)

  const path = window.location.pathname
  const shareMatch = path.match(/^\/kit\/([a-zA-Z0-9]+)$/)
  if (shareMatch) return <PaginaKitPublico shareId={shareMatch[1]} />

  // Preview reativo com debounce ao digitar
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPreview(emocao.length > 3 ? detectPreset(emocao) : null)
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [emocao])

  useEffect(() => () => audioEngine.stop(), [])

  if (!user && mostrarAuth) return <TelaAuth onLogin={login} />
  if (!user) return <TelaLanding onEntrar={() => setMostrarAuth(true)} />

  async function gerarKit() {
    setLoading(true); setResultado(null); setKitId(null); setShareUrl(null)
    try {
      const res = await fetch(`${API}/gerar-kit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
        body: JSON.stringify({ emocao, formato })
      })
      const data = await res.json()
      const local = detectPreset(emocao) || DEFAULT
      setResultado({ ...local, ...data, bg: local.bg, glow: local.glow, cenas: local.cenas })
      if (data.kit_id) setKitId(data.kit_id)
    } catch {
      const local = detectPreset(emocao) || DEFAULT
      setResultado(local)
    } finally { setLoading(false) }
  }

  async function compartilharKit(id) {
    setSharingId(id)
    try {
      const res = await fetch(`${API}/compartilhar/${id}`, { method: 'POST', headers: { 'Authorization': `Bearer ${user.token}` } })
      const data = await res.json()
      if (data.url) setShareUrl(data.url)
    } catch { alert('Erro ao compartilhar.') }
    setSharingId(null)
  }

  async function carregarKits() {
    try {
      const res = await fetch(`${API}/meus-kits`, { headers: { 'Authorization': `Bearer ${user.token}` } })
      const data = await res.json()
      setMeusKits(data)
    } catch {}
  }

  async function toggleAudio() {
    const preset = resultado || preview || DEFAULT
    if (audioOn) { audioEngine.stop(); setAudioOn(false) }
    else { await audioEngine.start(preset.audio.tipo, preset.bpm); setAudioOn(true) }
  }

  async function assinarPro() {
    try {
      const res = await fetch(`${API}/criar-assinatura`, { method: 'POST', headers: { 'Authorization': `Bearer ${user.token}` } })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch { alert(t.checkoutError) }
  }

  const active = resultado || preview

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: '#050508', color: '#fff', fontFamily: "'Segoe UI', sans-serif" }}>
      <OrbField />
      <ParticleField color={active ? active.glow : '#7c3aed'} count={40} />
      {shareUrl && <ShareToast url={shareUrl} onClose={() => setShareUrl(null)} />}

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '80px 28px 60px', position: 'relative', zIndex: 2 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
          <div style={{ animation: 'slideIn 0.6s ease both' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #7c3aed, #e94560)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>◈</div>
              <div style={{ fontSize: '0.6rem', letterSpacing: '3px', color: '#e94560', textTransform: 'uppercase' }}>{t.badge}</div>
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: '900', lineHeight: 1.1, background: `linear-gradient(135deg, #fff 0%, ${active ? active.glow : '#a78bfa'} 60%, #e94560 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>Kit de Intenção<br />Visual</h1>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>{t.hello}, {user.nome}</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={assinarPro} style={{ background: 'linear-gradient(135deg, #7c3aed, #e94560)', border: 'none', borderRadius: '999px', padding: '7px 18px', color: '#fff', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>{t.pro}</button>
              <button onClick={logout} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '999px', padding: '7px 16px', color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', cursor: 'pointer' }}>{t.logout}</button>
            </div>
          </div>
        </div>

        {/* Abas */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '36px', background: 'rgba(255,255,255,0.02)', borderRadius: '999px', padding: '4px', width: 'fit-content', border: '1px solid rgba(255,255,255,0.05)' }}>
          {[['gerar', t.generateKit], ['historico', t.dnaVisual]].map(([key, label]) => (
            <button key={key} onClick={() => { setAba(key); if (key==='historico') carregarKits() }}
              style={{ padding: '8px 22px', borderRadius: '999px', border: 'none', background: aba===key ? 'linear-gradient(135deg, rgba(124,58,237,0.4), rgba(233,69,96,0.3))' : 'transparent', color: aba===key ? '#fff' : 'rgba(255,255,255,0.35)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: aba===key ? '700' : '400' }}>{label}</button>
          ))}
        </div>

        {/* Histórico */}
        {aba === 'historico' && (
          <div style={{ animation: 'fadeUp 0.5s ease both' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff', marginBottom: '24px' }}>{t.dnaVisual}</h2>
            {meusKits.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 40px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px' }}>
                <p style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🎬</p>
                <p style={{ color: 'rgba(255,255,255,0.25)' }}>{t.emptyKits}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {meusKits.map((kit, i) => (
                  <TiltCard key={kit.id} glowColor="#7c3aed" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '18px', padding: '20px 24px', animation: 'fadeUp 0.4s ease both', animationDelay: `${i*0.08}s` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ fontSize: '0.55rem', letterSpacing: '2px', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: '6px' }}>{kit.formato}</p>
                        <p style={{ fontSize: '1rem', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>{kit.estilo}</p>
                        <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>"{kit.emocao}"</p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                        <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)' }}>{new Date(kit.criado_em).toLocaleDateString()}</p>
                        <button onClick={() => compartilharKit(kit.id)} disabled={sharingId === kit.id}
                          style={{ padding: '6px 14px', borderRadius: '999px', border: '1px solid rgba(124,58,237,0.4)', background: kit.share_id ? 'rgba(124,58,237,0.2)' : 'transparent', color: kit.share_id ? '#a78bfa' : 'rgba(255,255,255,0.4)', fontSize: '0.7rem', cursor: 'pointer', fontWeight: '600' }}>
                          {sharingId === kit.id ? '...' : kit.share_id ? '🔗 Compartilhado' : '↗ Compartilhar'}
                        </button>
                      </div>
                    </div>
                  </TiltCard>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Gerar Kit */}
        {aba === 'gerar' && (
          <div style={{ animation: 'fadeUp 0.5s ease both' }}>

            {/* Templates sugeridos */}
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '0.6rem', letterSpacing: '3px', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: '12px' }}>⚡ Começar com um estilo</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {TEMPLATES.map((tpl, i) => (
                  <button key={i} onClick={() => setEmocao(tpl.prompt)}
                    style={{ padding: '7px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = active ? active.glow+'66' : 'rgba(124,58,237,0.5)'; e.currentTarget.style.color = '#fff' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
                  >{tpl.label}</button>
                ))}
              </div>
            </div>

            {/* Formato */}
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '0.6rem', letterSpacing: '3px', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: '12px' }}>{t.format}</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {Object.entries(FORMATOS).map(([key, fmt]) => (
                  <button key={key} onClick={() => setFormato(key)}
                    style={{ padding: '8px 18px', borderRadius: '999px', border: `1px solid ${formato===key ? (active?active.glow:'#7c3aed') : 'rgba(255,255,255,0.08)'}`, background: formato===key ? `${active?active.glow:'#7c3aed'}18` : 'rgba(255,255,255,0.02)', color: formato===key ? (active?active.glow:'#a78bfa') : 'rgba(255,255,255,0.3)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: formato===key ? '700' : '400' }}>
                    {fmt.icon} {fmt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Pré-visualização em tempo real */}
            {active && (
              <TiltCard glowColor={active.glow} style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '32px', background: 'rgba(0,0,0,0.5)', borderRadius: '28px', border: `1px solid ${active.glow}22`, backdropFilter: 'blur(20px)', animation: 'tiltIn 0.5s ease both' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#e94560', animation: 'glowPulse 1s infinite' }} />
                  <p style={{ fontSize: '0.55rem', letterSpacing: '3px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Pré-visualização ao vivo · {active.nome}</p>
                </div>
                <div ref={miniplayerRef}>
                  <MiniPlayer3D preset={active} formato={formato} prompt={emocao} />
                </div>
                <p style={{ fontSize: '0.65rem', color: active.glow, fontWeight: '700', letterSpacing: '1px' }}>{active.emocao}</p>
              </TiltCard>
            )}

            {/* Variações detectadas */}
            {emocao.length > 3 && (
              <VariacoesKit emocao={emocao} formato={formato} glow={active?.glow || '#7c3aed'}
                onSelecionar={(p) => {
                  setPreview(p)
                  setEmocao(p.keywords[0])
                }}
              />
            )}

            {/* Aha #1 — Contador de detecção em tempo real */}
            <ContadorDeteccao emocao={emocao} preset={active} glow={active?.glow || '#7c3aed'} />

            {/* Textarea */}
            <textarea value={emocao} onChange={e => setEmocao(e.target.value)}
              placeholder={t.placeholder}
              style={{ width: '100%', height: '110px', background: 'rgba(255,255,255,0.02)', color: '#fff', border: `1px solid ${active ? active.glow+'44' : 'rgba(124,58,237,0.2)'}`, borderRadius: '20px', padding: '20px 24px', fontSize: '0.95rem', resize: 'none', boxSizing: 'border-box', outline: 'none', lineHeight: 1.6, backdropFilter: 'blur(10px)', transition: 'border 0.5s ease', boxShadow: active ? `0 0 30px ${active.glow}11` : 'none' }}
            />

            {/* Botões */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '14px' }}>
              <button onClick={gerarKit} disabled={loading}
                style={{ flex: 1, padding: '17px', borderRadius: '999px', border: 'none', background: loading ? 'rgba(255,255,255,0.04)' : `linear-gradient(135deg, ${active?active.glow:'#7c3aed'}, #e94560)`, color: loading ? 'rgba(255,255,255,0.25)' : '#fff', fontSize: '0.9rem', fontWeight: '700', letterSpacing: '2px', cursor: loading ? 'not-allowed' : 'pointer', textTransform: 'uppercase', boxShadow: loading ? 'none' : `0 0 40px ${active?active.glow+'44':'rgba(124,58,237,0.3)'}` }}>
                {loading ? t.generating : t.generateBtn}
              </button>
              {active && (
                <button onClick={toggleAudio}
                  style={{ padding: '17px 24px', borderRadius: '999px', border: `1px solid ${active.glow}44`, background: audioOn ? `${active.glow}22` : 'rgba(255,255,255,0.02)', color: audioOn ? active.glow : 'rgba(255,255,255,0.4)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: '600' }}>
                  {audioOn ? t.stopBtn : t.listenBtn}
                </button>
              )}
            </div>

            {/* Resultado */}
            {resultado && (
              <div style={{ marginTop: '48px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <TiltCard glowColor={resultado.glow} style={{ textAlign: 'center', padding: '28px', background: `${resultado.glow}0e`, border: `1px solid ${resultado.glow}33`, borderRadius: '24px', animation: 'tiltIn 0.6s ease both' }}>
                  <p style={{ fontSize: '0.55rem', letterSpacing: '3px', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: '8px' }}>{t.detectedStyle}</p>
                  <p style={{ fontSize: '1.4rem', fontWeight: '900', color: resultado.glow, marginBottom: '6px', textShadow: `0 0 30px ${resultado.glow}` }}>{resultado.nome}</p>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginBottom: '16px' }}>{resultado.emocao}</p>
                  {kitId && (
                    <button onClick={() => compartilharKit(kitId)} disabled={sharingId===kitId}
                      style={{ padding: '10px 24px', borderRadius: '999px', border: `1px solid ${resultado.glow}66`, background: shareUrl ? `${resultado.glow}22` : 'transparent', color: resultado.glow, fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', letterSpacing: '1px' }}>
                      {sharingId===kitId ? '...' : shareUrl ? '✓ Link gerado!' : '↗ Compartilhar este kit'}
                    </button>
                  )}
                </TiltCard>

                {/* Aha #2 — Efeito Psicológico */}
                <TiltCard glowColor={resultado.glow} style={{ background: `linear-gradient(135deg, rgba(0,0,0,0.6), ${resultado.glow}08)`, border: `1px solid ${resultado.glow}33`, borderRadius: '24px', overflow: 'hidden' }}>
                  <EfeitoPsicologico preset={resultado} glow={resultado.glow} />
                </TiltCard>

                {/* Feedback emocional */}
                <TiltCard glowColor={resultado.glow} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${resultado.glow}18`, borderRadius: '24px' }}>
                  <FeedbackEmocional glow={resultado.glow} kitId={kitId} token={user.token} />
                </TiltCard>

                {/* Export Card */}
                <TiltCard glowColor={resultado.glow} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${resultado.glow}28`, borderRadius: '24px', padding: '24px' }}>
                  <p style={{ fontSize: '0.55rem', letterSpacing: '3px', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: '16px' }}>🎬 Exportar para redes sociais</p>
                  <ExportCard preset={resultado} formato={formato} miniplayerRef={miniplayerRef} />
                </TiltCard>

                <TiltCard glowColor={resultado.glow} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${resultado.glow}18`, borderRadius: '24px', padding: '24px' }}>
                  <p style={{ fontSize: '0.55rem', letterSpacing: '3px', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: '16px' }}>{t.bpmLabel}</p>
                  <BPMVisual bpm={resultado.bpm} glow={resultado.glow} active={true} />
                </TiltCard>

                <TiltCard glowColor={resultado.glow} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${resultado.glow}18`, borderRadius: '24px', padding: '24px' }}>
                  <p style={{ fontSize: '0.55rem', letterSpacing: '3px', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: '16px' }}>{t.paletteLabel}</p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {resultado.paleta.map(cor => (
                      <div key={cor} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                        <div style={{ width: '100%', height: '54px', borderRadius: '14px', background: cor, boxShadow: `0 8px 24px ${cor}55`, cursor: 'pointer' }}
                          onMouseEnter={e=>e.currentTarget.style.transform='scale(1.05) translateY(-2px)'}
                          onMouseLeave={e=>e.currentTarget.style.transform='scale(1) translateY(0)'}
                        />
                        <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.2)' }}>{cor}</span>
                      </div>
                    ))}
                  </div>
                </TiltCard>

                <TiltCard glowColor={resultado.glow} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${resultado.glow}18`, borderRadius: '24px', padding: '24px' }}>
                  <p style={{ fontSize: '0.55rem', letterSpacing: '3px', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: '16px' }}>{t.framingLabel}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {resultado.cenas.map((c, i) => (
                      <div key={i} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '16px', padding: '14px', border: `1px solid ${resultado.glow}14` }}>
                        <CameraView tipo={c.cam} glow={resultado.glow} />
                        <p style={{ fontSize: '0.7rem', color: resultado.glow, fontWeight: '700', textAlign: 'center', marginTop: '6px' }}>{c.cam}</p>
                        <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>{c.desc}</p>
                      </div>
                    ))}
                  </div>
                </TiltCard>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {[{label:t.typographyLabel,valor:resultado.tipografia},{label:t.rhythmLabel,valor:resultado.ritmo},{label:t.lightLabel,valor:resultado.iluminacao},{label:t.formatLabel,valor:`${FORMATOS[formato].label} · ${FORMATOS[formato].ratio}`}].map(item => (
                    <TiltCard key={item.label} glowColor={resultado.glow} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${resultado.glow}14`, borderRadius: '20px', padding: '20px' }}>
                      <p style={{ fontSize: '0.55rem', letterSpacing: '2px', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: '8px' }}>{item.label}</p>
                      <p style={{ fontSize: '0.88rem', color: '#e2e8f0', fontWeight: '600' }}>{item.valor}</p>
                    </TiltCard>
                  ))}
                </div>

                <TiltCard glowColor={resultado.glow} style={{ background: `linear-gradient(135deg, ${resultado.glow}0e, rgba(233,69,96,0.05))`, border: `1px solid ${resultado.glow}28`, borderRadius: '24px', padding: '24px' }}>
                  <p style={{ fontSize: '0.55rem', letterSpacing: '3px', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: '16px' }}>{t.sceneLabel}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {resultado.cenas.map((c, i) => (
                      <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: `${resultado.glow}18`, border: `1px solid ${resultado.glow}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: resultado.glow, flexShrink: 0 }}>{i+1}</div>
                        <div>
                          <p style={{ fontSize: '0.88rem', fontWeight: '600', color: '#e2e8f0', marginBottom: '3px' }}>{c.desc}</p>
                          <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>📷 {c.cam} · 💡 {c.luz}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </TiltCard>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}