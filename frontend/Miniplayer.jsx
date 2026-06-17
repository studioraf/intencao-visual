import { useEffect, useRef } from 'react'

const FORMATOS = {
  youtube:   { label: 'YouTube',   ratio: '16:9',   w: 320, h: 180 },
  instagram: { label: 'Instagram', ratio: '1:1',    w: 240, h: 240 },
  filme:     { label: 'Filme',     ratio: '2.39:1', w: 320, h: 134 },
  clipe:     { label: 'Clipe',     ratio: '9:16',   w: 150, h: 267 },
}

// ACES filmic tone mapping
function aces(x) {
  const a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14
  return Math.min(1, Math.max(0, (x * (a * x + b)) / (x * (c * x + d) + e)))
}

function hexToRgb(hex) {
  try {
    const h = hex.replace('#', '')
    return [parseInt(h.slice(0,2),16)/255, parseInt(h.slice(2,4),16)/255, parseInt(h.slice(4,6),16)/255]
  } catch { return [0.5,0.2,0.9] }
}

function rgbToHex(r,g,b) {
  return '#' + [r,g,b].map(v => Math.min(255, Math.round(v*255)).toString(16).padStart(2,'0')).join('')
}

// Aplica tone mapping ACES + color grading num pixel
function gradePixel(r, g, b, exposure, tint, shadow, highlight) {
  // Exposure
  r *= exposure; g *= exposure; b *= exposure
  // Shadow lift
  r = r + shadow*(1-r); g = g + shadow*(1-g); b = b + shadow*(1-b)
  // Highlight compression
  r = r * (1 - highlight*r); g = g * (1 - highlight*g); b = b * (1 - highlight*b)
  // Color tint (warm/cool)
  r += tint[0]; g += tint[1]; b += tint[2]
  // ACES tone mapping
  return [aces(r), aces(g), aces(b)]
}

export default function CinematicMiniPlayer({ preset, formato }) {
  const canvasRef = useRef(null)
  const offscreenRef = useRef(null)
  const stateRef = useRef({
    time: 0,
    cenaIdx: 0,
    lastCut: 0,
    // Camera physics
    camX: 0, camY: 0, camTargetX: 0, camTargetY: 0,
    camVX: 0, camVY: 0,
    focalLength: 0, focalTarget: 1,
    // Lens flare positions
    flares: [],
    // Grain buffer
    grainBuffer: null,
    grainFrame: 0,
    // Exposure animation
    exposure: 1.2,
  })

  const fmt = FORMATOS[formato] || FORMATOS.clipe

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width = fmt.w
    const H = canvas.height = fmt.h

    // Offscreen para compositing
    const off = document.createElement('canvas')
    off.width = W; off.height = H
    const octx = off.getContext('2d')
    offscreenRef.current = off

    const s = stateRef.current
    const bpm = preset.bpm
    const msPerBeat = 60000 / bpm
    const cortes = parseInt(preset.ritmo) || 20
    const msPorCorte = 60000 / cortes

    // Color grading por preset
    const grades = {
      '#C8860A': { exposure: 1.3, tint: [0.08, 0.02, -0.04], shadow: 0.02, highlight: 0.08, fog: [0.15,0.08,0.02], fogDensity: 0.18 },
      '#00fff7': { exposure: 1.1, tint: [-0.02, 0.05, 0.1],  shadow: 0.0,  highlight: 0.12, fog: [0.0,0.05,0.12],  fogDensity: 0.22 },
      '#FF6B9D': { exposure: 1.0, tint: [0.06, -0.01, 0.04], shadow: 0.04, highlight: 0.06, fog: [0.1,0.02,0.08],  fogDensity: 0.14 },
      '#6a6aaa': { exposure: 0.9, tint: [0.0,  0.0,  0.05],  shadow: 0.0,  highlight: 0.04, fog: [0.02,0.02,0.06], fogDensity: 0.25 },
      '#DAA520': { exposure: 1.4, tint: [0.1,  0.04, -0.06], shadow: 0.03, highlight: 0.1,  fog: [0.18,0.1,0.01],  fogDensity: 0.2  },
      '#ffffff': { exposure: 1.2, tint: [0.0,  0.0,  0.0],   shadow: 0.06, highlight: 0.05, fog: [0.05,0.05,0.05], fogDensity: 0.1  },
    }
    const grade = grades[preset.glow] || grades['#C8860A']

    // Lens flares baseados na paleta
    s.flares = preset.paleta.slice(0,3).map((cor, i) => ({
      x: 0.2 + i * 0.3,
      y: 0.2 + (i % 2) * 0.4,
      color: cor,
      intensity: 0.3 + Math.random() * 0.4,
      size: 20 + Math.random() * 40,
    }))

    // Pre-gerar grain buffer (ruído de sensor realista)
    const grainW = W, grainH = H
    const grainFrames = 4
    const grains = []
    for (let f = 0; f < grainFrames; f++) {
      const buf = new ImageData(grainW, grainH)
      for (let i = 0; i < buf.data.length; i += 4) {
        // Noise gaussiano simulado (soma de uniforms)
        const n = ((Math.random() + Math.random() + Math.random() + Math.random()) / 4 - 0.5) * 2
        const v = Math.round(n * 18) // ISO ~800
        buf.data[i]   = 128 + v
        buf.data[i+1] = 128 + v + Math.round(Math.random()*4 - 2)
        buf.data[i+2] = 128 + v + Math.round(Math.random()*4 - 2)
        buf.data[i+3] = 255
      }
      const gc = document.createElement('canvas')
      gc.width = grainW; gc.height = grainH
      gc.getContext('2d').putImageData(buf, 0, 0)
      grains.push(gc)
    }

    let raf
    let lastTs = performance.now()

    function draw(ts) {
      const dt = Math.min(ts - lastTs, 50)
      lastTs = ts
      s.time += dt

      // Corte de câmera
      if (s.time - s.lastCut > msPorCorte) {
        s.lastCut = s.time
        s.cenaIdx = (s.cenaIdx + 1) % preset.cenas.length
        // Novo target de câmera a cada corte
        s.camTargetX = (Math.random() - 0.5) * 12
        s.camTargetY = (Math.random() - 0.5) * 8
        // Breathing exposure
        s.exposure = grade.exposure * (0.95 + Math.random() * 0.1)
      }

      // Física de câmera com inércia (como câmera de mão)
      const spring = 0.04, damping = 0.85
      s.camVX = (s.camVX + (s.camTargetX - s.camX) * spring) * damping
      s.camVY = (s.camVY + (s.camTargetY - s.camY) * spring) * damping
      // Breathing suave
      s.camX = s.camTargetX * 0.3 + Math.sin(s.time / 3800) * 3
      s.camY = s.camTargetY * 0.3 + Math.cos(s.time / 4600) * 2
      const camScale = 1 + 0.015 * Math.abs(Math.sin(s.time / 5000))

      // Focal length breathing (simula rack focus)
      s.focalLength += (s.focalTarget - s.focalLength) * 0.02
      if (Math.random() < 0.003) s.focalTarget = Math.random()

      ctx.clearRect(0, 0, W, H)

      // === LAYER 1: FUNDO COM MOVIMENTO FÍSICO ===
      ctx.save()
      ctx.translate(W/2 + s.camX, H/2 + s.camY)
      ctx.scale(camScale * 1.06, camScale * 1.06)
      ctx.translate(-W/2, -H/2)

      // Gradiente de fundo baseado no preset
      const [r0,g0,b0] = hexToRgb(preset.bg[0])
      const [r1,g1,b1] = hexToRgb(preset.bg[1])
      const [r2,g2,b2] = hexToRgb(preset.bg[2])
      const [tr0,tg0,tb0] = gradePixel(r0,g0,b0, s.exposure, grade.tint, grade.shadow, grade.highlight)
      const [tr1,tg1,tb1] = gradePixel(r1,g1,b1, s.exposure, grade.tint, grade.shadow, grade.highlight)
      const [tr2,tg2,tb2] = gradePixel(r2,g2,b2, s.exposure, grade.tint, grade.shadow, grade.highlight)

      const bgGrad = ctx.createLinearGradient(0, 0, W, H)
      bgGrad.addColorStop(0, rgbToHex(tr0,tg0,tb0))
      bgGrad.addColorStop(0.5, rgbToHex(tr1,tg1,tb1))
      bgGrad.addColorStop(1, rgbToHex(tr2,tg2,tb2))
      ctx.fillStyle = bgGrad
      ctx.fillRect(-10, -10, W+20, H+20)

      // === LAYER 2: VOLUMETRIC FOG / ATMOSPHERIC DEPTH ===
      const fogColor = `rgba(${Math.round(grade.fog[0]*255)},${Math.round(grade.fog[1]*255)},${Math.round(grade.fog[2]*255)}`
      // Fog de chão
      const fogGrad = ctx.createLinearGradient(0, H*0.4, 0, H)
      fogGrad.addColorStop(0, fogColor + ',0)')
      fogGrad.addColorStop(1, fogColor + `,${grade.fogDensity})`)
      ctx.fillStyle = fogGrad
      ctx.fillRect(0, 0, W, H)

      // Fog volumétrico lateral (god rays simulados)
      const rayAngle = Math.sin(s.time / 8000) * 0.3
      for (let i = 0; i < 3; i++) {
        const rx = W * (0.1 + i * 0.35 + Math.sin(s.time/6000 + i) * 0.05)
        const rg = ctx.createRadialGradient(rx, -H*0.2, 0, rx, H*0.8, H*1.2)
        rg.addColorStop(0, fogColor + `,${grade.fogDensity * 0.6})`)
        rg.addColorStop(1, fogColor + ',0)')
        ctx.fillStyle = rg
        ctx.save()
        ctx.transform(1, 0, rayAngle, 1, 0, 0)
        ctx.fillRect(0, 0, W, H)
        ctx.restore()
      }

      ctx.restore()

      // === LAYER 3: BLOOM VOLUMÉTRICO nas cores da paleta ===
      preset.paleta.forEach((cor, i) => {
        const [pr,pg,pb] = hexToRgb(cor)
        const beatPhase = Math.abs(Math.sin(s.time / msPerBeat + i * 0.7))
        const intensity = 0.08 + beatPhase * 0.12
        const bx = W * (0.15 + i * 0.22)
        const by = H * (0.6 + Math.sin(s.time/3000 + i) * 0.15)
        const radius = 40 + beatPhase * 30

        const bloom = ctx.createRadialGradient(bx, by, 0, bx, by, radius)
        bloom.addColorStop(0, `rgba(${Math.round(pr*255)},${Math.round(pg*255)},${Math.round(pb*255)},${intensity})`)
        bloom.addColorStop(0.4, `rgba(${Math.round(pr*255)},${Math.round(pg*255)},${Math.round(pb*255)},${intensity*0.4})`)
        bloom.addColorStop(1, `rgba(${Math.round(pr*255)},${Math.round(pg*255)},${Math.round(pb*255)},0)`)
        ctx.fillStyle = bloom
        ctx.fillRect(0, 0, W, H)
      })

      // === LAYER 4: DEPTH OF FIELD (blur radial simulado) ===
      // Aplica blur nas bordas simulando shallow DOF
      const dofStrength = 0.3 + s.focalLength * 0.4
      ctx.save()
      // DOF radial — blur nas extremidades
      const dofGrad = ctx.createRadialGradient(W/2, H/2, H*0.2, W/2, H/2, H*0.7)
      dofGrad.addColorStop(0, 'rgba(0,0,0,0)')
      dofGrad.addColorStop(1, `rgba(0,0,0,${dofStrength * 0.15})`)
      ctx.fillStyle = dofGrad
      ctx.fillRect(0, 0, W, H)
      ctx.restore()

      // === LAYER 5: LENS FLARES ===
      s.flares.forEach((flare, i) => {
        // Movimento suave dos flares
        const fx = flare.x * W + Math.sin(s.time/4000 + i*1.3) * 15
        const fy = flare.y * H + Math.cos(s.time/5000 + i*0.9) * 10
        const beatFlare = Math.abs(Math.sin(s.time / msPerBeat + i))
        const fIntensity = flare.intensity * (0.6 + beatFlare * 0.4)
        const [fr,fg,fb] = hexToRgb(flare.color)

        // Halo principal
        const halo = ctx.createRadialGradient(fx, fy, 0, fx, fy, flare.size * (1 + beatFlare*0.3))
        halo.addColorStop(0, `rgba(${Math.round(fr*255)},${Math.round(fg*255)},${Math.round(fb*255)},${fIntensity * 0.5})`)
        halo.addColorStop(0.3, `rgba(${Math.round(fr*255)},${Math.round(fg*255)},${Math.round(fb*255)},${fIntensity * 0.15})`)
        halo.addColorStop(1, `rgba(${Math.round(fr*255)},${Math.round(fg*255)},${Math.round(fb*255)},0)`)
        ctx.fillStyle = halo
        ctx.fillRect(0, 0, W, H)

        // Streak horizontal (anamorphic lens flare)
        ctx.save()
        ctx.globalAlpha = fIntensity * 0.25
        const streak = ctx.createLinearGradient(0, fy, W, fy)
        streak.addColorStop(0, `rgba(${Math.round(fr*255)},${Math.round(fg*255)},${Math.round(fb*255)},0)`)
        streak.addColorStop((fx/W - 0.05), `rgba(${Math.round(fr*255)},${Math.round(fg*255)},${Math.round(fb*255)},0)`)
        streak.addColorStop(fx/W, `rgba(${Math.round(fr*255)},${Math.round(fg*255)},${Math.round(fb*255)},0.8)`)
        streak.addColorStop((fx/W + 0.05), `rgba(${Math.round(fr*255)},${Math.round(fg*255)},${Math.round(fb*255)},0)`)
        streak.addColorStop(1, `rgba(${Math.round(fr*255)},${Math.round(fg*255)},${Math.round(fb*255)},0)`)
        ctx.fillStyle = streak
        ctx.fillRect(0, fy - 1, W, 2)
        ctx.globalAlpha = 1
        ctx.restore()
      })

      // === LAYER 6: VINHETA FÍSICA (falloff de lente real) ===
      const vig = ctx.createRadialGradient(W/2, H/2, H*0.1, W/2, H/2, H*0.85)
      vig.addColorStop(0, 'rgba(0,0,0,0)')
      vig.addColorStop(0.5, 'rgba(0,0,0,0.05)')
      vig.addColorStop(0.8, 'rgba(0,0,0,0.25)')
      vig.addColorStop(1, 'rgba(0,0,0,0.65)')
      ctx.fillStyle = vig
      ctx.fillRect(0, 0, W, H)

      // === LAYER 7: ABERRAÇÃO CROMÁTICA nas bordas ===
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      ctx.globalAlpha = 0.03
      // Canal vermelho deslocado
      ctx.drawImage(canvas, -1.5, 0, W, H)
      ctx.globalAlpha = 0.02
      // Canal azul deslocado  
      ctx.drawImage(canvas, 1.5, 0, W, H)
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
      ctx.restore()

      // === LAYER 8: GRAIN DE SENSOR (photosite noise realista) ===
      const gIdx = Math.floor(s.time / 40) % grains.length
      ctx.save()
      ctx.globalCompositeOperation = 'overlay'
      ctx.globalAlpha = 0.07 + Math.random() * 0.03
      ctx.drawImage(grains[gIdx], 0, 0)
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
      ctx.restore()

      // === LAYER 9: HUD CINEMATOGRÁFICO ===
      const cena = preset.cenas[s.cenaIdx]
      // Barra inferior com glass morphism
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      ctx.fillRect(0, H - 46, W, 46)

      // Blur glass no HUD (simulado)
      ctx.fillStyle = `rgba(${Math.round(hexToRgb(preset.glow)[0]*30)},${Math.round(hexToRgb(preset.glow)[1]*30)},${Math.round(hexToRgb(preset.glow)[2]*30)},0.15)`
      ctx.fillRect(0, H - 46, W, 46)

      // Linha de accent
      const [gr,gg,gb] = hexToRgb(preset.glow)
      ctx.fillStyle = `rgba(${Math.round(gr*255)},${Math.round(gg*255)},${Math.round(gb*255)},0.6)`
      ctx.fillRect(0, H - 47, W, 1)

      ctx.fillStyle = preset.glow
      ctx.font = `bold ${Math.min(8, W*0.042)}px 'Courier New', monospace`
      ctx.fillText(cena.cam.toUpperCase(), 6, H - 32)

      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.font = `${Math.min(7, W*0.036)}px 'Courier New', monospace`
      ctx.fillText(cena.desc.length > 24 ? cena.desc.slice(0,24)+'…' : cena.desc, 6, H - 18)

      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.font = `${Math.min(6, W*0.03)}px monospace`
      ctx.fillText(cena.luz.slice(0,22), 6, H - 6)

      // BPM pulse (indicator de câmera)
      const beatPhase = (s.time % msPerBeat) / msPerBeat
      const recSize = beatPhase < 0.1 ? 5 : 3.5
      const recAlpha = beatPhase < 0.1 ? 1 : 0.5
      ctx.fillStyle = `rgba(255,60,60,${recAlpha})`
      ctx.shadowBlur = beatPhase < 0.1 ? 10 : 0
      ctx.shadowColor = '#ff3c3c'
      ctx.beginPath()
      ctx.arc(W - 10, 10, recSize, 0, Math.PI*2)
      ctx.fill()
      ctx.shadowBlur = 0

      ctx.fillStyle = preset.glow + 'cc'
      ctx.font = `bold ${Math.min(7,W*0.036)}px monospace`
      ctx.textAlign = 'right'
      ctx.fillText(`${preset.bpm} BPM`, W - 18, 14)
      ctx.textAlign = 'left'

      // Waveform BPM no topo
      const bars = 20
      for (let i = 0; i < bars; i++) {
        const phase = (i/bars + s.time/msPerBeat) % 1
        const bh = (0.25 + 0.75 * Math.abs(Math.sin(phase * Math.PI * 2 + i*0.4))) * 14
        const alpha = 0.3 + 0.5*(i/bars)
        ctx.fillStyle = `rgba(${Math.round(gr*255)},${Math.round(gg*255)},${Math.round(gb*255)},${alpha})`
        ctx.fillRect(i*(W/bars), H-47-bh, W/bars-1, bh)
      }

      // Label de formato
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      if (ctx.roundRect) {
        ctx.beginPath(); ctx.roundRect(4, 4, 62, 14, 3); ctx.fill()
      } else { ctx.fillRect(4, 4, 62, 14) }
      ctx.fillStyle = preset.glow
      ctx.font = 'bold 6px monospace'
      const fmtLabel = `${fmt.ratio} · ${(fmt.label||'').toUpperCase()}`
      ctx.fillText(fmtLabel, 8, 14)

      // === LAYER 10: SCAN LINE sutil (referência analógica) ===
      for (let y = 0; y < H; y += 3) {
        ctx.fillStyle = 'rgba(0,0,0,0.04)'
        ctx.fillRect(0, y, W, 1)
      }

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [preset, formato])

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <canvas ref={canvasRef}
        style={{
          borderRadius: '12px',
          display: 'block',
          boxShadow: `0 0 60px ${preset.glow}44, 0 8px 32px rgba(0,0,0,0.8), 0 0 120px ${preset.glow}11`,
        }}
      />
      <div style={{
        position: 'absolute', top: '8px', right: '8px',
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        borderRadius: '5px', padding: '3px 8px',
        fontSize: '6px', color: '#ff4444',
        letterSpacing: '2px', fontFamily: 'monospace',
        display: 'flex', alignItems: 'center', gap: '4px',
        border: '1px solid rgba(255,60,60,0.3)',
      }}>
        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#ff4444', boxShadow: '0 0 6px #ff4444' }} />
        REC
      </div>
    </div>
  )
}