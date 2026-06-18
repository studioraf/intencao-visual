import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'

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
  melancolia: 'melancolia', sad: 'melancolia', triste: 'melancolia',
  euforia: 'euforia', hype: 'euforia', alegria: 'euforia', festa: 'euforia',
  noir: 'noir', cinema: 'noir', dramatico: 'noir',
}

function detectarAtmosferas(texto) {
  const lower = (texto || '').toLowerCase()
  const found = new Set()
  for (const [palavra, tipo] of Object.entries(PALAVRAS_ATMOSFERA)) {
    if (lower.includes(palavra)) found.add(tipo)
  }
  return Array.from(found)
}

// Detecta emoção dominante para definir personalidade do objeto
function detectarEmocao(preset, prompt) {
  const lower = (prompt || '').toLowerCase() + ' ' + (preset.nome || '').toLowerCase()
  if (lower.includes('noir') || lower.includes('dark') || lower.includes('sombri')) return 'noir'
  if (lower.includes('eufori') || lower.includes('hype') || lower.includes('alegri') || lower.includes('festa')) return 'euforia'
  if (lower.includes('melanc') || lower.includes('triste') || lower.includes('sad')) return 'melancolia'
  if (lower.includes('neon') || lower.includes('cyber') || lower.includes('glitch')) return 'neon'
  if (lower.includes('fogo') || lower.includes('fire') || lower.includes('brasa')) return 'fogo'
  if (lower.includes('gelo') || lower.includes('neve') || lower.includes('frio')) return 'gelo'
  // Detecta pelo preset
  const nome = (preset.nome || '').toLowerCase()
  if (nome.includes('noir') || nome.includes('dark')) return 'noir'
  if (nome.includes('trap') || nome.includes('hype') || nome.includes('bass')) return 'euforia'
  if (nome.includes('lo-fi') || nome.includes('chill') || nome.includes('soul')) return 'melancolia'
  if (nome.includes('cyber') || nome.includes('neon') || nome.includes('synth')) return 'neon'
  return 'neutro'
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

// ── MELHORIA 3: Shaders de pós-processamento emocional ──────────────────────

// Noir: alto contraste, quase sem cor, grain pesado
const NoirShader = {
  uniforms: { tDiffuse: { value: null }, intensity: { value: 0.0 }, time: { value: 0.0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float intensity;
    uniform float time;
    varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      // Alto contraste
      lum = pow(lum, 1.6);
      // Grain
      float grain = fract(sin(dot(vUv + time * 0.01, vec2(12.9898,78.233))) * 43758.5453) * 0.12;
      vec3 noir = vec3(lum + grain);
      // Toque azulado frio nas sombras
      noir += vec3(0.0, 0.0, 0.04) * (1.0 - lum);
      gl_FragColor = vec4(mix(c.rgb, noir, intensity), c.a);
    }
  `
}

// Euforia: aberração cromática + saturação
const EuforiaShader = {
  uniforms: { tDiffuse: { value: null }, intensity: { value: 0.0 }, time: { value: 0.0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float intensity;
    uniform float time;
    varying vec2 vUv;
    void main(){
      float aberration = intensity * 0.008 * (1.0 + sin(time * 3.0) * 0.3);
      vec2 dir = vUv - 0.5;
      vec4 r = texture2D(tDiffuse, vUv + dir * aberration);
      vec4 g = texture2D(tDiffuse, vUv);
      vec4 b = texture2D(tDiffuse, vUv - dir * aberration);
      vec3 aberrated = vec3(r.r, g.g, b.b);
      // Boost saturação
      float lum = dot(aberrated, vec3(0.299, 0.587, 0.114));
      vec3 saturated = mix(vec3(lum), aberrated, 1.0 + intensity * 0.6);
      gl_FragColor = vec4(mix(g.rgb, saturated, intensity), g.a);
    }
  `
}

// Melancolia: dessaturação + vinheta pesada + grain suave
const MelancoliaShader = {
  uniforms: { tDiffuse: { value: null }, intensity: { value: 0.0 }, time: { value: 0.0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float intensity;
    uniform float time;
    varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      // Dessatura e esfria
      vec3 desat = mix(c.rgb, vec3(lum * 0.85, lum * 0.88, lum * 0.98), intensity * 0.75);
      // Vinheta mais pesada
      float dist = length(vUv - 0.5) * 2.2;
      float vig = 1.0 - smoothstep(0.4, 1.4, dist) * intensity * 0.7;
      // Grain suave
      float grain = (fract(sin(dot(vUv + time * 0.005, vec2(127.1,311.7))) * 43758.5453) - 0.5) * 0.04 * intensity;
      gl_FragColor = vec4((desat + grain) * vig, c.a);
    }
  `
}

// Neon: glow de cor, scanlines, shift ciano/magenta
const NeonShader = {
  uniforms: { tDiffuse: { value: null }, intensity: { value: 0.0 }, time: { value: 0.0 }, glowColor: { value: new THREE.Vector3(0, 1, 1) } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float intensity;
    uniform float time;
    uniform vec3 glowColor;
    varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      // Scanlines
      float scanline = sin(vUv.y * 180.0 + time * 2.0) * 0.04 * intensity;
      // Ciano/magenta shift sutil
      vec3 shifted = c.rgb + vec3(-0.03, 0.06, 0.08) * intensity;
      // Boost de brilho nas áreas claras
      float bright = max(0.0, dot(c.rgb, vec3(0.333)) - 0.5) * 2.0;
      shifted += glowColor * bright * intensity * 0.3;
      gl_FragColor = vec4(shifted - scanline, c.a);
    }
  `
}

// ── MELHORIA 4: Motion blur direcional na transição ─────────────────────────
const MotionBlurShader = {
  uniforms: { tDiffuse: { value: null }, velocity: { value: new THREE.Vector2(0, 0) }, intensity: { value: 0.0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 velocity;
    uniform float intensity;
    varying vec2 vUv;
    void main(){
      vec4 result = vec4(0.0);
      int samples = 8;
      for(int i = 0; i < 8; i++){
        float t = float(i) / 7.0 - 0.5;
        result += texture2D(tDiffuse, vUv + velocity * t * intensity);
      }
      gl_FragColor = result / 8.0;
    }
  `
}

// ── MELHORIA 1: Geometria por emoção ────────────────────────────────────────
function criarGeometriaEmocional(emocao, seed) {
  let geo

  if (emocao === 'noir') {
    // Fragmentado, angular — dodecaedro distorcido
    geo = new THREE.DodecahedronGeometry(1, 0)
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i))
      // Distorção agressiva e angular
      const n = fbm(v.x * 3 + seed, v.y * 3, seed, 2) * 0.3
      const sharpNoise = Math.sign(fbm(v.x + 1, v.y + 1, seed + 5, 1) - 0.5) * 0.08
      v.multiplyScalar(1 + n + sharpNoise)
      pos.setXYZ(i, v.x, v.y, v.z)
    }
    geo.computeVertexNormals()

  } else if (emocao === 'euforia') {
    // Explodido, radiante — esfera super subdividida com spikes
    geo = new THREE.IcosahedronGeometry(1, 3)
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i))
      const spike = fbm(v.x * 5 + seed, v.y * 5, seed, 3)
      const burst = spike > 0.65 ? (spike - 0.65) * 3.5 : 0
      v.multiplyScalar(1 + burst * 0.6 + fbm(v.x * 2, v.y * 2, seed + 1, 2) * 0.15)
      pos.setXYZ(i, v.x, v.y, v.z)
    }
    geo.computeVertexNormals()

  } else if (emocao === 'melancolia') {
    // Pesado, "que cai" — esfera achatada e amassada no topo
    geo = new THREE.IcosahedronGeometry(1, 4)
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i))
      // Achata verticalmente e amassa o topo
      const crushTop = v.y > 0 ? 1.0 - v.y * 0.35 : 1.0
      const bulgeBot = v.y < 0 ? 1.0 + Math.abs(v.y) * 0.12 : 1.0
      v.y *= crushTop
      v.multiplyScalar(bulgeBot + fbm(v.x * 2, v.z * 2, seed, 3) * 0.12)
      pos.setXYZ(i, v.x, v.y, v.z)
    }
    geo.computeVertexNormals()

  } else if (emocao === 'neon') {
    // Toroide — cyberpunk, circular, limpo
    geo = new THREE.TorusGeometry(0.75, 0.32, 24, 64)
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i))
      v.x += fbm(v.x * 4 + seed, v.y * 4, seed, 2) * 0.06
      v.y += fbm(v.y * 4, v.z * 4, seed + 3, 2) * 0.06
      pos.setXYZ(i, v.x, v.y, v.z)
    }
    geo.computeVertexNormals()

  } else if (emocao === 'fogo') {
    // Cone invertido irregular — chama
    geo = new THREE.ConeGeometry(0.7, 2.0, 6, 8)
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i))
      const heightFactor = (v.y + 1) / 2
      const flicker = fbm(v.x * 4 + seed, v.z * 4, seed, 3) * heightFactor * 0.4
      v.x += flicker * Math.sign(v.x || 1)
      v.z += flicker * Math.sign(v.z || 1)
      pos.setXYZ(i, v.x, v.y, v.z)
    }
    geo.computeVertexNormals()

  } else if (emocao === 'gelo') {
    // Cristal — octaedro afiado e preciso
    geo = new THREE.OctahedronGeometry(1, 1)
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i))
      v.multiplyScalar(1 + fbm(v.x * 6 + seed, v.y * 6, seed, 2) * 0.08)
      pos.setXYZ(i, v.x, v.y, v.z)
    }
    geo.computeVertexNormals()

  } else {
    // Neutro — icosaedro clássico suave
    geo = new THREE.IcosahedronGeometry(1, 4)
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i))
      const n = fbm(v.x * 2 + 10, v.y * 2 + 10, seed, 3) * 0.18
      v.multiplyScalar(1 + n)
      pos.setXYZ(i, v.x, v.y, v.z)
    }
    geo.computeVertexNormals()
  }

  return geo
}

// Material por emoção
function criarMaterialEmocional(emocao, glowColor) {
  const base = {
    color: glowColor,
    emissive: glowColor,
    transparent: true,
  }

  if (emocao === 'noir') {
    return new THREE.MeshPhysicalMaterial({
      ...base, color: new THREE.Color(0x111118), roughness: 0.1, metalness: 0.95,
      emissive: new THREE.Color(0x0a0a1a), emissiveIntensity: 0.05,
      clearcoat: 1.0, clearcoatRoughness: 0.05, opacity: 1.0,
    })
  } else if (emocao === 'euforia') {
    return new THREE.MeshPhysicalMaterial({
      ...base, roughness: 0.2, metalness: 0.4,
      transmission: 0.4, thickness: 1.5, opacity: 0.88,
      emissiveIntensity: 0.45, clearcoat: 0.8, clearcoatRoughness: 0.1,
    })
  } else if (emocao === 'melancolia') {
    return new THREE.MeshPhysicalMaterial({
      ...base, roughness: 0.8, metalness: 0.1,
      transmission: 0.05, opacity: 0.95,
      emissiveIntensity: 0.08, clearcoat: 0.1,
    })
  } else if (emocao === 'neon') {
    return new THREE.MeshPhysicalMaterial({
      ...base, roughness: 0.0, metalness: 0.9,
      transmission: 0.0, opacity: 1.0,
      emissiveIntensity: 0.6, clearcoat: 1.0, clearcoatRoughness: 0.0,
      wireframe: false,
    })
  } else if (emocao === 'fogo') {
    return new THREE.MeshPhysicalMaterial({
      ...base, roughness: 0.7, metalness: 0.0,
      transmission: 0.3, thickness: 0.8, opacity: 0.82,
      emissiveIntensity: 0.55, clearcoat: 0.2,
    })
  } else if (emocao === 'gelo') {
    return new THREE.MeshPhysicalMaterial({
      ...base, roughness: 0.0, metalness: 0.05,
      transmission: 0.7, thickness: 2.5, opacity: 0.85,
      emissiveIntensity: 0.12, clearcoat: 1.0, clearcoatRoughness: 0.0,
      color: new THREE.Color(0xddeeff),
    })
  } else {
    return new THREE.MeshPhysicalMaterial({
      ...base, roughness: 0.35, metalness: 0.7,
      transmission: 0.25, thickness: 1.2, opacity: 0.92,
      emissiveIntensity: 0.18, clearcoat: 0.6, clearcoatRoughness: 0.3,
    })
  }
}

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

export default function MiniPlayer3D({ preset, formato, prompt = '' }) {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const fmt = FORMATOS[formato] || FORMATOS.clipe
    const W = fmt.w, H = fmt.h

    const emocao = detectarEmocao(preset, prompt)
    const tiposDetectados = detectarAtmosferas(prompt)

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
    renderer.toneMappingExposure = emocao === 'noir' ? 0.75 : emocao === 'euforia' ? 1.4 : 1.1
    if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace
    mount.innerHTML = ''
    mount.appendChild(renderer.domElement)

    const glowColor = new THREE.Color(preset.glow)
    const seed = preset.nome.length + preset.bpm

    scene.fog = new THREE.FogExp2(new THREE.Color(preset.bg[2]).getHex(), emocao === 'melancolia' ? 0.08 : 0.05)

    // Sky
    const skyGeo = new THREE.SphereGeometry(50, 32, 32)
    const skyCanvas = document.createElement('canvas')
    skyCanvas.width = 2; skyCanvas.height = 256
    const skyCtx = skyCanvas.getContext('2d')
    const skyGrad = skyCtx.createLinearGradient(0, 0, 0, 256)
    skyGrad.addColorStop(0, preset.bg[2])
    skyGrad.addColorStop(0.55, preset.bg[1])
    skyGrad.addColorStop(1, preset.bg[0])
    skyCtx.fillStyle = skyGrad; skyCtx.fillRect(0, 0, 2, 256)
    const skyTex = new THREE.CanvasTexture(skyCanvas)
    scene.add(new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false })))

    // ── MELHORIA 2: Terreno que pulsa no BPM ──────────────────────────────────
    const groundSize = 40, groundSeg = 80
    const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize, groundSeg, groundSeg)
    const posAttrBase = groundGeo.attributes.position
    // Salva alturas base para animar
    const baseHeights = new Float32Array(posAttrBase.count)
    for (let i = 0; i < posAttrBase.count; i++) {
      const x = posAttrBase.getX(i), y = posAttrBase.getY(i)
      baseHeights[i] = fbm(x / 6, y / 6, seed, 5) * 1.4 - 0.5
      posAttrBase.setZ(i, baseHeights[i])
    }
    groundGeo.computeVertexNormals()

    const albedoTex = gerarTexturaProcedural(256, preset.bg[1], seed, 'cor')
    albedoTex.wrapS = albedoTex.wrapT = THREE.RepeatWrapping; albedoTex.repeat.set(6, 6)
    const roughTex = gerarTexturaProcedural(256, '#888888', seed + 7, 'rough')
    roughTex.wrapS = roughTex.wrapT = THREE.RepeatWrapping; roughTex.repeat.set(6, 6)
    const normalTex = gerarNormalMap(256, seed)
    normalTex.wrapS = normalTex.wrapT = THREE.RepeatWrapping; normalTex.repeat.set(6, 6)

    const groundMat = new THREE.MeshStandardMaterial({
      map: albedoTex, roughnessMap: roughTex, normalMap: normalTex,
      normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.85, metalness: 0.12,
    })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -1.8
    ground.receiveShadow = true
    scene.add(ground)

    // ── MELHORIA 1: Objeto central emocional ──────────────────────────────────
    const coreGeo = criarGeometriaEmocional(emocao, seed)
    const coreMat = criarMaterialEmocional(emocao, glowColor)
    const core = new THREE.Mesh(coreGeo, coreMat)
    core.position.set(0, 1.1, -2)
    core.castShadow = true
    scene.add(core)

    // Wireframe sutil em cima do objeto para emoções específicas
    if (emocao === 'noir' || emocao === 'neon') {
      const wireMat = new THREE.MeshBasicMaterial({
        color: glowColor, wireframe: true, transparent: true,
        opacity: emocao === 'noir' ? 0.08 : 0.15,
        blending: THREE.AdditiveBlending,
      })
      scene.add(new THREE.Mesh(coreGeo, wireMat).translateY(1.1).translateZ(-2))
    }

    // Luzes
    const ambient = new THREE.AmbientLight(0xffffff, emocao === 'noir' ? 0.04 : 0.12)
    scene.add(ambient)

    const sun = new THREE.DirectionalLight(0xffffff, emocao === 'noir' ? 0.5 : 1.4)
    sun.position.set(-6, 8, 4); sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 30
    scene.add(sun)

    const keyLight = new THREE.PointLight(glowColor, 14, 22, 2)
    keyLight.position.set(-3, 3, 3); keyLight.castShadow = true
    scene.add(keyLight)

    const rimLight = new THREE.PointLight(glowColor, 6, 18, 2)
    rimLight.position.set(4, 1, -3)
    scene.add(rimLight)

    // Partículas base
    const atmosfera = criarParticulas(150, glowColor, 0.035, 16, 0.45)
    scene.add(atmosfera)

    const camadasExtras = []
    tiposDetectados.forEach(tipo => {
      if (tipo === 'chuva') { const p = criarParticulas(350, 0x9fc8ff, 0.02, 18, 0.55); p.userData.tipo='chuva'; scene.add(p); camadasExtras.push(p) }
      if (tipo === 'fogo') { const p = criarParticulas(150, 0xff5500, 0.045, 8, 0.7); p.position.y=-1.5; p.userData.tipo='fogo'; scene.add(p); camadasExtras.push(p) }
      if (tipo === 'neve') { const p = criarParticulas(220, 0xffffff, 0.03, 18, 0.7); p.userData.tipo='neve'; scene.add(p); camadasExtras.push(p) }
      if (tipo === 'estrelas') { const p = criarParticulas(400, 0xffffff, 0.018, 35, 0.8); p.position.y+=8; p.userData.tipo='estrelas'; scene.add(p); camadasExtras.push(p) }
      if (tipo === 'dourado') { const p = criarParticulas(180, 0xF5D78E, 0.028, 12, 0.6); p.userData.tipo='dourado'; scene.add(p); camadasExtras.push(p) }
      if (tipo === 'poeira') { const p = criarParticulas(250, 0xd4b896, 0.018, 18, 0.4); p.userData.tipo='poeira'; scene.add(p); camadasExtras.push(p) }
      if (tipo === 'fumaca') { const p = criarParticulas(100, 0xaaaaaa, 0.1, 10, 0.16); p.userData.tipo='fumaca'; scene.add(p); camadasExtras.push(p) }
      if (tipo === 'euforia') { const p = criarParticulas(300, glowColor, 0.04, 14, 0.7); p.userData.tipo='euforia'; scene.add(p); camadasExtras.push(p) }
      if (tipo === 'melancolia') { scene.fog.density = 0.10; ambient.intensity = 0.06 }
      if (tipo === 'neon') { keyLight.intensity = 22; rimLight.color = new THREE.Color(0x00fff7); rimLight.intensity = 12 }
      if (tipo === 'noite') { scene.fog.density = 0.09; ambient.intensity = 0.04; sun.intensity = 0.3 }
    })

    // ── Composer com passes emocionais ────────────────────────────────────────
    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))

    // Bloom adaptado à emoção
    const bloomStrength = emocao === 'noir' ? 0.3 : emocao === 'euforia' ? 0.85 : emocao === 'neon' ? 1.1 : 0.55
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(W, H), bloomStrength, 0.5, 0.15)
    composer.addPass(bloomPass)

    // Bokeh
    const bokehPass = new BokehPass(scene, camera, { focus: 7.0, aperture: 0.0022, maxblur: 0.012, width: W, height: H })
    composer.addPass(bokehPass)

    // ── MELHORIA 3: Pass emocional ─────────────────────────────────────────────
    let emotionPass = null
    if (emocao === 'noir') {
      emotionPass = new ShaderPass(NoirShader)
      emotionPass.uniforms['intensity'].value = 0.92
    } else if (emocao === 'euforia') {
      emotionPass = new ShaderPass(EuforiaShader)
      emotionPass.uniforms['intensity'].value = 0.85
    } else if (emocao === 'melancolia') {
      emotionPass = new ShaderPass(MelancoliaShader)
      emotionPass.uniforms['intensity'].value = 0.8
    } else if (emocao === 'neon') {
      emotionPass = new ShaderPass(NeonShader)
      emotionPass.uniforms['intensity'].value = 0.75
      const gc = new THREE.Color(preset.glow)
      emotionPass.uniforms['glowColor'].value = new THREE.Vector3(gc.r, gc.g, gc.b)
    }
    if (emotionPass) composer.addPass(emotionPass)

    // ── MELHORIA 4: Motion blur na transição ───────────────────────────────────
    const motionBlurPass = new ShaderPass(MotionBlurShader)
    motionBlurPass.uniforms['intensity'].value = 0
    composer.addPass(motionBlurPass)

    // HUD
    const hud = document.createElement('div')
    hud.style.cssText = 'position:absolute;inset:0;pointer-events:none;font-family:Courier New,monospace;border-radius:12px;overflow:hidden;'
    hud.innerHTML = `
      <div style="position:absolute;top:0;left:0;right:0;display:flex;justify-content:space-between;align-items:center;padding:6px 8px;background:linear-gradient(180deg,rgba(0,0,0,0.55),transparent);">
        <span data-el="ratio" style="font-size:6px;color:${preset.glow};letter-spacing:1px;background:rgba(0,0,0,0.5);padding:2px 6px;border-radius:4px;"></span>
        <span style="font-size:6px;color:#ff4444;letter-spacing:2px;background:rgba(0,0,0,0.5);padding:2px 6px;border-radius:4px;display:flex;align-items:center;gap:3px;">
          <span data-el="recdot" style="width:4px;height:4px;border-radius:50%;background:#ff4444;display:inline-block;"></span>REC
        </span>
      </div>
      <div style="position:absolute;bottom:0;left:0;right:0;padding:7px 8px;background:linear-gradient(0deg,rgba(0,0,0,0.75),transparent);">
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

    // Vinheta
    const vinheta = document.createElement('div')
    vinheta.style.cssText = 'position:absolute;inset:0;pointer-events:none;border-radius:12px;'
    mount.appendChild(vinheta)

    // Grain
    const grain = document.createElement('div')
    grain.style.cssText = `position:absolute;inset:0;pointer-events:none;opacity:${emocao === 'melancolia' ? '0.12' : emocao === 'noir' ? '0.10' : '0.05'};border-radius:12px;mix-blend-mode:overlay;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
    mount.appendChild(grain)

    // ── MELHORIA 5: Visualizador de som simbólico ──────────────────────────────
    const soundCanvas = document.createElement('canvas')
    soundCanvas.width = W; soundCanvas.height = 18
    soundCanvas.style.cssText = 'position:absolute;bottom:28px;left:0;width:100%;height:18px;pointer-events:none;opacity:0.45;'
    mount.appendChild(soundCanvas)
    const sCtx = soundCanvas.getContext('2d')

    const bpm = preset.bpm
    const msPerBeat = 60000 / bpm
    const cortes = parseInt(preset.ritmo) || 20
    const msPorCorte = 60000 / cortes
    let lastCut = 0, cenaIdx = 0, flashIntensity = 0
    let camTarget = { x: 0, y: 1.6, z: 7, focus: 7 }
    let camVel = { x: 0, y: 0, z: 0 }
    // ── MELHORIA 4: direção do motion blur por tipo de corte ──────────────────
    let motionDir = new THREE.Vector2(0, 0)
    let motionIntensity = 0
    let raf
    const clock = new THREE.Clock()

    function pickAngulo() {
      const cena = preset.cenas[cenaIdx % preset.cenas.length]
      elCamTipo.textContent = cena.cam.toUpperCase()
      elCenDesc.textContent = cena.desc

      // Direciona o motion blur baseado no movimento de câmera
      const prevZ = camTarget.z
      if (cena.cam === 'Close extremo' || cena.cam === 'Macro extremo') {
        camTarget = { x: (Math.random()-0.5)*1.2, y: 1.2, z: 2.8, focus: 2.8 }
        motionDir.set(0, 0.015) // zoom in: blur pra frente
      } else if (cena.cam === 'Ângulo baixo') {
        camTarget = { x: (Math.random()-0.5)*1.5, y: -0.3, z: 5.5, focus: 6 }
        motionDir.set(0, -0.012)
      } else if (cena.cam === 'Plano aberto' || cena.cam === 'Grande angular') {
        camTarget = { x: (Math.random()-0.5)*3, y: 2.2, z: 11, focus: 10 }
        motionDir.set(0, -0.018) // zoom out: blur pra trás
      } else if (cena.cam === 'Travelling lateral') {
        const dir = Math.random() > 0.5 ? 1 : -1
        camTarget = { x: dir * 4, y: 1.6, z: 6.5, focus: 6.5 }
        motionDir.set(dir * 0.02, 0) // lateral: blur horizontal
      } else {
        camTarget = { x: (Math.random()-0.5)*2, y: 1.6, z: 7.5, focus: 7.5 }
        motionDir.set((Math.random()-0.5)*0.01, (Math.random()-0.5)*0.01)
      }
      motionIntensity = 1.0 // dispara blur no corte
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

    // ── MELHORIA 5: Desenha waveform simbólica ─────────────────────────────────
    function drawWaveform(t, beatPhase, emocao) {
      sCtx.clearRect(0, 0, W, 18)
      const bars = Math.floor(W / 3)
      const glowC = new THREE.Color(preset.glow)
      sCtx.fillStyle = `rgba(${Math.floor(glowC.r*255)},${Math.floor(glowC.g*255)},${Math.floor(glowC.b*255)},0.7)`

      for (let i = 0; i < bars; i++) {
        const x = i * 3
        const phase = i / bars
        // Altura base procedural por emoção
        let h
        if (emocao === 'euforia') {
          // Rítmico e alto
          h = (Math.sin(phase * Math.PI * 8 + t * 0.006) * 0.5 + 0.5) * 12 + 2
          h *= (beatPhase < 0.2 ? 1.6 : 1.0)
        } else if (emocao === 'melancolia') {
          // Ondulado e baixo
          h = (Math.sin(phase * Math.PI * 3 + t * 0.002) * 0.5 + 0.5) * 7 + 1
        } else if (emocao === 'noir') {
          // Esparso e irregular
          h = noise2D(i * 0.3, t * 0.001) * 10 + 1
          h *= (i % 4 === 0 ? 1.8 : 0.4)
        } else if (emocao === 'neon') {
          // Quadrado/digital
          const sq = Math.sin(phase * Math.PI * 12 + t * 0.008) > 0 ? 1 : 0
          h = sq * 11 + 2
        } else {
          h = (Math.sin(phase * Math.PI * 5 + t * 0.004) * 0.5 + 0.5) * 9 + 2
        }
        sCtx.fillRect(x, 18 - h, 2, h)
      }
    }

    function animate() {
      const t = clock.getElapsedTime() * 1000
      const dt = clock.getDelta()

      // Corte de cena
      if (t - lastCut > msPorCorte) {
        lastCut = t; cenaIdx++; pickAngulo(); flashIntensity = 1
      }
      flashIntensity = Math.max(0, flashIntensity - dt * 5)

      // ── MELHORIA 4: Decai o motion blur ───────────────────────────────────
      motionIntensity = Math.max(0, motionIntensity - dt * 3.5)
      motionBlurPass.uniforms['intensity'].value = motionIntensity * 0.8
      motionBlurPass.uniforms['velocity'].value.copy(motionDir)

      // Câmera
      camVel.x += (camTarget.x - camera.position.x) * 0.035
      camVel.y += (camTarget.y - camera.position.y) * 0.035
      camVel.z += (camTarget.z - camera.position.z) * 0.035
      camVel.x *= 0.86; camVel.y *= 0.86; camVel.z *= 0.86
      camera.position.x += camVel.x + Math.sin(t/280)*0.004 + Math.sin(t/3100)*0.01
      camera.position.y += camVel.y + Math.cos(t/340)*0.003 + Math.cos(t/4200)*0.008
      camera.position.z += camVel.z
      camera.lookAt(0, 1, -1)
      bokehPass.uniforms['focus'].value += (camTarget.focus - bokehPass.uniforms['focus'].value) * 0.04

      // Rotação do objeto por emoção
      if (emocao === 'noir') {
        core.rotation.y += dt * 0.04 // lento, pesado
        core.rotation.x += dt * 0.02
      } else if (emocao === 'euforia') {
        core.rotation.y += dt * 0.28 + Math.sin(t * 0.002) * 0.02
        core.rotation.x += dt * 0.18
        core.rotation.z += dt * 0.09
      } else if (emocao === 'melancolia') {
        core.rotation.y += dt * 0.06
        core.rotation.x = Math.sin(t * 0.0003) * 0.08 // oscila languidamente
      } else if (emocao === 'neon') {
        core.rotation.y += dt * 0.22
        core.rotation.x += dt * 0.08
      } else if (emocao === 'fogo') {
        core.rotation.y += dt * 0.15
        core.rotation.z = Math.sin(t * 0.002) * 0.06 // chama oscila
      } else {
        core.rotation.y += dt * 0.12; core.rotation.x += dt * 0.06
      }

      // Beat phase
      const beatPhase = (t % msPerBeat) / msPerBeat
      const onBeat = beatPhase < 0.15

      // ── MELHORIA 2: Terreno pulsa no BPM ──────────────────────────────────
      const posAttr = ground.geometry.attributes.position
      const pulseAmp = emocao === 'euforia' ? 0.45 : emocao === 'melancolia' ? 0.06 : 0.18
      const pulseStrength = onBeat ? (0.15 - beatPhase) / 0.15 : 0
      for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i), y = posAttr.getY(i)
        const dist = Math.sqrt(x*x + y*y)
        const wave = Math.sin(dist * 0.8 - t * 0.003) * 0.12 * pulseAmp
        const beat = pulseStrength * Math.exp(-dist * 0.15) * pulseAmp
        posAttr.setZ(i, baseHeights[i] + wave + beat)
      }
      posAttr.needsUpdate = true
      ground.geometry.computeVertexNormals()

      // Escala do objeto no beat por emoção
      let scaleOnBeat = 1
      if (emocao === 'euforia') scaleOnBeat = onBeat ? 1 + (0.15 - beatPhase) * 1.4 : 1
      else if (emocao === 'melancolia') scaleOnBeat = 1 + Math.sin(t * 0.0005) * 0.04
      else if (emocao === 'noir') scaleOnBeat = 1
      else scaleOnBeat = 1 + (onBeat ? (0.15 - beatPhase) * 0.9 : 0)
      core.scale.setScalar(scaleOnBeat)

      // Luzes pulsam
      keyLight.intensity = (tiposDetectados.includes('neon') ? 22 : 14) * (onBeat ? 1.35 : 1)

      // HUD
      elBpmDot.style.background = onBeat ? '#fff' : preset.glow
      elBpmDot.style.boxShadow = onBeat ? `0 0 4px ${preset.glow}` : 'none'
      elRecDot.style.opacity = Math.sin(t/300) > 0 ? '1' : '0.3'

      // Atualiza shader emocional com tempo
      if (emotionPass) emotionPass.uniforms['time'].value = t * 0.001

      // Partículas
      updateParticulas(atmosfera, 0.25, 0, dt)
      camadasExtras.forEach(layer => {
        if (layer.userData.tipo === 'chuva') updateParticulas(layer, 5, 0, dt)
        else if (layer.userData.tipo === 'fogo') updateParticulas(layer, -1.5, 0, dt)
        else if (layer.userData.tipo === 'neve') updateParticulas(layer, 0.7, Math.sin(t/1000)*0.3, dt)
        else if (layer.userData.tipo === 'fumaca') updateParticulas(layer, -0.3, 0, dt)
        else if (layer.userData.tipo === 'poeira') updateParticulas(layer, 0.1, Math.sin(t/2000)*0.2, dt)
        else if (layer.userData.tipo === 'dourado') updateParticulas(layer, 0.3, 0, dt)
        else if (layer.userData.tipo === 'euforia') {
          updateParticulas(layer, -0.8, Math.sin(t/800)*0.4, dt)
          if (onBeat) layer.material.size = 0.07
          else layer.material.size = Math.max(0.04, layer.material.size - dt * 0.3)
        }
        else if (layer.userData.tipo === 'estrelas') layer.rotation.y += dt * 0.008
      })

      // Vinheta por emoção
      const vigBase = emocao === 'melancolia' ? 'rgba(0,0,0,0.72)' : emocao === 'noir' ? 'rgba(0,0,0,0.80)' : 'rgba(0,0,0,0.55)'
      vinheta.style.background = flashIntensity > 0.05
        ? `radial-gradient(ellipse at center, rgba(255,255,255,${flashIntensity*0.18}) 0%, ${vigBase.replace(')', `,${0.42*(1-flashIntensity)})`)} 100%)`
        : `radial-gradient(ellipse at center, transparent 35%, ${vigBase} 100%)`

      // ── MELHORIA 5: Waveform simbólico ────────────────────────────────────
      drawWaveform(t, beatPhase, emocao)

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