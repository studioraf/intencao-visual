"""
Neurocinematica — Backend FastAPI
Otimizações aplicadas (Plano de Guerra Dias 2, 3 e 5):
  ✓ Redis para cache de presets com TTL de 30 dias
  ✓ Deduplicação: mesma emoção+formato = 1 chamada de IA
  ✓ Cache-Control headers para Cloudflare (s-maxage + stale-while-revalidate)
  ✓ ETag para invalidação inteligente
  ✓ Modelo de planos: Free / Creator / Studio / Pro / Enterprise
  ✓ Rate limiting por plano
  ✓ Migração automática de schema
"""

from fastapi import FastAPI, HTTPException, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, text, inspect
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import json
import stripe
import os
import uuid
import hashlib
import redis as redis_lib

from auth import hash_senha, verificar_senha, criar_token, verificar_token

# ─────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")
redis     = redis_lib.from_url(REDIS_URL, decode_responses=True)

CACHE_TTL_PRESET  = 60 * 60 * 24 * 30  # 30 dias — presets são estáveis
CACHE_TTL_KIT     = 60 * 60 * 24 * 7   # 7 dias — kits gerados
CACHE_TTL_MEUS    = 60 * 60             # 1h — lista pessoal

# ─────────────────────────────────────────────────────────────
# PLANOS DE ASSINATURA
# ─────────────────────────────────────────────────────────────

PLANOS = {
    "free": {
        "nome":          "Free",
        "preco_usd":     0,
        "kits_por_mes":  3,
        "formatos":      ["youtube", "instagram"],
        "ia_personalizada": False,
        "export_4k":     False,
        "api_access":    False,
        "white_label":   False,
        "marca_dagua":   True,
        "stripe_price":  None,
    },
    "creator": {
        "nome":          "Creator",
        "preco_usd":     9,
        "kits_por_mes":  20,
        "formatos":      ["youtube", "instagram", "filme", "clipe"],
        "ia_personalizada": False,
        "export_4k":     False,
        "api_access":    False,
        "white_label":   False,
        "marca_dagua":   False,
        "stripe_price":  os.environ.get("STRIPE_CREATOR_PRICE_ID"),
    },
    "studio": {
        "nome":          "Studio",
        "preco_usd":     29,
        "kits_por_mes":  -1,   # ilimitado
        "formatos":      ["youtube", "instagram", "filme", "clipe"],
        "ia_personalizada": True,
        "export_4k":     True,
        "api_access":    True,  # API básica
        "white_label":   False,
        "marca_dagua":   False,
        "stripe_price":  os.environ.get("STRIPE_STUDIO_PRICE_ID"),
    },
    "pro": {
        "nome":          "Pro",
        "preco_usd":     99,
        "kits_por_mes":  -1,
        "formatos":      ["youtube", "instagram", "filme", "clipe"],
        "ia_personalizada": True,
        "export_4k":     True,
        "api_access":    True,  # API completa
        "white_label":   True,
        "marca_dagua":   False,
        "stripe_price":  os.environ.get("STRIPE_PRO_PRICE_ID"),
    },
    "enterprise": {
        "nome":          "Enterprise",
        "preco_usd":     -1,   # custom
        "kits_por_mes":  -1,
        "formatos":      ["youtube", "instagram", "filme", "clipe"],
        "ia_personalizada": True,
        "export_4k":     True,
        "api_access":    True,  # API avançada + SLA
        "white_label":   True,
        "marca_dagua":   False,
        "stripe_price":  None,  # contrato direto
    },
}

def plano_permite(plano: str, acao: str, valor=None) -> bool:
    """Verifica se um plano permite uma ação específica."""
    p = PLANOS.get(plano, PLANOS["free"])
    if acao == "kit_mensal" and p["kits_por_mes"] != -1:
        return (valor or 0) < p["kits_por_mes"]
    if acao == "formato":
        return valor in p.get("formatos", [])
    if acao == "api":
        return p["api_access"]
    if acao == "white_label":
        return p["white_label"]
    return True

# ─────────────────────────────────────────────────────────────
# PRESETS
# ─────────────────────────────────────────────────────────────

PRESETS = {
    "blade": {
        "keywords":    ["blade", "cyberpunk", "neon", "futurista", "tech", "matrix"],
        "nome":        "Cyberpunk",
        "emocao":      "Tensão · Adrenalina · Desorientação",
        "paleta":      ["#0a0a0f", "#00fff7", "#7c3aed", "#ff006e"],
        "tipografia":  "Rajdhani Bold",
        "ritmo":       "32 cortes/min",
        "bpm":         140,
        "iluminacao":  "Neon lateral · Chuva de luz",
        "enquadramento": "Close extremo",
        "audio_tipo":  "cyberpunk",
        "audio_desc":  "Sintetizador metálico + glitch eletrônico",
        "audio_efeito":"Gera tensão e adrenalina no espectador",
    },
    "poder": {
        "keywords":    ["poder", "urgência", "força", "luxo", "cartier", "sdm", "rap", "trap", "épico"],
        "nome":        "Luxo Cinematográfico",
        "emocao":      "Poder · Status · Inevitabilidade",
        "paleta":      ["#0d0500", "#8B3A00", "#C8860A", "#F5D78E"],
        "tipografia":  "Montserrat Black",
        "ritmo":       "22 cortes/min",
        "bpm":         95,
        "iluminacao":  "Tungstênio quente · Sombra épica",
        "enquadramento": "Ângulo baixo",
        "audio_tipo":  "trap",
        "audio_desc":  "Kick 808 grave + hi-hat seco + sub bass",
        "audio_efeito":"Ativa sensação de poder e status no cérebro",
    },
    "romance": {
        "keywords":    ["romance", "amor", "suave", "delicado", "intimidade", "saudade"],
        "nome":        "Romance Etéreo",
        "emocao":      "Nostalgia · Vulnerabilidade · Conexão",
        "paleta":      ["#1a0010", "#8B0050", "#FF6B9D", "#FFD6E8"],
        "tipografia":  "Cormorant Garamond",
        "ritmo":       "12 cortes/min",
        "bpm":         72,
        "iluminacao":  "Luz difusa · Bokeh profundo",
        "enquadramento": "Plano aberto",
        "audio_tipo":  "romance",
        "audio_desc":  "Pad suave + melodia de piano + reverb longo",
        "audio_efeito":"Ativa oxitocina — gera empatia e emoção",
    },
    "misterio": {
        "keywords":    ["mistério", "sombrio", "dark", "noir", "suspense", "thriller", "crime"],
        "nome":        "Noir Contemporâneo",
        "emocao":      "Ansiedade · Fascínio · Perigo",
        "paleta":      ["#000000", "#0a0a0a", "#1a1a2e", "#4a4a6a"],
        "tipografia":  "Playfair Display",
        "ritmo":       "18 cortes/min",
        "bpm":         85,
        "iluminacao":  "Contraluz duro · Sombra absoluta",
        "enquadramento": "Plano médio",
        "audio_tipo":  "noir",
        "audio_desc":  "Baixo profundo + silêncio dramático",
        "audio_efeito":"Ativa amígdala — gera antecipação e tensão",
    },
    "epico": {
        "keywords":    ["épico", "guerra", "batalha", "herói", "dune", "grandioso", "histórico"],
        "nome":        "Épico Cinematográfico",
        "emocao":      "Grandiosidade · Sacrifício · Destino",
        "paleta":      ["#0a0500", "#3d1a00", "#8B4513", "#DAA520"],
        "tipografia":  "Cinzel Bold",
        "ritmo":       "18 cortes/min",
        "bpm":         88,
        "iluminacao":  "Luz épica lateral · Névoa dramática",
        "enquadramento": "Grande angular",
        "audio_tipo":  "noir",
        "audio_desc":  "Orquestra + percussão épica",
        "audio_efeito":"Ativa senso de grandiosidade",
    },
    "minimalista": {
        "keywords":    ["minimalista", "clean", "simples", "moderno", "elegante", "corporativo"],
        "nome":        "Minimalismo Moderno",
        "emocao":      "Clareza · Confiança · Sofisticação",
        "paleta":      ["#ffffff", "#f5f5f5", "#333333", "#000000"],
        "tipografia":  "Helvetica Neue Light",
        "ritmo":       "15 cortes/min",
        "bpm":         80,
        "iluminacao":  "Luz difusa branca · Alto key",
        "enquadramento": "Plano médio",
        "audio_tipo":  "romance",
        "audio_desc":  "Piano minimalista + silêncio",
        "audio_efeito":"Transmite clareza e foco",
    },
}

# ─────────────────────────────────────────────────────────────
# DATABASE
# ─────────────────────────────────────────────────────────────

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./kits.db")

# Supabase usa postgres:// que precisa virar postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
engine       = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine)
Base         = declarative_base()


class Usuario(Base):
    __tablename__ = "usuarios"
    id           = Column(Integer, primary_key=True, index=True)
    nome         = Column(String)
    email        = Column(String, unique=True, index=True)
    senha_hash   = Column(String)
    plano        = Column(String, default="free")
    stripe_id    = Column(String, nullable=True)
    kits_mes_atual = Column(Integer, default=0)
    criado_em    = Column(DateTime, default=datetime.utcnow)


class KitSalvo(Base):
    __tablename__ = "kits"
    id            = Column(Integer, primary_key=True, index=True)
    usuario_email = Column(String)
    emocao        = Column(String)
    formato       = Column(String)
    nome_estilo   = Column(String)
    resultado_json = Column(String)
    share_id      = Column(String, unique=True, index=True, nullable=True)
    publico       = Column(Boolean, default=False)
    criado_em     = Column(DateTime, default=datetime.utcnow)


Base.metadata.create_all(bind=engine)

# Migração automática de colunas faltantes
with engine.connect() as conn:
    inspector = inspect(engine)
    colunas_usuarios = [c["name"] for c in inspector.get_columns("usuarios")]
    colunas_kits     = [c["name"] for c in inspector.get_columns("kits")]

    for col, ddl in [
        ("plano",          "ALTER TABLE usuarios ADD COLUMN plano VARCHAR DEFAULT 'free'"),
        ("stripe_id",      "ALTER TABLE usuarios ADD COLUMN stripe_id VARCHAR"),
        ("kits_mes_atual", "ALTER TABLE usuarios ADD COLUMN kits_mes_atual INTEGER DEFAULT 0"),
    ]:
        if col not in colunas_usuarios:
            conn.execute(text(ddl))

    for col, ddl in [
        ("usuario_email", "ALTER TABLE kits ADD COLUMN usuario_email VARCHAR"),
        ("share_id",      "ALTER TABLE kits ADD COLUMN share_id VARCHAR"),
        ("publico",       "ALTER TABLE kits ADD COLUMN publico BOOLEAN DEFAULT 0"),
    ]:
        if col not in colunas_kits:
            conn.execute(text(ddl))

    conn.commit()

# ─────────────────────────────────────────────────────────────
# APP
# ─────────────────────────────────────────────────────────────

app = FastAPI(title="Neurocinematica API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["ETag", "Cache-Control"],
)

# ─────────────────────────────────────────────────────────────
# HELPERS DE CACHE
# ─────────────────────────────────────────────────────────────

def cache_key_preset(emocao: str, formato: str) -> str:
    """Chave determinística para cache de preset — compartilhada entre usuários."""
    h = hashlib.md5(f"{emocao.lower().strip()}:{formato}".encode()).hexdigest()[:12]
    return f"preset:v1:{h}"


def cache_key_meus_kits(email: str) -> str:
    return f"meus_kits:v1:{email}"


def get_cached(key: str):
    try:
        val = redis.get(key)
        return json.loads(val) if val else None
    except Exception:
        return None


def set_cached(key: str, value, ttl: int):
    try:
        redis.setex(key, ttl, json.dumps(value))
    except Exception:
        pass  # Redis down não derruba a API


def invalidate(key: str):
    try:
        redis.delete(key)
    except Exception:
        pass


def etag_from(data: dict) -> str:
    return hashlib.md5(json.dumps(data, sort_keys=True).encode()).hexdigest()[:16]


def add_cache_headers(response: Response, data: dict, s_maxage: int = 86400):
    """
    Adiciona headers que o Cloudflare usa para fazer cache na edge.
    s-maxage = tempo que a CDN guarda
    stale-while-revalidate = serve stale enquanto busca novo em background
    """
    etag = etag_from(data)
    response.headers["Cache-Control"] = (
        f"public, s-maxage={s_maxage}, stale-while-revalidate=3600"
    )
    response.headers["ETag"]   = f'"{etag}"'
    response.headers["Vary"]   = "Accept-Encoding"


def set_private_cache(response: Response):
    response.headers["Cache-Control"] = "private, no-store"

# ─────────────────────────────────────────────────────────────
# DETECÇÃO DE PRESET
# ─────────────────────────────────────────────────────────────

def detectar_preset(emocao: str) -> dict:
    lower = emocao.lower()
    for preset in PRESETS.values():
        if any(k in lower for k in preset["keywords"]):
            return preset
    return PRESETS["poder"]

# ─────────────────────────────────────────────────────────────
# MODELOS DE REQUEST
# ─────────────────────────────────────────────────────────────

class EmocaoRequest(BaseModel):
    emocao:  str
    formato: str

class CadastroRequest(BaseModel):
    nome:  str
    email: str
    senha: str

class LoginRequest(BaseModel):
    email: str
    senha: str

class AssinarRequest(BaseModel):
    plano: str  # creator | studio | pro

# ─────────────────────────────────────────────────────────────
# ROTAS
# ─────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "Neurocinematica API rodando", "version": "2.0.0"}


@app.get("/presets", response_model=None)
def listar_presets(request: Request, response: Response):
    """
    Lista todos os presets disponíveis.
    100% cacheável na Cloudflare CDN — não muda sem deploy.
    """
    cache_k = "presets:v1:all"
    cached  = get_cached(cache_k)
    if cached:
        add_cache_headers(response, cached, s_maxage=86400)
        return cached

    resultado = {
        k: {
            "nome":        p["nome"],
            "emocao":      p["emocao"],
            "paleta":      p["paleta"],
            "tipografia":  p["tipografia"],
            "ritmo":       p["ritmo"],
            "bpm":         p["bpm"],
            "iluminacao":  p["iluminacao"],
            "enquadramento": p["enquadramento"],
        }
        for k, p in PRESETS.items()
    }
    set_cached(cache_k, resultado, CACHE_TTL_PRESET)
    add_cache_headers(response, resultado, s_maxage=86400)
    return resultado


@app.get("/planos")
def listar_planos(response: Response):
    """
    Lista todos os planos com preços e features.
    Estático — cache agressivo na CDN.
    """
    cache_k = "planos:v1:all"
    cached  = get_cached(cache_k)
    if cached:
        add_cache_headers(response, cached, s_maxage=86400)
        return cached

    resultado = {
        k: {
            "nome":          p["nome"],
            "preco_usd":     p["preco_usd"],
            "kits_por_mes":  p["kits_por_mes"],
            "formatos":      p["formatos"],
            "ia_personalizada": p["ia_personalizada"],
            "export_4k":     p["export_4k"],
            "api_access":    p["api_access"],
            "white_label":   p["white_label"],
            "marca_dagua":   p["marca_dagua"],
        }
        for k, p in PLANOS.items()
    }
    set_cached(cache_k, resultado, CACHE_TTL_PRESET)
    add_cache_headers(response, resultado, s_maxage=86400)
    return resultado


@app.post("/cadastro")
def cadastro(req: CadastroRequest, response: Response):
    db     = SessionLocal()
    existe = db.query(Usuario).filter(Usuario.email == req.email).first()
    if existe:
        db.close()
        raise HTTPException(status_code=400, detail="Email já cadastrado")

    usuario = Usuario(
        nome=req.nome,
        email=req.email,
        senha_hash=hash_senha(req.senha),
        plano="free",
    )
    db.add(usuario)
    db.commit()
    db.close()

    token = criar_token({"sub": req.email, "nome": req.nome})
    set_private_cache(response)
    return {"token": token, "nome": req.nome, "email": req.email, "plano": "free"}


@app.post("/login")
def login(req: LoginRequest, response: Response):
    db      = SessionLocal()
    usuario = db.query(Usuario).filter(Usuario.email == req.email).first()
    db.close()
    if not usuario or not verificar_senha(req.senha, usuario.senha_hash):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")

    token = criar_token({"sub": usuario.email, "nome": usuario.nome})
    set_private_cache(response)
    return {
        "token": token,
        "nome":  usuario.nome,
        "email": usuario.email,
        "plano": usuario.plano or "free",
    }


@app.post("/gerar-kit")
def gerar_kit(req: EmocaoRequest, response: Response, email: str = Depends(verificar_token)):
    """
    Gera um kit visual.

    Estratégia de cache (Dia 3 — IA Estratégica):
    1. Verifica Redis com chave determinística (emocao+formato)
    2. Se hit: retorna imediatamente, sem tocar banco ou IA
    3. Se miss: detecta preset, salva no banco E no Redis
    4. Usuários diferentes com mesma emoção compartilham o cache
    """
    # 1. Verifica plano do usuário
    db      = SessionLocal()
    usuario = db.query(Usuario).filter(Usuario.email == email).first()
    if not usuario:
        db.close()
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    plano    = usuario.plano or "free"
    kits_mes = usuario.kits_mes_atual or 0

    if not plano_permite(plano, "kit_mensal", kits_mes):
        db.close()
        raise HTTPException(
            status_code=403,
            detail=f"Limite de kits do plano {plano} atingido. Faça upgrade para continuar."
        )

    if not plano_permite(plano, "formato", req.formato):
        db.close()
        raise HTTPException(
            status_code=403,
            detail=f"Formato '{req.formato}' não disponível no plano {plano}."
        )

    # 2. Cache Redis — chave compartilhada entre usuários
    cache_k = cache_key_preset(req.emocao, req.formato)
    cached  = get_cached(cache_k)

    if cached:
        # Hit de cache — salva referência no banco sem re-processar
        kit = KitSalvo(
            usuario_email=email,
            emocao=req.emocao,
            formato=req.formato,
            nome_estilo=cached.get("nome", ""),
            resultado_json=json.dumps(cached),
        )
        db.add(kit)
        usuario.kits_mes_atual = kits_mes + 1
        db.commit()
        kit_id = kit.id
        db.close()

        invalidate(cache_key_meus_kits(email))
        set_private_cache(response)
        return {**cached, "kit_id": kit_id, "from_cache": True}

    # 3. Miss — detecta preset e gera resultado
    preset    = detectar_preset(req.emocao)
    resultado = {
        "nome":         preset["nome"],
        "emocao":       preset["emocao"],
        "paleta":       preset["paleta"],
        "tipografia":   preset["tipografia"],
        "ritmo":        preset["ritmo"],
        "bpm":          preset["bpm"],
        "iluminacao":   preset["iluminacao"],
        "enquadramento": preset["enquadramento"],
        "formato":      req.formato,
        "audio": {
            "tipo":      preset["audio_tipo"],
            "descricao": preset["audio_desc"],
            "efeito":    preset["audio_efeito"],
        },
    }

    # Adiciona marca d'água para plano free
    if PLANOS[plano]["marca_dagua"]:
        resultado["marca_dagua"] = True

    # 4. Salva no banco
    kit = KitSalvo(
        usuario_email=email,
        emocao=req.emocao,
        formato=req.formato,
        nome_estilo=preset["nome"],
        resultado_json=json.dumps(resultado),
    )
    db.add(kit)
    usuario.kits_mes_atual = kits_mes + 1
    db.commit()
    db.refresh(kit)
    kit_id = kit.id
    db.close()

    # 5. Guarda no Redis para os próximos usuários com a mesma emoção+formato
    set_cached(cache_k, resultado, CACHE_TTL_PRESET)
    invalidate(cache_key_meus_kits(email))

    set_private_cache(response)
    return {**resultado, "kit_id": kit_id, "from_cache": False}


@app.get("/meus-kits")
def meus_kits(response: Response, email: str = Depends(verificar_token)):
    """Lista kits do usuário. Cacheado por 1h — invalida quando novo kit é gerado."""
    cache_k = cache_key_meus_kits(email)
    cached  = get_cached(cache_k)
    if cached:
        set_private_cache(response)
        return cached

    db   = SessionLocal()
    kits = db.query(KitSalvo).filter(
        KitSalvo.usuario_email == email
    ).order_by(KitSalvo.criado_em.desc()).limit(20).all()
    db.close()

    resultado = [
        {
            "id":         k.id,
            "emocao":     k.emocao,
            "estilo":     k.nome_estilo,
            "formato":    k.formato,
            "share_id":   k.share_id,
            "publico":    k.publico,
            "criado_em":  k.criado_em.isoformat() if k.criado_em else None,
        }
        for k in kits
    ]
    set_cached(cache_k, resultado, CACHE_TTL_MEUS)
    set_private_cache(response)
    return resultado


@app.post("/compartilhar/{kit_id}")
def compartilhar_kit(kit_id: int, response: Response, email: str = Depends(verificar_token)):
    db  = SessionLocal()
    kit = db.query(KitSalvo).filter(
        KitSalvo.id == kit_id, KitSalvo.usuario_email == email
    ).first()
    if not kit:
        db.close()
        raise HTTPException(status_code=404, detail="Kit não encontrado")

    if not kit.share_id:
        kit.share_id = str(uuid.uuid4())[:8]
    kit.publico = True
    db.commit()
    share_id = kit.share_id
    db.close()

    # Cache público do kit compartilhado (cacheável na CDN)
    cache_k = f"kit_publico:v1:{share_id}"
    invalidate(cache_k)  # força refresh

    set_private_cache(response)
    return {
        "share_id": share_id,
        "url":      f"https://neurocinematica.vercel.app/kit/{share_id}",
    }


@app.get("/kit/{share_id}")
def ver_kit_publico(share_id: str, request: Request, response: Response):
    """
    Kit público — cacheável na CDN com ETag.
    Cloudflare serve direto sem chegar no backend após primeiro acesso.
    """
    cache_k = f"kit_publico:v1:{share_id}"
    cached  = get_cached(cache_k)
    if cached:
        # Verifica ETag para 304 Not Modified
        etag = f'"{etag_from(cached)}"'
        if request.headers.get("If-None-Match") == etag:
            return Response(status_code=304, headers={"ETag": etag})
        add_cache_headers(response, cached, s_maxage=3600)
        return cached

    db  = SessionLocal()
    kit = db.query(KitSalvo).filter(
        KitSalvo.share_id == share_id, KitSalvo.publico == True
    ).first()
    db.close()
    if not kit:
        raise HTTPException(status_code=404, detail="Kit não encontrado ou não compartilhado")

    resultado_db = json.loads(kit.resultado_json)
    resultado = {
        "emocao_input": kit.emocao,
        "formato":      kit.formato,
        "estilo":       kit.nome_estilo,
        "criado_em":    kit.criado_em.isoformat() if kit.criado_em else None,
        **resultado_db,
    }

    set_cached(cache_k, resultado, CACHE_TTL_KIT)
    add_cache_headers(response, resultado, s_maxage=3600)
    return resultado


@app.get("/meu-plano")
def meu_plano(response: Response, email: str = Depends(verificar_token)):
    db      = SessionLocal()
    usuario = db.query(Usuario).filter(Usuario.email == email).first()
    db.close()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    plano = usuario.plano or "free"
    info  = PLANOS.get(plano, PLANOS["free"])
    set_private_cache(response)
    return {
        "plano":         plano,
        "nome":          info["nome"],
        "kits_usados":   usuario.kits_mes_atual or 0,
        "kits_limite":   info["kits_por_mes"],
        "features":      {
            "ia_personalizada": info["ia_personalizada"],
            "export_4k":     info["export_4k"],
            "api_access":    info["api_access"],
            "white_label":   info["white_label"],
            "marca_dagua":   info["marca_dagua"],
        },
    }


@app.post("/assinar/{plano}")
def criar_assinatura(plano: str, response: Response, email: str = Depends(verificar_token)):
    """Cria sessão de checkout no Stripe para upgrade de plano."""
    if plano not in PLANOS:
        raise HTTPException(status_code=400, detail="Plano inválido")

    info = PLANOS[plano]
    if not info["stripe_price"]:
        raise HTTPException(
            status_code=400,
            detail="Para o plano Enterprise, entre em contato: enterprise@neurocinematica.app"
        )

    try:
        db      = SessionLocal()
        usuario = db.query(Usuario).filter(Usuario.email == email).first()
        db.close()

        # Cria ou recupera customer no Stripe
        if usuario and usuario.stripe_id:
            customer_id = usuario.stripe_id
        else:
            cliente     = stripe.Customer.create(email=email)
            customer_id = cliente.id
            if usuario:
                db2 = SessionLocal()
                u2  = db2.query(Usuario).filter(Usuario.email == email).first()
                if u2:
                    u2.stripe_id = customer_id
                    db2.commit()
                db2.close()

        sessao = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{"price": info["stripe_price"], "quantity": 1}],
            mode="subscription",
            success_url=f"https://neurocinematica.vercel.app?plano={plano}&sucesso=1",
            cancel_url="https://neurocinematica.vercel.app/planos",
            metadata={"email": email, "plano": plano},
        )
        set_private_cache(response)
        return {"url": sessao.url, "plano": plano}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/webhook/stripe")
async def stripe_webhook(request: Request, response: Response):
    """
    Webhook do Stripe — atualiza plano do usuário após pagamento confirmado.
    Não requer autenticação JWT.
    """
    payload    = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    secret     = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, secret)
    except Exception:
        raise HTTPException(status_code=400, detail="Webhook inválido")

    if event["type"] == "checkout.session.completed":
        session  = event["data"]["object"]
        email_wh = session["metadata"].get("email")
        plano_wh = session["metadata"].get("plano")

        if email_wh and plano_wh:
            db = SessionLocal()
            u  = db.query(Usuario).filter(Usuario.email == email_wh).first()
            if u:
                u.plano            = plano_wh
                u.kits_mes_atual   = 0  # reset no upgrade
                db.commit()
            db.close()
            # Invalida caches do usuário
            invalidate(cache_key_meus_kits(email_wh))

    return {"received": True}


@app.post("/admin/reset-kits-mensais")
def reset_kits_mensais(response: Response, email: str = Depends(verificar_token)):
    """
    Reset do contador mensal.
    Em produção: chamar via cron no dia 1 de cada mês (Railway Cron).
    """
    db = SessionLocal()
    db.execute(text("UPDATE usuarios SET kits_mes_atual = 0"))
    db.commit()
    db.close()
    set_private_cache(response)
    return {"reset": True, "data": datetime.utcnow().isoformat()}