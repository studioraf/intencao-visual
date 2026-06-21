import React, { useMemo, useState, useEffect, useRef } from 'react';

// ── Banco de Fracassos (Negative Data) ───────────────────────────────────────
const FRACASSOS = {
  genericidade: {
    palavras: ['produto', 'serviço', 'qualidade', 'excelência', 'inovação', 'solução', 'empresa', 'equipe', 'cliente', 'resultado', 'profissional', 'especialista', 'melhor', 'único', 'especial', 'incrível', 'fantástico', 'maravilhoso', 'perfeito', 'ótimo'],
    label: 'Genericidade Mortal',
    desc: 'Essas palavras causam skip em 3.2s. O cérebro as ignora automaticamente.',
    cor: '#ff4444',
    icone: '💀'
  },
  narrativa_fraca: {
    palavras: ['apresentamos', 'conheça', 'descubra nosso', 'venha conhecer', 'clique aqui', 'saiba mais', 'entre em contato', 'fale conosco'],
    label: 'Chamada para Ação Morta',
    desc: 'CTAs explícitos no início destroem a tensão narrativa. Taxa de abandono: 78%.',
    cor: '#ff8800',
    icone: '⚰️'
  }
};

const SINAIS_IMPACTO = ['medo', 'poder', 'desejo', 'raiva', 'luxo', 'perigo', 'segredo', 'proibido', 'urgente', 'agora', 'nunca', 'sempre', 'jamais', 'noir', 'trap', 'épico', 'sangue', 'fogo', 'guerra', 'morte', 'amor', 'ódio', 'traição', 'vingança', 'neon', 'cyberpunk', 'sombrio', 'dark', 'glitch', 'caos', 'explosão', 'velocidade', 'risco', 'adrenalina', 'intensidade'];

export function ZonaAbandonoOverlay({ active, phase }) {
  if (!active || phase === 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: '24px', overflow: 'hidden', opacity: phase, zIndex: 1, transition: 'opacity 0.8s ease' }}>
      <div style={{ position: 'absolute', inset: 0, background: `rgba(10,8,6,${0.4 * phase})`, backdropFilter: `blur(${phase * 2}px)` }} />
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: phase * 0.7 }} viewBox="0 0 400 120" preserveAspectRatio="none">
        <path d="M 0 0 Q 50 40 100 0" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
        <line x1="0" y1="0" x2="120" y2="120" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
        <circle cx="200" cy="60" r="1" fill="rgba(255,255,255,0.2)" />
      </svg>
      <div style={{ position: 'absolute', bottom: '12px', right: '15px', fontSize: '0.6rem', color: '#ff4400', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: '900', animation: 'glowPulse 2s infinite' }}>
        ⚠ Zona de Abandono Detectada
      </div>
    </div>
  );
}

export default function TedioDetector({ texto, glow, children }) {
  const [analise, setAnalise] = useState({ score: 0, alertas: [], emZonaAbandono: false, complexo: false });
  const glowColor = glow || '#7c3aed';

  const analisar = (txt) => {
    if (!txt || txt.length < 5) return { score: 0, alertas: [], emZonaAbandono: false, complexo: false };
    const lower = txt.toLowerCase();
    const palavras = lower.split(/\s+/);
    
    // 7. Modo Criança de 5 Anos (Simplificador)
    const palavrasLongas = palavras.filter(p => p.length > 10).length;
    const complexo = palavrasLongas / palavras.length > 0.25 && txt.length > 40;

    const alertas = [];
    Object.entries(FRACASSOS).forEach(([cat, dados]) => {
      const found = dados.palavras.filter(p => lower.includes(p));
      if (found.length > 0) alertas.push({ ...dados, found });
    });

    const impactos = SINAIS_IMPACTO.filter(s => lower.includes(s));
    const emZonaAbandono = txt.length > 70 && impactos.length === 0;
    const score = Math.min(100, (impactos.length * 25) - (alertas.length * 15) + (txt.length > 30 ? 10 : 0));

    return { score, alertas, emZonaAbandono, complexo, impactos };
  };

  useEffect(() => {
    const timer = setTimeout(() => setAnalise(analisar(texto)), 300);
    return () => clearTimeout(timer);
  }, [texto]);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative' }}>
        {children}
        <ZonaAbandonoOverlay active={analise.emZonaAbandono} phase={analise.emZonaAbandono ? 0.9 : 0} />
      </div>

      {/* 7. Feedback do Modo Criança */}
      {analise.complexo && (
        <div style={{ marginTop: '14px', padding: '16px', background: 'rgba(255, 170, 0, 0.08)', border: '1px solid rgba(255, 170, 0, 0.2)', borderRadius: '16px', animation: 'fadeUp 0.4s ease both' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '1rem' }}>👶</span>
            <span style={{ fontSize: '0.6rem', color: '#ffaa00', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px' }}>Modo Criança de 5 Anos</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.4 }}>
            Sua audiência vai desconectar aqui. O texto está denso demais. <strong>Simplifique para o nível 'Explicação de Elevador'.</strong>
          </p>
        </div>
      )}

      {/* Alertas de Fracasso */}
      {analise.alertas.length > 0 && (
        <div style={{ marginTop: '14px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {analise.alertas.map((a, i) => (
            <div key={i} style={{ padding: '8px 14px', background: `${a.cor}12`, border: `1px solid ${a.cor}33`, borderRadius: '10px', fontSize: '0.65rem', color: a.cor, fontWeight: '700', animation: 'fadeUp 0.3s ease both', animationDelay: `${i*0.1}s` }}>
              {a.icone} {a.label}
            </div>
          ))}
        </div>
      )}
      
      {/* Estilos de Animação */}
      <style>{`
        @keyframes glowPulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; text-shadow: 0 0 10px #ff4400; } }
      `}</style>
    </div>
  );
}
