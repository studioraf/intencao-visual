import { useRef, useState } from 'react'

const CARD_FORMATS = {
  instagram: { label: 'Instagram', icon: '◈', w: 1080, h: 1080, ratio: '1:1' },
  tiktok:    { label: 'TikTok',    icon: '◆', w: 1080, h: 1920, ratio: '9:16' },
  youtube:   { label: 'YouTube',   icon: '▶', w: 1920, h: 1080, ratio: '16:9' },
}

function hexToRgb(hex) {
  try {
    const h = hex.replace('#', '')
    return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]
  } catch { return [124,58,237] }
}

async function loadFont(name) {
  try {
    const font = new FontFace(name, `local('${name}')`)
    await font.load()
    document.fonts.add(font)
  } catch {}
}

async function gerarCard({ preset, formato, miniplayerCanvas }) {
  const fmt = CARD_FORMATS[formato]
  const W = fmt.w, H = fmt.h

  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')

  // ── 1. Fundo — frame capturado do MiniPlayer 3D ──────────────────
  if (miniplayerCanvas) {
    try {
      // Preenche o fundo inteiro com o frame do 3D esticado/cortado
      const mpW = miniplayerCanvas.width
      const mpH = miniplayerCanvas.height
      const scale = Math.max(W / mpW, H / mpH)
      const drawW = mpW * scale
      const drawH = mpH * scale
      const offsetX = (W - drawW) / 2
      const offsetY = (H - drawH) / 2
      ctx.drawImage(miniplayerCanvas, offsetX, offsetY, drawW, drawH)
    } catch {
      // Fallback: gradiente do preset
      const bg = ctx.createLinearGradient(0, 0, W, H)
      bg.addColorStop(0, preset.bg[0])
      bg.addColorStop(0.5, preset.bg[1])
      bg.addColorStop(1, preset.bg[2])
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)
    }
  } else {
    const bg = ctx.createLinearGradient(0, 0, W, H)
    bg.addColorStop(0, preset.bg[0])
    bg.addColorStop(0.5, preset.bg[1])
    bg.addColorStop(1, preset.bg[2])
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
  }

  // ── 2. Overlay escuro para legibilidade ──────────────────────────
  const overlay = ctx.createLinearGradient(0, 0, 0, H)
  overlay.addColorStop(0, 'rgba(0,0,0,0.35)')
  overlay.addColorStop(0.4, 'rgba(0,0,0,0.15)')
  overlay.addColorStop(0.65, 'rgba(0,0,0,0.55)')
  overlay.addColorStop(1, 'rgba(0,0,0,0.88)')
  ctx.fillStyle = overlay
  ctx.fillRect(0, 0, W, H)

  // ── 3. Vinheta nas bordas ────────────────────────────────────────
  const vig = ctx.createRadialGradient(W/2, H/2, H*0.1, W/2, H/2, H*0.85)
  vig.addColorStop(0, 'rgba(0,0,0,0)')
  vig.addColorStop(1, 'rgba(0,0,0,0.6)')
  ctx.fillStyle = vig
  ctx.fillRect(0, 0, W, H)

  // ── 4. Linha de cor do preset (topo) ─────────────────────────────
  const lineGrad = ctx.createLinearGradient(0, 0, W, 0)
  preset.paleta.forEach((cor, i) => {
    lineGrad.addColorStop(i / (preset.paleta.length - 1), cor)
  })
  ctx.fillStyle = lineGrad
  ctx.fillRect(0, 0, W, Math.round(H * 0.006))

  const pad = Math.round(W * 0.07)
  const fs = (n) => Math.round(W * n)
  const [gr, gg, gb] = hexToRgb(preset.glow)

  // ── 5. Badge de estilo (topo esquerdo) ───────────────────────────
  const badgeY = Math.round(H * 0.06)
  const badgeH = fs(0.038)
  const badgeW = fs(0.38)
  ctx.fillStyle = `rgba(${gr},${gg},${gb},0.15)`
  ctx.strokeStyle = `rgba(${gr},${gg},${gb},0.5)`
  ctx.lineWidth = Math.round(W * 0.002)
  ctx.beginPath()
  ctx.roundRect(pad, badgeY - badgeH * 0.7, badgeW, badgeH * 1.4, badgeH * 0.7)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = preset.glow
  ctx.font = `${fs(0.018)}px 'Courier New', monospace`
  ctx.textAlign = 'left'
  ctx.letterSpacing = `${fs(0.003)}px`
  ctx.fillText('NEUROCINEMATOGRAFIA · KIT VISUAL', pad + fs(0.015), badgeY + fs(0.007))

  // ── 6. Nome do estilo (grande) ────────────────────────────────────
  const titleY = Math.round(H * 0.16)
  ctx.textAlign = 'left'
  ctx.fillStyle = '#ffffff'
  ctx.font = `900 ${fs(0.08)}px 'Arial Black', Arial, sans-serif`
  ctx.shadowBlur = fs(0.04)
  ctx.shadowColor = preset.glow
  ctx.fillText(preset.nome.toUpperCase(), pad, titleY)
  ctx.shadowBlur = 0

  // Linha decorativa abaixo do título
  const lineY = titleY + fs(0.025)
  const lineGrad2 = ctx.createLinearGradient(pad, 0, pad + fs(0.5), 0)
  lineGrad2.addColorStop(0, preset.glow)
  lineGrad2.addColorStop(1, 'transparent')
  ctx.fillStyle = lineGrad2
  ctx.fillRect(pad, lineY, fs(0.5), Math.round(H * 0.004))

  // ── 7. Emoção ────────────────────────────────────────────────────
  ctx.fillStyle = `rgba(${gr},${gg},${gb},0.9)`
  ctx.font = `${fs(0.028)}px Georgia, serif`
  ctx.fillText(preset.emocao, pad, titleY + fs(0.07))

  // ── 8. Grid de informações (meio/inferior) ────────────────────────
  const infoStartY = Math.round(H * 0.55)
  const colW = (W - pad * 2) / 2
  const rowH = fs(0.09)

  const infos = [
    { label: 'BPM', valor: String(preset.bpm), icon: '🎵' },
    { label: 'RITMO DE CORTE', valor: preset.ritmo, icon: '✂️' },
    { label: 'TIPOGRAFIA', valor: preset.tipografia, icon: '✍️' },
    { label: 'ILUMINAÇÃO', valor: preset.iluminacao, icon: '💡' },
    { label: 'ENQUADRAMENTO', valor: preset.enquadramento, icon: '📐' },
    { label: 'ÁUDIO', valor: preset.audio?.descricao || '', icon: '🔊' },
  ]

  infos.forEach((info, i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = pad + col * colW
    const y = infoStartY + row * rowH

    // Card de fundo
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.strokeStyle = `rgba(${gr},${gg},${gb},0.2)`
    ctx.lineWidth = Math.round(W * 0.001)
    ctx.beginPath()
    ctx.roundRect(x, y, colW - fs(0.02), rowH - fs(0.012), fs(0.015))
    ctx.fill()
    ctx.stroke()

    // Label
    ctx.fillStyle = `rgba(${gr},${gg},${gb},0.7)`
    ctx.font = `${fs(0.016)}px 'Courier New', monospace`
    ctx.textAlign = 'left'
    ctx.fillText(info.label, x + fs(0.025), y + fs(0.028))

    // Valor
    ctx.fillStyle = '#ffffff'
    ctx.font = `700 ${fs(0.024)}px Arial, sans-serif`
    const maxValW = colW - fs(0.06)
    let valorText = info.valor
    while (ctx.measureText(valorText).width > maxValW && valorText.length > 4) {
      valorText = valorText.slice(0, -2) + '…'
    }
    ctx.fillText(valorText, x + fs(0.025), y + fs(0.062))
  })

  // ── 9. Paleta de cores ────────────────────────────────────────────
  const paletaY = Math.round(H * 0.88)
  const paletaH = Math.round(H * 0.025)
  const paletaW = W - pad * 2

  ctx.fillStyle = 'rgba(255,255,255,0.1)'
  ctx.font = `${fs(0.016)}px 'Courier New', monospace`
  ctx.fillText('PALETA', pad, paletaY - fs(0.012))

  preset.paleta.forEach((cor, i) => {
    const x = pad + (paletaW / preset.paleta.length) * i
    const w = paletaW / preset.paleta.length - fs(0.008)
    ctx.fillStyle = cor
    ctx.shadowBlur = fs(0.02)
    ctx.shadowColor = cor
    ctx.beginPath()
    ctx.roundRect(x, paletaY, w, paletaH, fs(0.006))
    ctx.fill()
    ctx.shadowBlur = 0

    // Hex code
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.font = `${fs(0.013)}px 'Courier New', monospace`
    ctx.textAlign = 'center'
    ctx.fillText(cor.toUpperCase(), x + w / 2, paletaY + paletaH + fs(0.022))
  })
  ctx.textAlign = 'left'

  // ── 10. Rodapé com logo + site (marca d'água) ─────────────────────
  const footerY = H - Math.round(H * 0.045)
  const footerH = Math.round(H * 0.06)

  // Fundo do rodapé
  ctx.fillStyle = 'rgba(0,0,0,0.75)'
  ctx.fillRect(0, footerY - footerH * 0.3, W, footerH * 1.3)

  // Linha de cor no topo do rodapé
  ctx.fillStyle = lineGrad
  ctx.fillRect(0, footerY - footerH * 0.3, W, Math.round(H * 0.003))

  // Logo ◈
  ctx.fillStyle = preset.glow
  ctx.font = `${fs(0.038)}px Arial`
  ctx.textAlign = 'left'
  ctx.shadowBlur = fs(0.015)
  ctx.shadowColor = preset.glow
  ctx.fillText('◈', pad, footerY + fs(0.01))
  ctx.shadowBlur = 0

  // Nome do software
  ctx.fillStyle = '#ffffff'
  ctx.font = `700 ${fs(0.022)}px Arial, sans-serif`
  ctx.fillText('Kit de Intenção Visual', pad + fs(0.05), footerY + fs(0.01))

  // Site
  ctx.fillStyle = `rgba(${gr},${gg},${gb},0.7)`
  ctx.font = `${fs(0.016)}px 'Courier New', monospace`
  ctx.fillText('intencao-visual.vercel.app', pad + fs(0.05), footerY + fs(0.038))

  // Formato no canto direito
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.font = `${fs(0.016)}px 'Courier New', monospace`
  ctx.textAlign = 'right'
  ctx.fillText(`${fmt.ratio} · ${fmt.label.toUpperCase()}`, W - pad, footerY + fs(0.025))
  ctx.textAlign = 'left'

  return canvas
}

export default function ExportCard({ preset, formato: formatoKit, miniplayerRef }) {
  const [exporting, setExporting] = useState(false)
  const [formatoExport, setFormatoExport] = useState('instagram')
  const [previewUrl, setPreviewUrl] = useState(null)

  async function gerarPreview() {
    setExporting(true)
    try {
      // Pega o canvas do MiniPlayer 3D via ref
      const mpCanvas = miniplayerRef?.current?.querySelector('canvas')
      const card = await gerarCard({ preset, formato: formatoExport, miniplayerCanvas: mpCanvas })
      setPreviewUrl(card.toDataURL('image/png'))
    } catch (e) {
      console.error('Erro ao gerar card:', e)
    }
    setExporting(false)
  }

  function baixar() {
    if (!previewUrl) return
    const a = document.createElement('a')
    a.href = previewUrl
    a.download = `kit-${preset.nome.toLowerCase().replace(/\s+/g,'-')}-${formatoExport}.png`
    a.click()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Seletor de formato */}
      <div>
        <p style={{ fontSize: '0.6rem', letterSpacing: '3px', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: '10px' }}>
          📱 Exportar card para
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          {Object.entries(CARD_FORMATS).map(([key, fmt]) => (
            <button key={key} onClick={() => { setFormatoExport(key); setPreviewUrl(null) }}
              style={{ padding: '8px 16px', borderRadius: '999px', border: `1px solid ${formatoExport===key ? preset.glow : 'rgba(255,255,255,0.1)'}`, background: formatoExport===key ? `${preset.glow}18` : 'rgba(255,255,255,0.02)', color: formatoExport===key ? preset.glow : 'rgba(255,255,255,0.4)', fontSize: '0.78rem', cursor: 'pointer', fontWeight: formatoExport===key ? '700' : '400', transition: 'all 0.2s' }}>
              {fmt.icon} {fmt.label} <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>{fmt.ratio}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Preview do card */}
      {previewUrl && (
        <div style={{ animation: 'fadeUp 0.4s ease both' }}>
          <img src={previewUrl} alt="Card preview"
            style={{ width: '100%', maxHeight: '320px', objectFit: 'contain', borderRadius: '12px', border: `1px solid ${preset.glow}33`, boxShadow: `0 0 30px ${preset.glow}22` }}
          />
        </div>
      )}

      {/* Botões */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={gerarPreview} disabled={exporting}
          style={{ flex: 1, padding: '14px', borderRadius: '999px', border: 'none', background: exporting ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg, ${preset.glow}, #e94560)`, color: exporting ? 'rgba(255,255,255,0.3)' : '#fff', fontSize: '0.85rem', fontWeight: '700', cursor: exporting ? 'not-allowed' : 'pointer', letterSpacing: '1px', textTransform: 'uppercase', transition: 'all 0.3s', boxShadow: exporting ? 'none' : `0 0 30px ${preset.glow}44` }}>
          {exporting ? 'Gerando...' : previewUrl ? '↺ Regenerar' : '✦ Gerar Card'}
        </button>
        {previewUrl && (
          <button onClick={baixar}
            style={{ padding: '14px 22px', borderRadius: '999px', border: `1px solid ${preset.glow}66`, background: `${preset.glow}18`, color: preset.glow, fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}>
            ↓ Baixar PNG
          </button>
        )}
      </div>

      <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
        {CARD_FORMATS[formatoExport].w}×{CARD_FORMATS[formatoExport].h}px · Pronto para postar
      </p>
    </div>
  )
}