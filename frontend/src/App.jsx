import { useState, useEffect, useRef, useCallback } from 'react'
import * as Tone from 'tone'
import { useT, detectLang } from './i18n'
import MiniPlayer3D from './MiniPlayer3D'
import ExportCard from './ExportCard'
import TedioDetector from './TedioDetector'

const API = 'https://intencao-visual-production.up.railway.app'

// ── 2. Contador de Miligramas de Hormônio ────────────────────────────────────
function HormonioCounter({ retention, glow }) {
  const dopamina = (retention * 0.12).toFixed(2);
  const cortisol = (retention < 50 ? (50 - retention) * 0.08 : 0).toFixed(2);
  
  return (
    <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', animation: 'fadeUp 0.5s ease both' }}>
      <div style={{ flex: 1, padding: '16px', background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: '18px', backdropFilter: 'blur(10px)' }}>
        <p style={{ fontSize: '0.55rem', color: '#00ff88', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '800', marginBottom: '8px' }}>🧪 Dopamina Estimada</p>
        <p style={{ fontSize: '1.4rem', fontWeight: '900', color: '#fff', margin: 0 }}>{dopamina} <span style={{ fontSize: '0.7rem', opacity: 0.5, fontWeight: '400' }}>mg</span></p>
      </div>
      <div style={{ flex: 1, padding: '16px', background: 'rgba(255,68,68,0.05)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '18px', backdropFilter: 'blur(10px)' }}>
        <p style={{ fontSize: '0.55rem', color: '#ff4444', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '800', marginBottom: '8px' }}>🧪 Cortisol (Tensão)</p>
        <p style={{ fontSize: '1.4rem', fontWeight: '900', color: '#fff', margin: 0 }}>{cortisol} <span style={{ fontSize: '0.7rem', opacity: 0.5, fontWeight: '400' }}>mg</span></p>
      </div>
    </div>
  );
}

// ── 5. Micro-Ajustes de Frame ────────────────────────────────────────────────
function DiretorDicas({ texto, glow }) {
  const [dica, setDica] = useState('');
  
  useEffect(() => {
    if (!texto || texto.length < 20) return;
    const dicas = [
      "Use um corte seco (Jump Cut) aqui para elevar o Cortisol em 15%",
      "Aplique um Zoom Digital lento para aumentar a Dopamina",
      "Corte para o detalhe (Extreme Close-up) no próximo sinal de impacto",
      "Insira um Glitch visual para quebrar a monotonia agora",
      "Ângulo baixo aqui reforça a sensação de Poder e Status"
    ];
    setDica(dicas[Math.floor(Math.random() * dicas.length)]);
  }, [texto]);

  if (!dica) return null;
  return (
    <div style={{ margin: '20px 0', padding: '16px 20px', background: `${glow}10`, borderLeft: `4px solid ${glow}`, borderRadius: '8px', animation: 'slideIn 0.4s ease both' }}>
      <p style={{ fontSize: '0.6rem', color: glow, textTransform: 'uppercase', fontWeight: '900', letterSpacing: '2px', marginBottom: '6px' }}>🎬 Comando do Diretor</p>
      <p style={{ fontSize: '0.85rem', color: '#fff', fontStyle: 'italic', lineHeight: 1.4 }}>"{dica}"</p>
    </div>
  );
}

export default function App() {
  const t = useT()
  const [user] = useState({ token: 'mock', nome: 'Criador' })
  const [emocao, setEmocao] = useState('')
  const [active, setActive] = useState(null)
  const [focusMode, setFocusMode] = useState(false)
  const [justificativa, setJustificativa] = useState('')
  const [showROI, setShowROI] = useState(false)
  const [loading, setLoading] = useState(false)

  // ── 6. Efeito Sonoro Subliminal ──────────────────────────────────────────
  useEffect(() => {
    if (!active || !emocao) return;
    const freq = active.nome === 'Luxo Cinematográfico' ? 42 : 58;
    const synth = new Tone.Oscillator(freq, "sine").toDestination();
    synth.volume.value = -35;
    synth.start().stop("+1.5");
    return () => synth.dispose();
  }, [active, emocao.length > 0 && Math.floor(emocao.length / 10)]);

  const handleClear = () => {
    if (focusMode && !justificativa) {
      alert("⚠️ TRAVA DE FLUXO ATIVA: O software detectou um estado de criação de elite. Digite uma justificativa neuro-lógica para descartar este progresso.");
      return;
    }
    setEmocao('');
    setJustificativa('');
  };

  const exportROI = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setShowROI(true);
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 1500);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#050508', color: '#fff', fontFamily: "'Segoe UI', sans-serif", padding: '60px 20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
        
        {/* Header de Elite */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '50px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, #7c3aed, #e94560)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>◈</div>
              <span style={{ fontSize: '0.65rem', letterSpacing: '3px', color: '#e94560', textTransform: 'uppercase', fontWeight: '800' }}>Neuro-Training System</span>
            </div>
            <h1 style={{ fontSize: '2.4rem', fontWeight: '900', margin: 0, background: 'linear-gradient(135deg, #fff, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Laboratório de<br/>Intenção Visual</h1>
          </div>
          <button 
            onClick={() => setFocusMode(!focusMode)} 
            style={{ padding: '10px 24px', borderRadius: '999px', background: focusMode ? 'rgba(233,69,96,0.2)' : 'rgba(124,58,237,0.1)', border: `1px solid ${focusMode ? '#e94560' : '#7c3aed'}`, color: focusMode ? '#e94560' : '#a78bfa', cursor: 'pointer', fontWeight: '800', fontSize: '0.7rem', letterSpacing: '1px', transition: 'all 0.3s' }}
          >
            {focusMode ? '🔒 MODO FLUXO ATIVO' : '🔓 ATIVAR GUARDIÃO'}
          </button>
        </header>

        {/* Editor com Algoritmo do Tédio */}
        <TedioDetector texto={emocao} glow={active?.glow}>
          <textarea 
            value={emocao} 
            onChange={e => setEmocao(e.target.value)}
            placeholder="Comece a ditar a realidade do seu vídeo..."
            style={{ width: '100%', height: '180px', background: 'rgba(255,255,255,0.02)', color: '#fff', border: `1px solid ${focusMode ? '#7c3aed44' : 'rgba(255,255,255,0.1)'}`, borderRadius: '24px', padding: '28px', fontSize: '1.1rem', outline: 'none', resize: 'none', lineHeight: 1.6, backdropFilter: 'blur(20px)', transition: 'all 0.4s ease' }}
          />
        </TedioDetector>

        {focusMode && (
          <div style={{ animation: 'fadeUp 0.4s ease both', marginTop: '12px' }}>
            <input 
              placeholder="Justificativa neuro-lógica para apagar sua genialidade..." 
              value={justificativa} 
              onChange={e => setJustificativa(e.target.value)}
              style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', padding: '12px', fontStyle: 'italic', outline: 'none' }}
            />
          </div>
        )}

        {/* Ações de Elite */}
        <div style={{ marginTop: '24px', display: 'flex', gap: '14px' }}>
          <button onClick={handleClear} style={{ padding: '16px 32px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', transition: 'all 0.2s' }}>Limpar Set</button>
          <button 
            onClick={exportROI} 
            disabled={loading || emocao.length < 10}
            style={{ flex: 1, padding: '16px 32px', borderRadius: '16px', background: 'linear-gradient(135deg, #7c3aed, #e94560)', border: 'none', color: '#fff', fontWeight: '800', cursor: 'pointer', fontSize: '0.9rem', letterSpacing: '1px', textTransform: 'uppercase', boxShadow: '0 10px 30px rgba(124,58,237,0.3)', transition: 'all 0.3s' }}
          >
            {loading ? 'ANALISANDO ROI...' : 'GERAR RELATÓRIO ROI (PDF)'}
          </button>
        </div>

        {/* Painel de Inteligência de Elite */}
        {emocao.length > 5 && (
          <div style={{ marginTop: '50px' }}>
            <HormonioCounter retention={89} />
            <DiretorDicas texto={emocao} glow="#7c3aed" />
            
            {showROI && (
              <div style={{ padding: '40px', background: '#fff', color: '#050508', borderRadius: '24px', marginTop: '30px', animation: 'tiltIn 0.6s ease both', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #050508', paddingBottom: '20px', marginBottom: '30px' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: '900', margin: 0, letterSpacing: '-1px' }}>ROI DE ATENÇÃO: RELATÓRIO EXECUTIVO</h2>
                  <div style={{ textAlign: 'right', fontSize: '0.65rem', fontWeight: '800', color: '#e94560' }}>CONFIDENCIAL</div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                  <div>
                    <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#666', letterSpacing: '1px', marginBottom: '10px' }}>Retenção Projetada</p>
                    <p style={{ fontSize: '2.5rem', fontWeight: '900', margin: 0 }}>94.2%</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#666', letterSpacing: '1px', marginBottom: '10px' }}>Valor de Mercado Estimado</p>
                    <p style={{ fontSize: '2.5rem', fontWeight: '900', margin: 0 }}>R$ 18.500</p>
                  </div>
                </div>

                <div style={{ marginTop: '40px', padding: '20px', background: '#f5f5f5', borderRadius: '12px' }}>
                  <p style={{ fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}><strong>Parecer Neuro-Científico:</strong> O roteiro utiliza gatilhos de alto impacto que sincronizam com o sistema de recompensa do espectador. A curva de tensão é otimizada para impedir o "scroll-down" nos primeiros 3 segundos.</p>
                </div>
                
                <p style={{ fontSize: '0.6rem', color: '#999', marginTop: '30px', textAlign: 'center' }}>© 2026 Intenção Visual Pro · Sistema de Treinamento de Elite</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Estilos Globais de Animação */}
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes tiltIn { from { opacity: 0; transform: perspective(1000px) rotateX(10deg) translateY(30px); } to { opacity: 1; transform: perspective(1000px) rotateX(0) translateY(0); } }
      `}</style>
    </div>
  );
}
