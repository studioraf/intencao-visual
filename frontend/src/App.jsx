import { useState, useEffect } from 'react'
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

function TelaLanding({ onEntrar }) {
  const estilos = [
    { nome: 'Luxo Cinematográfico', emocao: 'Poder · Status · Inevitabilidade', cor: '#C8860A', bg: '#1a0800' },
    { nome: 'Cyberpunk', emocao: 'Tensão · Adrenalina · Desorientação', cor: '#00fff7', bg: '#0d1f3c' },
    { nome: 'Romance Etéreo', emocao: 'Nostalgia · Vulnerabilidade · Conexão', cor: '#FF6B9D', bg: '#2d0020' },
    { nome: 'Noir Contemporâneo', emocao: 'Ansiedade · Fascínio · Perigo', cor: '#6a6aaa', bg: '#0a0a1a' },
  ]
  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 20% 30%, #1a0533 0%, #0a0a0f 60%)', color: '#fff', fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 40px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div>
          <span style={{ fontSize: '0.7rem', letterSpacing: '3px', color: '#e94560', textTransform: 'uppercase' }}>Neurocinematografia</span>
          <p style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', marginTop: '2px' }}>Kit de Intenção Visual</p>
        </div>
        <button onClick={onEntrar} style={{ padding: '10px 24px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', fontSize: '0.85rem', cursor: 'pointer' }}>Entrar</button>
      </div>
      <div style={{ textAlign: 'center', padding: '100px 32px 80px' }}>
        <div style={{ display: 'inline-block', background: 'rgba(233,69,96,0.1)', border: '1px solid rgba(233,69,96,0.3)', borderRadius: '999px', padding: '6px 18px', fontSize: '0.7rem', letterSpacing: '3px', color: '#e94560', marginBottom: '32px', textTransform: 'uppercase' }}>Para criadores de vídeo</div>
        <h1 style={{ fontSize: '3.5rem', fontWeight: '900', lineHeight: 1.1, background: 'linear-gradient(135deg, #fff 0%, #a78bfa 50%, #e94560 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', maxWidth: '700px', margin: '0 auto 24px' }}>
          Cada emoção tem uma estética. Descubra a sua.
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.1rem', maxWidth: '500px', margin: '0 auto 48px', lineHeight: 1.6 }}>
          Descreva o que quer transmitir. Receba paleta, tipografia, ritmo de corte, BPM, iluminação e enquadramento — em segundos.
        </p>
        <button onClick={onEntrar} style={{ padding: '18px 48px', borderRadius: '999px', border: 'none', background: 'linear-gradient(135deg, #7c3aed, #e94560)', color: '#fff', fontSize: '1.1rem', fontWeight: '700', letterSpacing: '2px', cursor: 'pointer', textTransform: 'uppercase', boxShadow: '0 0 40px rgba(124,58,237,0.4)' }}>
          Começar Grátis →
        </button>
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.8rem', marginTop: '16px' }}>Sem cartão de crédito · Grátis para sempre</p>
      </div>
      <div style={{ padding: '0 32px 80px', maxWidth: '900px', margin: '0 auto' }}>
        <p style={{ textAlign: 'center', fontSize: '0.7rem', letterSpacing: '3px', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: '32px' }}>Estilos disponíveis</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {estilos.map(e => (
            <div key={e.nome} style={{ background: e.bg, border: `1px solid ${e.cor}33`, borderRadius: '20px', padding: '28px', cursor: 'pointer' }}
              onMouseEnter={ev => ev.currentTarget.style.boxShadow = `0 0 30px ${e.cor}33`}
              onMouseLeave={ev => ev.currentTarget.style.boxShadow = 'none'}>
              <div style={{ width: '40px', height: '4px', background: e.cor, borderRadius: '999px', marginBottom: '16px', boxShadow: `0 0 10px ${e.cor}` }} />
              <p style={{ fontSize: '1rem', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>{e.nome}</p>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{e.emocao}</p>
            </div>
          ))}
        </div>
      </div>
      <div style={{ textAlign: 'center', padding: '32px', borderTop: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem' }}>
        Kit de Intenção Visual · Neurocinematografia para criadores
      </div>
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
    setLoading(true)
    setErro('')
    try {
      const url = modo === 'login' ? 'https://intencao-visual-production.up.railway.app/login' : 'https://intencao-visual-production.up.railway.app/cadastro'
      const body = modo === 'login' ? { email, senha } : { nome, email, senha }
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) { setErro(data.detail || 'Erro'); setLoading(false); return }
      onLogin(data.token, data.nome)
    } catch (e) { setErro('Erro de conexão com o servidor') }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 20% 50%, #1a0533 0%, #0a0a0f 60%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'inline-block', background: 'rgba(233,69,96,0.1)', border: '1px solid rgba(233,69,96,0.3)', borderRadius: '999px', padding: '5px 16px', fontSize: '0.7rem', letterSpacing: '3px', color: '#e94560', marginBottom: '20px', textTransform: 'uppercase' }}>Neurocinematografia</div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: '800', background: 'linear-gradient(135deg, #fff 0%, #a78bfa 60%, #e94560 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '8px' }}>Kit de Intenção Visual</h1>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.9rem' }}>{modo === 'login' ? 'Entre na sua conta' : 'Crie sua conta grátis'}</p>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '32px', backdropFilter: 'blur(10px)' }}>
          {modo === 'cadastro' && <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '14px 16px', fontSize: '0.95rem', marginBottom: '12px', boxSizing: 'border-box', outline: 'none' }} />}
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '14px 16px', fontSize: '0.95rem', marginBottom: '12px', boxSizing: 'border-box', outline: 'none' }} />
          <input value={senha} onChange={e => setSenha(e.target.value)} placeholder="Senha" type="password" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '14px 16px', fontSize: '0.95rem', marginBottom: '20px', boxSizing: 'border-box', outline: 'none' }} />
          {erro && <p style={{ color: '#e94560', fontSize: '0.8rem', marginBottom: '12px', textAlign: 'center' }}>{erro}</p>}
          <button onClick={submeter} disabled={loading} style={{ width: '100%', padding: '15px', borderRadius: '999px', border: 'none', background: 'linear-gradient(135deg, #7c3aed, #e94560)', color: '#fff', fontSize: '0.95rem', fontWeight: '700', letterSpacing: '2px', cursor: 'pointer', textTransform: 'uppercase', boxShadow: '0 0 30px rgba(124,58,237,0.3)' }}>
            {loading ? 'Aguarde...' : modo === 'login' ? 'Entrar' : 'Criar Conta'}
          </button>
          <p style={{ textAlign: 'center', marginTop: '20px', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>
            {modo === 'login' ? 'Não tem conta? ' : 'Já tem conta? '}
            <span onClick={() => setModo(modo === 'login' ? 'cadastro' : 'login')} style={{ color: '#a78bfa', cursor: 'pointer', fontWeight: '600' }}>{modo === 'login' ? 'Cadastre-se' : 'Entre'}</span>
          </p>
        </div>
      </div>
    </div>
  )
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

const PRESETS = {
  blade: {
    keywords: ['blade', 'cyberpunk', 'neon', 'futurista', 'tech', 'matrix'],
    nome: 'Cyberpunk', emocao: 'Tensão · Adrenalina · Desorientação',
    paleta: ['#0a0a0f', '#00fff7', '#7c3aed', '#ff006e'],
    tipografia: 'Rajdhani Bold', ritmo: '32 cortes/min', bpm: 140,
    iluminacao: 'Neon lateral · Chuva de luz', enquadramento: 'Close extremo',
    bg: ['#0a0a0f', '#0d1f3c', '#1a0533'], glow: '#00fff7', accent: '#7c3aed',
    cenas: [
      { desc: 'Silhueta contra neon', luz: 'Contraluz ciano', cam: 'Close extremo' },
      { desc: 'Chuva em slow motion', luz: 'Reflexo no asfalto', cam: 'Travelling lateral' },
      { desc: 'Olhar direto câmera', luz: 'LED lateral duro', cam: 'Close olhos' },
    ],
    audio: { tipo: 'cyberpunk', descricao: 'Sintetizador metálico + glitch', efeito: 'Gera tensão e adrenalina' }
  },
  poder: {
    keywords: ['poder', 'urgência', 'força', 'luxo', 'cartier', 'sdm', 'rap', 'trap', 'épico'],
    nome: 'Luxo Cinematográfico', emocao: 'Poder · Status · Inevitabilidade',
    paleta: ['#0d0500', '#8B3A00', '#C8860A', '#F5D78E'],
    tipografia: 'Montserrat Black', ritmo: '22 cortes/min', bpm: 95,
    iluminacao: 'Tungstênio quente · Sombra épica', enquadramento: 'Ângulo baixo',
    bg: ['#0d0500', '#1a0800', '#2d1200'], glow: '#C8860A', accent: '#8B3A00',
    cenas: [
      { desc: 'Detalhe relógio dourado', luz: 'Luz dourada lateral', cam: 'Macro extremo' },
      { desc: 'Artista em ambiente luxuoso', luz: 'Tungstênio + fill suave', cam: 'Ângulo baixo' },
      { desc: 'Fumaça em slow motion', luz: 'Backlight dourado', cam: 'Travelling lateral' },
    ],
    audio: { tipo: 'trap', descricao: 'Kick 808 grave + hi-hat seco', efeito: 'Ativa sensação de poder e status' }
  },
  romance: {
    keywords: ['romance', 'amor', 'suave', 'delicado', 'intimidade', 'saudade'],
    nome: 'Romance Etéreo', emocao: 'Nostalgia · Vulnerabilidade · Conexão',
    paleta: ['#1a0010', '#8B0050', '#FF6B9D', '#FFD6E8'],
    tipografia: 'Cormorant Garamond', ritmo: '12 cortes/min', bpm: 72,
    iluminacao: 'Luz difusa · Bokeh profundo', enquadramento: 'Plano aberto',
    bg: ['#1a0010', '#2d0020', '#1a0a1a'], glow: '#FF6B9D', accent: '#8B0050',
    cenas: [
      { desc: 'Mãos se tocando', luz: 'Janela natural difusa', cam: 'Close olhos' },
      { desc: 'Olhar perdido na distância', luz: 'Golden hour', cam: 'Plano aberto' },
      { desc: 'Detalhe — lágrima', luz: 'Rim light suave', cam: 'Macro extremo' },
    ],
    audio: { tipo: 'romance', descricao: 'Pad suave + melodia de piano', efeito: 'Ativa oxitocina — gera empatia' }
  },
  misterio: {
    keywords: ['mistério', 'sombrio', 'dark', 'noir', 'suspense', 'thriller', 'crime'],
    nome: 'Noir Contemporâneo', emocao: 'Ansiedade · Fascínio · Perigo',
    paleta: ['#000000', '#0a0a0a', '#1a1a2e', '#4a4a6a'],
    tipografia: 'Playfair Display', ritmo: '18 cortes/min', bpm: 85,
    iluminacao: 'Contraluz duro · Sombra absoluta', enquadramento: 'Plano médio',
    bg: ['#000000', '#0a0a1a', '#050510'], glow: '#6a6aaa', accent: '#2a2a4a',
    cenas: [
      { desc: 'Rosto metade na sombra', luz: 'Single key lateral', cam: 'Close extremo' },
      { desc: 'Corredor com névoa', luz: 'Luz de fundo fraca', cam: 'Plano médio' },
      { desc: 'Detalhe — mão nervosa', luz: 'Sem fill, só key', cam: 'Close olhos' },
    ],
    audio: { tipo: 'noir', descricao: 'Baixo profundo + silêncio dramático', efeito: 'Ativa amígdala — gera tensão' }
  },
  epico: {
    keywords: ['épico', 'guerra', 'batalha', 'herói', 'dune', 'grandioso', 'histórico'],
    nome: 'Épico Cinematográfico', emocao: 'Grandiosidade · Sacrifício · Destino',
    paleta: ['#0a0500', '#3d1a00', '#8B4513', '#DAA520'],
    tipografia: 'Cinzel Bold', ritmo: '18 cortes/min', bpm: 88,
    iluminacao: 'Luz épica lateral · Névoa dramática',
    enquadramento: 'Grande angular',
    bg: ['#0a0500', '#1a0800', '#2d1500'], glow: '#DAA520', accent: '#8B4513',
    cenas: [
      { desc: 'Exército no horizonte', luz: 'Pôr do sol épico', cam: 'Plano aberto' },
      { desc: 'Herói de costas', luz: 'Backlight dourado', cam: 'Ângulo baixo' },
      { desc: 'Olhar determinado', luz: 'Luz lateral dura', cam: 'Close extremo' },
    ],
    audio: { tipo: 'noir', descricao: 'Orquestra + percussão épica', efeito: 'Ativa senso de grandiosidade' }
  },
  minimalista: {
    keywords: ['minimalista', 'clean', 'simples', 'moderno', 'elegante', 'corporativo'],
    nome: 'Minimalismo Moderno', emocao: 'Clareza · Confiança · Sofisticação',
    paleta: ['#ffffff', '#f5f5f5', '#333333', '#000000'],
    tipografia: 'Helvetica Neue Light', ritmo: '15 cortes/min', bpm: 80,
    iluminacao: 'Luz difusa branca · Alto key',
    enquadramento: 'Plano médio',
    bg: ['#0a0a0a', '#111111', '#1a1a1a'], glow: '#ffffff', accent: '#333333',
    cenas: [
      { desc: 'Produto em fundo branco', luz: 'Softbox frontal', cam: 'Plano médio' },
      { desc: 'Detalhe de textura', luz: 'Luz rasante lateral', cam: 'Macro extremo' },
      { desc: 'Pessoa em ambiente clean', luz: 'Natural difusa', cam: 'Plano aberto' },
    ],
    audio: { tipo: 'romance', descricao: 'Piano minimalista + silêncio', efeito: 'Transmite clareza e foco' }
  },
}

const FORMATOS = {
  youtube: { label: 'YouTube', ratio: '16:9', icon: '▶', w: 320, h: 180 },
  instagram: { label: 'Instagram', ratio: '1:1', icon: '◈', w: 240, h: 240 },
  filme: { label: 'Filme', ratio: '2.39:1', icon: '◻', w: 320, h: 134 },
  clipe: { label: 'Clipe', ratio: '9:16', icon: '◆', w: 150, h: 267 },
}

const DEFAULT = PRESETS.poder

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

function detectPreset(text) {
  const lower = text.toLowerCase()
  for (const [, p] of Object.entries(PRESETS)) {
    if (p.keywords.some(k => lower.includes(k))) return p
  }
  return null
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
      const res = await fetch('https://intencao-visual-production.up.railway.app/meus-kits', {
        headers: { 'Authorization': `Bearer ${user.token}` }
      })
      const data = await res.json()
      setMeusKits(data)
    } catch (e) { console.log('erro ao carregar kits') }
  }

  async function toggleAudio() {
    const preset = resultado || preview || DEFAULT
    if (audioOn) { audioEngine.stop(); setAudioOn(false) }
    else { await audioEngine.start(preset.audio.tipo, preset.bpm); setAudioOn(true) }
  }

  const active = resultado || preview

  return (
    <div style={{ minHeight: '100vh', background: active ? `radial-gradient(ellipse at 30% 20%, ${active.glow}18 0%, #0a0a0f 60%)` : 'radial-gradient(ellipse at 20% 50%, #1a0533 0%, #0a0a0f 60%)', color: '#fff', fontFamily: "'Segoe UI', sans-serif", transition: 'background 1.2s ease' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '60px 28px', position: 'relative', zIndex: 1 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
          <div>
            <div style={{ display: 'inline-block', background: 'rgba(233,69,96,0.1)', border: '1px solid rgba(233,69,96,0.3)', borderRadius: '999px', padding: '5px 16px', fontSize: '0.7rem', letterSpacing: '3px', color: '#e94560', marginBottom: '12px', textTransform: 'uppercase' }}>Neurocinematografia</div>
            <h1 style={{ fontSize: '2.4rem', fontWeight: '800', lineHeight: 1.1, background: `linear-gradient(135deg, #fff 0%, ${active ? active.glow : '#a78bfa'} 60%, #e94560 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', transition: 'background 1s ease' }}>Kit de Intenção<br />Visual</h1>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Olá, {user.nome}</p>
            <button onClick={logout} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '999px', padding: '6px 14px', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', cursor: 'pointer' }}>Sair</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
          <button onClick={() => setAba('gerar')} style={{ padding: '8px 20px', borderRadius: '999px', border: `1px solid ${aba === 'gerar' ? '#e94560' : 'rgba(255,255,255,0.1)'}`, background: aba === 'gerar' ? 'rgba(233,69,96,0.15)' : 'transparent', color: aba === 'gerar' ? '#e94560' : 'rgba(255,255,255,0.4)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: aba === 'gerar' ? '700' : '400' }}>Gerar Kit</button>
          <button onClick={() => { setAba('historico'); carregarKits() }} style={{ padding: '8px 20px', borderRadius: '999px', border: `1px solid ${aba === 'historico' ? '#e94560' : 'rgba(255,255,255,0.1)'}`, background: aba === 'historico' ? 'rgba(233,69,96,0.15)' : 'transparent', color: aba === 'historico' ? '#e94560' : 'rgba(255,255,255,0.4)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: aba === 'historico' ? '700' : '400' }}>DNA Visual</button>
        </div>

        {aba === 'historico' && (
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff', marginBottom: '24px' }}>DNA Visual</h2>
            {meusKits.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.3)' }}>
                <p style={{ fontSize: '2rem', marginBottom: '12px' }}>🎬</p>
                <p>Nenhum kit gerado ainda.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {meusKits.map(kit => (
                  <div key={kit.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px 24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ fontSize: '0.6rem', letterSpacing: '2px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '6px' }}>{kit.formato}</p>
                        <p style={{ fontSize: '1rem', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>{kit.estilo}</p>
                        <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>"{kit.emocao}"</p>
                      </div>
                      <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)' }}>{new Date(kit.criado_em).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {aba === 'gerar' && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '0.6rem', letterSpacing: '3px', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: '10px' }}>Formato</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {Object.entries(FORMATOS).map(([key, fmt]) => (
                  <button key={key} onClick={() => setFormato(key)} style={{ padding: '7px 16px', borderRadius: '999px', border: `1px solid ${formato === key ? (active ? active.glow : '#7c3aed') : 'rgba(255,255,255,0.1)'}`, background: formato === key ? `${active ? active.glow : '#7c3aed'}22` : 'transparent', color: formato === key ? (active ? active.glow : '#a78bfa') : 'rgba(255,255,255,0.35)', fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.3s ease', fontWeight: formato === key ? '700' : '400' }}>
                    {fmt.icon} {fmt.label}
                  </button>
                ))}
              </div>
            </div>

            {active && (
              <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center', padding: '28px', background: 'rgba(0,0,0,0.3)', borderRadius: '24px', border: `1px solid ${active.glow}22`, backdropFilter: 'blur(10px)' }}>
                <PreviewFilme preset={active} formato={formato} active={true} />
              </div>
            )}

            <textarea value={emocao} onChange={e => setEmocao(e.target.value)}
              placeholder="Ex: quero algo como o clipe Cartier Santos do SDM — luxuoso, dourado, poderoso..."
              style={{ width: '100%', height: '110px', background: 'rgba(255,255,255,0.03)', color: '#fff', border: `1px solid ${active ? active.glow + '44' : 'rgba(167,139,250,0.2)'}`, borderRadius: '18px', padding: '18px 22px', fontSize: '0.95rem', resize: 'none', boxSizing: 'border-box', outline: 'none', lineHeight: 1.6, backdropFilter: 'blur(10px)', transition: 'border 0.5s ease' }}
            />

            <div style={{ display: 'flex', gap: '12px', marginTop: '14px' }}>
              <button onClick={gerarKit} disabled={loading} style={{ flex: 1, padding: '16px', borderRadius: '999px', border: 'none', background: loading ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg, ${active ? active.glow : '#7c3aed'}, #e94560)`, color: loading ? 'rgba(255,255,255,0.3)' : '#fff', fontSize: '0.9rem', fontWeight: '700', letterSpacing: '2px', cursor: loading ? 'not-allowed' : 'pointer', textTransform: 'uppercase', transition: 'all 0.5s ease' }}>
                {loading ? 'Gerando...' : 'Gerar Kit →'}
              </button>
              {active && (
                <button onClick={toggleAudio} style={{ padding: '16px 24px', borderRadius: '999px', border: `1px solid ${active ? active.glow + '66' : 'rgba(255,255,255,0.2)'}`, background: audioOn ? `${active ? active.glow : '#7c3aed'}22` : 'transparent', color: audioOn ? (active ? active.glow : '#a78bfa') : 'rgba(255,255,255,0.5)', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.3s ease', fontWeight: '600' }}>
                  {audioOn ? '⏹ Stop' : '▶ Ouvir'}
                </button>
              )}
            </div>

            {resultado && (
              <div style={{ marginTop: '44px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ textAlign: 'center', padding: '20px', background: `${resultado.glow}12`, border: `1px solid ${resultado.glow}33`, borderRadius: '20px' }}>
                  <p style={{ fontSize: '0.6rem', letterSpacing: '3px', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: '6px' }}>Estilo Detectado</p>
                  <p style={{ fontSize: '1.3rem', fontWeight: '800', color: resultado.glow, marginBottom: '6px' }}>{resultado.nome}</p>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{resultado.emocao}</p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${resultado.glow}22`, borderRadius: '20px', padding: '20px 24px' }}>
                  <p style={{ fontSize: '0.6rem', letterSpacing: '3px', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: '14px' }}>🎵 BPM Musical</p>
                  <BPMVisual bpm={resultado.bpm} glow={resultado.glow} active={true} />
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${resultado.glow}22`, borderRadius: '20px', padding: '20px 24px' }}>
                  <p style={{ fontSize: '0.6rem', letterSpacing: '3px', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: '14px' }}>🎨 Paleta de Cores</p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {resultado.paleta.map(cor => (
                      <div key={cor} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                        <div style={{ width: '100%', height: '50px', borderRadius: '12px', background: cor, boxShadow: `0 6px 20px ${cor}55` }} />
                        <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.25)' }}>{cor}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${resultado.glow}22`, borderRadius: '20px', padding: '20px 24px' }}>
                  <p style={{ fontSize: '0.6rem', letterSpacing: '3px', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: '14px' }}>📐 Enquadramento</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {resultado.cenas.map((c, i) => (
                      <div key={i} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '14px', padding: '14px', border: `1px solid ${resultado.glow}18` }}>
                        <CameraView tipo={c.cam} glow={resultado.glow} />
                        <p style={{ fontSize: '0.7rem', color: resultado.glow, fontWeight: '600', textAlign: 'center', marginTop: '6px' }}>{c.cam}</p>
                        <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: '2px' }}>{c.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {[
                    { emoji: '✍️', label: 'Tipografia', valor: resultado.tipografia },
                    { emoji: '✂️', label: 'Ritmo de Corte', valor: resultado.ritmo },
                    { emoji: '💡', label: 'Iluminação', valor: resultado.iluminacao },
                    { emoji: '🎬', label: 'Formato', valor: `${FORMATOS[formato].label} · ${FORMATOS[formato].ratio}` },
                  ].map(item => (
                    <div key={item.label} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${resultado.glow}18`, borderRadius: '18px', padding: '18px 20px' }}>
                      <p style={{ fontSize: '0.6rem', letterSpacing: '2px', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: '8px' }}>{item.emoji} {item.label}</p>
                      <p style={{ fontSize: '0.88rem', color: '#e2e8f0', fontWeight: '600' }}>{item.valor}</p>
                    </div>
                  ))}
                </div>
                <div style={{ background: `linear-gradient(135deg, ${resultado.glow}10, rgba(233,69,96,0.06))`, border: `1px solid ${resultado.glow}33`, borderRadius: '20px', padding: '22px 24px' }}>
                  <p style={{ fontSize: '0.6rem', letterSpacing: '3px', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: '14px' }}>🎥 Direção de Cena</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {resultado.cenas.map((c, i) => (
                      <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: `${resultado.glow}22`, border: `1px solid ${resultado.glow}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: resultado.glow, flexShrink: 0 }}>{i + 1}</div>
                        <div>
                          <p style={{ fontSize: '0.85rem', fontWeight: '600', color: '#e2e8f0', marginBottom: '2px' }}>{c.desc}</p>
                          <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>📷 {c.cam} · 💡 {c.luz}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}