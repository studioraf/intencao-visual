import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import * as Tone from 'tone'

/* ════════════════════════════════════════════════════════════════════════
   MiniPlayer3D — preview cinematográfico do "Kit de Intenção Visual"

   Prioriza REALISMO sobre espetáculo:
   - Energia suavizada por envelope (ataque/decaimento), nunca em "saltos".
   - Terreno gerado uma vez, como um set real.
   - Materiais fisicamente plausíveis; vidro/transmissão só no gelo.
   - Cortes de cena sem flash — apenas ajuste de exposição e motion blur.
   - Áudio via Tone.js com botão de mudo/som.
   ════════════════════════════════════════════════════════════════════════ */

const FORMATOS = {
  youtube:   { ratio: 16 / 9, w: 320, h: 180,  label: 'YouTube'   },
  instagram: { ratio: 1,      w: 240, h: 240,   label: 'Instagram' },
  filme:     { ratio: 2.39,   w: 320, h: 134,   label: 'Filme'     },
  clipe:     { ratio: 9 / 16, w: 150, h: 267,   label: 'Clipe'     },
}

const RATIO_LABEL = {
  [16 / 9]: '16:9',
  [1]:      '1:1',
  [2.39]:   '2.39:1',
  [9 / 16]: '9:16',
}

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

function detectarEmocao(preset, prompt) {
  const lower = (prompt || '').toLowerCase() + ' ' + (preset.nome || '').toLowerCase()
  if (lower.includes('noir') || lower.includes('dark') || lower.includes('sombri') || lower.includes('suspense') || lower.includes('terror') || lower.includes('horror') || lower.includes('mistério') || lower.includes('gótico') || lower.includes('gothic')) return 'noir'
  if (lower.includes('épico') || lower.includes('epic') || lower.includes('grandios') || lower.includes('poder') || lower.includes('luxo') || lower.includes('luxury') || lower.includes('status') || lower.includes('heroi') || lower.includes('fantasia') || lower.includes('gospel') || lower.includes('motivacional')) return 'epico'
  if (lower.includes('eufori') || lower.includes('hype') || lower.includes('festa') || lower.includes('rave') || lower.includes('club') || lower.includes('dance') || lower.includes('carnaval')) return 'euforia'
  if (lower.includes('melanc') || lower.includes('triste') || lower.includes('sad') || lower.includes('lofi') || lower.includes('lo-fi') || lower.includes('chill') || lower.includes('nostalg')) return 'melancolia'
  if (lower.includes('romance') || lower.includes('amor') || lower.includes('intimo') || lower.includes('íntimo') || lower.includes('casamento') || lower.includes('acústico') || lower.includes('voz e violão')) return 'romance'
  if (lower.includes('neon') || lower.includes('cyber') || lower.includes('glitch') || lower.includes('synth') || lower.includes('futurismo') || lower.includes('caligrafia')) return 'neon'
  if (lower.includes('fogo') || lower.includes('fire') || lower.includes('brasa')) return 'fogo'
  if (lower.includes('gelo') || lower.includes('neve') || lower.includes('frio') || lower.includes('cristal') || lower.includes('submers')) return 'gelo'
  return 'neutro'
}

/* ── Ruído / FBM ─────────────────────────────────────────────────────────── */
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
        img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v
      } else {
        const variation = (n - 0.5) * 0.35
        img.data[i]     = Math.min(255, Math.max(0, base.r * 255 * (1 + variation)))
        img.data[i + 1] = Math.min(255, Math.max(0, base.g * 255 * (1 + variation)))
        img.data[i + 2] = Math.min(255, Math.max(0, base.b * 255 * (1 + variation)))
      }
      img.data[i + 3] = 255
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
      img.data[i]     = ((nx / len) * 0.5 + 0.5) * 255
      img.data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255
      img.data[i + 2] = ((nz / len) * 0.5 + 0.5) * 255
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return new THREE.CanvasTexture(canvas)
}

/* ── Shaders de correção de cor ──────────────────────────────────────────── */
const NoirShader = {
  uniforms: { tDiffuse: { value: null }, intensity: { value: 0.0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float intensity; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      lum = pow(lum, 1.35);
      vec3 noir = vec3(lum) + vec3(0.0, 0.0, 0.03) * (1.0 - lum);
      gl_FragColor = vec4(mix(c.rgb, noir, intensity), c.a);
    }
  `
}

const MelancoliaShader = {
  uniforms: { tDiffuse: { value: null }, intensity: { value: 0.0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float intensity; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      vec3 desat = mix(c.rgb, vec3(lum * 0.88, lum * 0.90, lum * 0.98), intensity * 0.6);
      float dist = length(vUv - 0.5) * 2.0;
      float vig = 1.0 - smoothstep(0.5, 1.5, dist) * intensity * 0.45;
      gl_FragColor = vec4(desat * vig, c.a);
    }
  `
}

const NeonShader = {
  uniforms: { tDiffuse: { value: null }, intensity: { value: 0.0 }, glowColor: { value: new THREE.Vector3(0, 1, 1) } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float intensity; uniform vec3 glowColor; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 shifted = c.rgb + vec3(-0.015, 0.03, 0.045) * intensity;
      float bright = max(0.0, dot(c.rgb, vec3(0.333)) - 0.55) * 2.0;
      shifted += glowColor * bright * intensity * 0.18;
      gl_FragColor = vec4(shifted, c.a);
    }
  `
}

/* Aberração cromática — constante, não pulsa no beat (lentes reais têm aberração fixa). */
const ChromaShader = {
  uniforms: { tDiffuse: { value: null }, intensity: { value: 0.0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float intensity; varying vec2 vUv;
    void main(){
      vec2 c = vUv - 0.5;
      float d = length(c);
      float ab = intensity * 0.006 * d * d;
      vec2 ro = c * ab, bo = -c * ab * 0.7;
      float r = texture2D(tDiffuse, vUv + ro).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv + bo).b;
      gl_FragColor = vec4(r, g, b, 1.0);
    }
  `
}

const MotionBlurShader = {
  uniforms: { tDiffuse: { value: null }, velocity: { value: new THREE.Vector2(0, 0) }, intensity: { value: 0.0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec2 velocity; uniform float intensity; varying vec2 vUv;
    void main(){
      vec4 result = vec4(0.0);
      for (int i = 0; i < 8; i++) {
        float t = float(i) / 7.0 - 0.5;
        result += texture2D(tDiffuse, vUv + velocity * t * intensity);
      }
      gl_FragColor = result / 8.0;
    }
  `
}

/* ── Geometria do objeto central ─────────────────────────────────────────── */
function criarGeometriaEmocional(emocao, seed) {
  let geo
  if (emocao === 'noir') {
    geo = new THREE.DodecahedronGeometry(1, 1)
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i))
      const n = fbm(v.x * 3 + seed, v.y * 3, seed, 2) * 0.06
      v.multiplyScalar(1 + n)
      pos.setXYZ(i, v.x, v.y, v.z)
    }
    geo.computeVertexNormals()
  } else if (emocao === 'epico') {
    geo = new THREE.IcosahedronGeometry(1, 1)
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i))
      v.y *= 1.18
      const n = fbm(v.x * 2 + seed, v.y * 2, seed, 2) * 0.04
      v.multiplyScalar(1 + n)
      pos.setXYZ(i, v.x, v.y, v.z)
    }
    geo.computeVertexNormals()
  } else if (emocao === 'romance') {
    geo = new THREE.SphereGeometry(1, 48, 48)
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i))
      const n = fbm(v.x * 2 + seed, v.y * 2, seed, 3) * 0.03
      v.multiplyScalar(1 + n)
      pos.setXYZ(i, v.x, v.y, v.z)
    }
    geo.computeVertexNormals()
  } else if (emocao === 'euforia') {
    geo = new THREE.IcosahedronGeometry(1, 2)
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i))
      const n = fbm(v.x * 3 + seed, v.y * 3, seed, 3) * 0.1
      v.multiplyScalar(1 + n)
      pos.setXYZ(i, v.x, v.y, v.z)
    }
    geo.computeVertexNormals()
  } else if (emocao === 'melancolia') {
    geo = new THREE.IcosahedronGeometry(1, 3)
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i))
      const crushTop = v.y > 0 ? 1.0 - v.y * 0.12 : 1.0
      v.y *= crushTop
      v.multiplyScalar(1 + fbm(v.x * 2, v.z * 2, seed, 3) * 0.04)
      pos.setXYZ(i, v.x, v.y, v.z)
    }
    geo.computeVertexNormals()
  } else if (emocao === 'neon') {
    geo = new THREE.TorusGeometry(0.75, 0.3, 24, 64)
  } else if (emocao === 'fogo') {
    geo = new THREE.ConeGeometry(0.68, 1.7, 7, 6)
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i))
      const hf = (v.y + 1) / 2
      const fl = fbm(v.x * 4 + seed, v.z * 4, seed, 3) * hf * 0.12
      v.x += fl; v.z += fl
      pos.setXYZ(i, v.x, v.y, v.z)
    }
    geo.computeVertexNormals()
  } else if (emocao === 'gelo') {
    geo = new THREE.OctahedronGeometry(1, 1)
  } else {
    geo = new THREE.IcosahedronGeometry(1, 3)
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i))
      v.multiplyScalar(1 + fbm(v.x * 2 + 10, v.y * 2 + 10, seed, 3) * 0.05)
      pos.setXYZ(i, v.x, v.y, v.z)
    }
    geo.computeVertexNormals()
  }
  return geo
}

/* ── Materiais — opacos e fisicamente plausíveis. Transmissão só no gelo. ── */
function criarMaterialEmocional(emocao, glowColor) {
  if (emocao === 'noir') {
    return new THREE.MeshPhysicalMaterial({
      color: 0x16161c, roughness: 0.32, metalness: 0.85,
      emissive: glowColor, emissiveIntensity: 0.02, clearcoat: 0.4, clearcoatRoughness: 0.25,
    })
  } else if (emocao === 'epico') {
    return new THREE.MeshPhysicalMaterial({
      color: glowColor, roughness: 0.38, metalness: 0.75,
      emissive: glowColor, emissiveIntensity: 0.03, clearcoat: 0.5, clearcoatRoughness: 0.3,
    })
  } else if (emocao === 'romance') {
    return new THREE.MeshPhysicalMaterial({
      color: glowColor, roughness: 0.55, metalness: 0.05,
      emissive: glowColor, emissiveIntensity: 0.06, clearcoat: 0.15, sheen: 0.4, sheenColor: glowColor,
    })
  } else if (emocao === 'euforia') {
    return new THREE.MeshPhysicalMaterial({
      color: glowColor, roughness: 0.25, metalness: 0.5,
      emissive: glowColor, emissiveIntensity: 0.08, clearcoat: 0.7, clearcoatRoughness: 0.15,
    })
  } else if (emocao === 'melancolia') {
    return new THREE.MeshPhysicalMaterial({
      color: glowColor, roughness: 0.75, metalness: 0.08,
      emissive: glowColor, emissiveIntensity: 0.02, clearcoat: 0.08,
    })
  } else if (emocao === 'neon') {
    return new THREE.MeshPhysicalMaterial({
      color: 0x0a0a0a, roughness: 0.1, metalness: 0.9,
      emissive: glowColor, emissiveIntensity: 0.35, clearcoat: 1.0, clearcoatRoughness: 0.0,
    })
  } else if (emocao === 'fogo') {
    return new THREE.MeshPhysicalMaterial({
      color: glowColor, roughness: 0.6, metalness: 0.0,
      emissive: glowColor, emissiveIntensity: 0.22, clearcoat: 0.1,
    })
  } else if (emocao === 'gelo') {
    return new THREE.MeshPhysicalMaterial({
      color: 0xddeeff, roughness: 0.02, metalness: 0.0,
      transmission: 0.85, thickness: 2.2, ior: 1.3, opacity: 1.0, transparent: true,
      emissive: glowColor, emissiveIntensity: 0.04, clearcoat: 1.0, clearcoatRoughness: 0.0,
    })
  }
  return new THREE.MeshPhysicalMaterial({
    color: glowColor, roughness: 0.4, metalness: 0.55,
    emissive: glowColor, emissiveIntensity: 0.04, clearcoat: 0.4, clearcoatRoughness: 0.3,
  })
}

function criarParticulas(count, color, size, spread, opacity, additive = false) {
  const geo = new THREE.BufferGeometry()
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * spread
    positions[i * 3 + 1] = Math.random() * spread * 0.6
    positions[i * 3 + 2] = (Math.random() - 0.5) * spread
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const mat = new THREE.PointsMaterial({
    color, size, transparent: true, opacity,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthWrite: false, sizeAttenuation: true,
  })
  return new THREE.Points(geo, mat)
}

/* ════════════════════════════════════════════════════════════════════════
   MOTOR DE ÁUDIO — Tone.js
   10 famílias cobrindo todos os audio.tipo usados em presets.py.
   Expõe envelope de energia (ataque/decaimento) para animar a cena de
   forma suave e contínua — nunca em "saltos" de beat.
   ════════════════════════════════════════════════════════════════════════ */
class PlayerAudio {
  constructor() {
    this.synths = []
    this.loop = null
    this.started = false
    this.analyser = null
    this.fft = null
  }

  async start(tipo, bpm) {
    try {
      await Tone.start()
      this.stop()
      Tone.getTransport().bpm.value = bpm
      this.analyser = new Tone.Analyser('waveform', 64)
      this.fft = new Tone.Analyser('fft', 32)
      const builders = {
        trap:       () => this._trap(),
        cyberpunk:  () => this._cyberpunk(),
        romance:    () => this._romance(),
        noir:       () => this._noir(),
        epic:       () => this._epic(),
        lofi:       () => this._lofi(),
        ambient:    () => this._ambient(),
        rock:       () => this._rock(),
        festa:      () => this._festa(),
        eletronica: () => this._eletronica(),
      }
      ;(builders[tipo] || builders.ambient)()
      this.synths.forEach(s => {
        try { s.connect(this.analyser); s.connect(this.fft) } catch (e) {}
      })
      this.analyser.toDestination()
      this.fft.toDestination()
      Tone.getTransport().start()
      this.started = true
    } catch (e) {
      console.warn('Áudio indisponível:', e)
    }
  }

  /* Nível médio de energia (0..1), suavizado pelo chamador via envelope */
  getLevel() {
    if (!this.analyser || !this.started) return 0
    try {
      const wave = this.analyser.getValue()
      let sum = 0
      for (let i = 0; i < wave.length; i++) sum += Math.abs(wave[i])
      return Math.min(1, (sum / wave.length) * 4)
    } catch (e) { return 0 }
  }

  getFFT() {
    if (!this.fft || !this.started) return null
    try { return this.fft.getValue() } catch (e) { return null }
  }

  _trap() {
    const kick = new Tone.MembraneSynth({ pitchDecay: 0.06, octaves: 6, envelope: { attack: 0.001, decay: 0.4, sustain: 0 } }).toDestination()
    kick.volume.value = -6
    const hat = new Tone.MetalSynth({ frequency: 300, envelope: { attack: 0.001, decay: 0.04, release: 0.01 }, harmonicity: 4, modulationIndex: 24, resonance: 3000, octaves: 1 }).toDestination()
    hat.volume.value = -22
    const bass = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.6, sustain: 0.1, release: 0.4 } }).toDestination()
    bass.volume.value = -10
    this.loop = new Tone.Sequence((t, s) => {
      if (s === 0 || s === 8) kick.triggerAttackRelease('C1', '8n', t)
      if (s % 2 === 0) hat.triggerAttackRelease('16n', t)
      if (s === 4) bass.triggerAttackRelease('C2', '4n', t)
      if (s === 12) bass.triggerAttackRelease('G1', '4n', t)
    }, [...Array(16).keys()], '16n')
    this.synths = [kick, hat, bass]
    this.loop.start(0)
  }

  _cyberpunk() {
    const lead = new Tone.Synth({ oscillator: { type: 'sawtooth' }, envelope: { attack: 0.01, decay: 0.12, sustain: 0.2, release: 0.15 } })
    const dist = new Tone.Distortion(0.3), rev = new Tone.Reverb(0.4)
    lead.chain(dist, rev, Tone.getDestination()); lead.volume.value = -16
    const kick = new Tone.MembraneSynth({ pitchDecay: 0.03, octaves: 4 }).toDestination(); kick.volume.value = -10
    const notes = ['C4', 'Eb4', 'G4', 'Bb4', 'C5', 'Bb4', 'Ab4', 'G4']
    this.loop = new Tone.Sequence((t, s) => {
      lead.triggerAttackRelease(notes[s % notes.length], '16n', t)
      if (s % 4 === 0) kick.triggerAttackRelease('C1', '8n', t)
    }, [...Array(8).keys()], '16n')
    this.synths = [lead, kick]
    this.loop.start(0)
  }

  _romance() {
    const piano = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.02, decay: 1.0, sustain: 0.25, release: 1.6 } })
    const rev = new Tone.Reverb(3); rev.wet.value = 0.55; piano.chain(rev, Tone.getDestination()); piano.volume.value = -12
    const melody = ['E4', 'G4', 'B4', 'E5', 'D5', 'B4', 'G4', 'A4']
    this.loop = new Tone.Sequence((t, s) => piano.triggerAttackRelease(melody[s % melody.length], '4n', t), [...Array(8).keys()], '4n')
    this.synths = [piano]
    this.loop.start(0)
  }

  _noir() {
    const bass = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.08, decay: 1.2, sustain: 0.3, release: 1.6 } })
    const rev = new Tone.Reverb(2.5); rev.wet.value = 0.4; bass.chain(rev, Tone.getDestination()); bass.volume.value = -10
    this.loop = new Tone.Sequence((t, s) => {
      if (s === 0) bass.triggerAttackRelease('C2', '2n', t)
      if (s === 8) bass.triggerAttackRelease('G1', '2n', t)
    }, [...Array(16).keys()], '16n')
    this.synths = [bass]
    this.loop.start(0)
  }

  _epic() {
    const strings = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.6, decay: 0.4, sustain: 0.6, release: 1.6 } })
    const rev = new Tone.Reverb(4); rev.wet.value = 0.6; strings.chain(rev, Tone.getDestination()); strings.volume.value = -16
    const kick = new Tone.MembraneSynth({ pitchDecay: 0.25, octaves: 7 }).toDestination(); kick.volume.value = -6
    const chords = [['C3', 'E3', 'G3'], ['F3', 'A3', 'C4'], ['G3', 'B3', 'D4'], ['A3', 'C4', 'E4']]
    let ci = 0
    this.loop = new Tone.Sequence((t, s) => {
      if (s === 0) { strings.triggerAttackRelease(chords[ci % chords.length], '2n', t); ci++ }
      if (s === 0 || s === 8) kick.triggerAttackRelease('C1', '8n', t)
    }, [...Array(16).keys()], '8n')
    this.synths = [strings, kick]
    this.loop.start(0)
  }

  _lofi() {
    const chord = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'triangle' }, envelope: { attack: 0.05, decay: 0.8, sustain: 0.4, release: 1.2 } })
    const filt = new Tone.Filter(1200, 'lowpass'); const rev = new Tone.Reverb(1.5); rev.wet.value = 0.3
    chord.chain(filt, rev, Tone.getDestination()); chord.volume.value = -16
    const kick = new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 3 }).toDestination(); kick.volume.value = -14
    const chords = [['C3', 'E3', 'A3'], ['F3', 'A3', 'C4']]
    let ci = 0
    this.loop = new Tone.Sequence((t, s) => {
      if (s === 0) { chord.triggerAttackRelease(chords[ci % chords.length], '2n', t); ci++ }
      if (s === 0 || s === 10) kick.triggerAttackRelease('C2', '8n', t)
    }, [...Array(16).keys()], '8n')
    this.synths = [chord, kick]
    this.loop.start(0)
  }

  _ambient() {
    const pad = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'sine' }, envelope: { attack: 2.0, decay: 1.0, sustain: 0.8, release: 3.0 } })
    const rev = new Tone.Reverb(6); rev.wet.value = 0.7; pad.chain(rev, Tone.getDestination()); pad.volume.value = -18
    const chords = [['C3', 'G3', 'D4'], ['A2', 'E3', 'B3']]
    let ci = 0
    this.loop = new Tone.Sequence((t, s) => {
      if (s === 0) { pad.triggerAttackRelease(chords[ci % chords.length], '1n', t); ci++ }
    }, [0, 8], '8n')
    this.synths = [pad]
    this.loop.start(0)
  }

  _rock() {
    const gtr = new Tone.Synth({ oscillator: { type: 'fatsawtooth', count: 3, spread: 20 }, envelope: { attack: 0.005, decay: 0.25, sustain: 0.15, release: 0.15 } })
    const dist = new Tone.Distortion(0.5); gtr.chain(dist, Tone.getDestination()); gtr.volume.value = -14
    const kick = new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 5 }).toDestination(); kick.volume.value = -8
    const snare = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.15, sustain: 0 } }).toDestination(); snare.volume.value = -14
    const riff = ['E3', 'E3', 'G3', 'E3']
    this.loop = new Tone.Sequence((t, s) => {
      gtr.triggerAttackRelease(riff[s % riff.length], '8n', t)
      if (s % 4 === 0) kick.triggerAttackRelease('C1', '8n', t)
      if (s % 4 === 2) snare.triggerAttackRelease('8n', t)
    }, [...Array(8).keys()], '8n')
    this.synths = [gtr, kick, snare]
    this.loop.start(0)
  }

  _festa() {
    const perc = new Tone.MembraneSynth({ pitchDecay: 0.02, octaves: 3 }).toDestination(); perc.volume.value = -8
    const bell = new Tone.MetalSynth({ frequency: 600, envelope: { attack: 0.001, decay: 0.1, release: 0.05 }, harmonicity: 3, modulationIndex: 10, resonance: 2000 }).toDestination(); bell.volume.value = -20
    const bass = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.2 } }).toDestination(); bass.volume.value = -10
    this.loop = new Tone.Sequence((t, s) => {
      if (s % 2 === 0) perc.triggerAttackRelease('C2', '8n', t)
      if (s % 3 === 0) bell.triggerAttackRelease('16n', t)
      if (s === 0) bass.triggerAttackRelease('C2', '4n', t)
    }, [...Array(8).keys()], '8n')
    this.synths = [perc, bell, bass]
    this.loop.start(0)
  }

  _eletronica() {
    const pluck = new Tone.Synth({ oscillator: { type: 'square' }, envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.05 } }).toDestination(); pluck.volume.value = -16
    const kick = new Tone.MembraneSynth({ pitchDecay: 0.02, octaves: 5 }).toDestination(); kick.volume.value = -6
    const notes = ['C4', 'C4', 'Eb4', 'C4', 'G4', 'C4', 'Eb4', 'D4']
    this.loop = new Tone.Sequence((t, s) => {
      kick.triggerAttackRelease('C1', '8n', t)
      pluck.triggerAttackRelease(notes[s % notes.length], '16n', t)
    }, [...Array(8).keys()], '8n')
    this.synths = [pluck, kick]
    this.loop.start(0)
  }

  stop() {
    /* try/catch granular: um erro em um synth não impede a limpeza dos outros. */
    try { Tone.getTransport().stop(); Tone.getTransport().cancel() } catch (e) { console.error('Transport stop:', e) }
    if (this.loop) {
      try { this.loop.stop(); this.loop.dispose() } catch (e) { console.error('Loop dispose:', e) }
      this.loop = null
    }
    this.synths.forEach(s => { try { s.dispose() } catch (e) { console.error('Synth dispose:', e) } })
    this.synths = []
    if (this.analyser) { try { this.analyser.dispose() } catch (e) { console.error('Analyser dispose:', e) } }
    if (this.fft)      { try { this.fft.dispose()      } catch (e) { console.error('FFT dispose:', e)      } }
    this.analyser = null; this.fft = null
    this.started = false
  }
}

/* ── Ícones SVG inline ───────────────────────────────────────────────────── */
function IconSom() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path d="M3 9v6h4l5 5V4L7 9H3z" fill="currentColor" />
      <path d="M16 8a5 5 0 010 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M18.5 5.5a9 9 0 010 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.6" />
    </svg>
  )
}
function IconMudo() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path d="M3 9v6h4l5 5V4L7 9H3z" fill="currentColor" />
      <path d="M16.5 9.5l5 5M21.5 9.5l-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

/* ════════════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ════════════════════════════════════════════════════════════════════════ */
export default function MiniPlayer3D({ preset, formato, prompt = '' }) {
  const mountRef = useRef(null)
  const audioRef = useRef(null)
  const [audioEnabled, setAudioEnabled] = useState(false)

  const toggleAudio = useCallback(() => setAudioEnabled(v => !v), [])

  /* ── useEffect 1: Three.js — só re-executa quando preset/formato/prompt muda.
     audioEnabled NÃO é dependência aqui: mutar/desmutar não deve recriar
     toda a cena 3D. O controle de áudio fica no useEffect 2. ── */
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const fmt = FORMATOS[formato] || FORMATOS.clipe
    const W = fmt.w, H = fmt.h

    // Valores derivados calculados uma vez por montagem
    const emocao       = detectarEmocao(preset, prompt)
    const tiposDetect  = detectarAtmosferas(prompt)
    const seed         = preset.nome.length + preset.bpm
    const glowColor    = new THREE.Color(preset.glow)

    /* ── Cena / câmera / renderer ── */
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100)
    camera.position.set(0, 1.6, 7)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    const exposureBase = emocao === 'noir' ? 0.85 : emocao === 'euforia' ? 1.2 : 1.05
    renderer.toneMappingExposure = exposureBase
    if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace

    // Limpa o container antes de adicionar o novo canvas
    mount.innerHTML = ''
    mount.appendChild(renderer.domElement)

    scene.fog = new THREE.FogExp2(new THREE.Color(preset.bg[2]).getHex(), emocao === 'melancolia' ? 0.07 : 0.05)

    /* Céu — gradiente fixo (sem animação de cor) */
    const skyGeo = new THREE.SphereGeometry(50, 32, 32)
    const skyCanvas = document.createElement('canvas')
    skyCanvas.width = 2; skyCanvas.height = 256
    const skyCtx = skyCanvas.getContext('2d')
    const skyGrad = skyCtx.createLinearGradient(0, 0, 0, 256)
    skyGrad.addColorStop(0, preset.bg[2]); skyGrad.addColorStop(0.55, preset.bg[1]); skyGrad.addColorStop(1, preset.bg[0])
    skyCtx.fillStyle = skyGrad; skyCtx.fillRect(0, 0, 2, 256)
    scene.add(new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(skyCanvas), side: THREE.BackSide, fog: false })))

    /* Terreno — gerado uma vez, como um set fixo. Não recomputa a cada frame. */
    const groundGeo = new THREE.PlaneGeometry(40, 40, 64, 64)
    const gPos = groundGeo.attributes.position
    for (let i = 0; i < gPos.count; i++) {
      const x = gPos.getX(i), y = gPos.getY(i)
      gPos.setZ(i, fbm(x / 7, y / 7, seed, 4) * 0.5 - 0.3)
    }
    groundGeo.computeVertexNormals()
    const albedoTex = gerarTexturaProcedural(256, preset.bg[1], seed, 'cor')
    albedoTex.wrapS = albedoTex.wrapT = THREE.RepeatWrapping; albedoTex.repeat.set(6, 6)
    const roughTex = gerarTexturaProcedural(256, '#888888', seed + 7, 'rough')
    roughTex.wrapS = roughTex.wrapT = THREE.RepeatWrapping; roughTex.repeat.set(6, 6)
    const normalTex = gerarNormalMap(256, seed)
    normalTex.wrapS = normalTex.wrapT = THREE.RepeatWrapping; normalTex.repeat.set(6, 6)
    const ground = new THREE.Mesh(
      groundGeo,
      new THREE.MeshStandardMaterial({ map: albedoTex, roughnessMap: roughTex, normalMap: normalTex, normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.85, metalness: 0.1 })
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -1.8
    ground.receiveShadow = true
    scene.add(ground)

    /* Objeto central */
    const coreGeo = criarGeometriaEmocional(emocao, seed)
    const coreMat = criarMaterialEmocional(emocao, glowColor)
    const core = new THREE.Mesh(coreGeo, coreMat)
    core.position.set(0, 1.1, -2)
    core.castShadow = true
    scene.add(core)

    /* Luzes */
    const ambientLight = new THREE.AmbientLight(0xffffff, emocao === 'noir' ? 0.05 : 0.14)
    scene.add(ambientLight)
    const directionalLight = new THREE.DirectionalLight(0xffffff, emocao === 'noir' ? 0.55 : 1.3)
    directionalLight.position.set(-6, 8, 4); directionalLight.castShadow = true
    directionalLight.shadow.mapSize.set(1024, 1024); directionalLight.shadow.camera.near = 0.5; directionalLight.shadow.camera.far = 30
    scene.add(directionalLight)
    const keyLightBase = 9
    const pointLightKey = new THREE.PointLight(glowColor, keyLightBase, 22, 2)
    pointLightKey.position.set(-3, 3, 3); pointLightKey.castShadow = true
    scene.add(pointLightKey)
    const pointLightRim = new THREE.PointLight(glowColor, 4, 18, 2)
    pointLightRim.position.set(4, 1, -3)
    scene.add(pointLightRim)

    /* Partículas atmosféricas */
    const atmosfera = criarParticulas(80, glowColor, 0.025, 16, 0.22, false)
    scene.add(atmosfera)

    const camadasExtras = []
    tiposDetect.forEach(tipo => {
      const cfg = {
        chuva:    [220, 0x9fc8ff, 0.016, 18, 0.4,  false],
        fogo:     [90,  0xff5500, 0.035, 8,  0.5,  true ],
        neve:     [150, 0xffffff, 0.024, 18, 0.5,  false],
        estrelas: [300, 0xffffff, 0.014, 35, 0.6,  false],
        dourado:  [100, 0xF5D78E, 0.02,  12, 0.4,  true ],
        poeira:   [160, 0xd4b896, 0.014, 18, 0.28, false],
        fumaca:   [60,  0xaaaaaa, 0.09,  10, 0.12, false],
      }[tipo]
      if (cfg) { const p = criarParticulas(...cfg); p.userData.tipo = tipo; scene.add(p); camadasExtras.push(p) }
      if (tipo === 'neon')  { pointLightKey.intensity = keyLightBase * 1.4; pointLightRim.color = new THREE.Color(0x00fff7); pointLightRim.intensity = 7 }
      if (tipo === 'noite') { scene.fog.density = 0.08; ambientLight.intensity = 0.04; directionalLight.intensity = 0.3 }
    })

    /* ── Composer ── */
    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))

    const bloomStrength = emocao === 'noir' ? 0.18 : emocao === 'euforia' ? 0.42 : emocao === 'neon' ? 0.55 : 0.28
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(W, H), bloomStrength, 0.4, 0.78)
    composer.addPass(bloomPass)

    const bokehPass = new BokehPass(scene, camera, { focus: 7.0, aperture: 0.0018, maxblur: 0.01, width: W, height: H })
    composer.addPass(bokehPass)

    let emotionPass = null
    if (emocao === 'noir')       { emotionPass = new ShaderPass(NoirShader);       emotionPass.uniforms.intensity.value = 0.55 }
    else if (emocao === 'melancolia') { emotionPass = new ShaderPass(MelancoliaShader); emotionPass.uniforms.intensity.value = 0.6  }
    else if (emocao === 'neon')  {
      emotionPass = new ShaderPass(NeonShader); emotionPass.uniforms.intensity.value = 0.5
      const gc = new THREE.Color(preset.glow)
      emotionPass.uniforms.glowColor.value = new THREE.Vector3(gc.r, gc.g, gc.b)
    }
    if (emotionPass) composer.addPass(emotionPass)

    const chromaPass = new ShaderPass(ChromaShader)
    chromaPass.uniforms.intensity.value = emocao === 'neon' ? 0.6 : 0.3
    composer.addPass(chromaPass)

    const motionBlurPass = new ShaderPass(MotionBlurShader)
    motionBlurPass.uniforms.intensity.value = 0
    composer.addPass(motionBlurPass)

    /* ── HUD ── */
    const ACCENT_GOLD = '#C9A227'
    const hud = document.createElement('div')
    hud.style.cssText = `position:absolute;inset:0;pointer-events:none;font-family:'Cairo','Segoe UI',sans-serif;border-radius:10px;overflow:hidden;`
    hud.innerHTML = `
      <div data-el="lattice-top" style="position:absolute;top:0;left:0;right:0;height:2px;opacity:0.55;background:repeating-linear-gradient(115deg, ${ACCENT_GOLD} 0 6px, transparent 6px 13px);"></div>
      <div data-el="lattice-bottom" style="position:absolute;bottom:0;left:0;right:0;height:2px;opacity:0.55;background:repeating-linear-gradient(115deg, ${preset.glow} 0 6px, transparent 6px 13px);"></div>
      <div style="position:absolute;top:0;left:0;right:0;display:flex;justify-content:space-between;align-items:center;padding:7px 8px;background:linear-gradient(180deg, rgba(5,5,8,0.6), transparent);">
        <span data-el="ratio" style="font-size:6px;font-weight:600;color:${ACCENT_GOLD};letter-spacing:1.5px;background:rgba(5,5,8,0.55);padding:2px 6px;border:1px solid ${ACCENT_GOLD}55;border-radius:2px;"></span>
        <span style="font-size:6px;color:#e8503a;letter-spacing:1.5px;background:rgba(5,5,8,0.55);padding:2px 6px;border:1px solid #e8503a55;border-radius:2px;display:flex;align-items:center;gap:3px;">
          <span data-el="recdot" style="width:4px;height:4px;border-radius:50%;background:#e8503a;display:inline-block;"></span>REC
        </span>
      </div>
      <div style="position:absolute;bottom:0;left:0;right:0;padding:8px 9px;background:linear-gradient(0deg, rgba(5,5,8,0.78), transparent);">
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:5px;">
          <div>
            <div data-el="camtipo" style="font-size:7px;font-weight:700;color:${preset.glow};letter-spacing:1px;"></div>
            <div data-el="cendesc" style="font-size:5.8px;color:rgba(255,255,255,0.7);margin-top:1px;font-weight:300;"></div>
          </div>
          <div style="text-align:right;">
            <div style="display:flex;align-items:center;gap:3px;justify-content:flex-end;">
              <span data-el="bpmdot" style="width:4px;height:4px;border-radius:50%;background:${ACCENT_GOLD};display:inline-block;"></span>
              <span data-el="bpm" style="font-size:7px;font-weight:700;color:${ACCENT_GOLD};"></span>
            </div>
            <div data-el="tipografia" style="font-size:5.3px;color:rgba(255,255,255,0.45);margin-top:1px;"></div>
          </div>
        </div>
        <div data-el="paleta" style="display:flex;gap:2px;height:4px;margin-bottom:4px;border-radius:1px;overflow:hidden;"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span data-el="audio" style="font-size:4.8px;color:rgba(255,255,255,0.4);letter-spacing:0.4px;"></span>
          <span data-el="nome" style="font-size:5.3px;color:rgba(255,255,255,0.5);letter-spacing:1px;font-weight:600;"></span>
        </div>
      </div>
    `
    mount.style.position = 'relative'
    mount.appendChild(hud)

    const el = (name) => hud.querySelector(`[data-el="${name}"]`)
    el('ratio').textContent     = `${RATIO_LABEL[fmt.ratio] || ''} · ${fmt.label.toUpperCase()}`
    el('bpm').textContent       = `${preset.bpm} BPM`
    el('tipografia').textContent = preset.tipografia
    el('audio').textContent     = `${(preset.audio?.tipo || '').toUpperCase()} · ${preset.audio?.descricao || ''}`
    el('nome').textContent      = preset.nome.toUpperCase()
    el('paleta').innerHTML      = preset.paleta.map(c => `<div style="flex:1;background:${c};"></div>`).join('')

    /* Vinheta — fixa, sem flash branco nos cortes */
    const vinheta = document.createElement('div')
    vinheta.style.cssText = `position:absolute;inset:0;pointer-events:none;border-radius:10px;background:radial-gradient(ellipse at center, transparent 38%, rgba(4,4,6,${emocao === 'melancolia' || emocao === 'noir' ? 0.62 : 0.48}) 100%);`
    mount.appendChild(vinheta)

    /* Grão de filme — discreto, reforça realismo */
    const grain = document.createElement('div')
    grain.style.cssText = `position:absolute;inset:0;pointer-events:none;opacity:${emocao === 'noir' || emocao === 'melancolia' ? 0.09 : 0.045};border-radius:10px;mix-blend-mode:overlay;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
    mount.appendChild(grain)

    /* Medidor de áudio (VU-meter discreto) */
    const meterCanvas = document.createElement('canvas')
    meterCanvas.width = W; meterCanvas.height = 14
    meterCanvas.style.cssText = 'position:absolute;bottom:30px;left:0;width:100%;height:14px;pointer-events:none;opacity:0.4;'
    mount.appendChild(meterCanvas)
    const mCtx = meterCanvas.getContext('2d')

    /* ── Áudio ── */
    const playerAudio = new PlayerAudio()
    audioRef.current = playerAudio

    /* ── Loop de animação ── */
    const bpm       = preset.bpm
    const msPerBeat = 60000 / bpm
    const cortes    = parseInt(preset.ritmo) || 20
    const msPorCorte = 60000 / cortes
    let lastCut = 0, cenaIdx = 0
    let camTarget = { x: 0, y: 1.6, z: 7, focus: 7, aperture: 0.0018 }
    let camVel = { x: 0, y: 0, z: 0 }
    let motionDir = new THREE.Vector2(0, 0)
    let motionIntensity = 0
    let exposurePulse = 0
    let energyEnv = 0
    let raf
    const clock = new THREE.Clock()

    function pickAngulo() {
      const cena = preset.cenas[cenaIdx % preset.cenas.length]
      el('camtipo').textContent = cena.cam.toUpperCase()
      el('cendesc').textContent = cena.desc
      if (cena.cam === 'Close extremo' || cena.cam === 'Macro extremo') {
        camTarget = { x: (Math.random() - 0.5) * 1.0, y: 1.2, z: 2.9, focus: 2.9, aperture: 0.0035 }
        motionDir.set(0, 0.012)
      } else if (cena.cam === 'Ângulo baixo') {
        camTarget = { x: (Math.random() - 0.5) * 1.3, y: -0.2, z: 5.6, focus: 6, aperture: 0.002 }
        motionDir.set(0, -0.01)
      } else if (cena.cam === 'Plano aberto' || cena.cam === 'Grande angular') {
        camTarget = { x: (Math.random() - 0.5) * 2.6, y: 2.1, z: 10.5, focus: 10, aperture: 0.0009 }
        motionDir.set(0, -0.014)
      } else if (cena.cam === 'Travelling lateral') {
        const dir = Math.random() > 0.5 ? 1 : -1
        camTarget = { x: dir * 3.6, y: 1.6, z: 6.5, focus: 6.5, aperture: 0.0016 }
        motionDir.set(dir * 0.015, 0)
      } else {
        camTarget = { x: (Math.random() - 0.5) * 1.8, y: 1.6, z: 7.4, focus: 7.4, aperture: 0.0018 }
        motionDir.set((Math.random() - 0.5) * 0.008, (Math.random() - 0.5) * 0.008)
      }
      motionIntensity = 0.7
      exposurePulse   = 1
    }
    pickAngulo()

    function updateParticulas(pts, velY, velX, dt) {
      const pos = pts.geometry.attributes.position.array
      for (let i = 0; i < pos.length; i += 3) {
        pos[i + 1] -= velY * dt
        pos[i]     += velX * dt
        if (pos[i + 1] < -2) pos[i + 1] = 10
        if (pos[i + 1] > 10) pos[i + 1] = -2
      }
      pts.geometry.attributes.position.needsUpdate = true
    }

    function drawMeter(fftData, fallbackPhase) {
      mCtx.clearRect(0, 0, W, 14)
      const gc = new THREE.Color(preset.glow)
      mCtx.fillStyle = `rgba(${Math.round(gc.r * 255)},${Math.round(gc.g * 255)},${Math.round(gc.b * 255)},0.8)`
      const bars = 24, bw = W / bars
      for (let i = 0; i < bars; i++) {
        let h
        if (fftData) {
          const idx = Math.floor((i / bars) * (fftData.length * 0.6))
          const db  = fftData[idx] ?? -100
          h = Math.max(1, Math.min(12, (db + 100) / 100 * 12))
        } else {
          h = (Math.sin(i * 0.6 + fallbackPhase * Math.PI * 2) * 0.5 + 0.5) * 5 + 1.5
        }
        mCtx.fillRect(i * bw, 14 - h, bw - 1, h)
      }
    }

    function animate() {
      const dt = Math.min(clock.getDelta(), 0.05)
      const t  = clock.getElapsedTime() * 1000

      if (t - lastCut > msPorCorte) { lastCut = t; cenaIdx++; pickAngulo() }

      motionIntensity = Math.max(0, motionIntensity - dt * 3.2)
      motionBlurPass.uniforms.velocity.value.copy(motionDir)
      motionBlurPass.uniforms.intensity.value = motionIntensity * 0.6

      exposurePulse = Math.max(0, exposurePulse - dt * 2.2)
      renderer.toneMappingExposure = exposureBase * (1 - exposurePulse * 0.12)

      camVel.x += (camTarget.x - camera.position.x) * 0.032
      camVel.y += (camTarget.y - camera.position.y) * 0.032
      camVel.z += (camTarget.z - camera.position.z) * 0.032
      camVel.x *= 0.87; camVel.y *= 0.87; camVel.z *= 0.87
      camera.position.x += camVel.x + Math.sin(t / 1900) * 0.006
      camera.position.y += camVel.y + Math.cos(t / 2300) * 0.005
      camera.position.z += camVel.z
      camera.lookAt(0, 1, -1)
      bokehPass.uniforms.focus.value    += (camTarget.focus    - bokehPass.uniforms.focus.value)    * 0.035
      bokehPass.uniforms.aperture.value += (camTarget.aperture - bokehPass.uniforms.aperture.value) * 0.04

      const rotSpeed = { noir: 0.025, epico: 0.02, romance: 0.05, euforia: 0.1, melancolia: 0.04, neon: 0.09, fogo: 0.08, gelo: 0.03, neutro: 0.05 }[emocao] ?? 0.05
      core.rotation.y += dt * rotSpeed
      core.rotation.x += dt * rotSpeed * 0.35

      /* Energia — lê do áudio se ativo, caso contrário simula via BPM */
      let targetEnergy
      if (audioRef.current?.started) {
        targetEnergy = audioRef.current.getLevel()
      } else {
        const beatPhase = (t % msPerBeat) / msPerBeat
        targetEnergy = Math.max(0, Math.cos(beatPhase * Math.PI * 2) * 0.5 + 0.5) * 0.6
      }
      const rate = targetEnergy > energyEnv ? 10 : 3.5
      energyEnv += (targetEnergy - energyEnv) * Math.min(1, dt * rate)

      core.scale.setScalar(1 + energyEnv * 0.02)
      pointLightKey.intensity = keyLightBase * (1 + energyEnv * 0.25) * (tiposDetect.includes('neon') ? 1.4 : 1)
      chromaPass.uniforms.intensity.value = (emocao === 'neon' ? 0.6 : 0.3) * (1 + energyEnv * 0.3)

      el('bpmdot').style.opacity = String(0.5 + energyEnv * 0.5)
      el('recdot').style.opacity = Math.sin(t / 500) > 0 ? '1' : '0.35'

      updateParticulas(atmosfera, 0.18, 0, dt)
      camadasExtras.forEach(layer => {
        if      (layer.userData.tipo === 'chuva')    updateParticulas(layer, 4.5, 0, dt)
        else if (layer.userData.tipo === 'fogo')     updateParticulas(layer, -1.2, 0, dt)
        else if (layer.userData.tipo === 'neve')     updateParticulas(layer, 0.55, Math.sin(t / 1200) * 0.2, dt)
        else if (layer.userData.tipo === 'fumaca')   updateParticulas(layer, -0.25, 0, dt)
        else if (layer.userData.tipo === 'poeira')   updateParticulas(layer, 0.08, Math.sin(t / 2400) * 0.15, dt)
        else if (layer.userData.tipo === 'dourado')  updateParticulas(layer, 0.22, 0, dt)
        else if (layer.userData.tipo === 'estrelas') layer.rotation.y += dt * 0.006
      })

      drawMeter(audioRef.current?.getFFT?.() ?? null, (t % 2000) / 2000)

      composer.render()
      raf = requestAnimationFrame(animate)
    }
    animate()

    /* ── Cleanup — libera todos os recursos Three.js e DOM ── */
    return () => {
      cancelAnimationFrame(raf)
      if (audioRef.current) { audioRef.current.stop(); audioRef.current = null }
      composer.dispose()
      renderer.dispose()
      scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) {
          Array.isArray(obj.material)
            ? obj.material.forEach(m => m.dispose())
            : obj.material.dispose()
        }
      })
      /* removeChild é mais seguro que innerHTML='' pois não remove o botão
         de áudio que vive fora deste useEffect */
      const safeRemove = (el) => { try { if (el && mount.contains(el)) mount.removeChild(el) } catch (e) {} }
      safeRemove(renderer.domElement)
      safeRemove(hud)
      safeRemove(vinheta)
      safeRemove(grain)
      safeRemove(meterCanvas)
    }
  }, [preset, formato, prompt]) // audioEnabled propositalmente FORA das deps

  /* ── useEffect 2: controle de áudio — só toca/para, não recria a cena ── */
  useEffect(() => {
    const player = audioRef.current
    if (!player) return
    if (audioEnabled && !player.started) {
      player.start(preset.audio?.tipo || 'ambient', preset.bpm)
    } else if (!audioEnabled && player.started) {
      player.stop()
    }
  }, [audioEnabled, preset])

  const fmt = FORMATOS[formato] || FORMATOS.clipe
  return (
    <div style={{
      position: 'relative', width: fmt.w, height: fmt.h, borderRadius: '10px', overflow: 'hidden',
      boxShadow: `0 0 24px ${preset.glow}22, 0 8px 32px rgba(0,0,0,0.85)`,
      border: `1px solid ${preset.glow}33`,
    }}>
      <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />
      <button
        onClick={toggleAudio}
        aria-label={audioEnabled ? 'Desativar som' : 'Ativar som'}
        style={{
          position: 'absolute', bottom: 6, right: 6, zIndex: 5,
          width: 18, height: 18, borderRadius: '50%', pointerEvents: 'auto',
          border: `1px solid ${preset.glow}55`, background: 'rgba(5,5,8,0.65)',
          color: audioEnabled ? preset.glow : 'rgba(255,255,255,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.2s',
        }}
      >
        {audioEnabled ? <IconSom /> : <IconMudo />}
      </button>
    </div>
  )
}