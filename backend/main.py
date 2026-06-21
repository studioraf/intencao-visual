from fastapi import FastAPI, HTTPException, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Float, text, inspect, func
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
LIMITE_FREE_DIARIO = int(os.environ.get("LIMITE_FREE_DIARIO", "5"))

app = FastAPI(title="Neurocinematica API", version="4.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção: restrinja ao domínio do frontend
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# ── Banco de Dados ────────────────────────────────────────────────────────────
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./kits.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Modelos ───────────────────────────────────────────────────────────────────
class Usuario(Base):
    __tablename__ = "usuarios"
    id              = Column(Integer, primary_key=True, index=True)
    nome            = Column(String)
    email           = Column(String, unique=True, index=True)
    senha_hash      = Column(String)
    plano           = Column(String, default="free")
    stripe_id       = Column(String, nullable=True)
    # Métricas (novas)
    total_kits      = Column(Integer, default=0)
    estilo_favorito = Column(String, nullable=True)
    # Tags de público — CSV ex: "músico,videomaker"
    publicos        = Column(String, nullable=True)
    criado_em       = Column(DateTime, default=datetime.utcnow)


class KitSalvo(Base):
    __tablename__ = "kits"
    id             = Column(Integer, primary_key=True, index=True)
    usuario_email  = Column(String, index=True)
    emocao         = Column(String)
    formato        = Column(String)
    nome_estilo    = Column(String)
    resultado_json = Column(String)
    share_id       = Column(String, unique=True, index=True, nullable=True)
    publico        = Column(Boolean, default=False)
    criado_em      = Column(DateTime, default=datetime.utcnow)


class FeedbackEmocional(Base):
    __tablename__ = "feedbacks"
    id             = Column(Integer, primary_key=True, index=True)
    kit_id         = Column(Integer)
    usuario_email  = Column(String)
    emocao_gerada  = Column(String)
    emocao_sentida = Column(String)
    intensidade    = Column(Float)
    preset_nome    = Column(String)
    formato        = Column(String)
    criado_em      = Column(DateTime, default=datetime.utcnow)


class FeedbackFracasso(Base):
    __tablename__ = "fracassos"
    id                 = Column(Integer, primary_key=True, index=True)
    usuario_email      = Column(String, index=True)
    texto_original     = Column(String)
    padroes_detectados = Column(String)
    score_impacto      = Column(Integer)
    em_zona_abandono   = Column(Boolean, default=False)
    preset_gerado      = Column(String, nullable=True)
    converteu          = Column(Boolean, default=False)
    criado_em          = Column(DateTime, default=datetime.utcnow)


Base.metadata.create_all(bind=engine)


# ── Migrações automáticas ─────────────────────────────────────────────────────
def apply_migrations(db_engine):
    inspector = inspect(db_engine)
    conn = db_engine.connect()
    transaction = conn.begin()
    try:
        tables = inspector.get_table_names()

        if "usuarios" in tables:
            cols = [c["name"] for c in inspector.get_columns("usuarios")]
            for col, ddl in {
                "plano":           "ALTER TABLE usuarios ADD COLUMN plano VARCHAR DEFAULT 'free'",
                "stripe_id":       "ALTER TABLE usuarios ADD COLUMN stripe_id VARCHAR NULL",
                "total_kits":      "ALTER TABLE usuarios ADD COLUMN total_kits INTEGER DEFAULT 0",
                "estilo_favorito": "ALTER TABLE usuarios ADD COLUMN estilo_favorito VARCHAR NULL",
                "publicos":        "ALTER TABLE usuarios ADD COLUMN publicos VARCHAR NULL",
            }.items():
                if col not in cols:
                    print(f"[migration] usuarios.{col}")
                    conn.execute(text(ddl))

        if "kits" in tables:
            cols = [c["name"] for c in inspector.get_columns("kits")]
            for col, ddl in {
                "usuario_email": "ALTER TABLE kits ADD COLUMN usuario_email VARCHAR NULL",
                "share_id":      "ALTER TABLE kits ADD COLUMN share_id VARCHAR NULL",
                "publico":       "ALTER TABLE kits ADD COLUMN publico BOOLEAN DEFAULT 0",
            }.items():
                if col not in cols:
                    print(f"[migration] kits.{col}")
                    conn.execute(text(ddl))

        # Garante tabela fracassos (caso DB antigo não tenha)
        if "fracassos" not in tables:
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
            print("[migration] tabela fracassos criada")

        transaction.commit()
    except Exception as e:
        print(f"[migration] erro — rollback: {e}")
        transaction.rollback()
    finally:
        conn.close()


@app.on_event("startup")
async def startup_event():
    apply_migrations(engine)


# ── Tags de público disponíveis ───────────────────────────────────────────────
PUBLICOS_DISPONIVEIS = [
    "músico", "videomaker", "podcaster", "marca", "agência",
    "fotógrafo", "influencer", "designer", "produtor", "streamer",
]

# Mapeamento preset_id → públicos sugeridos
MAPA_PUBLICOS = {
    "músico":     ["trap","poder","epico","romance","misterio","lofi","jazz","bossa_nova",
                   "folk_acustico","violao_voz","sertanejo_romantico","sertanejo_festa",
                   "pagode","forro","axe","samba","funk_br","boombap","drill","rnb_slow",
                   "reggaeton","house","techno","edm_festival","rock_classico","punk",
                   "metal","indie_alt","grunge","synthwave","vaporwave","retro80",
                   "gospel","kpop","anime","afrobeat","nostalgia_anos80"],
    "videomaker": ["blade","epico","misterio","scifi","drone","documentary","drama_historico",
                   "fantasia_epica","suspense_psicologico","terror_sobrenatural","horror",
                   "dark_academia","gulf_futurism","caligrafia_neon","abstract","ai_tech",
                   "sport","esportivo_radical","aventura","travel","vlog_diario"],
    "marca":      ["poder","minimalista","fashion","luxury_car","perfume","luxury_watch",
                   "luxury_lifestyle","beleza_skincare","moda_editorial","culinaria_gourmet",
                   "foodporn","unboxing_tech","wedding","casamento_classico","motivacional"],
    "influencer": ["kpop","rave","gaming","retro80","vaporwave","synthwave","nostalgia_anos80",
                   "vlog_diario","funk_br","carnaval","festa_junina","ano_novo","natal_aconchegante","axe"],
    "designer":   ["blade","abstract","caligrafia_neon","gulf_futurism","ai_tech",
                   "minimalista","moda_editorial","fashion","scifi"],
    "produtor":   ["trap","drill","boombap","rnb_slow","house","techno","edm_festival",
                   "synthwave","kpop","afrobeat"],
    "streamer":   ["gaming","rave","edm_festival","kpop","rock_classico","punk","metal",
                   "esportivo_radical","sport"],
    "fotógrafo":  ["drone","natureza","underwater","minimalista","documentary",
                   "dark_academia","romance","wedding","casamento_classico","beleza_skincare"],
    "podcaster":  ["documentary","motivacional","espiritual_zen","meditacao","gospel",
                   "jazz","misterio","suspense_psicologico","dark_academia"],
}


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

class FeedbackRequest(BaseModel):
    kit_id: int
    emocao_sentida: str
    intensidade: float

class AnaliseRequest(BaseModel):
    texto: str

class FracassoRequest(BaseModel):
    texto: str
    padroes: list
    score: int
    em_zona_abandono: bool
    converteu: bool = False
    preset_gerado: str = None

class PublicosRequest(BaseModel):
    publicos: list[str]


# ── Lógica de negócio ─────────────────────────────────────────────────────────
def detectar_preset(emocao: str) -> dict:
    """Detecção por pontuação — retorna o preset com mais keywords no texto."""
    lower = emocao.lower()
    melhor_preset, melhor_pontuacao = None, -1
    for preset_data in PRESETS.values():
        pontuacao = sum(1 for k in preset_data["keywords"] if k in lower)
        if pontuacao > melhor_pontuacao:
            melhor_pontuacao = pontuacao
            melhor_preset = preset_data
    return melhor_preset or PRESETS.get("poder", list(PRESETS.values())[0])


def montar_resultado(preset: dict, formato: str) -> dict:
    audio = preset.get("audio", {})
    return {
        "nome":          preset.get("nome", "Desconhecido"),
        "emocao":        preset.get("emocao", "N/A"),
        "paleta":        preset.get("paleta", []),
        "glow":          preset.get("glow", "#FFFFFF"),
        "bg":            preset.get("bg", ["#000000", "#000000", "#000000"]),
        "tipografia":    preset.get("tipografia", "Arial"),
        "ritmo":         preset.get("ritmo", "0 cortes/min"),
        "bpm":           preset.get("bpm", 0),
        "iluminacao":    preset.get("iluminacao", "Luz ambiente"),
        "enquadramento": preset.get("enquadramento", "Plano médio"),
        "cenas":         preset.get("cenas", []),
        "formato":       formato,
        "audio": {
            "tipo":      audio.get("tipo") or preset.get("audio_tipo", "ambient"),
            "descricao": audio.get("descricao") or preset.get("audio_desc", "N/A"),
            "efeito":    audio.get("efeito") or preset.get("audio_efeito", "N/A"),
        },
    }


def kits_hoje(email: str, db: Session) -> int:
    """Conta kits gerados pelo usuário no dia atual (UTC)."""
    hoje = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    return (
        db.query(func.count(KitSalvo.id))
        .filter(KitSalvo.usuario_email == email, KitSalvo.criado_em >= hoje)
        .scalar() or 0
    )


def atualizar_metricas(email: str, nome_estilo: str, db: Session):
    """Incrementa total_kits e recalcula estilo_favorito."""
    usuario = db.query(Usuario).filter(Usuario.email == email).first()
    if not usuario:
        return
    usuario.total_kits = (usuario.total_kits or 0) + 1
    top = (
        db.query(KitSalvo.nome_estilo, func.count(KitSalvo.id).label("qtd"))
        .filter(KitSalvo.usuario_email == email)
        .group_by(KitSalvo.nome_estilo)
        .order_by(func.count(KitSalvo.id).desc())
        .first()
    )
    if top:
        usuario.estilo_favorito = top.nome_estilo
    db.commit()


# ── Banco de Fracassos (espelho do TedioDetector frontend) ───────────────────
FRACASSOS_DB = {
    "genericidade": {
        "palavras": ["produto","serviço","qualidade","excelência","inovação","solução",
                     "empresa","equipe","cliente","resultado","profissional","especialista",
                     "melhor","único","especial","incrível","fantástico","maravilhoso",
                     "perfeito","ótimo"],
        "label": "Genericidade Mortal", "gravidade": "alta", "taxa_abandono": 0.78,
    },
    "narrativa_fraca": {
        "palavras": ["apresentamos","conheça","descubra nosso","venha conhecer",
                     "clique aqui","saiba mais","entre em contato","fale conosco",
                     "acesse nosso","visite nosso","siga nossas","curta nossa"],
        "label": "Chamada para Ação Morta", "gravidade": "alta", "taxa_abandono": 0.78,
    },
    "cliches_visuais": {
        "palavras": ["logo animado","intro com logo","fade in","fade out",
                     "texto centralizado","fundo branco com logo","stock footage",
                     "música motivacional"],
        "label": "Clichê Visual Saturado", "gravidade": "media", "taxa_abandono": 0.62,
    },
    "ritmo_tedio": {
        "palavras": ["fundo musical suave","trilha leve","narração em off",
                     "voz over","voice over","narração calma","plano estático",
                     "câmera parada","sem cortes","transição suave"],
        "label": "Ritmo de Tédio Biológico", "gravidade": "media", "taxa_abandono": 0.55,
    },
    "sem_tensao": {
        "palavras": ["feliz","sorrindo","alegre","positivo","ensolarado",
                     "belo dia","oportunidade incrível","história de sucesso",
                     "caso de sucesso","depoimento","testemunhal"],
        "label": "Ausência de Tensão Narrativa", "gravidade": "baixa", "taxa_abandono": 0.41,
    },
}

SINAIS_IMPACTO = [
    "medo","poder","desejo","raiva","luxo","perigo","segredo","proibido","urgente",
    "noir","trap","épico","sangue","fogo","guerra","morte","amor","ódio","traição",
    "vingança","ascensão","queda","neon","cyberpunk","sombrio","dark","glitch","caos",
]


def analisar_tedio(texto: str) -> dict:
    if not texto or len(texto) < 3:
        return {"score": 0, "alertas": [], "em_zona_abandono": False, "sinais_impacto": []}
    lower = texto.lower()
    alertas = []
    total_fracassos = 0
    for categoria, dados in FRACASSOS_DB.items():
        encontradas = [p for p in dados["palavras"] if p in lower]
        if encontradas:
            alertas.append({
                "categoria": categoria, "label": dados["label"],
                "gravidade": dados["gravidade"], "taxa_abandono": dados["taxa_abandono"],
                "palavras_encontradas": encontradas[:3],
            })
            total_fracassos += len(encontradas)
    sinais = [s for s in SINAIS_IMPACTO if s in lower]
    em_zona = len(texto) > 60 and len(sinais) == 0 and total_fracassos >= 2
    score = max(0, min(100, (len(sinais) * 15) - (total_fracassos * 8) + (10 if len(texto) > 20 else 0)))
    return {"score": score, "alertas": alertas, "em_zona_abandono": em_zona,
            "sinais_impacto": sinais, "total_fracassos": total_fracassos}


# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.get("/", summary="Status da API")
def root():
    return {"status": "Neurocinematica API rodando", "version": app.version, "total_presets": len(PRESETS)}


@app.options("/{rest_of_path:path}", include_in_schema=False)
async def preflight(rest_of_path: str):
    return Response(status_code=200)


# ── Marketplace ───────────────────────────────────────────────────────────────
@app.get("/explorar", summary="Marketplace — lista todos os presets com filtros")
def explorar_presets(publico: str | None = None, busca: str | None = None):
    """
    Lista todos os 82+ presets para a tela de exploração.
    - publico: filtra por tag (músico, videomaker, marca…)
    - busca: filtra por nome, emoção ou keyword
    """
    resultados = []
    for pid, p in PRESETS.items():
        if busca:
            lower = busca.lower()
            if not (lower in p["nome"].lower() or lower in p["emocao"].lower()
                    or any(lower in k for k in p["keywords"])):
                continue
        if publico:
            if pid not in MAPA_PUBLICOS.get(publico, []):
                continue
        resultados.append({
            "id":         pid,
            "nome":       p["nome"],
            "emocao":     p["emocao"],
            "paleta":     p["paleta"],
            "glow":       p["glow"],
            "bg":         p["bg"],
            "bpm":        p["bpm"],
            "ritmo":      p["ritmo"],
            "tipografia": p["tipografia"],
            "audio_tipo": p.get("audio", {}).get("tipo", ""),
            "keywords":   p["keywords"][:4],
        })
    return {"total": len(resultados), "publicos_disponiveis": PUBLICOS_DISPONIVEIS, "presets": resultados}


@app.get("/presets", summary="Listar todos os presets (id, nome, emoção, glow)")
def listar_presets():
    return [{"id": pid, "nome": p["nome"], "emocao": p["emocao"], "glow": p["glow"]}
            for pid, p in PRESETS.items()]


# ── Auth ──────────────────────────────────────────────────────────────────────
@app.post("/cadastro", summary="Cadastrar novo usuário")
def cadastro(req: CadastroRequest, db: Session = Depends(get_db)):
    if db.query(Usuario).filter(Usuario.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    usuario = Usuario(nome=req.nome, email=req.email, senha_hash=hash_senha(req.senha),
                      plano="free", total_kits=0)
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
    return {"token": token, "nome": usuario.nome, "email": usuario.email, "plano": usuario.plano or "free"}


# ── Geração de kit com limite free ────────────────────────────────────────────
@app.post("/gerar-kit", summary="Gerar e salvar um Kit de Intenção Visual")
def gerar_kit(req: EmocaoRequest, email: str = Depends(verificar_token), db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.email == email).first()
    plano = (usuario.plano or "free") if usuario else "free"

    if plano == "free":
        usados = kits_hoje(email, db)
        if usados >= LIMITE_FREE_DIARIO:
            raise HTTPException(status_code=429, detail={
                "erro":     "limite_atingido",
                "mensagem": f"Você atingiu o limite de {LIMITE_FREE_DIARIO} kits por dia no plano gratuito.",
                "limite":   LIMITE_FREE_DIARIO,
                "usados":   usados,
                "upgrade":  True,
            })

    preset    = detectar_preset(req.emocao)
    resultado = montar_resultado(preset, req.formato)

    kit = KitSalvo(usuario_email=email, emocao=req.emocao, formato=req.formato,
                   nome_estilo=preset.get("nome", "Desconhecido"),
                   resultado_json=json.dumps(resultado))
    db.add(kit)
    db.commit()
    db.refresh(kit)

    atualizar_metricas(email, preset.get("nome", ""), db)

    usados_agora = kits_hoje(email, db)
    limite_info = {
        "plano":       plano,
        "limite_dia":  LIMITE_FREE_DIARIO if plano == "free" else None,
        "usados_hoje": usados_agora if plano == "free" else None,
        "restantes":   max(0, LIMITE_FREE_DIARIO - usados_agora) if plano == "free" else None,
    }
    return {**resultado, "kit_id": kit.id, "limite": limite_info}


@app.get("/meus-kits", summary="Listar kits do usuário")
def meus_kits(email: str = Depends(verificar_token), db: Session = Depends(get_db)):
    kits = (db.query(KitSalvo).filter(KitSalvo.usuario_email == email)
            .order_by(KitSalvo.criado_em.desc()).limit(20).all())
    return [{"id": k.id, "emocao": k.emocao, "estilo": k.nome_estilo, "formato": k.formato,
             "share_id": k.share_id, "publico": k.publico,
             "criado_em": k.criado_em.isoformat() if k.criado_em else None}
            for k in kits]


@app.post("/compartilhar/{kit_id}", summary="Compartilhar um kit")
def compartilhar_kit(kit_id: int, email: str = Depends(verificar_token), db: Session = Depends(get_db)):
    kit = db.query(KitSalvo).filter(KitSalvo.id == kit_id, KitSalvo.usuario_email == email).first()
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
    kit = db.query(KitSalvo).filter(KitSalvo.share_id == share_id, KitSalvo.publico == True).first()
    if not kit:
        raise HTTPException(status_code=404, detail="Kit público não encontrado")
    resultado = json.loads(kit.resultado_json)
    return {"emocao_input": kit.emocao, "formato": kit.formato, "estilo": kit.nome_estilo,
            "criado_em": kit.criado_em.isoformat() if kit.criado_em else None, **resultado}


# ── Métricas do usuário ───────────────────────────────────────────────────────
@app.get("/minhas-metricas", summary="Métricas e estatísticas do usuário")
def minhas_metricas(email: str = Depends(verificar_token), db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.email == email).first()
    plano   = (usuario.plano or "free") if usuario else "free"

    por_formato = (db.query(KitSalvo.formato, func.count(KitSalvo.id).label("qtd"))
                   .filter(KitSalvo.usuario_email == email).group_by(KitSalvo.formato).all())

    top_estilos = (db.query(KitSalvo.nome_estilo, func.count(KitSalvo.id).label("qtd"))
                   .filter(KitSalvo.usuario_email == email).group_by(KitSalvo.nome_estilo)
                   .order_by(func.count(KitSalvo.id).desc()).limit(5).all())

    recentes = (db.query(KitSalvo.nome_estilo, KitSalvo.formato, KitSalvo.criado_em)
                .filter(KitSalvo.usuario_email == email)
                .order_by(KitSalvo.criado_em.desc()).limit(7).all())

    usados_hoje = kits_hoje(email, db)

    return {
        "total_kits":      usuario.total_kits or 0 if usuario else 0,
        "estilo_favorito": usuario.estilo_favorito if usuario else None,
        "publicos":        usuario.publicos.split(",") if usuario and usuario.publicos else [],
        "kits_hoje":       usados_hoje,
        "limite_dia":      LIMITE_FREE_DIARIO if plano == "free" else None,
        "restantes_hoje":  max(0, LIMITE_FREE_DIARIO - usados_hoje) if plano == "free" else None,
        "por_formato":     [{"formato": f, "qtd": q} for f, q in por_formato],
        "top_estilos":     [{"estilo": e, "qtd": q} for e, q in top_estilos],
        "recentes":        [{"estilo": r.nome_estilo, "formato": r.formato,
                             "criado_em": r.criado_em.isoformat()} for r in recentes],
    }


# ── Tags de público ───────────────────────────────────────────────────────────
@app.get("/publicos", summary="Lista os públicos disponíveis")
def listar_publicos():
    return {"publicos": PUBLICOS_DISPONIVEIS}


@app.post("/meus-publicos", summary="Salva os públicos selecionados")
def salvar_publicos(req: PublicosRequest, email: str = Depends(verificar_token), db: Session = Depends(get_db)):
    invalidos = [p for p in req.publicos if p not in PUBLICOS_DISPONIVEIS]
    if invalidos:
        raise HTTPException(status_code=400, detail=f"Públicos inválidos: {invalidos}")
    usuario = db.query(Usuario).filter(Usuario.email == email).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    usuario.publicos = ",".join(req.publicos)
    db.commit()
    return {"publicos": req.publicos, "mensagem": "Públicos atualizados com sucesso"}


@app.get("/meus-publicos", summary="Retorna os públicos selecionados")
def get_meus_publicos(email: str = Depends(verificar_token), db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.email == email).first()
    publicos = usuario.publicos.split(",") if usuario and usuario.publicos else []
    return {"publicos": publicos}


# ── Plano ─────────────────────────────────────────────────────────────────────
@app.get("/meu-plano", summary="Plano de assinatura do usuário")
def meu_plano(email: str = Depends(verificar_token), db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.email == email).first()
    return {"plano": (usuario.plano or "free") if usuario else "free"}


# ── Feedback emocional ────────────────────────────────────────────────────────
@app.post("/feedback", summary="Registrar feedback emocional do kit")
def registrar_feedback(req: FeedbackRequest, email: str = Depends(verificar_token), db: Session = Depends(get_db)):
    kit = db.query(KitSalvo).filter(KitSalvo.id == req.kit_id).first()
    if not kit:
        raise HTTPException(status_code=404, detail="Kit não encontrado")
    feedback = FeedbackEmocional(
        kit_id=req.kit_id, usuario_email=email, emocao_gerada=kit.emocao,
        emocao_sentida=req.emocao_sentida,
        intensidade=max(0.0, min(1.0, req.intensidade)),
        preset_nome=kit.nome_estilo, formato=kit.formato,
    )
    db.add(feedback)
    db.commit()
    acerto = req.emocao_sentida.lower() in kit.emocao.lower()
    return {"registrado": True,
            "precisao_emocional": "alta" if acerto else "divergente",
            "mensagem": "Obrigado! Seu feedback melhora a precisão neurocinemática do sistema."}


@app.get("/insights-emocionais", summary="DNA emocional do usuário")
def insights_emocionais(email: str = Depends(verificar_token), db: Session = Depends(get_db)):
    feedbacks = (db.query(FeedbackEmocional).filter(FeedbackEmocional.usuario_email == email)
                 .order_by(FeedbackEmocional.criado_em.desc()).limit(50).all())
    if not feedbacks:
        return {"mensagem": "Gere e avalie kits para ver seus padrões emocionais.", "total": 0}
    emocoes = {}
    intensidade_media = 0
    for f in feedbacks:
        emocoes[f.emocao_sentida] = emocoes.get(f.emocao_sentida, 0) + 1
        intensidade_media += f.intensidade
    intensidade_media /= len(feedbacks)
    emocao_dominante = max(emocoes, key=emocoes.get)
    return {
        "total_avaliacoes":     len(feedbacks),
        "emocao_dominante":     emocao_dominante,
        "intensidade_media":    round(intensidade_media, 2),
        "distribuicao_emocional": emocoes,
        "dna_marca": f"Sua marca ressoa principalmente com '{emocao_dominante}' a {round(intensidade_media*100)}% de intensidade.",
    }


# ── Algoritmo do Tédio ────────────────────────────────────────────────────────
@app.post("/analisar-tedio", summary="Analisa texto em tempo real — score de impacto")
def analisar_tedio_endpoint(req: AnaliseRequest, email: str = Depends(verificar_token)):
    return analisar_tedio(req.texto)


@app.post("/registrar-fracasso", summary="Registra padrão de fracasso detectado")
def registrar_fracasso(req: FracassoRequest, email: str = Depends(verificar_token), db: Session = Depends(get_db)):
    fracasso = FeedbackFracasso(
        usuario_email=email, texto_original=req.texto[:500],
        padroes_detectados=json.dumps(req.padroes),
        score_impacto=max(0, min(100, req.score)),
        em_zona_abandono=req.em_zona_abandono,
        preset_gerado=req.preset_gerado, converteu=req.converteu,
    )
    db.add(fracasso)
    db.commit()
    return {"registrado": True}


@app.get("/insights-negativos", summary="Padrões de fracasso globais — Algoritmo Fantasma")
def insights_negativos(email: str = Depends(verificar_token), db: Session = Depends(get_db)):
    fracassos = (db.query(FeedbackFracasso).order_by(FeedbackFracasso.criado_em.desc()).limit(500).all())
    if not fracassos:
        return {"total": 0, "mensagem": "Dados insuficientes ainda."}
    padroes_count = {}
    zonas = sum(1 for f in fracassos if f.em_zona_abandono)
    score_medio = sum(f.score_impacto for f in fracassos) / len(fracassos)
    taxa_conversao = sum(1 for f in fracassos if f.converteu) / len(fracassos)
    for f in fracassos:
        try:
            for p in json.loads(f.padroes_detectados or "[]"):
                padroes_count[p] = padroes_count.get(p, 0) + 1
        except Exception:
            pass
    mais_comum = max(padroes_count, key=padroes_count.get) if padroes_count else None
    return {
        "total_amostras":              len(fracassos),
        "zonas_abandono":              zonas,
        "taxa_zona_abandono":          round(zonas / len(fracassos), 2),
        "score_medio_impacto":         round(score_medio, 1),
        "taxa_conversao_apos_alerta":  round(taxa_conversao, 2),
        "padrao_mais_comum":           mais_comum,
        "distribuicao_padroes":        padroes_count,
        "insight": f"O padrão '{mais_comum}' é o maior killer com {padroes_count.get(mais_comum, 0)} ocorrências." if mais_comum else "Coletando dados.",
    }


# ── Stripe ────────────────────────────────────────────────────────────────────
@app.post("/criar-assinatura", summary="Criar checkout Stripe para plano Pro")
def criar_assinatura(email: str = Depends(verificar_token), db: Session = Depends(get_db)):
    try:
        usuario = db.query(Usuario).filter(Usuario.email == email).first()
        if not usuario:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
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
            line_items=[{"price_data": {"currency": "usd",
                         "product_data": {"name": "Kit de Intenção Visual Pro"},
                         "unit_amount": 900, "recurring": {"interval": "month"}},
                         "quantity": 1}],
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