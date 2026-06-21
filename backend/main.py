from fastapi import FastAPI, HTTPException, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, text, inspect
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from datetime import datetime
import json
import stripe
import os
import uuid

from auth import hash_senha, verificar_senha, criar_token, verificar_token
from presets import PRESETS

# ── Configuração ──────────────────────────────────────────────────────────────
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")

app = FastAPI(title="Neurocinematica API", version="3.1.0")

# CORS — Em produção, substitua "*" pelos domínios específicos do seu frontend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# ── Banco de Dados ────────────────────────────────────────────────────────────
# DATABASE_URL pode ser sobrescrito por variável de ambiente (ex: PostgreSQL em produção).
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./kits.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """
    Dependência FastAPI que garante abertura e fechamento correto da sessão
    de banco de dados por requisição, mesmo em caso de exceção.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Modelos ───────────────────────────────────────────────────────────────────
class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String)
    email = Column(String, unique=True, index=True)
    senha_hash = Column(String)
    plano = Column(String, default="free")
    stripe_id = Column(String, nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)


class KitSalvo(Base):
    __tablename__ = "kits"
    id = Column(Integer, primary_key=True, index=True)
    usuario_email = Column(String, index=True)
    emocao = Column(String)
    formato = Column(String)
    nome_estilo = Column(String)
    resultado_json = Column(String)
    share_id = Column(String, unique=True, index=True, nullable=True)
    publico = Column(Boolean, default=False)
    criado_em = Column(DateTime, default=datetime.utcnow)


Base.metadata.create_all(bind=engine)


# ── Migrações automáticas ─────────────────────────────────────────────────────
# Para produção com banco relacional, use Alembic.
# Esta função garante que colunas adicionadas em versões novas existam em DBs
# existentes, com transação atômica e rollback em caso de erro.
def apply_migrations(db_engine):
    inspector = inspect(db_engine)
    conn = db_engine.connect()
    transaction = conn.begin()
    try:
        if "usuarios" in inspector.get_table_names():
            cols_u = [c["name"] for c in inspector.get_columns("usuarios")]
            for col, ddl in {
                "plano": "ALTER TABLE usuarios ADD COLUMN plano VARCHAR DEFAULT 'free'",
                "stripe_id": "ALTER TABLE usuarios ADD COLUMN stripe_id VARCHAR NULL",
            }.items():
                if col not in cols_u:
                    print(f"[migration] usuarios.{col}")
                    conn.execute(text(ddl))

        if "kits" in inspector.get_table_names():
            cols_k = [c["name"] for c in inspector.get_columns("kits")]
            for col, ddl in {
                "usuario_email": "ALTER TABLE kits ADD COLUMN usuario_email VARCHAR NULL",
                "share_id": "ALTER TABLE kits ADD COLUMN share_id VARCHAR NULL",
                "publico": "ALTER TABLE kits ADD COLUMN publico BOOLEAN DEFAULT 0",
            }.items():
                if col not in cols_k:
                    print(f"[migration] kits.{col}")
                    conn.execute(text(ddl))

        transaction.commit()
    except Exception as e:
        print(f"[migration] erro — rollback: {e}")
        transaction.rollback()
    finally:
        conn.close()


@app.on_event("startup")
async def startup_event():
    apply_migrations(engine)


# ── Schemas Pydantic ──────────────────────────────────────────────────────────
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


# ── Lógica de negócio ─────────────────────────────────────────────────────────
def detectar_preset(emocao: str) -> dict:
    """
    Detecção por pontuação: conta quantas keywords de cada preset aparecem no
    texto e retorna o de maior pontuação. Em empate, o primeiro do dicionário
    vence (ordem estável no Python 3.7+). Inicializa com -1 para que presets
    com pontuação 0 também sejam elegíveis como fallback.
    """
    lower = emocao.lower()
    melhor_preset = None
    melhor_pontuacao = -1
    for preset_data in PRESETS.values():
        pontuacao = sum(1 for k in preset_data["keywords"] if k in lower)
        if pontuacao > melhor_pontuacao:
            melhor_pontuacao = pontuacao
            melhor_preset = preset_data
    return melhor_preset or PRESETS.get("poder", list(PRESETS.values())[0])


def montar_resultado(preset: dict, formato: str) -> dict:
    """
    Monta o payload completo enviado ao front-end.
    Usa .get() com defaults para tolerar presets incompletos sem KeyError.

    ATENÇÃO: os presets usam sub-dicionário 'audio' com chaves 'tipo',
    'descricao' e 'efeito' (presets_refactored.py). Se você ainda usa o
    formato antigo com 'audio_tipo'/'audio_desc'/'audio_efeito' no nível
    raiz, troque as chaves abaixo de volta para preset.get("audio_tipo").
    """
    audio = preset.get("audio", {})
    return {
        "nome": preset.get("nome", "Desconhecido"),
        "emocao": preset.get("emocao", "N/A"),
        "paleta": preset.get("paleta", []),
        "glow": preset.get("glow", "#FFFFFF"),
        "bg": preset.get("bg", ["#000000", "#000000", "#000000"]),
        "tipografia": preset.get("tipografia", "Arial"),
        "ritmo": preset.get("ritmo", "0 cortes/min"),
        "bpm": preset.get("bpm", 0),
        "iluminacao": preset.get("iluminacao", "Luz ambiente"),
        "enquadramento": preset.get("enquadramento", "Plano médio"),
        "cenas": preset.get("cenas", []),
        "formato": formato,
        "audio": {
            # Suporte aos dois formatos de presets (antigo flat e novo nested)
            "tipo": audio.get("tipo") or preset.get("audio_tipo", "ambient"),
            "descricao": audio.get("descricao") or preset.get("audio_desc", "N/A"),
            "efeito": audio.get("efeito") or preset.get("audio_efeito", "N/A"),
        },
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.get("/", summary="Status da API")
def root():
    return {
        "status": "Neurocinematica API rodando",
        "version": app.version,
        "total_presets": len(PRESETS),
    }


@app.options("/{rest_of_path:path}", include_in_schema=False)
async def preflight(rest_of_path: str):
    return Response(status_code=200)


@app.get("/presets", summary="Listar todos os presets")
def listar_presets():
    """Retorna id, nome, emoção e glow de cada preset — útil para seletor manual no front-end."""
    return [
        {"id": pid, "nome": p["nome"], "emocao": p["emocao"], "glow": p["glow"]}
        for pid, p in PRESETS.items()
    ]


@app.post("/cadastro", summary="Cadastrar novo usuário")
def cadastro(req: CadastroRequest, db: Session = Depends(get_db)):
    if db.query(Usuario).filter(Usuario.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    usuario = Usuario(
        nome=req.nome,
        email=req.email,
        senha_hash=hash_senha(req.senha),
        plano="free",
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    token = criar_token({"sub": usuario.email, "nome": usuario.nome})
    return {"token": token, "nome": usuario.nome, "email": usuario.email, "plano": usuario.plano}


@app.post("/login", summary="Login de usuário")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.email == req.email).first()
    if not usuario or not verificar_senha(req.senha, usuario.senha_hash):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    token = criar_token({"sub": usuario.email, "nome": usuario.nome})
    return {
        "token": token,
        "nome": usuario.nome,
        "email": usuario.email,
        "plano": usuario.plano or "free",
    }


@app.post("/gerar-kit", summary="Gerar e salvar um Kit de Intenção Visual")
def gerar_kit(req: EmocaoRequest, email: str = Depends(verificar_token), db: Session = Depends(get_db)):
    preset = detectar_preset(req.emocao)
    resultado = montar_resultado(preset, req.formato)
    kit = KitSalvo(
        usuario_email=email,
        emocao=req.emocao,
        formato=req.formato,
        nome_estilo=preset.get("nome", "Desconhecido"),
        resultado_json=json.dumps(resultado),
    )
    db.add(kit)
    db.commit()
    db.refresh(kit)
    return {**resultado, "kit_id": kit.id}


@app.get("/meus-kits", summary="Listar kits do usuário")
def meus_kits(email: str = Depends(verificar_token), db: Session = Depends(get_db)):
    kits = (
        db.query(KitSalvo)
        .filter(KitSalvo.usuario_email == email)
        .order_by(KitSalvo.criado_em.desc())
        .limit(20)
        .all()
    )
    return [
        {
            "id": k.id,
            "emocao": k.emocao,
            "estilo": k.nome_estilo,
            "formato": k.formato,
            "share_id": k.share_id,
            "publico": k.publico,
            "criado_em": k.criado_em.isoformat() if k.criado_em else None,
        }
        for k in kits
    ]


@app.post("/compartilhar/{kit_id}", summary="Compartilhar um kit")
def compartilhar_kit(kit_id: int, email: str = Depends(verificar_token), db: Session = Depends(get_db)):
    kit = db.query(KitSalvo).filter(
        KitSalvo.id == kit_id, KitSalvo.usuario_email == email
    ).first()
    if not kit:
        raise HTTPException(status_code=404, detail="Kit não encontrado ou não pertence ao usuário")
    if not kit.share_id:
        kit.share_id = str(uuid.uuid4())[:8]
    kit.publico = True
    db.commit()
    db.refresh(kit)
    frontend_url = os.environ.get("FRONTEND_URL", "https://intencao-visual.vercel.app")
    return {"share_id": kit.share_id, "url": f"{frontend_url}/kit/{kit.share_id}"}


@app.get("/kit/{share_id}", summary="Ver kit público")
def ver_kit_publico(share_id: str, db: Session = Depends(get_db)):
    kit = db.query(KitSalvo).filter(
        KitSalvo.share_id == share_id, KitSalvo.publico == True
    ).first()
    if not kit:
        raise HTTPException(status_code=404, detail="Kit público não encontrado")
    resultado = json.loads(kit.resultado_json)
    return {
        "emocao_input": kit.emocao,
        "formato": kit.formato,
        "estilo": kit.nome_estilo,
        "criado_em": kit.criado_em.isoformat() if kit.criado_em else None,
        **resultado,
    }


@app.get("/meu-plano", summary="Plano de assinatura do usuário")
def meu_plano(email: str = Depends(verificar_token), db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.email == email).first()
    return {"plano": (usuario.plano or "free") if usuario else "free"}


@app.post("/criar-assinatura", summary="Criar checkout Stripe para plano Pro")
def criar_assinatura(email: str = Depends(verificar_token), db: Session = Depends(get_db)):
    try:
        usuario = db.query(Usuario).filter(Usuario.email == email).first()
        if not usuario:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")

        # Reutiliza o customer Stripe existente em vez de criar um novo a cada chamada.
        if usuario.stripe_id:
            customer_id = usuario.stripe_id
        else:
            cliente = stripe.Customer.create(email=email)
            customer_id = cliente.id
            usuario.stripe_id = customer_id
            db.commit()
            db.refresh(usuario)

        frontend_url = os.environ.get("FRONTEND_URL", "https://intencao-visual.vercel.app")
        sessao = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": "usd",
                        "product_data": {"name": "Kit de Intenção Visual Pro"},
                        "unit_amount": 900,
                        "recurring": {"interval": "month"},
                    },
                    "quantity": 1,
                }
            ],
            mode="subscription",
            success_url=f"{frontend_url}?plano=pro",
            cancel_url=frontend_url,
        )
        return {"url": sessao.url}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Erro no Stripe: {e.user_message}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")