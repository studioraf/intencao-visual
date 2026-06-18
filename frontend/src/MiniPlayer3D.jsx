import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js'

const FORMATOS = {
  youtube:   { ratio: 16/9,   w: 320, h: 180,  label: 'YouTube' },
  instagram: { ratio: 1,      w: 240, h: 240,  label: 'Instagram' },
  filme:     { ratio: 2.39,   w: 320, h: 134,  label: 'Filme' },
  clipe:     { ratio: 9/16,   w: 150, h: 267,  label: 'Clipe' },
}

const RATIO_LABEL = { [16/9]: '16:9', [1]: '1:1', [2.39]: '2.39:1', [9/16]: '9:16' }

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

function noise2D(x, y, seed = 0) {
  let n = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453
  return n - Math.floor(n)
}
function smoothNoise(x, y, seed) {
  const ix = Math.floor(x), iy = Math.floor(y)
  const fx = x - ix, fy = y - iy
  const a = noise2D(ix, iy, seed), b = noise2D(ix + 1, iy, seed)
  const c = noise2D(ix, iy + 1, seed), d = noise2D(ix + 1, iy + 1, seed)
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy)
  return a * (1 - ux) * (1 - uy) + b * ux * (1 - uy) + c * (1 - ux) * uy + d * ux * uy
}
function fbm(x, y, seed, octaves = 4) {
  let val = 0, amp = 0.5, freq = 1
  for (let i = 0; i < octaves; i++) {
    val += smoothNoise(x * freq, y * freq, seed) * amp
    amp *= 0.5; freq *= 2
  }
  return val
}

function gerarTexturaProcedural(size, baseColor, seed, tipo = 'cor') {
  const canvas = document.createElement('canvas')
  canvas.width = size; canvas.height = size
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(size, size)
  const base = new THREE.Color(baseColor)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const n = fbm(x / 24, y / 24, seed, 5)
      if (tipo === 'rough') {
        const v = Math.floor(n * 255)
        img.data[i] = v; img.data[i+1] = v; img.data[i+2] = v
      } else {
        const variation = (n - 0.5) * 0.35
        img.data[i] = Math.min(255, Math.max(0, base.r * 255 * (1 + variation)))
        img.data[i+1] = Math.min(255, Math.max(0, base.g * 255 * (1 + variation)))
        img.data[i+2] = Math.min(255, Math.max(0, base.b * 255 * (1 + variation)))
      }
      img.data[i+3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return new THREE.CanvasTexture(canvas)
}

function gerarNormalMap(size, seed) {
  const canvas = document.createElement('canvas')
  canvas.width = size; canvas.height = size
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(size, size)
  const h = (x, y) => fbm(x / 18, y / 18, seed, 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const hL = h(x - 1, y), hR = h(x + 1, y), hD = h(x, y - 1), hU = h(x, y + 1)
      const nx = (hL - hR) * 2.0, ny = (hD - hU) * 2.0, nz = 1.0
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz)
      img.data[i] = ((nx / len) * 0.5 + 0.5) * 255
      img.data[i+1] = ((ny / len) * 0.5 + 0.5) * 255
      img.data[i+2] = ((nz / len) * 0.5 + 0.5) * 255
      img.data[i+3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return new THREE.CanvasTexture(canvas)
}

export default function MiniPlayer3D({ preset, formato, prompt = '' }) {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const fmt = FORMATOS[formato] || FORMATOS.clipe
    const W = fmt.w, H = fmt.h

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100)
    camera.position.set(0, 1.6, 7)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace
    mount.innerHTML = ''
    mount.appendChild(renderer.domElement)

    const glowColor = new THREE.Color(preset.glow)
    const seed = preset.nome.length + preset.bpm

    scene.fog = new THREE.FogExp2(new THREE.Color(preset.bg[2]).getHex(), 0.05)

    const skyGeo = new THREE.SphereGeometry(50, 32, 32)
    const skyCanvas = document.createElement('canvas')
    skyCanvas.width = 2; skyCanvas.height = 256
    const skyCtx = skyCanvas.getContext('2d')
    const skyGrad = skyCtx.createLinearGradient(0, 0, 0, 256)
    skyGrad.addColorStop(0, preset.bg[2])
    skyGrad.addColorStop(0.55, preset.bg[1])
    skyGrad.addColorStop(1, preset.bg[0])
    skyCtx.fillStyle = skyGrad
    skyCtx.fillRect(0, 0, 2, 256)
    const skyTex = new THREE.CanvasTexture(skyCanvas)
    const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false })
    scene.add(new THREE.Mesh(skyGeo, skyMat))

    const groundSize = 40, groundSeg = 80
    const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize, groundSeg, groundSeg)
    const posAttr = groundGeo.attributes.position
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i), y = posAttr.getY(i)
      posAttr.setZ(i, fbm(x / 6, y / 6, seed, 5) * 1.4 - 0.5)
    }
    groundGeo.computeVertexNormals()

    const albedoTex = gerarTexturaProcedural(256, preset.bg[1], seed, 'cor')
    albedoTex.wrapS = albedoTex.wrapT = THREE.RepeatWrapping
    albedoTex.repeat.set(6, 6)
    const roughTex = gerarTexturaProcedural(256, '#888888', seed + 7, 'rough')
    roughTex.wrapS = roughTex.wrapT = THREE.RepeatWrapping
    roughTex.repeat.set(6, 6)
    const normalTex = gerarNormalMap(256, seed)
    normalTex.wrapS = normalTex.wrapT = THREE.RepeatWrapping
    normalTex.repeat.set(6, 6)

    const groundMat = new THREE.MeshStandardMaterial({
      map: albedoTex, roughnessMap: roughTex, normalMap: normalTex,
      normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.85, metalness: 0.12,
    })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -1.8
    ground.receiveShadow = true
    scene.add(ground)

    const coreGeo = new THREE.IcosahedronGeometry(1, 4)
    const cPos = coreGeo.attributes.position
    for (let i = 0; i < cPos.count; i++) {
      const v = new THREE.Vector3(cPos.getX(i), cPos.getY(i), cPos.getZ(i))
      const n = fbm(v.x * 2 + 10, v.y * 2 + 10, seed, 3) * 0.18
      v.multiplyScalar(1 + n)
      cPos.setXYZ(i, v.x, v.y, v.z)
    }
    coreGeo.computeVertexNormals()
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: glowColor, roughness: 0.35, metalness: 0.7,
      transmission: 0.25, thickness: 1.2, transparent: true, opacity: 0.92,
      emissive: glowColor, emissiveIntensity: 0.18, clearcoat: 0.6, clearcoatRoughness: 0.3,
    })
    const core = new THREE.Mesh(coreGeo, coreMat)
    core.position.set(0, 1.1, -2)
    core.castShadow = true
    scene.add(core)

    const ambient = new THREE.AmbientLight(0xffffff, 0.12)
    scene.add(ambient)

    const sun = new THREE.DirectionalLight(0xffffff, 1.4)
    sun.position.set(-6, 8, 4)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.camera.near = 0.5
    sun.shadow.camera.far = 30
    scene.add(sun)

    const keyLight = new THREE.PointLight(glowColor, 14, 22, 2)
    keyLight.position.set(-3, 3, 3)
    keyLight.castShadow = true
    scene.add(keyLight)

    const rimLight = new THREE.PointLight(glowColor, 6, 18, 2)
    rimLight.position.set(4, 1, -3)
    scene.add(rimLight)

    function criarParticulas(count, color, size, spread, opacity) {
      const geo = new THREE.BufferGeometry()
      const positions = new Float32Array(count * 3)
      for (let i = 0; i < count; i++) {
        positions[i*3] = (Math.random()-0.5)*spread
        positions[i*3+1] = Math.random()*spread*0.6
        positions[i*3+2] = (Math.random()-0.5)*spread
      }
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      const mat = new THREE.PointsMaterial({ color, size, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true })
      return new THREE.Points(geo, mat)
    }

    const atmosfera = criarParticulas(150, glowColor, 0.035, 16, 0.45)
    scene.add(atmosfera)

    const camadasExtras = []
    const tiposDetectados = detectarAtmosferas(prompt)
    tiposDetectados.forEach(tipo => {
      if (tipo === 'chuva') { const p = criarParticulas(350, 0x9fc8ff, 0.02, 18, 0.55); p.userData.tipo='chuva'; scene.add(p); camadasExtras.push(p) }
      if (tipo === 'fogo') { const p = criarParticulas(150, 0xff5500, 0.045, 8, 0.7); p.position.y=-1.5; p.userData.tipo='fogo'; scene.add(p); camadasExtras.push(p) }
      if (tipo === 'neve') { const p = criarParticulas(220, 0xffffff, 0.03, 18, 0.7); p.userData.tipo='neve'; scene.add(p); camadasExtras.push(p) }
      if (tipo === 'estrelas') { const p = criarParticulas(400, 0xffffff, 0.018, 35, 0.8); p.position.y+=8; p.userData.tipo='estrelas'; scene.add(p); camadasExtras.push(p) }
      if (tipo === 'dourado') { const p = criarParticulas(180, 0xF5D78E, 0.028, 12, 0.6); p.userData.tipo='dourado'; scene.add(p); camadasExtras.push(p) }
      if (tipo === 'poeira') { const p = criarParticulas(250, 0xd4b896, 0.018, 18, 0.4); p.userData.tipo='poeira'; scene.add(p); camadasExtras.push(p) }
      if (tipo === 'fumaca') { const p = criarParticulas(100, 0xaaaaaa, 0.1, 10, 0.16); p.userData.tipo='fumaca'; scene.add(p); camadasExtras.push(p) }
      if (tipo === 'neon') { keyLight.intensity = 20; rimLight.color = new THREE.Color(0x00fff7); rimLight.intensity = 10 }
      if (tipo === 'noite') { scene.fog.density = 0.09; ambient.intensity = 0.04; sun.intensity = 0.3 }
    })

    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(W, H), 0.55, 0.5, 0.15)
    composer.addPass(bloomPass)
    const bokehPass = new BokehPass(scene, camera, { focus: 7.0, aperture: 0.0022, maxblur: 0.012, width: W, height: H })
    composer.addPass(bokehPass)

    const hud = document.createElement('div')
    hud.style.position = 'absolute'
    hud.style.inset = '0'
    hud.style.pointerEvents = 'none'
    hud.style.fontFamily = "'Courier New', monospace"
    hud.style.borderRadius = '12px'
    hud.style.overflow = 'hidden'
    hud.innerHTML = `
      <div style="position:absolute;top:0;left:0;right:0;display:flex;justify-content:space-between;align-items:center;padding:6px 8px;background:linear-gradient(180deg, rgba(0,0,0,0.55), transparent);">
        <span data-el="ratio" style="font-size:6px;color:${preset.glow};letter-spacing:1px;background:rgba(0,0,0,0.5);padding:2px 6px;border-radius:4px;"></span>
        <span style="font-size:6px;color:#ff4444;letter-spacing:2px;background:rgba(0,0,0,0.5);padding:2px 6px;border-radius:4px;display:flex;align-items:center;gap:3px;">
          <span data-el="recdot" style="width:4px;height:4px;border-radius:50%;background:#ff4444;display:inline-block;"></span>REC
        </span>
      </div>
      <div style="position:absolute;bottom:0;left:0;right:0;padding:7px 8px;background:linear-gradient(0deg, rgba(0,0,0,0.75), transparent);">
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:4px;">
          <div>
            <div data-el="camtipo" style="font-size:7px;font-weight:bold;color:${preset.glow};letter-spacing:1px;"></div>
            <div data-el="cendesc" style="font-size:6px;color:rgba(255,255,255,0.75);margin-top:1px;"></div>
          </div>
          <div style="text-align:right;">
            <div style="display:flex;align-items:center;gap:3px;justify-content:flex-end;">
              <span data-el="bpmdot" style="width:4px;height:4px;border-radius:50%;background:${preset.glow};display:inline-block;"></span>
              <span data-el="bpm" style="font-size:7px;font-weight:bold;color:${preset.glow};"></span>
            </div>
            <div data-el="tipografia" style="font-size:5.5px;color:rgba(255,255,255,0.5);margin-top:1px;"></div>
          </div>
        </div>
        <div data-el="paleta" style="display:flex;gap:2px;height:5px;margin-bottom:3px;border-radius:2px;overflow:hidden;"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span data-el="audio" style="font-size:5px;color:rgba(255,255,255,0.45);letter-spacing:0.5px;"></span>
          <span data-el="nome" style="font-size:5.5px;color:rgba(255,255,255,0.55);letter-spacing:1px;"></span>
        </div>
      </div>
    `
    mount.style.position = 'relative'
    mount.appendChild(hud)

    const elRatio = hud.querySelector('[data-el="ratio"]')
    const elCamTipo = hud.querySelector('[data-el="camtipo"]')
    const elCenDesc = hud.querySelector('[data-el="cendesc"]')
    const elBpm = hud.querySelector('[data-el="bpm"]')
    const elBpmDot = hud.querySelector('[data-el="bpmdot"]')
    const elTipografia = hud.querySelector('[data-el="tipografia"]')
    const elPaleta = hud.querySelector('[data-el="paleta"]')
    const elAudio = hud.querySelector('[data-el="audio"]')
    const elNome = hud.querySelector('[data-el="nome"]')
    const elRecDot = hud.querySelector('[data-el="recdot"]')

    elRatio.textContent = `${RATIO_LABEL[fmt.ratio] || ''} · ${fmt.label.toUpperCase()}`
    elBpm.textContent = `${preset.bpm} BPM`
    elTipografia.textContent = preset.tipografia
    elAudio.textContent = `♪ ${preset.audio?.tipo?.toUpperCase() || ''} · ${preset.audio?.descricao || ''}`
    elNome.textContent = preset.nome.toUpperCase()
    elPaleta.innerHTML = preset.paleta.map(c => `<div style="flex:1;background:${c};"></div>`).join('')

    const vinheta = document.createElement('div')
    vinheta.style.position = 'absolute'
    vinheta.style.inset = '0'
    vinheta.style.pointerEvents = 'none'
    vinheta.style.borderRadius = '12px'
    vinheta.style.background = `radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.55) 100%)`
    mount.appendChild(vinheta)

    const grain = document.createElement('div')
    grain.style.position = 'absolute'
    grain.style.inset = '0'
    grain.style.pointerEvents = 'none'
    grain.style.opacity = '0.05'
    grain.style.borderRadius = '12px'
    grain.style.mixBlendMode = 'overlay'
    grain.style.backgroundImage = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"
    mount.appendChild(grain)

    const bpm = preset.bpm
    const msPerBeat = 60000 / bpm
    const cortes = parseInt(preset.ritmo) || 20
    const msPorCorte = 60000 / cortes
    let lastCut = 0, cenaIdx = 0, flashIntensity = 0
    let camTarget = { x: 0, y: 1.6, z: 7, focus: 7 }
    let camVel = { x: 0, y: 0, z: 0 }
    let raf
    const clock = new THREE.Clock()

    function pickAngulo() {
      const cena = preset.cenas[cenaIdx % preset.cenas.length]
      elCamTipo.textContent = cena.cam.toUpperCase()
      elCenDesc.textContent = cena.desc
      if (cena.cam === 'Close extremo' || cena.cam === 'Macro extremo') camTarget = { x: (Math.random()-0.5)*1.2, y: 1.2, z: 2.8, focus: 2.8 }
      else if (cena.cam === 'Ângulo baixo') camTarget = { x: (Math.random()-0.5)*1.5, y: -0.3, z: 5.5, focus: 6 }
      else if (cena.cam === 'Plano aberto' || cena.cam === 'Grande angular') camTarget = { x: (Math.random()-0.5)*3, y: 2.2, z: 11, focus: 10 }
      else if (cena.cam === 'Travelling lateral') camTarget = { x: (Math.random()>0.5?4:-4), y: 1.6, z: 6.5, focus: 6.5 }
      else camTarget = { x: (Math.random()-0.5)*2, y: 1.6, z: 7.5, focus: 7.5 }
    }
    pickAngulo()

    function updateParticulas(pts, velY, velX, dt) {
      const pos = pts.geometry.attributes.position.array
      for (let i = 0; i < pos.length; i += 3) {
        pos[i+1] -= velY * dt
        pos[i] += velX * dt
        if (pos[i+1] < -2) pos[i+1] = 10
        if (pos[i+1] > 10) pos[i+1] = -2
      }
      pts.geometry.attributes.position.needsUpdate = true
    }

    function animate() {
      const t = clock.getElapsedTime() * 1000
      const dt = clock.getDelta()

      if (t - lastCut > msPorCorte) { lastCut = t; cenaIdx++; pickAngulo(); flashIntensity = 1 }
      flashIntensity = Math.max(0, flashIntensity - dt * 4)

      camVel.x += (camTarget.x - camera.position.x) * 0.035
      camVel.y += (camTarget.y - camera.position.y) * 0.035
      camVel.z += (camTarget.z - camera.position.z) * 0.035
      camVel.x *= 0.86; camVel.y *= 0.86; camVel.z *= 0.86
      camera.position.x += camVel.x + Math.sin(t/280)*0.004 + Math.sin(t/3100)*0.01
      camera.position.y += camVel.y + Math.cos(t/340)*0.003 + Math.cos(t/4200)*0.008
      camera.position.z += camVel.z
      camera.lookAt(0, 1, -1)

      bokehPass.uniforms['focus'].value += (camTarget.focus - bokehPass.uniforms['focus'].value) * 0.04

      core.rotation.y += dt * 0.12
      core.rotation.x += dt * 0.06

      const beatPhase = (t % msPerBeat) / msPerBeat
      core.scale.setScalar(1 + (beatPhase < 0.15 ? (0.15 - beatPhase) * 0.9 : 0))
      keyLight.intensity = (tiposDetectados.includes('neon') ? 20 : 14) * (beatPhase < 0.15 ? 1.3 : 1)
      elBpmDot.style.background = beatPhase < 0.15 ? '#fff' : preset.glow
      elBpmDot.style.boxShadow = beatPhase < 0.15 ? `0 0 4px ${preset.glow}` : 'none'
      elRecDot.style.opacity = Math.sin(t/300) > 0 ? '1' : '0.3'

      updateParticulas(atmosfera, 0.25, 0, dt)
      camadasExtras.forEach(layer => {
        if (layer.userData.tipo === 'chuva') updateParticulas(layer, 5, 0, dt)
        else if (layer.userData.tipo === 'fogo') updateParticulas(layer, -1.5, 0, dt)
        else if (layer.userData.tipo === 'neve') updateParticulas(layer, 0.7, Math.sin(t/1000)*0.3, dt)
        else if (layer.userData.tipo === 'fumaca') updateParticulas(layer, -0.3, 0, dt)
        else if (layer.userData.tipo === 'poeira') updateParticulas(layer, 0.1, Math.sin(t/2000)*0.2, dt)
        else if (layer.userData.tipo === 'dourado') updateParticulas(layer, 0.3, 0, dt)
        else if (layer.userData.tipo === 'estrelas') layer.rotation.y += dt * 0.008
      })

      vinheta.style.background = flashIntensity > 0.05
        ? `radial-gradient(ellipse at center, rgba(255,255,255,${flashIntensity*0.22}) 0%, rgba(0,0,0,${0.42*(1-flashIntensity)}) 100%)`
        : `radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.55) 100%)`

      composer.render()
      raf = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(raf)
      composer.dispose()
      renderer.dispose()
      scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) { Array.isArray(obj.material) ? obj.material.forEach(m=>m.dispose()) : obj.material.dispose() }
      })
      if (mount) mount.innerHTML = ''
    }
  }, [preset, formato, prompt])

  const fmt = FORMATOS[formato] || FORMATOS.clipe
  return (
    <div ref={mountRef} style={{
      position: 'relative', width: fmt.w, height: fmt.h, borderRadius: '12px', overflow: 'hidden',
      boxShadow: `0 0 50px ${preset.glow}44, 0 8px 40px rgba(0,0,0,0.85), 0 0 100px ${preset.glow}11`,
      border: `1px solid ${preset.glow}33`,
    }} />
  )
}