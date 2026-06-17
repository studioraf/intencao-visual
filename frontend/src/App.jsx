cat > /mnt/user-data/outputs/App.jsx << 'ENDOFFILE'
import { useState, useEffect, useRef } from 'react'
import * as Tone from 'tone'
import { useT, detectLang } from './i18n'

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
        @keyframes buildIn { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }
        @keyframes barGrow { from{width:0} to{width:100%} }
        @keyframes typewriter { from{width:0;overflow:hidden} to{width:100%;overflow:hidden} }
        @keyframes colorDrop { from{opacity:0;transform:translateY(-20px) scale(0.8)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes waveform { 0%,100%{transform:scaleY(0.3)} 50%{transform:scaleY(1)} }
        @keyframes scanH { 0%{transform:translateX(-100%)} 100%{transform:translateX(400%)} }
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

// ── MINIPLAYER CINEMATICO ─────────────────────────────────────────────────────
// Renderiza em tempo real todos os elementos visuais: paleta, fonte, ritmo, BPM, cena
function CinematicMiniPlayer({ preset, formato, phase = 'idle' }) {
  const canvasRef = useRef(null)
  const stateRef = useRef({ cenaIdx: 0, lastCut: 0, flash: 0, grain: [], buildStep: 0, lastBuild: 0 })
  const fmt = (FORMATOS && FORMATOS[formato]) || { w: 150, h: 267, ratio: '9:16', label: 'Clipe' }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width = fmt.w
    const H = canvas.height = fmt.h
    const bpm = preset.bpm
    const msPerBeat = 60000 / bpm
    const cortes = parseInt(preset.ritmo) || 20
    const msPorCorte = 60000 / cortes

    const s = stateRef.current
    s.grain = Array.from({ length: 150 }, () => ({ x: Math.random() * W, y: Math.random() * H }))
    s.buildStep = 0
    s.lastBuild = 0

    function hexToRgb(hex) {
      try {
        const h = hex.replace('#', '')
        return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) }
      } catch { return {r:124,g:58,b:237} }
    }

    let raf
    function draw(ts) {
      // Build progressivo: a cada 600ms revela um novo elemento
      if (ts - s.lastBuild > 600 && s.buildStep < 6) {
        s.buildStep++
        s.lastBuild = ts
      }

      // Corte de câmera
      if (ts - s.lastCut > msPorCorte) {
        s.lastCut = ts
        s.cenaIdx = (s.cenaIdx + 1) % preset.cenas.length
        s.flash = 1
      }
      if (s.flash > 0) s.flash = Math.max(0, s.flash - 16/80)

      ctx.clearRect(0, 0, W, H)

      // === LAYER 1: Fundo com movimento de câmera ===
      const moveX = Math.sin(ts / 4000) * 6
      const moveY = Math.cos(ts / 5000) * 4
      const scale = 1 + Math.sin(ts / 3000) * 0.025

      ctx.save()
      ctx.translate(W/2 + moveX, H/2 + moveY)
      ctx.scale(scale, scale)
      ctx.translate(-W/2, -H/2)

      const bg = ctx.createLinearGradient(0, 0, W, H)
      bg.addColorStop(0, preset.bg[0])
      bg.addColorStop(0.5, preset.bg[1])
      bg.addColorStop(1, preset.bg[2])
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      // Grid de luz (layer cinematográfico)
      ctx.strokeStyle = preset.glow + '0a'
      ctx.lineWidth = 0.5
      for (let x = 0; x < W; x += 18) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke() }
      for (let y = 0; y < H; y += 18) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke() }
      ctx.restore()

      // === LAYER 2: PALETA — barras crescendo da base (buildStep >= 1) ===
      if (s.buildStep >= 1) {
        const progress = Math.min(1, (s.buildStep - 1) * 0.4 + 0.6)
        preset.paleta.forEach((cor, i) => {
          const beatAnim = 0.4 + 0.6 * Math.abs(Math.sin(ts / msPerBeat + i * 0.8))
          const maxH = H * 0.22 * beatAnim * progress
          const rgb = hexToRgb(cor)
          ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.75)`
          const bw = W / preset.paleta.length
          if (ctx.roundRect) {
            ctx.beginPath()
            ctx.roundRect(i * bw + 1, H - maxH, bw - 2, maxH, [3, 3, 0, 0])
            ctx.fill()
          } else {
            ctx.fillRect(i * bw + 1, H - maxH, bw - 2, maxH)
          }
          // Glow no topo de cada barra
          const grad = ctx.createLinearGradient(0, H - maxH - 4, 0, H - maxH + 4)
          grad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`)
          grad.addColorStop(0.5, `rgba(${rgb.r},${rgb.g},${rgb.b},0.9)`)
          grad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`)
          ctx.fillStyle = grad
          ctx.fillRect(i * bw, H - maxH - 4, bw, 8)
        })
      }

      // === LAYER 3: REGRA DOS TERÇOS (buildStep >= 2) ===
      if (s.buildStep >= 2) {
        const opacity = Math.min(1, (s.buildStep - 2) * 0.5 + 0.3) * 0.25
        ctx.strokeStyle = preset.glow + Math.floor(opacity * 255).toString(16).padStart(2,'0')
        ctx.lineWidth = 0.8
        ctx.setLineDash([3, 4])
        ctx.beginPath(); ctx.moveTo(W/3, 0); ctx.lineTo(W/3, H); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(W*2/3, 0); ctx.lineTo(W*2/3, H); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(0, H/3); ctx.lineTo(W, H/3); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(0, H*2/3); ctx.lineTo(W, H*2/3); ctx.stroke()
        ctx.setLineDash([])

        // Pontos de intersecção
        [[W/3,H/3],[W*2/3,H/3],[W/3,H*2/3],[W*2/3,H*2/3]].forEach(([px,py]) => {
          ctx.beginPath()
          ctx.arc(px, py, 3, 0, Math.PI*2)
          ctx.fillStyle = preset.glow + '66'
          ctx.fill()
        })
      }

      // === LAYER 4: VINHETA ===
      const vig = ctx.createRadialGradient(W/2, H/2, H*0.15, W/2, H/2, H*0.75)
      vig.addColorStop(0, 'transparent')
      vig.addColorStop(1, 'rgba(0,0,0,0.75)')
      ctx.fillStyle = vig
      ctx.fillRect(0, 0, W, H)

      // === LAYER 5: GRAIN CINEMATOGRÁFICO ===
      ctx.fillStyle = `rgba(255,255,255,${0.015 + Math.random()*0.025})`
      s.grain.forEach(g => {
        g.x += (Math.random()-0.5)*0.8
        g.y += (Math.random()-0.5)*0.8
        if (g.x<0) g.x=W; if (g.x>W) g.x=0
        if (g.y<0) g.y=H; if (g.y>H) g.y=0
        ctx.fillRect(g.x, g.y, Math.random()*1.5, Math.random()*1.5)
      })

      // === LAYER 6: HUD INFERIOR (buildStep >= 3) ===
      if (s.buildStep >= 3) {
        const cena = preset.cenas[s.cenaIdx]
        ctx.fillStyle = 'rgba(0,0,0,0.65)'
        ctx.fillRect(0, H - 52, W, 52)

        // Scan line animada no HUD
        const scanX = ((ts % 2000) / 2000) * (W + 60) - 30
        const scanGrad = ctx.createLinearGradient(scanX-15, 0, scanX+15, 0)
        scanGrad.addColorStop(0, 'transparent')
        scanGrad.addColorStop(0.5, preset.glow + '22')
        scanGrad.addColorStop(1, 'transparent')
        ctx.fillStyle = scanGrad
        ctx.fillRect(0, H-52, W, 52)

        ctx.fillStyle = preset.glow
        ctx.font = `bold ${Math.min(8, W*0.04)}px monospace`
        ctx.fillText(cena.cam.toUpperCase(), 6, H - 38)

        ctx.fillStyle = 'rgba(255,255,255,0.65)'
        ctx.font = `${Math.min(7, W*0.035)}px monospace`
        const desc = cena.desc.length > 22 ? cena.desc.slice(0,22)+'…' : cena.desc
        ctx.fillText(desc, 6, H - 24)

        ctx.fillStyle = 'rgba(255,255,255,0.3)'
        ctx.font = `${Math.min(6, W*0.03)}px monospace`
        ctx.fillText('💡 ' + cena.luz.slice(0,20), 6, H - 10)
      }

      // === LAYER 7: WAVEFORM BPM (buildStep >= 4) ===
      if (s.buildStep >= 4) {
        const beatPhase = (ts % msPerBeat) / msPerBeat
        const waveY = 12
        const waveH = 16
        const bars = 24
        for (let i = 0; i < bars; i++) {
          const t2 = (i / bars + ts / msPerBeat) % 1
          const h2 = (0.3 + 0.7 * Math.abs(Math.sin(t2 * Math.PI * 2 + i))) * waveH
          const rgb = hexToRgb(preset.glow)
          ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${0.4 + 0.5*(i/bars)})`
          ctx.fillRect(i * (W/bars), waveY + (waveH-h2)/2, W/bars - 1, h2)
        }

        // BPM pulse dot
        const dotR = beatPhase < 0.12 ? 5 : 3
        ctx.fillStyle = beatPhase < 0.12 ? preset.glow : preset.glow + '66'
        ctx.shadowBlur = beatPhase < 0.12 ? 14 : 0
        ctx.shadowColor = preset.glow
        ctx.beginPath()
        ctx.arc(W - 10, 10, dotR, 0, Math.PI*2)
        ctx.fill()
        ctx.shadowBlur = 0
      }

      // === LAYER 8: TIPOGRAFIA (buildStep >= 5) ===
      if (s.buildStep >= 5) {
        const fontName = preset.tipografia || 'sans-serif'
        const shortFont = fontName.split(' ')[0]
        ctx.fillStyle = preset.glow + 'cc'
        ctx.font = `bold ${Math.min(9, W*0.042)}px monospace`
        ctx.fillText('FONT: ' + shortFont.toUpperCase(), 6, 40)

        // Barra de progresso do ritmo
        ctx.fillStyle = 'rgba(255,255,255,0.08)'
        ctx.fillRect(6, 46, W - 12, 3)
        const corteProgress = ((ts % msPorCorte) / msPorCorte)
        ctx.fillStyle = preset.glow
        ctx.fillRect(6, 46, (W-12) * corteProgress, 3)
        ctx.fillStyle = 'rgba(255,255,255,0.25)'
        ctx.font = `${Math.min(6,W*0.03)}px monospace`
        ctx.fillText(preset.ritmo, 6, 58)
      }

      // === LAYER 9: FLASH DE CORTE ===
      if (s.flash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${s.flash * 0.5})`
        ctx.fillRect(0, 0, W, H)
      }

      // === LAYER 10: BORDA GLOW + FORMAT LABEL ===
      ctx.strokeStyle = preset.glow + '55'
      ctx.lineWidth = 1.5
      ctx.strokeRect(1, 1, W-2, H-2)

      ctx.fillStyle = 'rgba(0,0,0,0.7)'
      ctx.fillRect(4, H - 68, 60, 14)
      ctx.fillStyle = preset.glow
      ctx.font = 'bold 6px monospace'
      ctx.fillText(`${fmt.ratio} · ${(fmt.label||'').toUpperCase()}`, 7, H - 57)

      // BPM no canto inferior direito
      ctx.fillStyle = preset.glow + 'aa'
      ctx.font = `bold ${Math.min(8,W*0.038)}px monospace`
      ctx.textAlign = 'right'
      ctx.fillText(`${bpm} BPM`, W - 5, H - 57)
      ctx.textAlign = 'left'

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [preset, formato])

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <canvas ref={canvasRef} style={{ borderRadius: '16px', display: 'block', boxShadow: `0 0 50px ${preset.glow}55, 0 0 100px ${preset.glow}22` }} />
      <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.75)', borderRadius: '6px', padding: '3px 8px', fontSize: '6px', color: preset.glow, letterSpacing: '2px', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#e94560', animation: 'glowPulse 1s infinite' }} />
        AO VIVO
      </div>
    </div>
  )
}

// ── Painel lateral de build (mostra elementos sendo construídos) ──────────────
function BuildPanel({ preset, active }) {
  const [steps, setSteps] = useState([])
  const items = [
    { icon: '🎨', label: 'Paleta', val: preset.paleta.slice(0,2).join(' · ') },
    { icon: '📐', label: 'Enquadramento', val: preset.enquadramento },
    { icon: '✂️', label: 'Ritmo', val: preset.ritmo },
    { icon: '🎵', label: 'BPM', val: `${preset.bpm} BPM` },
    { icon: '✍️', label: 'Tipografia', val: preset.tipografia },
    { icon: '💡', label: 'Iluminação', val: preset.iluminacao.split('·')[0].trim() },
  ]

  useEffect(() => {
    setSteps([])
    items.forEach((item, i) => {
      setTimeout(() => setSteps(prev => [...prev, i]), i * 600 + 200)
    })
  }, [preset.nome])

  if (!active) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '180px' }}>
      <p style={{ fontSize: '0.55rem', letterSpacing: '3px', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: '8px' }}>
        🔧 Construindo kit...
      </p>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '10px', background: steps.includes(i) ? `${preset.glow}12` : 'rgba(255,255,255,0.02)', border: `1px solid ${steps.includes(i) ? preset.glow+'33' : 'rgba(255,255,255,0.05)'}`, opacity: steps.includes(i) ? 1 : 0.25, transition: 'all 0.5s ease', animation: steps.includes(i) ? 'buildIn 0.4s ease both' : 'none' }}>
          <span style={{ fontSize: '0.75rem' }}>{item.icon}</span>
          <div>
            <p style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '1px', textTransform: 'uppercase' }}>{item.label}</p>
            <p style={{ fontSize: '0.7rem', color: steps.includes(i) ? preset.glow : 'rgba(255,255,255,0.3)', fontWeight: '700', fontFamily: 'monospace' }}>{item.val}</p>
          </div>
          {steps.includes(i) && (
            <div style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', background: preset.glow, boxShadow: `0 0 8px ${preset.glow}` }} />
          )}
        </div>
      ))}
    </div>
  )
}

const TEMPLATES = [
  { label: '⚡ Trap luxuoso', prompt: 'clipe estilo trap luxo cartier poder status' },
  { label: '🌙 Noir', prompt: 'suspense dark noir thriller crime sombrio' },
  { label: '💜 Cyberpunk', prompt: 'cyberpunk neon futurista tech glitch matrix' },
  { label: '🌹 Romance', prompt: 'romance amor suave intimidade saudade' },
  { label: '⚔️ Épico', prompt: 'épico guerra herói grandioso batalha' },
  { label: '◻ Minimal', prompt: 'minimalista clean moderno elegante simples' },
]

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
  const CORES = { 'Cyberpunk': '#00fff7', 'Luxo Cinematográfico': '#C8860A', 'Romance Etéreo': '#FF6B9D', 'Noir Contemporâneo': '#6a6aaa', 'Épico Cinematográfico': '#DAA520', 'Minimalismo Moderno': '#ffffff' }
  const glow = kit ? (CORES[kit.estilo] || '#7c3aed') : '#7c3aed'
  if (loading) return <div style={{ minHeight: '100vh', background: '#050508', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><OrbField /><p style={{ color: 'rgba(255,255,255,0.4)', position: 'relative', zIndex: 2 }}>Carregando...</p></div>
  if (erro || !kit) return (
    <div style={{ minHeight: '100vh', background: '#050508', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
      <OrbField />
      <p style={{ color: '#e94560', fontSize: '1.2rem', position: 'relative', zIndex: 2 }}>Kit não encontrado</p>
      <button onClick={() => window.location.href = '/'} style={{ padding: '12px 28px', borderRadius: '999px', border: 'none', background: 'linear-gradient(135deg, #7c3aed, #e94560)', color: '#fff', cursor: 'pointer', fontWeight: '700', position: 'relative', zIndex: 2 }}>Criar meu kit grátis →</button>
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
          <p style={{ fontSize: '1.2rem', fontWeight: '900', color: glow, marginBottom: '8px' }}>Kit de Intenção Visual</p>
          <p style={{ color: 'rgba(255,255,255,0.3)', marginBottom: '24px' }}>Neurocinematografia para criadores</p>
          <button onClick={() => window.location.href = '/'} style={{ padding: '14px 36px', borderRadius: '999px', border: 'none', background: 'linear-gradient(135deg, #7c3aed, #e94560)', color: '#fff', fontWeight: '700', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '2px' }}>Criar meu kit grátis →</button>
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
      <section style={{ padding: '80px 32px 120px', textAlign: 'center', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '32px', padding: '60px 40px' }}>
          <h2 style={{ fontSize: '2.2rem', fontWeight: '900', color: '#fff', marginBottom: '16px' }}>{t.ctaTitle}</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '36px' }}>{t.ctaDesc}</p>
          <button onClick={onEntrar} style={{ padding: '18px 52px', borderRadius: '999px', border: 'none', background: 'linear-gradient(135deg, #7c3aed, #e94560)', color: '#fff', fontSize: '1rem', fontWeight: '700', cursor: 'pointer', textTransform: 'uppercase', boxShadow: '0 0 60px rgba(124,58,237,0.4)' }}>{t.startFree}</button>
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
    'Close extremo': (<svg viewBox="0 0 200 120" style={{width:'100%',height:'100%'}}><rect x="60" y="20" width="80" height="80" rx="40" fill="none" stroke={glow} strokeWidth="1.5" opacity="0.4"/><rect x="75" y="35" width="50" height="50" rx="25" fill="none" stroke={glow} strokeWidth="1.5" opacity="0.7"/><circle cx="100" cy="60" r="14" fill={glow} opacity="0.15"/><circle cx="100" cy="60" r="6" fill={glow} opacity="0.6"/><text x="100" y="108" textAnchor="middle" fill={glow} fontSize="7" opacity="0.5">EXTREME CLOSE-UP</text></svg>),
    'Ângulo baixo': (<svg viewBox="0 0 200 120" style={{width:'100%',height:'100%'}}><polygon points="100,15 30,95 170,95" fill="none" stroke={glow} strokeWidth="1.5" opacity="0.5"/><circle cx="100" cy="15" r="5" fill={glow} opacity="0.8"/><text x="100" y="116" textAnchor="middle" fill={glow} fontSize="7" opacity="0.5">LOW ANGLE</text></svg>),
    'Macro extremo': (<svg viewBox="0 0 200 120" style={{width:'100%',height:'100%'}}><circle cx="100" cy="55" r="35" fill="none" stroke={glow} strokeWidth="1.5" opacity="0.3"/><circle cx="100" cy="55" r="20" fill="none" stroke={glow} strokeWidth="1.5" opacity="0.5"/><circle cx="100" cy="55" r="8" fill={glow} opacity="0.2"/><circle cx="100" cy="55" r="3" fill={glow} opacity="0.9"/><text x="100" y="108" textAnchor="middle" fill={glow} fontSize="7" opacity="0.5">MACRO LENS</text></svg>),
    'Plano aberto': (<svg viewBox="0 0 200 120" style={{width:'100%',height:'100%'}}><rect x="15" y="25" width="170" height="70" rx="4" fill="none" stroke={glow} strokeWidth="1.5" opacity="0.4"/><rect x="85" y="45" width="30" height="30" fill="none" stroke={glow} strokeWidth="1" opacity="0.6"/><text x="100" y="108" textAnchor="middle" fill={glow} fontSize="7" opacity="0.5">WIDE SHOT</text></svg>),
    'Travelling lateral': (<svg viewBox="0 0 200 120" style={{width:'100%',height:'100%'}}><rect x="70" y="45" width="60" height="30" rx="3" fill="none" stroke={glow} strokeWidth="1.5" opacity="0.5"/><polygon points="20,55 5,60 20,65" fill={glow} opacity="0.6"/><line x1="20" y1="60" x2="70" y2="60" stroke={glow} strokeWidth="1.5" opacity="0.4" strokeDasharray="5 3"/><text x="100" y="108" textAnchor="middle" fill={glow} fontSize="7" opacity="0.5">TRACKING SHOT</text></svg>),
    'Plano médio': (<svg viewBox="0 0 200 120" style={{width:'100%',height:'100%'}}><rect x="40" y="15" width="120" height="90" rx="4" fill="none" stroke={glow} strokeWidth="1.5" opacity="0.4"/><rect x="75" y="25" width="50" height="45" fill="none" stroke={glow} strokeWidth="1" opacity="0.6"/><text x="100" y="112" textAnchor="middle" fill={glow} fontSize="7" opacity="0.5">MEDIUM SHOT</text></svg>),
    'Close olhos': (<svg viewBox="0 0 200 120" style={{width:'100%',height:'100%'}}><path d="M30,60 Q100,20 170,60 Q100,100 30,60" fill="none" stroke={glow} strokeWidth="1.5" opacity="0.5"/><ellipse cx="100" cy="60" rx="22" ry="16" fill="none" stroke={glow} strokeWidth="1.5" opacity="0.7"/><circle cx="100" cy="60" r="4" fill={glow} opacity="0.7"/><text x="100" y="108" textAnchor="middle" fill={glow} fontSize="7" opacity="0.5">INSERT SHOT</text></svg>),
    'Grande angular': (<svg viewBox="0 0 200 120" style={{width:'100%',height:'100%'}}><path d="M5,60 Q100,10 195,60 Q100,110 5,60" fill="none" stroke={glow} strokeWidth="1.5" opacity="0.4"/><rect x="20" y="30" width="160" height="60" rx="4" fill="none" stroke={glow} strokeWidth="1" opacity="0.3"/><text x="100" y="112" textAnchor="middle" fill={glow} fontSize="7" opacity="0.5">WIDE ANGLE</text></svg>),
  }
  return <div style={{width:'100%',height:'100px'}}>{configs[tipo]||configs['Plano médio']}</div>
}

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

  const path = window.location.pathname
  const shareMatch = path.match(/^\/kit\/([a-zA-Z0-9]+)$/)
  if (shareMatch) return <PaginaKitPublico shareId={shareMatch[1]} />

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
      const res = await fetch(`${API}/gerar-kit`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` }, body: JSON.stringify({ emocao, formato }) })
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
      setMeusKits(await res.json())
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

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '80px 28px 60px', position: 'relative', zIndex: 2 }}>
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

        {/* Tabs */}
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
            {meusKits.length === 0
              ? <div style={{ textAlign: 'center', padding: '80px 40px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px' }}><p style={{ fontSize: '2.5rem' }}>🎬</p><p style={{ color: 'rgba(255,255,255,0.25)' }}>{t.emptyKits}</p></div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                          <button onClick={() => compartilharKit(kit.id)} disabled={sharingId===kit.id}
                            style={{ padding: '6px 14px', borderRadius: '999px', border: '1px solid rgba(124,58,237,0.4)', background: kit.share_id ? 'rgba(124,58,237,0.2)' : 'transparent', color: kit.share_id ? '#a78bfa' : 'rgba(255,255,255,0.4)', fontSize: '0.7rem', cursor: 'pointer', fontWeight: '600' }}>
                            {sharingId===kit.id ? '...' : kit.share_id ? '🔗 Compartilhado' : '↗ Compartilhar'}
                          </button>
                        </div>
                      </div>
                    </TiltCard>
                  ))}
                </div>
            }
          </div>
        )}

        {/* Gerar Kit */}
        {aba === 'gerar' && (
          <div style={{ animation: 'fadeUp 0.5s ease both' }}>

            {/* Templates */}
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '0.6rem', letterSpacing: '3px', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: '10px' }}>⚡ Começar com um estilo</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {TEMPLATES.map((tpl, i) => (
                  <button key={i} onClick={() => setEmocao(tpl.prompt)}
                    style={{ padding: '7px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = active ? active.glow+'66' : 'rgba(124,58,237,0.5)'; e.currentTarget.style.color = '#fff' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
                  >{tpl.label}</button>
                ))}
              </div>
            </div>

            {/* Formato */}
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '0.6rem', letterSpacing: '3px', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: '10px' }}>{t.format}</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {Object.entries(FORMATOS).map(([key, fmt]) => (
                  <button key={key} onClick={() => setFormato(key)}
                    style={{ padding: '8px 18px', borderRadius: '999px', border: `1px solid ${formato===key ? (active?active.glow:'#7c3aed') : 'rgba(255,255,255,0.08)'}`, background: formato===key ? `${active?active.glow:'#7c3aed'}18` : 'rgba(255,255,255,0.02)', color: formato===key ? (active?active.glow:'#a78bfa') : 'rgba(255,255,255,0.3)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: formato===key ? '700' : '400' }}>
                    {fmt.icon} {fmt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* === MINIPLAYER + BUILD PANEL === */}
            {active && (
              <TiltCard glowColor={active.glow} style={{ marginBottom: '24px', padding: '28px', background: 'rgba(0,0,0,0.5)', borderRadius: '28px', border: `1px solid ${active.glow}22`, backdropFilter: 'blur(20px)', animation: 'tiltIn 0.5s ease both' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#e94560', animation: 'glowPulse 1s infinite' }} />
                  <p style={{ fontSize: '0.55rem', letterSpacing: '3px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Pré-visualização ao vivo · {active.nome}</p>
                </div>
                <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  {/* Canvas do miniplayer */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <CinematicMiniPlayer preset={active} formato={formato} />
                    <p style={{ fontSize: '0.65rem', color: active.glow, fontWeight: '700', letterSpacing: '1px', textAlign: 'center' }}>{active.emocao}</p>
                  </div>
                  {/* Painel de build lateral */}
                  <BuildPanel preset={active} active={true} />
                </div>
              </TiltCard>
            )}

            {/* Textarea */}
            <textarea value={emocao} onChange={e => setEmocao(e.target.value)} placeholder={t.placeholder}
              style={{ width: '100%', height: '110px', background: 'rgba(255,255,255,0.02)', color: '#fff', border: `1px solid ${active ? active.glow+'44' : 'rgba(124,58,237,0.2)'}`, borderRadius: '20px', padding: '20px 24px', fontSize: '0.95rem', resize: 'none', boxSizing: 'border-box', outline: 'none', lineHeight: 1.6, backdropFilter: 'blur(10px)', transition: 'border 0.5s ease' }}
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
                <TiltCard glowColor={resultado.glow} style={{ textAlign: 'center', padding: '28px', background: `${resultado.glow}0e`, border: `1px solid ${resultado.glow}33`, borderRadius: '24px' }}>
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
ENDOFFILE
echo "done"