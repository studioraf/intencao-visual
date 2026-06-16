from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean
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

Base.metadata.create_all(bind=engine)

PRESETS = {
    "blade": {
        "keywords": ["blade", "cyberpunk", "neon", "futurista", "tech", "matrix"],
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
    },
}

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

def detectar_preset(emocao: str):
    lower = emocao.lower()
    for preset in PRESETS.values():
        if any(k in lower for k in preset["keywords"]):
            return preset
    return PRESETS["poder"]

@app.get("/")
def root():
    return {"status": "Kit de Intenção Visual API rodando"}

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
    return {
        "emocao_input": kit.emocao,
        "formato": kit.formato,
        "estilo": kit.nome_estilo,
        "criado_em": kit.criado_em,
        **resultado
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