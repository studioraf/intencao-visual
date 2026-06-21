import { useState, useEffect, useRef, useCallback } from 'react'
import * as Tone from 'tone'
import { useT, detectLang } from './i18n'
import MiniPlayer3D from './MiniPlayer3D'
import ExportCard from './ExportCard'
import TedioDetector from './TedioDetector'

const API = 'https://intencao-visual-production.up.railway.app'

// ── 1. Hooks de Autenticação Originais (Railway/Vercel Ready) ────────────────
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

// ── 2. Componentes Visuais (Partículas e Orbs) ───────────────────────────────
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
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = color + Math.floor(p.alpha * 255).toString(16).padStart(2, '0'); ctx.fill()
      })
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [color, count])
  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />
}

function OrbField() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: '600px', height: '600px', borderRadius: '50%', left: '-100px', top: '-100px', background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)', animation: 'orbFloat1 12s ease-in-out infinite' }} />
      <style>{`
        @keyframes orbFloat1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(80px,60px) scale(1.1)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
        @keyframes tiltIn { from{opacity:0;transform:perspective(800px) rotateX(20deg) translateY(40px)} to{opacity:1;transform:perspective(800px) rotateX(0deg) translateY(0)} }
      `}</style>
    </div>
  )
}

function TiltCard({ children, style, glowColor = '#7c3aed' }) {
  const ref = useRef(null)
  function handleMove(e) {
    const el = ref.current; const rect = el.getBoundingClientRect()
    const rx = ((e.clientY - rect.top) / rect.height - 0.5) * -16
    const ry = ((e.clientX - rect.left) / rect.width - 0.5) * 16
    el.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.02)`
  }
  function handleLeave() { ref.current.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)' }
  return <div ref={ref} onMouseMove={handleMove} onMouseLeave={handleLeave} style={{ transition: 'transform 0.15s ease', willChange: 'transform', ...style }}>{children}</div>
}

// ── 3. Componentes de Elite Integrados ──────────────────────────────────────
function HormonioCounter({ retention }) {
  return (
    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', animation: 'fadeUp 0.5s ease both' }}>
      <div style={{ flex: 1, padding: '12px', background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: '14px' }}>
        <p style={{ fontSize: '0.5rem', color: '#00ff88', textTransform: 'uppercase', margin: '0 0 4px 0' }}>🧪 Dopamina</p>
        <p style={{ fontSize: '1.2rem', fontWeight: '900', margin: 0 }}>{(retention * 0.12).toFixed(2)} mg</p>
      </div>
      <div style={{ flex: 1, padding: '12px', background: 'rgba(255,68,68,0.05)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '14px' }}>
        <p style={{ fontSize: '0.5rem', color: '#ff4444', textTransform: 'uppercase', margin: '0 0 4px 0' }}>🧪 Cortisol</p>
        <p style={{ fontSize: '1.2rem', fontWeight: '900', margin: 0 }}>{(retention < 50 ? (50 - retention) * 0.08 : 0).toFixed(2)} mg</p>
      </div>
    </div>
  )
}

// ── 4. Telas Principais (Landing e Auth) ─────────────────────────────────────
function Landing({ onEntrar }) {
  const t = useT(); const isRTL = detectLang() === 'ar'
  const estilos = [
    { nome: 'Luxo Cinematográfico', emocao: 'Poder · Status · Inevitabilidade', cor: '#C8860A', bg: '#1a0800', icon: '◈' },
    { nome: 'Cyberpunk', emocao: 'Tensão · Adrenalina · Desorientação', cor: '#00fff7', bg: '#0d1f3c', icon: '◆' },
    { nome: 'Romance Etéreo', emocao: 'Nostalgia · Vulnerabilidade · Conexão', cor: '#FF6B9D', bg: '#2d0020', icon: '◉' },
    { nome: 'Noir Contemporâneo', emocao: 'Ansiedade · Fascínio · Perigo', cor: '#6a6aaa', bg: '#0a0a1a', icon: '▣' },
  ]
  return (
    <div style={{ minHeight: '100vh', background: '#050508', color: '#fff', fontFamily: "'Segoe UI', sans-serif" }}>
      <OrbField /><ParticleField color="#7c3aed" count={50} />
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '20px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(5,5,8,0.8)', backdropFilter: 'blur(20px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #7c3aed, #e94560)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>◈</div>
          <span style={{ fontWeight: '800' }}>Kit de Intenção Visual</span>
        </div>
        <button onClick={onEntrar} style={{ padding: '10px 28px', borderRadius: '999px', border: '1px solid #7c3aed', background: 'rgba(124,58,237,0.1)', color: '#a78bfa', cursor: 'pointer' }}>{t.enter || 'Entrar'}</button>
      </nav>
      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', position: 'relative', zIndex: 2 }}>
        <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', fontWeight: '900', maxWidth: '800px', marginBottom: '40px' }}>{t.hero1 || 'Transforme Vídeos'} <br/><span style={{ color: '#7c3aed' }}>{t.hero2 || 'em Cinema'}</span></h1>
        <button onClick={onEntrar} style={{ padding: '18px 52px', borderRadius: '999px', background: 'linear-gradient(135deg, #7c3aed, #e94560)', color: '#fff', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', border: 'none' }}>{t.startFree || 'Começar Agora'}</button>
      </section>
    </div>
  )
}

function TelaAuth({ onLogin }) {
  const t = useT(); const [modo, setModo] = useState('login'); const [email, setEmail] = useState(''); const [senha, setSenha] = useState(''); const [erro, setErro] = useState('')
  async function submeter() {
    try {
      const url = `${API}/${modo === 'login' ? 'login' : 'cadastro'}`
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, senha }) })
      const data = await res.json()
      if (!res.ok) { setErro(data.detail || 'Erro'); return }
      onLogin(data.token, data.nome)
    } catch { setErro('Erro de conexão') }
  }
  return (
    <div style={{ minHeight: '100vh', background: '#050508', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <OrbField /><ParticleField color="#7c3aed" count={30} />
      <div style={{ width: '100%', maxWidth: '400px', padding: '24px', position: 'relative', zIndex: 2 }}>
        <TiltCard style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '28px', padding: '36px', backdropFilter: 'blur(20px)' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>{modo === 'login' ? 'Login' : 'Cadastro'}</h2>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" style={{ width: '100%', padding: '15px', background: '#111', border: '1px solid #333', borderRadius: '12px', color: '#fff', marginBottom: '10px' }} />
          <input value={senha} onChange={e => setSenha(e.target.value)} placeholder="Senha" type="password" style={{ width: '100%', padding: '15px', background: '#111', border: '1px solid #333', borderRadius: '12px', color: '#fff', marginBottom: '20px' }} />
          {erro && <p style={{ color: '#ff4444', textAlign: 'center' }}>{erro}</p>}
          <button onClick={submeter} style={{ width: '100%', padding: '16px', borderRadius: '999px', background: '#7c3aed', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Entrar</button>
          <p onClick={() => setModo(modo === 'login' ? 'cadastro' : 'login')} style={{ textAlign: 'center', marginTop: '20px', color: '#a78bfa', cursor: 'pointer' }}>{modo === 'login' ? 'Criar conta' : 'Já tenho conta'}</p>
        </TiltCard>
      </div>
    </div>
  )
}

// ── 5. App Principal (Fusão Final) ───────────────────────────────────────────
export default function App() {
  const t = useT(); const { user, login, logout } = useAuth()
  const [emocao, setEmocao] = useState(''); const [active, setActive] = useState(null); const [presets, setPresets] = useState([])
  const [landing, setLanding] = useState(true); const [focusMode, setFocusMode] = useState(false); const [justificativa, setJustificativa] = useState(''); const [showROI, setShowROI] = useState(false)

  useEffect(() => {
    fetch(`${API}/presets`).then(r => r.json()).then(data => setPresets(data)).catch(e => console.error(e))
  }, [])

  const handleClear = () => {
    if (focusMode && !justificativa) { alert("Trava de Fluxo Ativa!"); return }
    setEmocao(''); setJustificativa('')
  }

  if (landing && !user) return <Landing onEntrar={() => setLanding(false)} />
  if (!user) return <TelaAuth onLogin={(t, n) => login(t, n)} />

  return (
    <div style={{ minHeight: '100vh', background: '#050508', color: '#fff', padding: '40px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '900', margin: 0 }}>Kit de Intenção Visual</h1>
            <p style={{ opacity: 0.5 }}>Olá, {user.nome} | <span onClick={logout} style={{ cursor: 'pointer', textDecoration: 'underline' }}>Sair</span></p>
          </div>
          <button onClick={() => setFocusMode(!focusMode)} style={{ padding: '10px 20px', borderRadius: '20px', background: focusMode ? '#e94560' : '#7c3aed', border: 'none', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>{focusMode ? '🔒 FOCO ATIVO' : '🔓 ATIVAR FOCO'}</button>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '30px' }}>
          <div>
            <TedioDetector texto={emocao} glow={active?.glow}>
              <textarea value={emocao} onChange={e => setEmocao(e.target.value)} placeholder="Escreva seu roteiro..." style={{ width: '100%', height: '200px', background: 'rgba(255,255,255,0.02)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '24px', fontSize: '1.1rem', outline: 'none' }} />
            </TedioDetector>
            {focusMode && <input placeholder="Justificativa..." value={justificativa} onChange={e => setJustificativa(e.target.value)} style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#666', padding: '10px', marginTop: '10px' }} />}
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <button onClick={handleClear} style={{ padding: '12px 24px', background: '#222', border: 'none', color: '#fff', borderRadius: '12px', cursor: 'pointer' }}>Limpar</button>
              <button onClick={() => setShowROI(true)} style={{ flex: 1, padding: '12px 24px', background: 'linear-gradient(135deg, #7c3aed, #e94560)', border: 'none', color: '#fff', fontWeight: 'bold', borderRadius: '12px', cursor: 'pointer' }}>Gerar Relatório ROI</button>
            </div>
            {emocao.length > 5 && <div style={{ marginTop: '30px' }}><HormonioCounter retention={92} /></div>}
          </div>
          <aside>
            <h3 style={{ fontSize: '0.7rem', opacity: 0.3, textTransform: 'uppercase', marginBottom: '15px' }}>Presets</h3>
            <div style={{ display: 'grid', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
              {presets.map(p => (
                <div key={p.nome} onClick={() => setActive(p)} style={{ padding: '15px', background: active?.nome === p.nome ? `${p.glow}22` : '#111', border: `1px solid ${active?.nome === p.nome ? p.glow : '#222'}`, borderRadius: '16px', cursor: 'pointer' }}>
                  <p style={{ fontWeight: 'bold', margin: 0, fontSize: '0.9rem' }}>{p.nome}</p>
                  <p style={{ fontSize: '0.7rem', opacity: 0.5, margin: 0 }}>{p.emocao}</p>
                </div>
              ))}
            </div>
            {active && <div style={{ marginTop: '20px' }}><MiniPlayer3D preset={active} formato="clipe" prompt={emocao} /></div>}
          </aside>
        </div>
      </div>
    </div>
  )
}
