import { useState, useEffect, useRef } from 'react'
import * as Tone from 'tone'

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
      `}</style>
    </div>
  )
}

function TiltCard({ children, style, glowColor = '#7c3aed' }) {
  const ref = useRef(null)
  function handleMove(e) {
    const el = ref.current
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const cx = rect.width / 2
    const cy = rect.height / 2
    const rx = (y - cy) / cy * -8
    const ry = (x - cx) / cx * 8
    el.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.02)`
    el.style.boxShadow = `0 20px 60px ${glowColor}33, 0 0 30px ${glowColor}22`
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

function TelaLanding({ onEntrar }) {
  const [scrollY, setScrollY] = useState(0)
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const estilos = [
    { nome: 'Luxo Cinematográfico', emocao: 'Poder · Status · Inevitabilidade', cor: '#C8860A', bg: '#1a0800', icon: '◈' },
    { nome: 'Cyberpunk', emocao: 'Tensão · Adrenalina · Desorientação', cor: '#00fff7', bg: '#0d1f3c', icon: '◆' },
    { nome: 'Romance Etéreo', emocao: 'Nostalgia · Vulnerabilidade · Conexão', cor: '#FF6B9D', bg: '#2d0020', icon: '◉' },
    { nome: 'Noir Contemporâneo', emocao: 'Ansiedade · Fascínio · Perigo', cor: '#6a6aaa', bg: '#0a0a1a', icon: '▣' },
    { nome: 'Épico Cinematográfico', emocao: 'Grandiosidade · Sacrifício · Destino', cor: '#DAA520', bg: '#1a0800', icon: '◈' },
    { nome: 'Minimalismo Moderno', emocao: 'Clareza · Confiança · Sofisticação', cor: '#ffffff', bg: '#111111', icon: '□' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#050508', color: '#fff', fontFamily: "'Segoe UI', sans-serif", overflowX: 'hidden' }}>
      <OrbField />
      <ParticleField color="#7c3aed" count={50} />
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)' }} />

      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '20px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(5,5,8,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #7c3aed, #e94560)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', boxShadow: '0 0 20px rgba(124,58,237,0.5)' }}>◈</div>
          <div>
            <div style={{ fontSize: '0.6rem', letterSpacing: '3px', color: '#e94560', textTransform: 'uppercase' }}>Neurocinematografia</div>
            <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#fff', lineHeight: 1 }}>Kit de Intenção Visual</div>
          </div>
        </div>
        <button onClick={onEntrar}
          onMouseEnter={e => { e.target.style.background = 'rgba(124,58,237,0.3)'; e.target.style.borderColor = '#7c3aed' }}
          onMouseLeave={e => { e.target.style.background = 'rgba(124,58,237,0.1)'; e.target.style.borderColor = 'rgba(124,58,237,0.5)' }}
          style={{ padding: '10px 28px', borderRadius: '999px', border: '1px solid rgba(124,58,237,0.5)', background: 'rgba(124,58,237,0.1)', color: '#a78bfa', fontSize: '0.85rem', cursor: 'pointer', backdropFilter: 'blur(10px)', transition: 'all 0.3s ease' }}>Entrar →</button>
      </nav>

      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 32px 80px', textAlign: 'center', position: 'relative', zIndex: 2, transform: `translateY(${scrollY * 0.3}px)` }}>
        <div style={{ animation: 'fadeUp 1s ease both', animationDelay: '0.2s', marginBottom: '24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(233,69,96,0.08)', border: '1px solid rgba(233,69,96,0.2)', borderRadius: '999px', padding: '6px 20px', fontSize: '0.7rem', letterSpacing: '3px', color: '#e94560', textTransform: 'uppercase' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#e94560', animation: 'glowPulse 2s infinite' }} />
            Para criadores de vídeo
          </div>
        </div>

        <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', fontWeight: '900', lineHeight: 1.05, margin: '0 0 32px', maxWidth: '800px', animation: 'fadeUp 1s ease both', animationDelay: '0.4s' }}>
          <GlitchText text="Cada emoção" style={{ background: 'linear-gradient(135deg, #fff 0%, #c4b5fd 40%, #e94560 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }} />
          <br />
          <span style={{ color: 'rgba(255,255,255,0.9)' }}>tem uma estética.</span>
          <br />
          <span style={{ background: 'linear-gradient(135deg, #7c3aed, #00fff7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundSize: '200% auto', animation: 'shimmer 4s linear infinite' }}>Descubra a sua.</span>
        </h1>

        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.1rem', maxWidth: '520px', margin: '0 auto 56px', lineHeight: 1.7, animation: 'fadeUp 1s ease both', animationDelay: '0.6s' }}>
          Descreva o que quer transmitir. Receba paleta, tipografia, ritmo de corte, BPM, iluminação e enquadramento — em segundos.
        </p>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', animation: 'fadeUp 1s ease both', animationDelay: '0.8s' }}>
          <button onClick={onEntrar}
            onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.target.style.transform = 'scale(1)'}
            style={{ padding: '18px 52px', borderRadius: '999px', border: 'none', background: 'linear-gradient(135deg, #7c3aed, #e94560)', color: '#fff', fontSize: '1rem', fontWeight: '700', letterSpacing: '2px', cursor: 'pointer', textTransform: 'uppercase', boxShadow: '0 0 60px rgba(124,58,237,0.4), 0 0 120px rgba(233,69,96,0.2)', animation: 'pulse 3s infinite', transition: 'transform 0.2s ease' }}>Começar Grátis →</button>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.75rem', marginTop: '20px', animation: 'fadeUp 1s ease both', animationDelay: '1s' }}>Sem cartão de crédito · Grátis para sempre</p>

        <div style={{ marginTop: '80px', position: 'relative', animation: 'tiltIn 1.2s ease both', animationDelay: '1s' }}>
          <div style={{ position: 'absolute', inset: '-40px', background: 'radial-gradient(ellipse, rgba(124,58,237,0.2) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)' }} />
          <TiltCard glowColor="#7c3aed" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '28px', padding: '32px', backdropFilter: 'blur(20px)', maxWidth: '480px', margin: '0 auto' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              {['#ff5f57','#febc2e','#28c840'].map(c => <div key={c} style={{ width: '12px', height: '12px', borderRadius: '50%', background: c }} />)}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {['#0d0500','#8B3A00','#C8860A','#F5D78E'].map(cor => <div key={cor} style={{ flex: 1, height: '40px', borderRadius: '10px', background: cor, boxShadow: `0 4px 16px ${cor}66` }} />)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[{ label: 'Estilo', val: 'Luxo Cinematográfico', col: '#C8860A' },{ label: 'BPM', val: '95', col: '#C8860A' },{ label: 'Ritmo', val: '22 cortes/min', col: '#C8860A' },{ label: 'Tipografia', val: 'Montserrat Black', col: '#C8860A' }].map(item => (
                <div key={item.label} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '12px' }}>
                  <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px', marginBottom: '4px', textTransform: 'uppercase' }}>{item.label}</div>
                  <div style={{ fontSize: '0.8rem', color: item.col, fontWeight: '700' }}>{item.val}</div>
                </div>
              ))}
            </div>
          </TiltCard>
        </div>
      </section>

      <section style={{ padding: '80px 32px 120px', maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <div style={{ fontSize: '0.65rem', letterSpacing: '4px', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: '16px' }}>6 linguagens visuais</div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '900', color: '#fff', margin: 0 }}>Cada vídeo tem uma alma.</h2>
          <p style={{ color: 'rgba(255,255,255,0.3)', marginTop: '12px', fontSize: '1rem' }}>Encontre a sua em segundos.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {estilos.map((e, i) => (
            <TiltCard key={e.nome} glowColor={e.cor} style={{ background: `linear-gradient(135deg, ${e.bg}, rgba(0,0,0,0.8))`, border: `1px solid ${e.cor}22`, borderRadius: '24px', padding: '28px', animation: 'fadeUp 0.6s ease both', animationDelay: `${i * 0.1}s`, cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${e.cor}22`, border: `1px solid ${e.cor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: e.cor }}>{e.icon}</div>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: e.cor, boxShadow: `0 0 12px ${e.cor}` }} />
              </div>
              <div style={{ width: '100%', height: '3px', background: `linear-gradient(90deg, ${e.cor}, transparent)`, borderRadius: '999px', marginBottom: '16px' }} />
              <p style={{ fontSize: '1rem', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>{e.nome}</p>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>{e.emocao}</p>
            </TiltCard>
          ))}
        </div>
      </section>

      <section style={{ padding: '80px 32px 120px', textAlign: 'center', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '32px', padding: '60px 40px', backdropFilter: 'blur(20px)' }}>
          <h2 style={{ fontSize: '2.2rem', fontWeight: '900', color: '#fff', marginBottom: '16px' }}>Pronto para criar?</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '36px', fontSize: '1rem' }}>Seu próximo vídeo começa com a emoção certa.</p>
          <button onClick={onEntrar}
            onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.target.style.transform = 'scale(1)'}
            style={{ padding: '18px 52px', borderRadius: '999px', border: 'none', background: 'linear-gradient(135deg, #7c3aed, #e94560)', color: '#fff', fontSize: '1rem', fontWeight: '700', letterSpacing: '2px', cursor: 'pointer', textTransform: 'uppercase', boxShadow: '0 0 60px rgba(124,58,237,0.4)', transition: 'transform 0.2s ease' }}>Começar Grátis →</button>
        </div>
      </section>

      <footer style={{ textAlign: 'center', padding: '32px', borderTop: '1px solid rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.15)', fontSize: '0.75rem', position: 'relative', zIndex: 2 }}>
        Kit de Intenção Visual · Neurocinematografia para criadores
      </footer>
    </div>
  )
}

function TelaAuth({ onLogin }) {
  const [modo, setModo] = useState('login')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function submeter() {
    setLoading(true); setErro('')
    try {
      const url = modo === 'login' ? 'https://intencao-visual-production.up.railway.app/login' : 'https://intencao-visual-production.up.railway.app/cadastro'
      const body = modo === 'login' ? { email, senha } : { nome, email, senha }
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) { setErro(data.detail || 'Erro'); setLoading(false); return }
      onLogin(data.token, data.nome)
    } catch { setErro('Erro de conexão com o servidor') }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#050508', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI', sans-serif" }}>
      <OrbField />
      <ParticleField color="#7c3aed" count={30} />
      <div style={{ width: '100%', maxWidth: '420px', padding: '0 24px', position: 'relative', zIndex: 2, animation: 'tiltIn 0.8s ease both' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #7c3aed, #e94560)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', boxShadow: '0 0 40px rgba(124,58,237,0.5)' }}>◈</div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', background: 'linear-gradient(135deg, #fff, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '8px' }}>Kit de Intenção Visual</h1>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>{modo === 'login' ? 'Entre na sua conta' : 'Crie sua conta grátis'}</p>
        </div>
        <TiltCard glowColor="#7c3aed" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '28px', padding: '36px', backdropFilter: 'blur(20px)' }}>
          {modo === 'cadastro' && (
            <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome"
              onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.6)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '15px 18px', fontSize: '0.95rem', marginBottom: '12px', boxSizing: 'border-box', outline: 'none', transition: 'border 0.2s' }} />
          )}
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email"
            onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.6)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            style={{ width: '100%', background: 'rgba(255,255,255,0.04)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '15px 18px', fontSize: '0.95rem', marginBottom: '12px', boxSizing: 'border-box', outline: 'none', transition: 'border 0.2s' }} />
          <input value={senha} onChange={e => setSenha(e.target.value)} placeholder="Senha" type="password"
            onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.6)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            style={{ width: '100%', background: 'rgba(255,255,255,0.04)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '15px 18px', fontSize: '0.95rem', marginBottom: '20px', boxSizing: 'border-box', outline: 'none', transition: 'border 0.2s' }} />
          {erro && <p style={{ color: '#e94560', fontSize: '0.8rem', marginBottom: '12px', textAlign: 'center' }}>{erro}</p>}
          <button onClick={submeter} disabled={loading} style={{ width: '100%', padding: '16px', borderRadius: '999px', border: 'none', background: loading ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #7c3aed, #e94560)', color: loading ? 'rgba(255,255,255,0.3)' : '#fff', fontSize: '0.95rem', fontWeight: '700', letterSpacing: '2px', cursor: loading ? 'not-allowed' : 'pointer', textTransform: 'uppercase', boxShadow: loading ? 'none' : '0 0 30px rgba(124,58,237,0.3)', transition: 'all 0.3s' }}>
            {loading ? 'Aguarde...' : modo === 'login' ? 'Entrar' : 'Criar Conta'}
          </button>
          <p style={{ textAlign: 'center', marginTop: '20px', color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem' }}>
            {modo === 'login' ? 'Não tem conta? ' : 'Já tem conta? '}
            <span onClick={() => setModo(modo === 'login' ? 'cadastro' : 'login')} style={{ color: '#a78bfa', cursor: 'pointer', fontWeight: '600' }}>{modo === 'login' ? 'Cadastre-se' : 'Entre'}</span>
          </p>
        </TiltCard>
      </div>
    </div>
  )
}

const PRESETS = {
  blade: { keywords: ['blade','cyberpunk','neon','futurista','tech','matrix'], nome: 'Cyberpunk', emocao: 'Tensão · Adrenalina · Desorientação', paleta: ['#0a0a0f','#00fff7','#7c3aed','#ff006e'], tipografia: 'Rajdhani Bold', ritmo: '32 cortes/min', bpm: 140, iluminacao: 'Neon lateral · Chuva de luz', enquadramento: 'Close extremo', bg: ['#0a0a0f','#0d1f3c','#1a0533'], glow: '#00fff7', accent: '#7c3aed', cenas: [{ desc: 'Silhueta contra neon', luz: 'Contraluz ciano', cam: 'Close extremo' },{ desc: 'Chuva em slow motion', luz: 'Reflexo no asfalto', cam: 'Travelling lateral' },{ desc: 'Olhar direto câmera', luz: 'LED lateral duro', cam: 'Close olhos' }], audio: { tipo: 'cyberpunk', descricao: 'Sintetizador metálico + glitch', efeito: 'Gera tensão e adrenalina' } },
  poder: { keywords: ['poder','urgência','força','luxo','cartier','sdm','rap','trap','épico'], nome: 'Luxo Cinematográfico', emocao: 'Poder · Status · Inevitabilidade', paleta: ['#0d0500','#8B3A00','#C8860A','#F5D78E'], tipografia: 'Montserrat Black', ritmo: '22 cortes/min', bpm: 95, iluminacao: 'Tungstênio quente · Sombra épica', enquadramento: 'Ângulo baixo', bg: ['#0d0500','#1a0800','#2d1200'], glow: '#C8860A', accent: '#8B3A00', cenas: [{ desc: 'Detalhe relógio dourado', luz: 'Luz dourada lateral', cam: 'Macro extremo' },{ desc: 'Artista em ambiente luxuoso', luz: 'Tungstênio + fill suave', cam: 'Ângulo baixo' },{ desc: 'Fumaça em slow motion', luz: 'Backlight dourado', cam: 'Travelling lateral' }], audio: { tipo: 'trap', descricao: 'Kick 808 grave + hi-hat seco', efeito: 'Ativa sensação de poder e status' } },
  romance: { keywords: ['romance','amor','suave','delicado','intimidade','saudade'], nome: 'Romance Etéreo', emocao: 'Nostalgia · Vulnerabilidade · Conexão', paleta: ['#1a0010','#8B0050','#FF6B9D','#FFD6E8'], tipografia: 'Cormorant Garamond', ritmo: '12 cortes/min', bpm: 72, iluminacao: 'Luz difusa · Bokeh profundo', enquadramento: 'Plano aberto', bg: ['#1a0010','#2d0020','#1a0a1a'], glow: '#FF6B9D', accent: '#8B0050', cenas: [{ desc: 'Mãos se tocando', luz: 'Janela natural difusa', cam: 'Close olhos' },{ desc: 'Olhar perdido na distância', luz: 'Golden hour', cam: 'Plano aberto' },{ desc: 'Detalhe — lágrima', luz: 'Rim light suave', cam: 'Macro extremo' }], audio: { tipo: 'romance', descricao: 'Pad suave + melodia de piano', efeito: 'Ativa oxitocina — gera empatia' } },
  misterio: { keywords: ['mistério','sombrio','dark','noir','suspense','thriller','crime'], nome: 'Noir Contemporâneo', emocao: 'Ansiedade · Fascínio · Perigo', paleta: ['#000000','#0a0a0a','#1a1a2e','#4a4a6a'], tipografia: 'Playfair Display', ritmo: '18 cortes/min', bpm: 85, iluminacao: 'Contraluz duro · Sombra absoluta', enquadramento: 'Plano médio', bg: ['#000000','#0a0a1a','#050510'], glow: '#6a6aaa', accent: '#2a2a4a', cenas: [{ desc: 'Rosto metade na sombra', luz: 'Single key lateral', cam: 'Close extremo' },{ desc: 'Corredor com névoa', luz: 'Luz de fundo fraca', cam: 'Plano médio' },{ desc: 'Detalhe — mão nervosa', luz: 'Sem fill, só key', cam: 'Close olhos' }], audio: { tipo: 'noir', descricao: 'Baixo profundo + silêncio dramático', efeito: 'Ativa amígdala — gera tensão' } },
  epico: { keywords: ['épico','guerra','batalha','herói','dune','grandioso','histórico'], nome: 'Épico Cinematográfico', emocao: 'Grandiosidade · Sacrifício · Destino', paleta: ['#0a0500','#3d1a00','#8B4513','#DAA520'], tipografia: 'Cinzel Bold', ritmo: '18 cortes/min', bpm: 88, iluminacao: 'Luz épica lateral · Névoa dramática', enquadramento: 'Grande angular', bg: ['#0a0500','#1a0800','#2d1500'], glow: '#DAA520', accent: '#8B4513', cenas: [{ desc: 'Exército no horizonte', luz: 'Pôr do sol épico', cam: 'Plano aberto' },{ desc: 'Herói de costas', luz: 'Backlight dourado', cam: 'Ângulo baixo' },{ desc: 'Olhar determinado', luz: 'Luz lateral dura', cam: 'Close extremo' }], audio: { tipo: 'noir', descricao: 'Orquestra + percussão épica', efeito: 'Ativa senso de grandiosidade' } },
  minimalista: { keywords: ['minimalista','clean','simples','moderno','elegante','corporativo'], nome: 'Minimalismo Moderno', emocao: 'Clareza · Confiança · Sofisticação', paleta: ['#ffffff','#f5f5f5','#333333','#000000'], tipografia: 'Helvetica Neue Light', ritmo: '15 cortes/min', bpm: 80, iluminacao: 'Luz difusa branca · Alto key', enquadramento: 'Plano médio', bg: ['#0a0a0a','#111111','#1a1a1a'], glow: '#ffffff', accent: '#333333', cenas: [{ desc: 'Produto em fundo branco', luz: 'Softbox frontal', cam: 'Plano médio' },{ desc: 'Detalhe de textura', luz: 'Luz rasante lateral', cam: 'Macro extremo' },{ desc: 'Pessoa em ambiente clean', luz: 'Natural difusa', cam: 'Plano aberto' }], audio: { tipo: 'romance', descricao: 'Piano minimalista + silêncio', efeito: 'Transmite clareza e foco' } },
}

const FORMATOS = {
  youtube: { label: 'YouTube', ratio: '16:9', icon: '▶', w: 320, h: 180 },
  instagram: { label: 'Instagram', ratio: '1:1', icon: '◈', w: 240, h: 240 },
  filme: { label: 'Filme', ratio: '2.39:1', icon: '◻', w: 320, h: 134 },
  clipe: { label: 'Clipe', ratio: '9:16', icon: '◆', w: 150, h: 267 },
}

const DEFAULT = PRESETS.poder

function detectPreset(text) {
  const lower = text.toLowerCase()
  for (const [, p] of Object.entries(PRESETS)) {
    if (p.keywords.some(k => lower.includes(k))) return p
  }
  return null
}

class AudioEngine {
  constructor() { this.loop = null; this.synths = [] }
  async start(tipo, bpm) {
    await Tone.start(); this.stop()
    Tone.getTransport().bpm.value = bpm
    if (tipo === 'trap') this.playTrap()
    else if (tipo === 'cyberpunk') this.playCyberpunk()
    else if (tipo === 'romance') this.playRomance()
    else this.playNoir()
    Tone.getTransport().start()
  }
  playTrap() {
    const kick = new Tone.MembraneSynth({ pitchDecay: 0.08, octaves: 6 }).toDestination()
    const hihat = new Tone.MetalSynth({ frequency: 400, envelope: { attack: 0.001, decay: 0.05, release: 0.01 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5 }).toDestination()
    hihat.volume.value = -18
    const bass = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.8, sustain: 0.2, release: 0.5 } }).toDestination()
    bass.volume.value = -6
    this.loop = new Tone.Sequence((time, step) => {
      if (step === 0 || step === 8) kick.triggerAttackRelease('C1', '8n', time)
      if (step % 2 === 0) hihat.triggerAttackRelease('16n', time)
      if (step === 4) bass.triggerAttackRelease('C2', '4n', time)
      if (step === 12) bass.triggerAttackRelease('G1', '4n', time)
    }, [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15], '16n')
    this.synths = [kick, hihat, bass]; this.loop.start(0)
  }
  playCyberpunk() {
    const lead = new Tone.Synth({ oscillator: { type: 'sawtooth' }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.2 } })
    const dist = new Tone.Distortion(0.4); const rev = new Tone.Reverb(0.5)
    lead.chain(dist, rev, Tone.getDestination()); lead.volume.value = -14
    const kick = new Tone.MembraneSynth({ pitchDecay: 0.04, octaves: 4 }).toDestination(); kick.volume.value = -8
    const notes = ['C4','Eb4','G4','Bb4','C5','Bb4','Ab4','G4']
    this.loop = new Tone.Sequence((time, step) => {
      lead.triggerAttackRelease(notes[step % notes.length], '16n', time)
      if (step % 4 === 0) kick.triggerAttackRelease('C1', '8n', time)
    }, [0,1,2,3,4,5,6,7], '16n')
    this.synths = [lead, kick, dist, rev]; this.loop.start(0)
  }
  playRomance() {
    const piano = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.02, decay: 1.2, sustain: 0.3, release: 2 } })
    const rev = new Tone.Reverb(4); rev.wet.value = 0.6
    piano.chain(rev, Tone.getDestination()); piano.volume.value = -10
    const melody = ['E4','G4','B4','E5','D5','B4','G4','A4']
    this.loop = new Tone.Sequence((time, step) => {
      piano.triggerAttackRelease(melody[step % melody.length], '4n', time)
    }, [0,1,2,3,4,5,6,7], '4n')
    this.synths = [piano, rev]; this.loop.start(0)
  }
  playNoir() {
    const bass = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.1, decay: 1.5, sustain: 0.4, release: 2 } })
    const rev = new Tone.Reverb(3); rev.wet.value = 0.5
    bass.chain(rev, Tone.getDestination()); bass.volume.value = -8
    this.loop = new Tone.Sequence((time, step) => {
      if (step === 0) bass.triggerAttackRelease('C2', '2n', time)
      if (step === 8) bass.triggerAttackRelease('G1', '2n', time)
    }, [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15], '16n')
    this.synths = [bass, rev]; this.loop.start(0)
  }
  stop() {
    Tone.getTransport().stop(); Tone.getTransport().cancel()
    if (this.loop) { this.loop.stop(); this.loop.dispose(); this.loop = null }
    this.synths.forEach(s => { try { s.dispose() } catch(e) {} }); this.synths = []
  }
}

const audioEngine = new AudioEngine()

function usePulse(bpm, active) {
  const [pulse, setPulse] = useState(false)
  useEffect(() => {
    if (!active) return
    const ms = Math.round(60000 / bpm)
    const t = setInterval(() => { setPulse(true); setTimeout(() => setPulse(false), 80) }, ms)
    return () => clearInterval(t)
  }, [bpm, active])
  return pulse
}

function CameraView({ tipo, glow }) {
  const configs = {
    'Close extremo': (<svg viewBox="0 0 200 120" style={{ width: '100%', height: '100%' }}><rect x="60" y="20" width="80" height="80" rx="40" fill="none" stroke={glow} strokeWidth="1.5" opacity="0.4" /><rect x="75" y="35" width="50" height="50" rx="25" fill="none" stroke={glow} strokeWidth="1.5" opacity="0.7" /><circle cx="100" cy="60" r="14" fill={glow} opacity="0.15" /><circle cx="100" cy="60" r="6" fill={glow} opacity="0.6" /><text x="100" y="108" textAnchor="middle" fill={glow} fontSize="7" opacity="0.5" letterSpacing="2">EXTREME CLOSE-UP</text></svg>),
    'Ângulo baixo': (<svg viewBox="0 0 200 120" style={{ width: '100%', height: '100%' }}><polygon points="100,15 30,95 170,95" fill="none" stroke={glow} strokeWidth="1.5" opacity="0.5" /><circle cx="100" cy="15" r="5" fill={glow} opacity="0.8" /><text x="100" y="116" textAnchor="middle" fill={glow} fontSize="7" opacity="0.5" letterSpacing="2">LOW ANGLE</text></svg>),
    'Macro extremo': (<svg viewBox="0 0 200 120" style={{ width: '100%', height: '100%' }}><circle cx="100" cy="55" r="35" fill="none" stroke={glow} strokeWidth="1.5" opacity="0.3" /><circle cx="100" cy="55" r="20" fill="none" stroke={glow} strokeWidth="1.5" opacity="0.5" /><circle cx="100" cy="55" r="8" fill={glow} opacity="0.2" /><circle cx="100" cy="55" r="3" fill={glow} opacity="0.9" /><text x="100" y="108" textAnchor="middle" fill={glow} fontSize="7" opacity="0.5" letterSpacing="2">MACRO LENS</text></svg>),
    'Plano aberto': (<svg viewBox="0 0 200 120" style={{ width: '100%', height: '100%' }}><rect x="15" y="25" width="170" height="70" rx="4" fill="none" stroke={glow} strokeWidth="1.5" opacity="0.4" /><rect x="85" y="45" width="30" height="30" fill="none" stroke={glow} strokeWidth="1" opacity="0.6" /><text x="100" y="108" textAnchor="middle" fill={glow} fontSize="7" opacity="0.5" letterSpacing="2">WIDE SHOT</text></svg>),
    'Travelling lateral': (<svg viewBox="0 0 200 120" style={{ width: '100%', height: '100%' }}><rect x="70" y="45" width="60" height="30" rx="3" fill="none" stroke={glow} strokeWidth="1.5" opacity="0.5" /><polygon points="20,55 5,60 20,65" fill={glow} opacity="0.6" /><line x1="20" y1="60" x2="70" y2="60" stroke={glow} strokeWidth="1.5" opacity="0.4" strokeDasharray="5 3" /><text x="100" y="108" textAnchor="middle" fill={glow} fontSize="7" opacity="0.5" letterSpacing="2">TRACKING SHOT</text></svg>),
    'Plano médio': (<svg viewBox="0 0 200 120" style={{ width: '100%', height: '100%' }}><rect x="40" y="15" width="120" height="90" rx="4" fill="none" stroke={glow} strokeWidth="1.5" opacity="0.4" /><rect x="75" y="25" width="50" height="45" fill="none" stroke={glow} strokeWidth="1" opacity="0.6" /><text x="100" y="112" textAnchor="middle" fill={glow} fontSize="7" opacity="0.5" letterSpacing="2">MEDIUM SHOT</text></svg>),
    'Close olhos': (<svg viewBox="0 0 200 120" style={{ width: '100%', height: '100%' }}><path d="M30,60 Q100,20 170,60 Q100,100 30,60" fill="none" stroke={glow} strokeWidth="1.5" opacity="0.5" /><ellipse cx="100" cy="60" rx="22" ry="16" fill="none" stroke={glow} strokeWidth="1.5" opacity="0.7" /><circle cx="100" cy="60" r="4" fill={glow} opacity="0.7" /><text x="100" y="108" textAnchor="middle" fill={glow} fontSize="7" opacity="0.5" letterSpacing="2">INSERT SHOT</text></svg>),
  }
  return <div style={{ width: '100%', height: '100px' }}>{configs[tipo] || configs['Plano médio']}</div>
}

function PreviewFilme({ preset, formato, active }) {
  const [cena, setCena] = useState(0)
  const [fade, setFade] = useState(true)
  const pulse = usePulse(preset.bpm, active)
  const fmt = FORMATOS[formato]
  useEffect(() => {
    if (!active) return
    const delay = Math.max(1800, Math.round(60000 / parseInt(preset.ritmo)))
    const t = setInterval(() => { setFade(false); setTimeout(() => { setCena(c => (c + 1) % preset.cenas.length); setFade(true) }, 300) }, delay)
    return () => clearInterval(t)
  }, [active, preset])
  const cenaAtual = preset.cenas[cena]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div style={{ width: `${fmt.w}px`, height: `${fmt.h}px`, borderRadius: '14px', overflow: 'hidden', position: 'relative', background: `linear-gradient(135deg, ${preset.bg[0]}, ${preset.bg[1]}, ${preset.bg[2]})`, boxShadow: pulse ? `0 0 50px ${preset.glow}66` : `0 0 25px ${preset.glow}33`, transition: 'box-shadow 0.1s ease', border: `1px solid ${preset.glow}33` }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${preset.glow}06 1px, transparent 1px), linear-gradient(90deg, ${preset.glow}06 1px, transparent 1px)`, backgroundSize: '30px 30px' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%', display: 'flex', alignItems: 'flex-end', gap: '3px', padding: '8px', opacity: fade ? 1 : 0, transition: 'opacity 0.3s ease' }}>
          {preset.paleta.map((cor, i) => <div key={i} style={{ flex: 1, borderRadius: '4px', background: cor, height: `${35 + i * 18}%`, transition: 'height 0.4s ease' }} />)}
        </div>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '10px 12px', opacity: fade ? 1 : 0, transition: 'opacity 0.3s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', borderRadius: '999px', padding: '3px 10px', fontSize: '0.55rem', color: preset.glow, letterSpacing: '2px' }}>{fmt.ratio} · {fmt.label.toUpperCase()}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', borderRadius: '999px', padding: '3px 10px', fontSize: '0.55rem', color: '#fff' }}>
              <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: pulse ? preset.glow : 'rgba(255,255,255,0.3)', transition: 'all 0.1s' }} />
              {preset.bpm} BPM
            </div>
          </div>
          <div style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.88))', margin: '-10px -12px -10px', padding: '20px 12px 10px' }}>
            <p style={{ fontSize: '0.6rem', color: preset.glow, letterSpacing: '1px', marginBottom: '2px', textTransform: 'uppercase' }}>{cenaAtual.cam}</p>
            <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.85)', fontWeight: '600' }}>{cenaAtual.desc}</p>
            <p style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>💡 {cenaAtual.luz}</p>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        {preset.cenas.map((_, i) => <div key={i} style={{ width: i === cena ? '18px' : '5px', height: '5px', borderRadius: '999px', background: i === cena ? preset.glow : 'rgba(255,255,255,0.15)', transition: 'all 0.3s ease' }} />)}
      </div>
    </div>
  )
}

function BPMVisual({ bpm, glow, active }) {
  const pulse = usePulse(bpm, active)
  const [heights, setHeights] = useState([0.4,0.7,1,0.6,0.85,0.5,0.9,0.65])
  useEffect(() => {
    if (!active) return
    const ms = Math.round(60000 / bpm)
    const t = setInterval(() => setHeights([0.4,0.7,1,0.6,0.85,0.5,0.9,0.65].map(() => 0.3 + Math.random() * 0.7)), ms)
    return () => clearInterval(t)
  }, [bpm, active])
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '32px' }}>
        {heights.map((h, i) => <div key={i} style={{ width: '4px', borderRadius: '2px', height: `${h * 32}px`, background: glow, opacity: 0.5 + h * 0.5, transition: `height ${Math.round(60000 / bpm * 0.8)}ms ease`, boxShadow: pulse ? `0 0 6px ${glow}` : 'none' }} />)}
      </div>
      <span style={{ fontSize: '1.6rem', fontWeight: '800', color: glow, letterSpacing: '-1px' }}>{bpm}</span>
      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px' }}>BPM</span>
    </div>
  )
}

export default function App() {
  const { user, login, logout } = useAuth()
  const [mostrarAuth, setMostrarAuth] = useState(false)
  const [emocao, setEmocao] = useState('')
  const [formato, setFormato] = useState('clipe')
  const [resultado, setResultado] = useState(null)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [audioOn, setAudioOn] = useState(false)
  const [aba, setAba] = useState('gerar')
  const [meusKits, setMeusKits] = useState([])

  useEffect(() => { setPreview(emocao.length > 3 ? detectPreset(emocao) : null) }, [emocao])
  useEffect(() => () => audioEngine.stop(), [])

  if (!user && mostrarAuth) return <TelaAuth onLogin={login} />
  if (!user) return <TelaLanding onEntrar={() => setMostrarAuth(true)} />

  async function gerarKit() {
    setLoading(true)
    try {
      const res = await fetch('https://intencao-visual-production.up.railway.app/gerar-kit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
        body: JSON.stringify({ emocao, formato })
      })
      const data = await res.json()
      const local = detectPreset(emocao) || DEFAULT
      setResultado({ ...local, ...data, bg: local.bg, glow: local.glow, cenas: local.cenas })
    } catch {
      const local = detectPreset(emocao) || DEFAULT
      setResultado(local)
    } finally { setLoading(false) }
  }

  async function carregarKits() {
    try {
      const res = await fetch('https://intencao-visual-production.up.railway.app/meus-kits', { headers: { 'Authorization': `Bearer ${user.token}` } })
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
      const res = await fetch('https://intencao-visual-production.up.railway.app/criar-assinatura', {
        method: 'POST', headers: { 'Authorization': `Bearer ${user.token}` }
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch { alert('Erro ao iniciar checkout. Tente novamente.') }
  }

  const active = resultado || preview

  return (
    <div style={{ minHeight: '100vh', background: '#050508', color: '#fff', fontFamily: "'Segoe UI', sans-serif" }}>
      <OrbField />
      <ParticleField color={active ? active.glow : '#7c3aed'} count={40} />

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '80px 28px 60px', position: 'relative', zIndex: 2 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
          <div style={{ animation: 'slideIn 0.6s ease both' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #7c3aed, #e94560)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', boxShadow: `0 0 20px ${active ? active.glow + '66' : 'rgba(124,58,237,0.5)'}`, transition: 'box-shadow 1s ease' }}>◈</div>
              <div style={{ fontSize: '0.6rem', letterSpacing: '3px', color: '#e94560', textTransform: 'uppercase' }}>Neurocinematografia</div>
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: '900', lineHeight: 1.1, background: `linear-gradient(135deg, #fff 0%, ${active ? active.glow : '#a78bfa'} 60%, #e94560 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', transition: 'background 1.2s ease', margin: 0 }}>Kit de Intenção<br />Visual</h1>
          </div>
          <div style={{ textAlign: 'right', animation: 'slideIn 0.6s ease both' }}>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>Olá, {user.nome}</p>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button onClick={assinarPro}
                onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
                onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                style={{ background: 'linear-gradient(135deg, #7c3aed, #e94560)', border: 'none', borderRadius: '999px', padding: '7px 18px', color: '#fff', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', letterSpacing: '1px', boxShadow: '0 0 20px rgba(124,58,237,0.4)', transition: 'transform 0.2s' }}>⚡ Pro</button>
              <button onClick={logout} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '999px', padding: '7px 16px', color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', cursor: 'pointer' }}>Sair</button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '36px', background: 'rgba(255,255,255,0.02)', borderRadius: '999px', padding: '4px', width: 'fit-content', border: '1px solid rgba(255,255,255,0.05)' }}>
          {[['gerar', 'Gerar Kit'], ['historico', 'DNA Visual']].map(([key, label]) => (
            <button key={key} onClick={() => { setAba(key); if (key === 'historico') carregarKits() }} style={{ padding: '8px 22px', borderRadius: '999px', border: 'none', background: aba === key ? 'linear-gradient(135deg, rgba(124,58,237,0.4), rgba(233,69,96,0.3))' : 'transparent', color: aba === key ? '#fff' : 'rgba(255,255,255,0.35)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: aba === key ? '700' : '400', transition: 'all 0.3s', boxShadow: aba === key ? '0 0 20px rgba(124,58,237,0.2)' : 'none' }}>{label}</button>
          ))}
        </div>

        {aba === 'historico' && (
          <div style={{ animation: 'fadeUp 0.5s ease both' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff', marginBottom: '24px' }}>DNA Visual</h2>
            {meusKits.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 40px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px' }}>
                <p style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🎬</p>
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.9rem' }}>Nenhum kit gerado ainda.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {meusKits.map((kit, i) => (
                  <TiltCard key={kit.id} glowColor="#7c3aed" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '18px', padding: '20px 24px', animation: 'fadeUp 0.4s ease both', animationDelay: `${i * 0.08}s` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ fontSize: '0.55rem', letterSpacing: '2px', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: '6px' }}>{kit.formato}</p>
                        <p style={{ fontSize: '1rem', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>{kit.estilo}</p>
                        <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>"{kit.emocao}"</p>
                      </div>
                      <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)' }}>{new Date(kit.criado_em).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </TiltCard>
                ))}
              </div>
            )}
          </div>
        )}

        {aba === 'gerar' && (
          <div style={{ animation: 'fadeUp 0.5s ease both' }}>
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '0.6rem', letterSpacing: '3px', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: '12px' }}>Formato</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {Object.entries(FORMATOS).map(([key, fmt]) => (
                  <button key={key} onClick={() => setFormato(key)} style={{ padding: '8px 18px', borderRadius: '999px', border: `1px solid ${formato === key ? (active ? active.glow : '#7c3aed') : 'rgba(255,255,255,0.08)'}`, background: formato === key ? `${active ? active.glow : '#7c3aed'}18` : 'rgba(255,255,255,0.02)', color: formato === key ? (active ? active.glow : '#a78bfa') : 'rgba(255,255,255,0.3)', fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.3s ease', fontWeight: formato === key ? '700' : '400', boxShadow: formato === key ? `0 0 16px ${active ? active.glow + '33' : 'rgba(124,58,237,0.2)'}` : 'none' }}>
                    {fmt.icon} {fmt.label}
                  </button>
                ))}
              </div>
            </div>

            {active && (
              <TiltCard glowColor={active.glow} style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center', padding: '32px', background: 'rgba(0,0,0,0.4)', borderRadius: '28px', border: `1px solid ${active.glow}18`, backdropFilter: 'blur(20px)', animation: 'tiltIn 0.6s ease both' }}>
                <PreviewFilme preset={active} formato={formato} active={true} />
              </TiltCard>
            )}

            <textarea value={emocao} onChange={e => setEmocao(e.target.value)}
              placeholder="Ex: quero algo como o clipe Cartier Santos do SDM — luxuoso, dourado, poderoso..."
              style={{ width: '100%', height: '110px', background: 'rgba(255,255,255,0.02)', color: '#fff', border: `1px solid ${active ? active.glow + '44' : 'rgba(124,58,237,0.2)'}`, borderRadius: '20px', padding: '20px 24px', fontSize: '0.95rem', resize: 'none', boxSizing: 'border-box', outline: 'none', lineHeight: 1.6, backdropFilter: 'blur(10px)', transition: 'border 0.5s ease', boxShadow: active ? `0 0 30px ${active.glow}11` : 'none' }}
            />

            <div style={{ display: 'flex', gap: '12px', marginTop: '14px' }}>
              <button onClick={gerarKit} disabled={loading} style={{ flex: 1, padding: '17px', borderRadius: '999px', border: 'none', background: loading ? 'rgba(255,255,255,0.04)' : `linear-gradient(135deg, ${active ? active.glow : '#7c3aed'}, #e94560)`, color: loading ? 'rgba(255,255,255,0.25)' : '#fff', fontSize: '0.9rem', fontWeight: '700', letterSpacing: '2px', cursor: loading ? 'not-allowed' : 'pointer', textTransform: 'uppercase', transition: 'all 0.5s ease', boxShadow: loading ? 'none' : `0 0 40px ${active ? active.glow + '44' : 'rgba(124,58,237,0.3)'}` }}>
                {loading ? 'Gerando...' : 'Gerar Kit →'}
              </button>
              {active && (
                <button onClick={toggleAudio} style={{ padding: '17px 24px', borderRadius: '999px', border: `1px solid ${active.glow}44`, background: audioOn ? `${active.glow}22` : 'rgba(255,255,255,0.02)', color: audioOn ? active.glow : 'rgba(255,255,255,0.4)', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.3s ease', fontWeight: '600', backdropFilter: 'blur(10px)' }}>
                  {audioOn ? '⏹ Stop' : '▶ Ouvir'}
                </button>
              )}
            </div>

            {resultado && (
              <div style={{ marginTop: '48px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <TiltCard glowColor={resultado.glow} style={{ textAlign: 'center', padding: '28px', background: `${resultado.glow}0e`, border: `1px solid ${resultado.glow}33`, borderRadius: '24px', animation: 'tiltIn 0.6s ease both' }}>
                  <p style={{ fontSize: '0.55rem', letterSpacing: '3px', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: '8px' }}>Estilo Detectado</p>
                  <p style={{ fontSize: '1.4rem', fontWeight: '900', color: resultado.glow, marginBottom: '6px', textShadow: `0 0 30px ${resultado.glow}` }}>{resultado.nome}</p>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>{resultado.emocao}</p>
                </TiltCard>

                <TiltCard glowColor={resultado.glow} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${resultado.glow}18`, borderRadius: '24px', padding: '24px' }}>
                  <p style={{ fontSize: '0.55rem', letterSpacing: '3px', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: '16px' }}>🎵 BPM Musical</p>
                  <BPMVisual bpm={resultado.bpm} glow={resultado.glow} active={true} />
                </TiltCard>

                <TiltCard glowColor={resultado.glow} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${resultado.glow}18`, borderRadius: '24px', padding: '24px' }}>
                  <p style={{ fontSize: '0.55rem', letterSpacing: '3px', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: '16px' }}>🎨 Paleta de Cores</p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {resultado.paleta.map(cor => (
                      <div key={cor} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                        <div style={{ width: '100%', height: '54px', borderRadius: '14px', background: cor, boxShadow: `0 8px 24px ${cor}55`, transition: 'transform 0.2s', cursor: 'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)'}
                          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1) translateY(0)'}
                        />
                        <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.2)' }}>{cor}</span>
                      </div>
                    ))}
                  </div>
                </TiltCard>

                <TiltCard glowColor={resultado.glow} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${resultado.glow}18`, borderRadius: '24px', padding: '24px' }}>
                  <p style={{ fontSize: '0.55rem', letterSpacing: '3px', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: '16px' }}>📐 Enquadramento</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {resultado.cenas.map((c, i) => (
                      <div key={i} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '16px', padding: '14px', border: `1px solid ${resultado.glow}14` }}>
                        <CameraView tipo={c.cam} glow={resultado.glow} />
                        <p style={{ fontSize: '0.7rem', color: resultado.glow, fontWeight: '700', textAlign: 'center', marginTop: '6px' }}>{c.cam}</p>
                        <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: '2px' }}>{c.desc}</p>
                      </div>
                    ))}
                  </div>
                </TiltCard>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {[{ emoji: '✍️', label: 'Tipografia', valor: resultado.tipografia },{ emoji: '✂️', label: 'Ritmo de Corte', valor: resultado.ritmo },{ emoji: '💡', label: 'Iluminação', valor: resultado.iluminacao },{ emoji: '🎬', label: 'Formato', valor: `${FORMATOS[formato].label} · ${FORMATOS[formato].ratio}` }].map(item => (
                    <TiltCard key={item.label} glowColor={resultado.glow} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${resultado.glow}14`, borderRadius: '20px', padding: '20px' }}>
                      <p style={{ fontSize: '0.55rem', letterSpacing: '2px', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: '8px' }}>{item.emoji} {item.label}</p>
                      <p style={{ fontSize: '0.88rem', color: '#e2e8f0', fontWeight: '600' }}>{item.valor}</p>
                    </TiltCard>
                  ))}
                </div>

                <TiltCard glowColor={resultado.glow} style={{ background: `linear-gradient(135deg, ${resultado.glow}0e, rgba(233,69,96,0.05))`, border: `1px solid ${resultado.glow}28`, borderRadius: '24px', padding: '24px' }}>
                  <p style={{ fontSize: '0.55rem', letterSpacing: '3px', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: '16px' }}>🎥 Direção de Cena</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {resultado.cenas.map((c, i) => (
                      <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: `${resultado.glow}18`, border: `1px solid ${resultado.glow}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: resultado.glow, flexShrink: 0, boxShadow: `0 0 12px ${resultado.glow}33` }}>{i + 1}</div>
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