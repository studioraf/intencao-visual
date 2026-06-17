import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const FORMATOS = {
  youtube:   { ratio: 16/9,   w: 320, h: 180 },
  instagram: { ratio: 1,      w: 240, h: 240 },
  filme:     { ratio: 2.39,   w: 320, h: 134 },
  clipe:     { ratio: 9/16,   w: 150, h: 267 },
}

// Mapeia palavras-chave do prompt para elementos atmosféricos 3D
const PALAVRAS_ATMOSFERA = {
  chuva: 'chuva', rain: 'chuva', tempestade: 'chuva',
  fogo: 'fogo', fire: 'fogo', brasa: 'fogo', incendio: 'fogo',
  neon: 'neon', cyberpunk: 'neon', glitch: 'neon',
  noite: 'noite', dark: 'noite', escuro: 'noite', sombrio: 'noite',
  dourado: 'dourado', luxo: 'dourado', gold: 'dourado', ouro: 'dourado',
  neve: 'neve', snow: 'neve', frio: 'neve', gelo: 'neve',
  fumaca: 'fumaca', smoke: 'fumaca', nevoa: 'fumaca',
  estrela: 'estrelas', stars: 'estrelas', espaco: 'estrelas', galaxia: 'estrelas',
  poeira: 'poeira', dust: 'poeira', deserto: 'poeira',
}

function detectarAtmosferas(texto) {
  const lower = (texto || '').toLowerCase()
  const found = new Set()
  for (const [palavra, tipo] of Object.entries(PALAVRAS_ATMOSFERA)) {
    if (lower.includes(palavra)) found.add(tipo)
  }
  return Array.from(found)
}

function hexToThree(hex) {
  return new THREE.Color(hex)
}

export default function MiniPlayer3D({ preset, formato, prompt = '' }) {
  const mountRef = useRef(null)
  const stateRef = useRef({})

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const fmt = FORMATOS[formato] || FORMATOS.clipe
    const W = fmt.w, H = fmt.h

    // ── Setup básico ──────────────────────────────────────────────
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100)
    camera.position.set(0, 0, 8)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    mount.innerHTML = ''
    mount.appendChild(renderer.domElement)

    // ── Névoa volumétrica (fog) ───────────────────────────────────
    const glowColor = hexToThree(preset.glow)
    scene.fog = new THREE.FogExp2(new THREE.Color(preset.bg[0]).getHex(), 0.06)

    // ── Fundo: plano com gradiente do preset ─────────────────────
    const bgGeo = new THREE.PlaneGeometry(60, 60)
    const bgCanvas = document.createElement('canvas')
    bgCanvas.width = 64; bgCanvas.height = 64
    const bgCtx = bgCanvas.getContext('2d')
    const grad = bgCtx.createLinearGradient(0, 0, 0, 64)
    grad.addColorStop(0, preset.bg[0])
    grad.addColorStop(0.5, preset.bg[1])
    grad.addColorStop(1, preset.bg[2])
    bgCtx.fillStyle = grad
    bgCtx.fillRect(0, 0, 64, 64)
    const bgTex = new THREE.CanvasTexture(bgCanvas)
    const bgMat = new THREE.MeshBasicMaterial({ map: bgTex, fog: false })
    const bgMesh = new THREE.Mesh(bgGeo, bgMat)
    bgMesh.position.z = -15
    scene.add(bgMesh)

    // ── Luzes ──────────────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0xffffff, 0.15)
    scene.add(ambient)

    const keyLight = new THREE.PointLight(glowColor, 8, 25, 2)
    keyLight.position.set(-3, 2, 4)
    scene.add(keyLight)

    const rimLight = new THREE.PointLight(glowColor, 4, 20, 2)
    rimLight.position.set(4, -1, -2)
    scene.add(rimLight)

    const fillLight = new THREE.SpotLight(0xffffff, 2, 30, Math.PI / 6, 0.5, 1)
    fillLight.position.set(0, 6, 6)
    scene.add(fillLight)

    // ── Partículas base (sempre presentes — "ar" cinematográfico) ─
    function criarParticulas(count, color, size, spread, opacity) {
      const geo = new THREE.BufferGeometry()
      const positions = new Float32Array(count * 3)
      const speeds = new Float32Array(count)
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * spread
        positions[i * 3 + 1] = (Math.random() - 0.5) * spread
        positions[i * 3 + 2] = (Math.random() - 0.5) * spread
        speeds[i] = 0.2 + Math.random() * 0.6
      }
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      const mat = new THREE.PointsMaterial({
        color, size, transparent: true, opacity,
        blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
      })
      const pts = new THREE.Points(geo, mat)
      pts.userData.speeds = speeds
      return pts
    }

    const atmosfera = criarParticulas(120, glowColor, 0.04, 14, 0.5)
    scene.add(atmosfera)

    // ── Camadas extras baseadas em palavras-chave do prompt ───────
    const camadasExtras = []
    const tiposDetectados = detectarAtmosferas(prompt)

    tiposDetectados.forEach(tipo => {
      if (tipo === 'chuva') {
        const chuva = criarParticulas(300, 0x9fc8ff, 0.025, 16, 0.6)
        chuva.geometry.attributes.position.array.forEach((_, i) => {})
        chuva.userData.tipo = 'chuva'
        scene.add(chuva); camadasExtras.push(chuva)
      }
      if (tipo === 'fogo') {
        const fogo = criarParticulas(150, 0xff5500, 0.05, 8, 0.7)
        fogo.position.y = -3
        fogo.userData.tipo = 'fogo'
        scene.add(fogo); camadasExtras.push(fogo)
      }
      if (tipo === 'neve') {
        const neve = criarParticulas(200, 0xffffff, 0.035, 16, 0.7)
        neve.userData.tipo = 'neve'
        scene.add(neve); camadasExtras.push(neve)
      }
      if (tipo === 'estrelas') {
        const estrelas = criarParticulas(400, 0xffffff, 0.02, 30, 0.8)
        estrelas.userData.tipo = 'estrelas'
        scene.add(estrelas); camadasExtras.push(estrelas)
      }
      if (tipo === 'dourado') {
        const douradas = criarParticulas(180, 0xF5D78E, 0.03, 12, 0.6)
        douradas.userData.tipo = 'dourado'
        scene.add(douradas); camadasExtras.push(douradas)
      }
      if (tipo === 'poeira') {
        const poeira = criarParticulas(250, 0xd4b896, 0.02, 18, 0.4)
        poeira.userData.tipo = 'poeira'
        scene.add(poeira); camadasExtras.push(poeira)
      }
      if (tipo === 'fumaca') {
        const fumaca = criarParticulas(100, 0xaaaaaa, 0.12, 10, 0.18)
        fumaca.userData.tipo = 'fumaca'
        scene.add(fumaca); camadasExtras.push(fumaca)
      }
      if (tipo === 'neon') {
        keyLight.intensity = 12
        rimLight.color = new THREE.Color(0x00fff7)
        rimLight.intensity = 6
      }
      if (tipo === 'noite') {
        scene.fog.density = 0.1
        ambient.intensity = 0.05
      }
    })

    // ── Elemento central — forma abstrata que representa "presença" ─
    const coreGeo = new THREE.IcosahedronGeometry(1.1, 1)
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: glowColor, emissive: glowColor, emissiveIntensity: 0.25,
      metalness: 0.6, roughness: 0.25, transparent: true, opacity: 0.18,
      wireframe: false,
    })
    const core = new THREE.Mesh(coreGeo, coreMat)
    scene.add(core)

    const wireGeo = new THREE.IcosahedronGeometry(1.4, 1)
    const wireMat = new THREE.MeshBasicMaterial({ color: glowColor, wireframe: true, transparent: true, opacity: 0.15 })
    const wire = new THREE.Mesh(wireGeo, wireMat)
    scene.add(wire)

    // ── Lens flare simulado (sprite com glow) ─────────────────────
    const flareCanvas = document.createElement('canvas')
    flareCanvas.width = 128; flareCanvas.height = 128
    const fctx = flareCanvas.getContext('2d')
    const fgrad = fctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    fgrad.addColorStop(0, 'rgba(255,255,255,0.9)')
    fgrad.addColorStop(0.3, preset.glow + 'aa')
    fgrad.addColorStop(1, 'rgba(0,0,0,0)')
    fctx.fillStyle = fgrad
    fctx.fillRect(0, 0, 128, 128)
    const flareTex = new THREE.CanvasTexture(flareCanvas)
    const flareMat = new THREE.SpriteMaterial({ map: flareTex, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending })
    const flare = new THREE.Sprite(flareMat)
    flare.position.set(-3, 2, 4)
    flare.scale.set(3, 3, 1)
    scene.add(flare)

    // ── Vinheta via overlay DOM (mais barato que post-processing) ──
    const vinheta = document.createElement('div')
    vinheta.style.position = 'absolute'
    vinheta.style.inset = '0'
    vinheta.style.pointerEvents = 'none'
    vinheta.style.background = `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)`
    vinheta.style.borderRadius = '12px'
    mount.style.position = 'relative'
    mount.appendChild(vinheta)

    // Grain overlay (CSS, leve)
    const grain = document.createElement('div')
    grain.style.position = 'absolute'
    grain.style.inset = '0'
    grain.style.pointerEvents = 'none'
    grain.style.opacity = '0.06'
    grain.style.borderRadius = '12px'
    grain.style.mixBlendMode = 'overlay'
    grain.style.backgroundImage = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"
    mount.appendChild(grain)

    // ── Animação de câmera (física com easing, não linear) ─────────
    const bpm = preset.bpm
    const msPerBeat = 60000 / bpm
    const cortes = parseInt(preset.ritmo) || 20
    const msPorCorte = 60000 / cortes
    let lastCut = 0
    let camTarget = { x: 0, y: 0, z: 8 }
    let camVel = { x: 0, y: 0, z: 0 }
    let cenaIdx = 0
    let flashIntensity = 0
    let raf

    function pickNovoAngulo() {
      const cena = preset.cenas[cenaIdx % preset.cenas.length]
      if (cena.cam === 'Close extremo' || cena.cam === 'Macro extremo') {
        camTarget = { x: (Math.random()-0.5)*1, y: (Math.random()-0.5)*0.5, z: 3.5 }
      } else if (cena.cam === 'Ângulo baixo') {
        camTarget = { x: (Math.random()-0.5)*1.5, y: -2.5, z: 6 }
        camera.lookAt(0, 1, 0)
      } else if (cena.cam === 'Plano aberto' || cena.cam === 'Grande angular') {
        camTarget = { x: (Math.random()-0.5)*3, y: (Math.random()-0.5)*1, z: 11 }
      } else if (cena.cam === 'Travelling lateral') {
        camTarget = { x: (Math.random()>0.5?4:-4), y: (Math.random()-0.5)*0.8, z: 7 }
      } else {
        camTarget = { x: (Math.random()-0.5)*2, y: (Math.random()-0.5)*1, z: 8 }
      }
    }
    pickNovoAngulo()

    const clock = new THREE.Clock()

    function animate() {
      const t = clock.getElapsedTime() * 1000
      const dt = clock.getDelta()

      if (t - lastCut > msPorCorte) {
        lastCut = t
        cenaIdx++
        pickNovoAngulo()
        flashIntensity = 1
      }
      flashIntensity = Math.max(0, flashIntensity - dt * 4)

      // Câmera com easing (damped spring)
      camVel.x += (camTarget.x - camera.position.x) * 0.04
      camVel.y += (camTarget.y - camera.position.y) * 0.04
      camVel.z += (camTarget.z - camera.position.z) * 0.04
      camVel.x *= 0.85; camVel.y *= 0.85; camVel.z *= 0.85
      camera.position.x += camVel.x + Math.sin(t / 3000) * 0.003
      camera.position.y += camVel.y + Math.cos(t / 4000) * 0.002
      camera.position.z += camVel.z
      camera.lookAt(0, 0, 0)

      // Rotação sutil do core (sensação de "vida")
      core.rotation.y += dt * 0.15
      core.rotation.x += dt * 0.08
      wire.rotation.y -= dt * 0.1
      wire.rotation.z += dt * 0.05

      // Pulso no ritmo do BPM
      const beatPhase = (t % msPerBeat) / msPerBeat
      const pulse = 1 + (beatPhase < 0.15 ? (0.15 - beatPhase) * 1.2 : 0)
      core.scale.setScalar(pulse)
      wire.scale.setScalar(pulse * 1.02)
      keyLight.intensity = (tiposDetectados.includes('neon') ? 12 : 8) * (beatPhase < 0.15 ? 1.4 : 1)

      // Partículas flutuando
      function updateParticulas(pts, velY, velX = 0) {
        const pos = pts.geometry.attributes.position.array
        for (let i = 0; i < pos.length; i += 3) {
          pos[i + 1] -= velY * dt
          pos[i] += velX * dt
          if (pos[i + 1] < -8) pos[i + 1] = 8
          if (pos[i + 1] > 8) pos[i + 1] = -8
        }
        pts.geometry.attributes.position.needsUpdate = true
      }
      updateParticulas(atmosfera, 0.15)
      camadasExtras.forEach(layer => {
        if (layer.userData.tipo === 'chuva') updateParticulas(layer, 4)
        else if (layer.userData.tipo === 'fogo') updateParticulas(layer, -1.2)
        else if (layer.userData.tipo === 'neve') updateParticulas(layer, 0.6, Math.sin(t/1000)*0.3)
        else if (layer.userData.tipo === 'fumaca') updateParticulas(layer, -0.3)
        else if (layer.userData.tipo === 'poeira') updateParticulas(layer, 0.1, Math.sin(t/2000)*0.2)
        else if (layer.userData.tipo === 'dourado') updateParticulas(layer, 0.25)
        else if (layer.userData.tipo === 'estrelas') layer.rotation.y += dt * 0.01
      })

      // Flare segue levemente a luz
      flare.material.opacity = 0.35 + Math.sin(t / 1500) * 0.15 + flashIntensity * 0.3

      // Flash de corte via vinheta (clareando rapidamente)
      vinheta.style.background = flashIntensity > 0.05
        ? `radial-gradient(ellipse at center, rgba(255,255,255,${flashIntensity*0.25}) 0%, rgba(0,0,0,${0.4*(1-flashIntensity)}) 100%)`
        : `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)`

      renderer.render(scene, camera)
      raf = requestAnimationFrame(animate)
    }
    animate()

    stateRef.current = { renderer, scene }

    return () => {
      cancelAnimationFrame(raf)
      renderer.dispose()
      scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose())
          else obj.material.dispose()
        }
      })
      if (mount) mount.innerHTML = ''
    }
  }, [preset, formato, prompt])

  const fmt = FORMATOS[formato] || FORMATOS.clipe
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div ref={mountRef} style={{
        width: fmt.w, height: fmt.h, borderRadius: '12px', overflow: 'hidden',
        boxShadow: `0 0 50px ${preset.glow}44, 0 8px 40px rgba(0,0,0,0.85), 0 0 100px ${preset.glow}11`,
        border: `1px solid ${preset.glow}33`,
      }} />
      <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', borderRadius: '5px', padding: '3px 8px', fontSize: '6px', color: '#ff4444', letterSpacing: '2px', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid rgba(255,60,60,0.3)' }}>
        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#ff4444', boxShadow: '0 0 6px #ff4444' }} />
        REC · 3D
      </div>
      <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.6)', borderRadius: '5px', padding: '3px 8px', fontSize: '6px', color: preset.glow, letterSpacing: '1px', fontFamily: 'monospace' }}>
        {fmt.ratio === 16/9 ? '16:9' : fmt.ratio === 1 ? '1:1' : fmt.ratio === 2.39 ? '2.39:1' : '9:16'}
      </div>
    </div>
  )
}