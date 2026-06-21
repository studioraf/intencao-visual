import React, { useState, useEffect, useRef, useCallback } from 'react'
import * as Tone from 'tone'
import { useT, detectLang } from './i18n'
import MiniPlayer3D from './MiniPlayer3D'
import ExportCard from './ExportCard'
import TedioDetector from './TedioDetector'

const API = 'https://intencao-visual-production.up.railway.app'

// ── 1. Hooks de Autenticação ──────────────────────────────────────────────
function useAuth() {
  const [user, setUser] = useState(() => {
    try {
      const token = localStorage.getItem('token')
      const nome = localStorage.getItem('nome')
      return token ? { token, nome } : null
    } catch (e) { return null }
  })
  const login = (token, nome) => {
    localStorage.setItem('token', token)
    localStorage.setItem('nome', nome)
    setUser({ token, nome })
  }
  const logout = () => {
    localStorage.clear()
    setUser(null)
  }
  return { user, login, logout }
}

// ── 2. Componentes de Apoio ───────────────────────────────────────────────
const HormonioCounter = ({ retention }) => (
  <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
    <div style={{ flex: 1, padding: '12px', background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: '12px' }}>
      <p style={{ fontSize: '0.5rem', color: '#00ff88', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Dopamina</p>
      <p style={{ fontSize: '1.2rem', fontWeight: '900', margin: 0 }}>{(retention * 0.12).toFixed(2)} mg</p>
    </div>
    <div style={{ flex: 1, padding: '12px', background: 'rgba(255,68,68,0.05)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '12px' }}>
      <p style={{ fontSize: '0.5rem', color: '#ff4444', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Cortisol</p>
      <p style={{ fontSize: '1.2rem', fontWeight: '900', margin: 0 }}>{(retention < 50 ? (50 - retention) * 0.08 : 0).toFixed(2)} mg</p>
    </div>
  </div>
)

// ── 3. App Principal ──────────────────────────────────────────────────────
export default function App() {
  // Use try/catch no useT para evitar quebra se o i18n falhar
  let t = {}
  try { t = useT() } catch (e) { console.warn("i18n fail", e) }

  const { user, login, logout } = useAuth()
  const [emocao, setEmocao] = useState('')
  const [active, setActive] = useState(null)
  const [presets, setPresets] = useState([])
  const [focusMode, setFocusMode] = useState(false)
  const [justificativa, setJustificativa] = useState('')
  const [showROI, setShowROI] = useState(false)

  useEffect(() => {
    console.log("App mounted, fetching presets...");
    fetch(`${API}/presets`)
      .then(r => r.json())
      .then(data => {
        console.log("Presets loaded:", data.length);
        setPresets(data)
      })
      .catch(err => console.error("API Error:", err))
  }, [])

  const handleClear = () => {
    if (focusMode && !justificativa) {
      alert("⚠️ Digite uma justificativa neuro-lógica para apagar.");
      return;
    }
    setEmocao('');
    setJustificativa('');
  };

  // Tela de Login
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: '#050508', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ padding: '40px', background: '#111', borderRadius: '24px', border: '1px solid #333', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '24px' }}>Laboratório de Intenção</h2>
          <button 
            onClick={() => login('dev-token', 'Criador')}
            style={{ padding: '14px 28px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Entrar no Sistema
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#050508', color: '#fff', padding: '30px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '900', margin: 0 }}>Kit de Intenção Visual</h1>
            <p style={{ fontSize: '0.8rem', opacity: 0.5, margin: '5px 0 0 0' }}>Usuário: {user.nome} | <span onClick={logout} style={{ cursor: 'pointer', textDecoration: 'underline' }}>Sair</span></p>
          </div>
          <button 
            onClick={() => setFocusMode(!focusMode)}
            style={{ padding: '10px 20px', borderRadius: '20px', background: focusMode ? '#e94560' : '#7c3aed', border: 'none', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
          >
            {focusMode ? '🔒 FOCO ATIVO' : '🔓 ATIVAR FOCO'}
          </button>
        </header>

        <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 500px' }}>
            <TedioDetector texto={emocao} glow={active?.glow}>
              <textarea 
                value={emocao} 
                onChange={e => setEmocao(e.target.value)}
                placeholder="Escreva seu roteiro aqui..."
                style={{ width: '100%', height: '180px', background: 'rgba(255,255,255,0.03)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '20px', fontSize: '1rem', outline: 'none', resize: 'none' }}
              />
            </TedioDetector>

            {focusMode && (
              <input 
                placeholder="Justificativa para apagar..." 
                value={justificativa} 
                onChange={e => setJustificativa(e.target.value)}
                style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#666', padding: '10px', marginTop: '10px', outline: 'none' }}
              />
            )}

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <button onClick={handleClear} style={{ padding: '12px 24px', background: '#222', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer' }}>Limpar</button>
              <button 
                onClick={() => setShowROI(true)}
                style={{ flex: 1, padding: '12px 24px', background: 'linear-gradient(135deg, #7c3aed, #e94560)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Gerar Relatório ROI
              </button>
            </div>

            {emocao.length > 5 && (
              <div style={{ marginTop: '30px' }}>
                <HormonioCounter retention={85} />
                <div style={{ padding: '15px', background: 'rgba(124,58,237,0.1)', borderLeft: '4px solid #7c3aed', borderRadius: '4px' }}>
                  <p style={{ fontSize: '0.6rem', color: '#7c3aed', fontWeight: 'bold', margin: '0 0 5px 0' }}>DIRETOR:</p>
                  <p style={{ fontSize: '0.8rem', fontStyle: 'italic', margin: 0 }}>"Considere um corte rápido para elevar a tensão aqui."</p>
                </div>
              </div>
            )}
          </div>

          <aside style={{ flex: '0 0 320px' }}>
            <h3 style={{ fontSize: '0.7rem', opacity: 0.3, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '15px' }}>Presets</h3>
            <div style={{ display: 'grid', gap: '10px', maxHeight: '400px', overflowY: 'auto', paddingRight: '5px' }}>
              {presets.length === 0 && <p style={{ fontSize: '0.8rem', opacity: 0.3 }}>Carregando estilos...</p>}
              {presets.map(p => (
                <div 
                  key={p.nome} 
                  onClick={() => setActive(p)}
                  style={{ padding: '15px', background: active?.nome === p.nome ? `${p.glow}22` : '#111', border: `1px solid ${active?.nome === p.nome ? p.glow : '#222'}`, borderRadius: '15px', cursor: 'pointer', transition: '0.2s' }}
                >
                  <p style={{ fontWeight: 'bold', margin: 0, fontSize: '0.9rem' }}>{p.nome}</p>
                  <p style={{ fontSize: '0.7rem', opacity: 0.5, margin: 0 }}>{p.emocao}</p>
                </div>
              ))}
            </div>

            {active && (
              <div style={{ marginTop: '20px' }}>
                {/* Fallback para o MiniPlayer se ele falhar */}
                <React.Suspense fallback={<div style={{ height: '180px', background: '#111', borderRadius: '15px' }} />}>
                  <MiniPlayer3D preset={active} formato="clipe" prompt={emocao} />
                </React.Suspense>
              </div>
            )}
          </aside>
        </div>

        {showROI && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
            <div style={{ background: '#fff', color: '#000', padding: '40px', borderRadius: '24px', maxWidth: '500px', width: '100%' }}>
              <h2 style={{ borderBottom: '2px solid #000', paddingBottom: '10px', margin: '0 0 20px 0' }}>RELATÓRIO ROI</h2>
              <p>Retenção Projetada: <strong>94%</strong></p>
              <p>Valor Estimado: <strong>R$ 15.000,00</strong></p>
              <button 
                onClick={() => setShowROI(false)}
                style={{ marginTop: '20px', width: '100%', padding: '12px', background: '#000', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Fechar
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
