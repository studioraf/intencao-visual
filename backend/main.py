from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Float, text, inspect
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from auth import hash_senha, verificar_senha, criar_token, verificar_token
import json
import stripe
import os
import uuid

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = "sqlite:///./kits.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String)
    email = Column(String, unique=True, index=True)
    senha_hash = Column(String)
    criado_em = Column(DateTime, default=datetime.utcnow)

class KitSalvo(Base):
    __tablename__ = "kits"
    id = Column(Integer, primary_key=True, index=True)
    usuario_email = Column(String)
    emocao = Column(String)
    formato = Column(String)
    nome_estilo = Column(String)
    resultado_json = Column(String)
    share_id = Column(String, unique=True, index=True, nullable=True)
    publico = Column(Boolean, default=False)
    criado_em = Column(DateTime, default=datetime.utcnow)

# ── NOVO: Tabela de feedback emocional (moat de dados) ──────────────────────
class FeedbackEmocional(Base):
    __tablename__ = "feedbacks"
    id = Column(Integer, primary_key=True, index=True)
    kit_id = Column(Integer)
    usuario_email = Column(String)
    emocao_gerada = Column(String)   # emoção que o software detectou
    emocao_sentida = Column(String)  # emoção que o usuário realmente sentiu
    intensidade = Column(Float)      # 0.0 a 1.0 — quão forte foi a resposta
    preset_nome = Column(String)
    formato = Column(String)
    criado_em = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

# Migração automática de colunas faltantes
with engine.connect() as conn:
    inspector = inspect(engine)

    # Migração tabela kits
    colunas_kits = [c["name"] for c in inspector.get_columns("kits")]
    for coluna, ddl in [
        ("usuario_email", "ALTER TABLE kits ADD COLUMN usuario_email VARCHAR"),
        ("share_id", "ALTER TABLE kits ADD COLUMN share_id VARCHAR"),
        ("publico", "ALTER TABLE kits ADD COLUMN publico BOOLEAN DEFAULT 0"),
    ]:
        if coluna not in colunas_kits:
            conn.execute(text(ddl))
    conn.commit()

PRESETS = {
    "blade": {
        "keywords": ["blade", "cyberpunk", "neon", "futurista", "tech", "matrix", "glitch"],
        "nome": "Cyberpunk",
        "emocao": "Tensão · Adrenalina · Desorientação",
        "paleta": ["#0a0a0f", "#00fff7", "#7c3aed", "#ff006e"],
        "tipografia": "Rajdhani Bold",
        "ritmo": "32 cortes/min",
        "bpm": 140,
        "iluminacao": "Neon lateral · Chuva de luz",
        "enquadramento": "Close extremo",
        "audio_tipo": "cyberpunk",
        "audio_desc": "Sintetizador metálico + glitch eletrônico",
        "audio_efeito": "Gera tensão e adrenalina no espectador",
        "bg": ["#0a0a0f", "#0d0d1a", "#050508"],
        "glow": "#00fff7",
        "cenas": [
            {"cam": "Close extremo", "desc": "Olho com reflexo neon", "luz": "Neon ciano lateral"},
            {"cam": "Travelling lateral", "desc": "Corredor cyberpunk", "luz": "Luz de néon pulsante"},
            {"cam": "Grande angular", "desc": "Cidade distópica", "luz": "Glow roxo no horizonte"},
        ],
    },
    "poder": {
        "keywords": ["poder", "urgência", "força", "luxo", "cartier", "sdm", "rap", "trap", "épico"],
        "nome": "Luxo Cinematográfico",
        "emocao": "Poder · Status · Inevitabilidade",
        "paleta": ["#0d0500", "#8B3A00", "#C8860A", "#F5D78E"],
        "tipografia": "Montserrat Black",
        "ritmo": "22 cortes/min",
        "bpm": 95,
        "iluminacao": "Tungstênio quente · Sombra épica",
        "enquadramento": "Ângulo baixo",
        "audio_tipo": "trap",
        "audio_desc": "Kick 808 grave + hi-hat seco + sub bass",
        "audio_efeito": "Ativa sensação de poder e status no cérebro",
        "bg": ["#0d0500", "#1a0a00", "#0a0300"],
        "glow": "#C8860A",
        "cenas": [
            {"cam": "Ângulo baixo", "desc": "Figura imponente em contraluz", "luz": "Tungstênio quente"},
            {"cam": "Close extremo", "desc": "Detalhe dourado — relógio, joia", "luz": "Luz quente pontual"},
            {"cam": "Plano aberto", "desc": "Skyline noturno dourado", "luz": "Sombra épica"},
        ],
    },
    "romance": {
        "keywords": ["romance", "amor", "suave", "delicado", "intimidade", "saudade"],
        "nome": "Romance Etéreo",
        "emocao": "Nostalgia · Vulnerabilidade · Conexão",
        "paleta": ["#1a0010", "#8B0050", "#FF6B9D", "#FFD6E8"],
        "tipografia": "Cormorant Garamond",
        "ritmo": "12 cortes/min",
        "bpm": 72,
        "iluminacao": "Luz difusa · Bokeh profundo",
        "enquadramento": "Plano aberto",
        "audio_tipo": "romance",
        "audio_desc": "Pad suave + melodia de piano + reverb longo",
        "audio_efeito": "Ativa oxitocina — gera empatia e emoção",
        "bg": ["#1a0010", "#2d0020", "#0d0008"],
        "glow": "#FF6B9D",
        "cenas": [
            {"cam": "Plano aberto", "desc": "Dois sob luz dourada difusa", "luz": "Bokeh profundo"},
            {"cam": "Close extremo", "desc": "Mãos entrelaçadas", "luz": "Luz difusa lateral"},
            {"cam": "Macro extremo", "desc": "Olhar úmido — lágrima sutil", "luz": "Catch light suave"},
        ],
    },
    "misterio": {
        "keywords": ["mistério", "sombrio", "dark", "noir", "suspense", "thriller", "crime"],
        "nome": "Noir Contemporâneo",
        "emocao": "Ansiedade · Fascínio · Perigo",
        "paleta": ["#000000", "#0a0a0a", "#1a1a2e", "#4a4a6a"],
        "tipografia": "Playfair Display",
        "ritmo": "18 cortes/min",
        "bpm": 85,
        "iluminacao": "Contraluz duro · Sombra absoluta",
        "enquadramento": "Plano médio",
        "audio_tipo": "noir",
        "audio_desc": "Baixo profundo + silêncio dramático",
        "audio_efeito": "Ativa amígdala — gera antecipação e tensão",
        "bg": ["#000000", "#050508", "#020204"],
        "glow": "#4a4a6a",
        "cenas": [
            {"cam": "Plano médio", "desc": "Corredor com névoa", "luz": "Contraluz duro"},
            {"cam": "Close extremo", "desc": "Sombra de rosto fragmentada", "luz": "Sombra absoluta"},
            {"cam": "Ângulo baixo", "desc": "Figura solitária na chuva", "luz": "Luz de poste distante"},
        ],
    },
    "epico": {
        "keywords": ["épico", "guerra", "batalha", "herói", "dune", "grandioso", "histórico"],
        "nome": "Épico Cinematográfico",
        "emocao": "Grandiosidade · Sacrifício · Destino",
        "paleta": ["#0a0500", "#3d1a00", "#8B4513", "#DAA520"],
        "tipografia": "Cinzel Bold",
        "ritmo": "18 cortes/min",
        "bpm": 88,
        "iluminacao": "Luz épica lateral · Névoa dramática",
        "enquadramento": "Grande angular",
        "audio_tipo": "noir",
        "audio_desc": "Orquestra + percussão épica",
        "audio_efeito": "Ativa senso de grandiosidade",
        "bg": ["#0a0500", "#1a0a00", "#050200"],
        "glow": "#DAA520",
        "cenas": [
            {"cam": "Grande angular", "desc": "Exército no horizonte", "luz": "Luz épica lateral"},
            {"cam": "Ângulo baixo", "desc": "Herói erguendo espada", "luz": "Contraluz solar"},
            {"cam": "Travelling lateral", "desc": "Marcha épica", "luz": "Névoa dourada"},
        ],
    },
    "minimalista": {
        "keywords": ["minimalista", "clean", "simples", "moderno", "elegante", "corporativo"],
        "nome": "Minimalismo Moderno",
        "emocao": "Clareza · Confiança · Sofisticação",
        "paleta": ["#ffffff", "#f5f5f5", "#333333", "#000000"],
        "tipografia": "Helvetica Neue Light",
        "ritmo": "15 cortes/min",
        "bpm": 80,
        "iluminacao": "Luz difusa branca · Alto key",
        "enquadramento": "Plano médio",
        "audio_tipo": "romance",
        "audio_desc": "Piano minimalista + silêncio",
        "audio_efeito": "Transmite clareza e foco",
        "bg": ["#1a1a1a", "#222222", "#111111"],
        "glow": "#ffffff",
        "cenas": [
            {"cam": "Plano médio", "desc": "Produto sobre fundo branco", "luz": "Alto key difuso"},
            {"cam": "Macro extremo", "desc": "Detalhe de textura", "luz": "Luz rente à superfície"},
            {"cam": "Grande angular", "desc": "Espaço vazio significativo", "luz": "Luz neutra branca"},
        ],
    },
    # ── NOVOS PRESETS ────────────────────────────────────────────────────────
    "melancolia": {
        "keywords": ["melancolia", "triste", "saudade", "chuva", "solidão", "lo-fi", "chill"],
        "nome": "Melancolia Urbana",
        "emocao": "Saudade · Introspecção · Beleza Triste",
        "paleta": ["#0d1117", "#1a2030", "#2d4060", "#6080a0"],
        "tipografia": "Georgia Italic",
        "ritmo": "10 cortes/min",
        "bpm": 68,
        "iluminacao": "Luz fria difusa · Chuva nas janelas",
        "enquadramento": "Plano aberto",
        "audio_tipo": "lo-fi",
        "audio_desc": "Piano lo-fi + chuva + vinyl crackle",
        "audio_efeito": "Ativa memória emocional e introspecção",
        "bg": ["#0d1117", "#111820", "#080d12"],
        "glow": "#6080a0",
        "cenas": [
            {"cam": "Plano aberto", "desc": "Janela com chuva — cidade ao fundo", "luz": "Luz fria difusa"},
            {"cam": "Close extremo", "desc": "Mão tocando vidro molhado", "luz": "Reflexo de neon na chuva"},
            {"cam": "Travelling lateral", "desc": "Rua vazia de madrugada", "luz": "Postes distantes"},
        ],
    },
    "euforia": {
        "keywords": ["euforia", "festa", "hype", "energia", "dança", "rave", "festival"],
        "nome": "Euforia Coletiva",
        "emocao": "Alegria · Energia · Pertencimento",
        "paleta": ["#ff006e", "#fb5607", "#ffbe0b", "#8338ec"],
        "tipografia": "Bebas Neue",
        "ritmo": "40 cortes/min",
        "bpm": 128,
        "iluminacao": "Estrobo · Laser colorido",
        "enquadramento": "Close extremo",
        "audio_tipo": "rave",
        "audio_desc": "Bass drop + synth eufórico + crowd",
        "audio_efeito": "Libera dopamina — sensação de pertencimento",
        "bg": ["#0a0005", "#150010", "#050008"],
        "glow": "#ff006e",
        "cenas": [
            {"cam": "Close extremo", "desc": "Rosto em êxtase na multidão", "luz": "Estrobo colorido"},
            {"cam": "Grande angular", "desc": "Crowd levantando as mãos", "luz": "Laser verde e rosa"},
            {"cam": "Travelling lateral", "desc": "Movimento frenético de dança", "luz": "Luz estroboscópica"},
        ],
    },
    "natureza": {
        "keywords": ["natureza", "floresta", "mar", "montanha", "terra", "zen", "paz", "calma"],
        "nome": "Natureza Visceral",
        "emocao": "Serenidade · Conexão · Pertencimento",
        "paleta": ["#0a1a0a", "#1a3020", "#2d5a2d", "#7ab87a"],
        "tipografia": "Lora Regular",
        "ritmo": "8 cortes/min",
        "bpm": 60,
        "iluminacao": "Luz natural filtrada · Golden hour",
        "enquadramento": "Grande angular",
        "audio_tipo": "ambient",
        "audio_desc": "Sons de floresta + respiração + pad etéreo",
        "audio_efeito": "Reduz cortisol — gera calma e conexão",
        "bg": ["#0a1a0a", "#0d2010", "#060f06"],
        "glow": "#7ab87a",
        "cenas": [
            {"cam": "Grande angular", "desc": "Floresta densa com raios de sol", "luz": "Golden hour filtrado"},
            {"cam": "Macro extremo", "desc": "Folha com gota de orvalho", "luz": "Luz natural suave"},
            {"cam": "Travelling lateral", "desc": "Rio entre pedras", "luz": "Reflexo de água"},
        ],
    },
}

# ── Models ───────────────────────────────────────────────────────────────────
class EmocaoRequest(BaseModel):
    emocao: str
    formato: str

class CadastroRequest(BaseModel):
    nome: str
    email: str
    senha: str

class LoginRequest(BaseModel):
    email: str
    senha: str

class FeedbackRequest(BaseModel):
    kit_id: int
    emocao_sentida: str
    intensidade: float  # 0.0 a 1.0

def detectar_preset(emocao: str):
    lower = emocao.lower()
    for preset in PRESETS.values():
        if any(k in lower for k in preset["keywords"]):
            return preset
    return PRESETS["poder"]

# ── Rotas ────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "Kit de Intenção Visual API rodando", "version": "2.0"}

@app.post("/cadastro")
def cadastro(req: CadastroRequest):
    db = SessionLocal()
    existe = db.query(Usuario).filter(Usuario.email == req.email).first()
    if existe:
        db.close()
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    usuario = Usuario(nome=req.nome, email=req.email, senha_hash=hash_senha(req.senha))
    db.add(usuario)
    db.commit()
    db.close()
    token = criar_token({"sub": req.email, "nome": req.nome})
    return {"token": token, "nome": req.nome, "email": req.email}

@app.post("/login")
def login(req: LoginRequest):
    db = SessionLocal()
    usuario = db.query(Usuario).filter(Usuario.email == req.email).first()
    db.close()
    if not usuario or not verificar_senha(req.senha, usuario.senha_hash):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    token = criar_token({"sub": usuario.email, "nome": usuario.nome})
    return {"token": token, "nome": usuario.nome, "email": usuario.email}

@app.post("/gerar-kit")
def gerar_kit(req: EmocaoRequest, email: str = Depends(verificar_token)):
    preset = detectar_preset(req.emocao)
    resultado = {
        "nome": preset["nome"],
        "emocao": preset["emocao"],
        "paleta": preset["paleta"],
        "tipografia": preset["tipografia"],
        "ritmo": preset["ritmo"],
        "bpm": preset["bpm"],
        "iluminacao": preset["iluminacao"],
        "enquadramento": preset["enquadramento"],
        "formato": req.formato,
        "bg": preset.get("bg", ["#000000", "#111111", "#050505"]),
        "glow": preset.get("glow", "#ffffff"),
        "cenas": preset.get("cenas", []),
        "audio": {
            "tipo": preset["audio_tipo"],
            "descricao": preset["audio_desc"],
            "efeito": preset["audio_efeito"],
        }
    }
    db = SessionLocal()
    kit = KitSalvo(
        usuario_email=email,
        emocao=req.emocao,
        formato=req.formato,
        nome_estilo=preset["nome"],
        resultado_json=json.dumps(resultado)
    )
    db.add(kit)
    db.commit()
    db.refresh(kit)
    kit_id = kit.id
    db.close()
    return {**resultado, "kit_id": kit_id}

@app.get("/meus-kits")
def meus_kits(email: str = Depends(verificar_token)):
    db = SessionLocal()
    kits = db.query(KitSalvo).filter(
        KitSalvo.usuario_email == email
    ).order_by(KitSalvo.criado_em.desc()).limit(20).all()
    db.close()
    return [{"id": k.id, "emocao": k.emocao, "estilo": k.nome_estilo, "formato": k.formato, "share_id": k.share_id, "publico": k.publico, "criado_em": k.criado_em} for k in kits]

@app.post("/compartilhar/{kit_id}")
def compartilhar_kit(kit_id: int, email: str = Depends(verificar_token)):
    db = SessionLocal()
    kit = db.query(KitSalvo).filter(KitSalvo.id == kit_id, KitSalvo.usuario_email == email).first()
    if not kit:
        db.close()
        raise HTTPException(status_code=404, detail="Kit não encontrado")
    if not kit.share_id:
        kit.share_id = str(uuid.uuid4())[:8]
    kit.publico = True
    db.commit()
    share_id = kit.share_id
    db.close()
    return {"share_id": share_id, "url": f"https://intencao-visual.vercel.app/kit/{share_id}"}

@app.get("/kit/{share_id}")
def ver_kit_publico(share_id: str):
    db = SessionLocal()
    kit = db.query(KitSalvo).filter(KitSalvo.share_id == share_id, KitSalvo.publico == True).first()
    db.close()
    if not kit:
        raise HTTPException(status_code=404, detail="Kit não encontrado ou não compartilhado")
    resultado = json.loads(kit.resultado_json)
    return {"emocao_input": kit.emocao, "formato": kit.formato, "estilo": kit.nome_estilo, "criado_em": kit.criado_em, **resultado}

# ── NOVO: Feedback emocional — o moat de dados ──────────────────────────────
@app.post("/feedback")
def registrar_feedback(req: FeedbackRequest, email: str = Depends(verificar_token)):
    """
    Usuário diz qual emoção realmente sentiu e com que intensidade.
    Isso alimenta o banco de dados emocional proprietário.
    """
    db = SessionLocal()
    kit = db.query(KitSalvo).filter(KitSalvo.id == req.kit_id).first()
    if not kit:
        db.close()
        raise HTTPException(status_code=404, detail="Kit não encontrado")
    resultado = json.loads(kit.resultado_json)
    feedback = FeedbackEmocional(
        kit_id=req.kit_id,
        usuario_email=email,
        emocao_gerada=kit.emocao,
        emocao_sentida=req.emocao_sentida,
        intensidade=max(0.0, min(1.0, req.intensidade)),
        preset_nome=kit.nome_estilo,
        formato=kit.formato,
    )
    db.add(feedback)
    db.commit()
    db.close()
    # Calcula precisão emocional instantânea
    acerto = req.emocao_sentida.lower() in kit.emocao.lower()
    return {
        "registrado": True,
        "precisao_emocional": "alta" if acerto else "divergente",
        "mensagem": "Obrigado! Seu feedback melhora a precisão neurocinemática do sistema."
    }

@app.get("/insights-emocionais")
def insights_emocionais(email: str = Depends(verificar_token)):
    """
    Retorna análise dos padrões emocionais do usuário.
    Começo do 'DNA emocional da marca'.
    """
    db = SessionLocal()
    feedbacks = db.query(FeedbackEmocional).filter(
        FeedbackEmocional.usuario_email == email
    ).order_by(FeedbackEmocional.criado_em.desc()).limit(50).all()
    db.close()

    if not feedbacks:
        return {"mensagem": "Gere e avalie kits para ver seus padrões emocionais.", "total": 0}

    # Agrega padrões
    emocoes_sentidas = {}
    intensidade_media = 0
    for f in feedbacks:
        emocoes_sentidas[f.emocao_sentida] = emocoes_sentidas.get(f.emocao_sentida, 0) + 1
        intensidade_media += f.intensidade
    intensidade_media = intensidade_media / len(feedbacks)
    emocao_dominante = max(emocoes_sentidas, key=emocoes_sentidas.get)

    return {
        "total_avaliacoes": len(feedbacks),
        "emocao_dominante": emocao_dominante,
        "intensidade_media": round(intensidade_media, 2),
        "distribuicao_emocional": emocoes_sentidas,
        "dna_marca": f"Sua marca ressoa principalmente com '{emocao_dominante}' a {round(intensidade_media*100)}% de intensidade.",
    }

@app.post("/criar-assinatura")
def criar_assinatura(email: str = Depends(verificar_token)):
    try:
        cliente = stripe.Customer.create(email=email)
        sessao = stripe.checkout.Session.create(
            customer=cliente.id,
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {"name": "Kit de Intenção Visual Pro"},
                    "unit_amount": 900,
                    "recurring": {"interval": "month"},
                },
                "quantity": 1,
            }],
            mode="subscription",
            success_url="https://intencao-visual.vercel.app?plano=pro",
            cancel_url="https://intencao-visual.vercel.app",
        )
        return {"url": sessao.url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ════════════════════════════════════════════════════════════════════════════════
# ALGORITMO DO TÉDIO — Negative Data Engine
# ════════════════════════════════════════════════════════════════════════════════

class FeedbackFracasso(Base):
    """
    Banco de Fracassos: registra padrões que geraram abandono/skip.
    Cada entrada é um sinal de aprendizado do sistema.
    """
    __tablename__ = "fracassos"
    id = Column(Integer, primary_key=True, index=True)
    usuario_email = Column(String, index=True)
    texto_original = Column(String)          # o que o usuário escreveu
    padroes_detectados = Column(String)      # JSON: lista de categorias de fracasso
    score_impacto = Column(Integer)          # 0-100
    em_zona_abandono = Column(Boolean, default=False)
    preset_gerado = Column(String, nullable=True)   # qual preset foi gerado (se houve)
    converteu = Column(Boolean, default=False)      # usuário continuou e gerou kit?
    criado_em = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

# Migração da nova tabela
with engine.connect() as conn:
    try:
        inspector = inspect(engine)
        if "fracassos" not in inspector.get_table_names():
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS fracassos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    usuario_email VARCHAR,
                    texto_original VARCHAR,
                    padroes_detectados VARCHAR,
                    score_impacto INTEGER,
                    em_zona_abandono BOOLEAN DEFAULT 0,
                    preset_gerado VARCHAR,
                    converteu BOOLEAN DEFAULT 0,
                    criado_em DATETIME
                )
            """))
        conn.commit()
    except Exception as e:
        print(f"[migration fracassos] {e}")

# ── Banco de Fracassos (espelho do frontend) ──────────────────────────────────
FRACASSOS_DB = {
    "genericidade": {
        "palavras": [
            "produto", "serviço", "qualidade", "excelência", "inovação",
            "solução", "empresa", "equipe", "cliente", "resultado",
            "profissional", "especialista", "melhor", "único", "especial",
            "incrível", "fantástico", "maravilhoso", "perfeito", "ótimo",
            "product", "service", "quality", "excellence", "innovation",
        ],
        "label": "Genericidade Mortal",
        "desc": "Essas palavras causam skip em 3.2s.",
        "gravidade": "alta",
        "taxa_abandono": 0.78,
    },
    "narrativa_fraca": {
        "palavras": [
            "apresentamos", "conheça", "descubra nosso", "venha conhecer",
            "clique aqui", "saiba mais", "entre em contato", "fale conosco",
            "acesse nosso", "visite nosso", "siga nossas", "curta nossa",
        ],
        "label": "Chamada para Ação Morta",
        "desc": "CTAs explícitos no início destroem a tensão narrativa.",
        "gravidade": "alta",
        "taxa_abandono": 0.78,
    },
    "cliches_visuais": {
        "palavras": [
            "logo animado", "intro com logo", "fade in", "fade out",
            "texto centralizado", "fundo branco com logo", "foto corporativa",
            "stock footage", "música motivacional",
        ],
        "label": "Clichê Visual Saturado",
        "desc": "10 anos de oversaturation.",
        "gravidade": "media",
        "taxa_abandono": 0.62,
    },
    "ritmo_tedio": {
        "palavras": [
            "fundo musical suave", "trilha leve", "narração em off",
            "voz over", "voice over", "narração calma", "plano estático",
            "câmera parada", "sem cortes", "transição suave",
        ],
        "label": "Ritmo de Tédio Biológico",
        "desc": "Estrutura que desativa o sistema de alerta.",
        "gravidade": "media",
        "taxa_abandono": 0.55,
    },
    "sem_tensao": {
        "palavras": [
            "feliz", "sorrindo", "alegre", "positivo", "ensolarado",
            "belo dia", "oportunidade incrível", "história de sucesso",
            "caso de sucesso", "depoimento", "testemunhal",
        ],
        "label": "Ausência de Tensão Narrativa",
        "desc": "Conteúdo sem conflito não ativa a amígdala.",
        "gravidade": "baixa",
        "taxa_abandono": 0.41,
    },
}

SINAIS_IMPACTO = [
    "medo", "poder", "desejo", "raiva", "luxo", "perigo", "segredo",
    "proibido", "urgente", "agora", "nunca", "sempre", "jamais",
    "noir", "trap", "épico", "sangue", "fogo", "guerra", "morte",
    "amor", "ódio", "traição", "vingança", "ascensão", "queda",
    "neon", "cyberpunk", "sombrio", "dark", "glitch", "caos",
]


def analisar_tedio(texto: str) -> dict:
    """Analisa o texto e retorna score de impacto e padrões de fracasso."""
    if not texto or len(texto) < 3:
        return {"score": 0, "alertas": [], "em_zona_abandono": False, "sinais_impacto": []}

    lower = texto.lower()
    alertas = []
    total_fracassos = 0

    for categoria, dados in FRACASSOS_DB.items():
        encontradas = [p for p in dados["palavras"] if p in lower]
        if encontradas:
            alertas.append({
                "categoria": categoria,
                "label": dados["label"],
                "gravidade": dados["gravidade"],
                "taxa_abandono": dados["taxa_abandono"],
                "palavras_encontradas": encontradas[:3],
            })
            total_fracassos += len(encontradas)

    sinais_impacto = [s for s in SINAIS_IMPACTO if s in lower]

    em_zona_abandono = (
        len(texto) > 60
        and len(sinais_impacto) == 0
        and total_fracassos >= 2
    )

    score = max(0, min(100,
        (len(sinais_impacto) * 15) - (total_fracassos * 8) + (10 if len(texto) > 20 else 0)
    ))

    return {
        "score": score,
        "alertas": alertas,
        "em_zona_abandono": em_zona_abandono,
        "sinais_impacto": sinais_impacto,
        "total_fracassos": total_fracassos,
    }


class AnaliseRequest(BaseModel):
    texto: str


class FracassoRequest(BaseModel):
    texto: str
    padroes: list
    score: int
    em_zona_abandono: bool
    converteu: bool = False
    preset_gerado: str = None


@app.post("/analisar-tedio")
def analisar_tedio_endpoint(req: AnaliseRequest, email: str = Depends(verificar_token)):
    """
    Analisa texto em tempo real e retorna score de impacto + padrões de fracasso.
    Chamado com debounce pelo frontend enquanto o usuário digita.
    """
    resultado = analisar_tedio(req.texto)
    return resultado


@app.post("/registrar-fracasso")
def registrar_fracasso(req: FracassoRequest, email: str = Depends(verificar_token)):
    """
    Registra no banco quando um padrão de fracasso foi detectado.
    Alimenta o modelo de dados negativo — o moat mais difícil de replicar.
    """
    db = SessionLocal()
    fracasso = FeedbackFracasso(
        usuario_email=email,
        texto_original=req.texto[:500],  # limite de segurança
        padroes_detectados=json.dumps(req.padroes),
        score_impacto=max(0, min(100, req.score)),
        em_zona_abandono=req.em_zona_abandono,
        preset_gerado=req.preset_gerado,
        converteu=req.converteu,
    )
    db.add(fracasso)
    db.commit()
    db.close()
    return {"registrado": True}


@app.get("/insights-negativos")
def insights_negativos(email: str = Depends(verificar_token)):
    """
    Retorna padrões de fracasso mais comuns globalmente.
    Começo do 'Algoritmo Fantasma' — dados que nenhum concorrente tem.
    """
    db = SessionLocal()
    fracassos = db.query(FeedbackFracasso).order_by(
        FeedbackFracasso.criado_em.desc()
    ).limit(500).all()
    db.close()

    if not fracassos:
        return {"total": 0, "mensagem": "Dados insuficientes ainda."}

    # Agrega padrões
    padroes_count = {}
    zonas_abandono = sum(1 for f in fracassos if f.em_zona_abandono)
    score_medio = sum(f.score_impacto for f in fracassos) / len(fracassos)
    taxa_conversao = sum(1 for f in fracassos if f.converteu) / len(fracassos)

    for f in fracassos:
        try:
            padroes = json.loads(f.padroes_detectados or "[]")
            for p in padroes:
                padroes_count[p] = padroes_count.get(p, 0) + 1
        except Exception:
            pass

    padrao_mais_comum = max(padroes_count, key=padroes_count.get) if padroes_count else None

    return {
        "total_amostras": len(fracassos),
        "zonas_abandono": zonas_abandono,
        "taxa_zona_abandono": round(zonas_abandono / len(fracassos), 2),
        "score_medio_impacto": round(score_medio, 1),
        "taxa_conversao_apos_alerta": round(taxa_conversao, 2),
        "padrao_mais_comum": padrao_mais_comum,
        "distribuicao_padroes": padroes_count,
        "insight": f"O padrão '{padrao_mais_comum}' é o maior killer de impacto emocional com {padroes_count.get(padrao_mais_comum, 0)} ocorrências." if padrao_mais_comum else "Coletando dados.",
    }