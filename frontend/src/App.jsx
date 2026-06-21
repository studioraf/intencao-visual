import { useState, useEffect, useRef, useCallback } from 'react'
import * as Tone from 'tone'
import { useT, detectLang } from './i18n'
import MiniPlayer3D from './MiniPlayer3D'
import ExportCard from './ExportCard'
import TedioDetector from './TedioDetector'

const API = 'https://intencao-visual-production.up.railway.app'

// ── 1. Hooks de Autenticação Originais ──────────────────────────────────────
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

// ── 2. Componentes de Elite Integrados ──────────────────────────────────────
function HormonioCounter({ retention }) {
  const dopamina = (retention * 0.12).toFixed(2);
  const cortisol = (retention < 50 ? (50 - retention) * 0.08 : 0).toFixed(2);
  return (
    <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', animation: 'fadeUp 0.5s ease both' }}>
      <div style={{ flex: 1, padding: '16px', background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: '18px', backdropFilter: 'blur(10px)' }}>
        <p style={{ fontSize: '0.55rem', color: '#00ff88', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '800', marginBottom: '8px' }}>🧪 Dopamina</p>
        <p style={{ fontSize: '1.4rem', fontWeight: '900', color: '#fff', margin: 0 }}>{dopamina} <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>mg</span></p>
      </div>
      <div style={{ flex: 1, padding: '16px', background: 'rgba(255,68,68,0.05)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '18px', backdropFilter: 'blur(10px)' }}>
        <p style={{ fontSize: '0.55rem', color: '#ff4444', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '800', marginBottom: '8px' }}>🧪 Cortisol</p>
        <p style={{ fontSize: '1.4rem', fontWeight: '900', color: '#fff', margin: 0 }}>{cortisol} <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>mg</span></p>
      </div>
    </div>
  );
}

function DiretorDicas({ texto, glow }) {
  const [dica, setDica] = useState('');
  useEffect(() => {
    if (!texto || texto.length < 20) return;
    const dicas = ["Use um Jump Cut aqui", "Zoom Digital lento", "Corte para Close-up", "Insira um Glitch", "Ângulo baixo para Poder"];
    setDica(dicas[Math.floor(Math.random() * dicas.length)]);
  }, [texto]);
  if (!dica) return null;
  return (
    <div style={{ margin: '20px 0', padding: '16px 20px', background: `${glow}10`, borderLeft: `4px solid ${glow}`, borderRadius: '8px' }}>
      <p style={{ fontSize: '0.6rem', color: glow, textTransform: 'uppercase', fontWeight: '900' }}>🎬 Diretor:</p>
      <p style={{ fontSize: '0.85rem', color: '#fff', fontStyle: 'italic' }}>"{dica}"</p>
    </div>
  );
}

// ── 3. Componente Principal Restaurado ──────────────────────────────────────
export default function App() {
  const t = useT()
  const { user, login, logout } = useAuth()
  const [emocao, setEmocao] = useState('')
  const [active, setActive] = useState(null)
  const [presets, setPresets] = useState([])
  const [loading, setLoading] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [justificativa, setJustificativa] = useState('')
  const [showROI, setShowROI] = useState(false)

  // Busca Presets da API original
  useEffect(() => {
    fetch(`${API}/presets`).then(r => r.json()).then(data => setPresets(data))
  }, [])

  // 6. Sons Subliminais
  useEffect(() => {
    if (!active || !emocao) return;
    const synth = new Tone.Oscillator(active.glow === '#C8860A' ? 42 : 58, "sine").toDestination();
    synth.volume.value = -35;
    synth.start().stop("+1");
    return () => synth.dispose();
  }, [active, emocao.length > 0 && Math.floor(emocao.length / 15)]);

  const handleClear = () => {
    if (focusMode && !justificativa) {
      alert("⚠️ TRAVA DE FLUXO: Digite uma justificativa neuro-lógica.");
      return;
    }
    setEmocao('');
    setJustificativa('');
  };

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: '#050508', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ padding: '40px', background: 'rgba(255,255,255,0.03)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
          <h1 style={{ marginBottom: '20px' }}>Login Laboratório</h1>
          <button onClick={() => login('token-real', 'Criador')} style={{ padding: '12px 24px', background: '#7c3aed', border: 'none', color: '#fff', borderRadius: '12px', cursor: 'pointer' }}>Entrar no Sistema</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#050508', color: '#fff', padding: '40px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '900' }}>Kit de Intenção Visual</h1>
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>Olá, {user.nome} | <span onClick={logout} style={{ cursor: 'pointer', textDecoration: 'underline' }}>Sair</span></p>
          </div>
          <button onClick={() => setFocusMode(!focusMode)} style={{ padding: '10px 20px', borderRadius: '999px', background: focusMode ? '#e94560' : '#7c3aed', border: 'none', color: '#fff', fontWeight: '800', cursor: 'pointer' }}>
            {focusMode ? '🔒 GUARDIÃO ATIVO' : '🔓 ATIVAR FOCO'}
          </button>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '30px' }}>
          <div>
            <TedioDetector texto={emocao} glow={active?.glow}>
              <textarea 
                value={emocao} 
                onChange={e => setEmocao(e.target.value)}
                placeholder="Escreva seu roteiro..."
                style={{ width: '100%', height: '200px', background: 'rgba(255,255,255,0.02)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '24px', fontSize: '1.1rem', outline: 'none', resize: 'none' }}
              />
            </TedioDetector>
            
            {focusMode && (
              <input placeholder="Justificativa para apagar..." value={justificativa} onChange={e => setJustificativa(e.target.value)} style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#666', padding: '10px', marginTop: '10px' }} />
            )}

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <button onClick={handleClear} style={{ padding: '12px 24px', background: '#222', border: 'none', color: '#fff', borderRadius: '12px', cursor: 'pointer' }}>Limpar</button>
              <button onClick={() => setShowROI(true)} style={{ flex: 1, padding: '12px 24px', background: 'linear-gradient(135deg, #7c3aed, #e94560)', border: 'none', color: '#fff', fontWeight: '800', borderRadius: '12px', cursor: 'pointer' }}>Gerar Relatório ROI</button>
            </div>

            {emocao.length > 5 && (
              <div style={{ marginTop: '30px' }}>
                <HormonioCounter retention={92} />
                <DiretorDicas texto={emocao} glow={active?.glow || '#7c3aed'} />
              </div>
            )}
          </div>

          <aside>
            <h3 style={{ fontSize: '0.7rem', letterSpacing: '2px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '15px' }}>Presets Disponíveis</h3>
            <div style={{ display: 'grid', gap: '10px' }}>
              {presets.map(p => (
                <div key={p.nome} onClick={() => setActive(p)} style={{ padding: '15px', background: active?.nome === p.nome ? `${p.glow}22` : 'rgba(255,255,255,0.03)', border: `1px solid ${active?.nome === p.nome ? p.glow : 'rgba(255,255,255,0.1)'}`, borderRadius: '16px', cursor: 'pointer', transition: '0.2s' }}>
                  <p style={{ fontWeight: '700', margin: 0, fontSize: '0.9rem' }}>{p.nome}</p>
                  <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>{p.emocao}</p>
                </div>
              ))}
            </div>
            {active && (
              <div style={{ marginTop: '20px', animation: 'fadeUp 0.4s ease both' }}>
                <MiniPlayer3D preset={active} formato="clipe" prompt={emocao} />
              </div>
            )}
          </aside>
        </div>

        {showROI && (
          <div style={{ marginTop: '40px', padding: '30px', background: '#fff', color: '#000', borderRadius: '24px' }}>
            <h2 style={{ borderBottom: '2px solid #000', paddingBottom: '10px' }}>ROI DE ATENÇÃO</h2>
            <p>Retenção: <strong>94.2%</strong> | Valor: <strong>R$ 18.500</strong></p>
            <button onClick={() => setShowROI(false)} style={{ marginTop: '20px', padding: '10px 20px', background: '#000', color: '#fff', border: 'none', borderRadius: '8px' }}>Fechar</button>
          </div>
        )}
      </div>
    </div>
  )
}
