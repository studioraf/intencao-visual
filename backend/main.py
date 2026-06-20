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

from auth import hash_senha, verificar_senha, criar_token, verificar_token

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")

app = FastAPI(title="Neurocinematica API")

# CORS — precisa vir antes de tudo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
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
    plano = Column(String, default="free")
    stripe_id = Column(String, nullable=True)
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

# Migração automática de colunas
with engine.connect() as conn:
    inspector = inspect(engine)
    cols_u = [c["name"] for c in inspector.get_columns("usuarios")]
    cols_k = [c["name"] for c in inspector.get_columns("kits")]
    for col, ddl in [
        ("plano", "ALTER TABLE usuarios ADD COLUMN plano VARCHAR DEFAULT 'free'"),
        ("stripe_id", "ALTER TABLE usuarios ADD COLUMN stripe_id VARCHAR"),
    ]:
        if col not in cols_u:
            try: conn.execute(text(ddl))
            except: pass
    for col, ddl in [
        ("usuario_email", "ALTER TABLE kits ADD COLUMN usuario_email VARCHAR"),
        ("share_id", "ALTER TABLE kits ADD COLUMN share_id VARCHAR"),
        ("publico", "ALTER TABLE kits ADD COLUMN publico BOOLEAN DEFAULT 0"),
    ]:
        if col not in cols_k:
            try: conn.execute(text(ddl))
            except: pass
    conn.commit()

PRESETS = {
    "blade": {"keywords":["blade","cyberpunk","neon","futurista","tech","matrix"],"nome":"Cyberpunk","emocao":"Tensão · Adrenalina · Desorientação","paleta":["#0a0a0f","#00fff7","#7c3aed","#ff006e"],"tipografia":"Rajdhani Bold","ritmo":"32 cortes/min","bpm":140,"iluminacao":"Neon lateral · Chuva de luz","enquadramento":"Close extremo","audio_tipo":"cyberpunk","audio_desc":"Sintetizador metálico + glitch eletrônico","audio_efeito":"Gera tensão e adrenalina"},
    "poder": {"keywords":["poder","urgência","força","luxo","cartier","sdm","rap","trap","épico","gold","luxury","power"],"nome":"Luxo Cinematográfico","emocao":"Poder · Status · Inevitabilidade","paleta":["#0d0500","#8B3A00","#C8860A","#F5D78E"],"tipografia":"Montserrat Black","ritmo":"22 cortes/min","bpm":95,"iluminacao":"Tungstênio quente · Sombra épica","enquadramento":"Ângulo baixo","audio_tipo":"trap","audio_desc":"Kick 808 grave + hi-hat seco","audio_efeito":"Ativa sensação de poder"},
    "romance": {"keywords":["romance","amor","suave","delicado","intimidade","saudade","love","soft"],"nome":"Romance Etéreo","emocao":"Nostalgia · Vulnerabilidade · Conexão","paleta":["#1a0010","#8B0050","#FF6B9D","#FFD6E8"],"tipografia":"Cormorant Garamond","ritmo":"12 cortes/min","bpm":72,"iluminacao":"Luz difusa · Bokeh profundo","enquadramento":"Plano aberto","audio_tipo":"romance","audio_desc":"Pad suave + melodia de piano","audio_efeito":"Ativa oxitocina"},
    "misterio": {"keywords":["mistério","sombrio","dark","noir","suspense","thriller","crime","mystery"],"nome":"Noir Contemporâneo","emocao":"Ansiedade · Fascínio · Perigo","paleta":["#000000","#0a0a0a","#1a1a2e","#4a4a6a"],"tipografia":"Playfair Display","ritmo":"18 cortes/min","bpm":85,"iluminacao":"Contraluz duro · Sombra absoluta","enquadramento":"Plano médio","audio_tipo":"noir","audio_desc":"Baixo profundo + silêncio dramático","audio_efeito":"Ativa amígdala"},
    "epico": {"keywords":["épico","guerra","batalha","herói","dune","grandioso","histórico","epic","war","hero"],"nome":"Épico Cinematográfico","emocao":"Grandiosidade · Sacrifício · Destino","paleta":["#0a0500","#3d1a00","#8B4513","#DAA520"],"tipografia":"Cinzel Bold","ritmo":"18 cortes/min","bpm":88,"iluminacao":"Luz épica lateral · Névoa dramática","enquadramento":"Grande angular","audio_tipo":"noir","audio_desc":"Orquestra + percussão épica","audio_efeito":"Grandiosidade"},
    "minimalista": {"keywords":["minimalista","clean","simples","moderno","elegante","corporativo","minimal","simple","modern"],"nome":"Minimalismo Moderno","emocao":"Clareza · Confiança · Sofisticação","paleta":["#ffffff","#f5f5f5","#333333","#000000"],"tipografia":"Helvetica Neue Light","ritmo":"15 cortes/min","bpm":80,"iluminacao":"Luz difusa branca · Alto key","enquadramento":"Plano médio","audio_tipo":"romance","audio_desc":"Piano minimalista + silêncio","audio_efeito":"Clareza e foco"},
    "lofi": {"keywords":["lo-fi","lofi","chill","relaxar","estudo","café","vibe"],"nome":"Lo-Fi Nostálgico","emocao":"Calma · Nostalgia · Introspecção","paleta":["#2d1f3d","#7c5cbf","#c9a0dc","#f0e6ff"],"tipografia":"IBM Plex Mono","ritmo":"8 cortes/min","bpm":75,"iluminacao":"Luz de abajur quente","enquadramento":"Plano médio","audio_tipo":"romance","audio_desc":"Beats de baixo fidelidade","audio_efeito":"Relaxamento e foco"},
    "horror": {"keywords":["horror","terror","medo","assombrado","ghost","paranormal"],"nome":"Horror Psicológico","emocao":"Medo · Paranoia · Desespero","paleta":["#000000","#1a0000","#8B0000","#ff0000"],"tipografia":"Creepster","ritmo":"25 cortes/min","bpm":120,"iluminacao":"Luz vermelha lateral · Escuridão total","enquadramento":"Close extremo","audio_tipo":"noir","audio_desc":"Strings tensas + batida cardíaca","audio_efeito":"Ativa medo máximo"},
    "retro80": {"keywords":["retrô","80s","synthwave","vaporwave","anos 80","outrun"],"nome":"Synthwave Retrô","emocao":"Nostalgia · Energia · Escapismo","paleta":["#0d0221","#f72585","#7209b7","#4cc9f0"],"tipografia":"Press Start 2P","ritmo":"24 cortes/min","bpm":118,"iluminacao":"Grade neon · Pôr do sol gradiente","enquadramento":"Plano aberto","audio_tipo":"cyberpunk","audio_desc":"Synth vintage + drum machine","audio_efeito":"Nostalgia e energia retrô"},
    "natureza": {"keywords":["natureza","floresta","cachoeira","selva","forest","waterfall"],"nome":"Natureza Selvagem","emocao":"Liberdade · Paz · Grandiosidade","paleta":["#0a1f0a","#1a4a1a","#2d8a2d","#7ddf64"],"tipografia":"Libre Baskerville","ritmo":"10 cortes/min","bpm":65,"iluminacao":"Luz natural filtrada","enquadramento":"Grande angular","audio_tipo":"romance","audio_desc":"Sons da natureza + melodia orgânica","audio_efeito":"Paz e redução de estresse"},
    "scifi": {"keywords":["ficção científica","sci-fi","espaço","space","galáxia","alienígena"],"nome":"Sci-Fi Espacial","emocao":"Maravilha · Solidão · Infinito","paleta":["#000814","#001d3d","#003566","#ffd60a"],"tipografia":"Exo 2 Bold","ritmo":"20 cortes/min","bpm":90,"iluminacao":"Luz de estrelas · Bioluminescência","enquadramento":"Grande angular","audio_tipo":"cyberpunk","audio_desc":"Ambient espacial + sintetizador","audio_efeito":"Maravilha e imensidão"},
    "sport": {"keywords":["esporte","sport","futebol","corrida","atletismo","vitória"],"nome":"Sport Motion","emocao":"Adrenalina · Vitória · Superação","paleta":["#000000","#1a1a1a","#ff4d00","#ffffff"],"tipografia":"Bebas Neue","ritmo":"35 cortes/min","bpm":145,"iluminacao":"Luz de estádio · Slow motion dramático","enquadramento":"Ângulo baixo","audio_tipo":"trap","audio_desc":"Trap acelerado + crowd noise","audio_efeito":"Adrenalina e superação"},
    "fashion": {"keywords":["moda","fashion","passarela","vogue","editorial","estilo"],"nome":"Fashion Editorial","emocao":"Poder Feminino · Arte · Atitude","paleta":["#f5f5f5","#1a1a1a","#c9b99a","#8B7355"],"tipografia":"Bodoni Moda","ritmo":"20 cortes/min","bpm":92,"iluminacao":"Luz de estúdio · High fashion","enquadramento":"Plano médio","audio_tipo":"trap","audio_desc":"Electronic fashion + deep bass","audio_efeito":"Poder e atitude"},
    "travel": {"keywords":["viagem","travel","aventura","explore","wanderlust","mochileiro"],"nome":"Travel Cinematic","emocao":"Liberdade · Descoberta · Aventura","paleta":["#003049","#fcbf49","#eae2b7","#f77f00"],"tipografia":"Raleway Bold","ritmo":"16 cortes/min","bpm":84,"iluminacao":"Golden hour · Luz natural intensa","enquadramento":"Grande angular","audio_tipo":"romance","audio_desc":"World music + percussão étnica","audio_efeito":"Ansiedade por descoberta"},
    "kpop": {"keywords":["k-pop","kpop","coreano","k-drama","hallyu"],"nome":"K-Pop Hyper","emocao":"Energia · Perfeição · Impacto","paleta":["#ff006e","#8338ec","#3a86ff","#ffbe0b"],"tipografia":"Nanum Gothic Bold","ritmo":"40 cortes/min","bpm":155,"iluminacao":"RGB strobo · Holográfico","enquadramento":"Close extremo","audio_tipo":"cyberpunk","audio_desc":"Hyperpop + 808 coreano","audio_efeito":"Energia explosiva"},
    "gothic": {"keywords":["gótico","gothic","vampiro","cemitério","dark romance","medieval"],"nome":"Dark Gothic","emocao":"Beleza Sombria · Eternidade · Mistério","paleta":["#0d0014","#2d1b4e","#7b2d8b","#c77dff"],"tipografia":"Cinzel Decorative","ritmo":"16 cortes/min","bpm":78,"iluminacao":"Velas · Luz de lua · Névoa","enquadramento":"Plano médio","audio_tipo":"noir","audio_desc":"Órgão de catedral + violinos","audio_efeito":"Beleza sombria"},
    "rave": {"keywords":["rave","festival","eletrônica","dj","club","techno"],"nome":"Rave Underground","emocao":"Êxtase · Libertação · Comunidade","paleta":["#000000","#39ff14","#ff00ff","#00ffff"],"tipografia":"Chakra Petch Bold","ritmo":"45 cortes/min","bpm":160,"iluminacao":"Strobo · Laser · Fumaça","enquadramento":"Grande angular","audio_tipo":"cyberpunk","audio_desc":"Techno acelerado 160bpm","audio_efeito":"Êxtase e libertação"},
    "wedding": {"keywords":["casamento","wedding","noiva","noivo","amor eterno"],"nome":"Casamento Cinematográfico","emocao":"Amor Eterno · Alegria · Emoção","paleta":["#fff5f5","#f9dcc4","#fcd5ce","#ffffff"],"tipografia":"Great Vibes","ritmo":"10 cortes/min","bpm":68,"iluminacao":"Golden hour · Luz difusa romântica","enquadramento":"Plano aberto","audio_tipo":"romance","audio_desc":"Piano clássico + cordas suaves","audio_efeito":"Amor e emoção profunda"},
    "hiphop": {"keywords":["hip-hop","hiphop","rap","street","urbano","graffiti"],"nome":"Hip-Hop Urbano","emocao":"Autenticidade · Atitude · Flow","paleta":["#1a1a1a","#333333","#ff6b00","#ffffff"],"tipografia":"Anton","ritmo":"26 cortes/min","bpm":95,"iluminacao":"Luz de rua · Néon urbano","enquadramento":"Ângulo baixo","audio_tipo":"trap","audio_desc":"Boom bap + scratching","audio_efeito":"Autenticidade e flow"},
    "underwater": {"keywords":["submarino","underwater","oceano","mergulho","coral","profundezas"],"nome":"Submersão Profunda","emocao":"Mistério · Silêncio · Profundidade","paleta":["#03045e","#0077b6","#00b4d8","#90e0ef"],"tipografia":"Josefin Sans Light","ritmo":"8 cortes/min","bpm":60,"iluminacao":"Luz filtrada pela água","enquadramento":"Plano aberto","audio_tipo":"romance","audio_desc":"Ambient aquático + low bass","audio_efeito":"Calma e mistério"},
    "anime": {"keywords":["anime","mangá","japonês","sakura","katana","samurai"],"nome":"Anime Cinematográfico","emocao":"Intensidade · Honra · Beleza","paleta":["#1a0a2e","#c9184a","#ff758c","#ffd6e0"],"tipografia":"Noto Sans JP Bold","ritmo":"28 cortes/min","bpm":130,"iluminacao":"Luz dura lateral · Pétalas de sakura","enquadramento":"Close extremo","audio_tipo":"noir","audio_desc":"Orchestral japonês + shamisen","audio_efeito":"Intensidade e honra"},
    "jazz": {"keywords":["jazz","blues","improviso","sax","trompete","clube de jazz"],"nome":"Jazz Club","emocao":"Sofisticação · Improviso · Alma","paleta":["#1a0f00","#4a2800","#8B5E3C","#F4D03F"],"tipografia":"Abril Fatface","ritmo":"10 cortes/min","bpm":72,"iluminacao":"Spot light de palco · Fumaça de clube","enquadramento":"Plano médio","audio_tipo":"noir","audio_desc":"Sax ao vivo + contrabaixo","audio_efeito":"Sofisticação e alma"},
    "gaming": {"keywords":["gaming","gamer","esports","streamer","videogame"],"nome":"Gaming Cinematic","emocao":"Competição · Foco · Vitória","paleta":["#0d0d0d","#39ff14","#ff00ff","#0080ff"],"tipografia":"Rajdhani Bold","ritmo":"30 cortes/min","bpm":132,"iluminacao":"RGB de setup · Monitor glow","enquadramento":"Close extremo","audio_tipo":"cyberpunk","audio_desc":"Chiptune + EDM de arena","audio_efeito":"Adrenalina competitiva"},
    "spiritual": {"keywords":["espiritual","spiritual","transcendência","divino","cosmos","energia"],"nome":"Transcendência Espiritual","emocao":"Paz Profunda · Infinito · Conexão","paleta":["#fff8dc","#ffd700","#daa520","#b8860b"],"tipografia":"IM Fell English Italic","ritmo":"6 cortes/min","bpm":58,"iluminacao":"Luz celestial · Raios divinos","enquadramento":"Grande angular","audio_tipo":"romance","audio_desc":"Gregoriano + singing bowls","audio_efeito":"Transcendência"},
    "foodporn": {"keywords":["gastronomia","food","restaurante","chef","culinária","comida"],"nome":"Gastronomia Cinematográfica","emocao":"Prazer · Sofisticação · Desejo","paleta":["#1a0a00","#4a2800","#8B5E3C","#F4A261"],"tipografia":"Playfair Display Italic","ritmo":"12 cortes/min","bpm":70,"iluminacao":"Luz lateral quente · Vapor","enquadramento":"Macro extremo","audio_tipo":"romance","audio_desc":"Jazz suave + ambiente","audio_efeito":"Apetite e sofisticação"},
    "documentary": {"keywords":["documentário","documentary","jornalismo","verdade","real"],"nome":"Documentário Realista","emocao":"Verdade · Urgência · Empatia","paleta":["#2c2c2c","#4a4a4a","#888888","#cccccc"],"tipografia":"Roboto Condensed","ritmo":"14 cortes/min","bpm":78,"iluminacao":"Luz natural · Sem fill","enquadramento":"Plano médio","audio_tipo":"noir","audio_desc":"Ambient + narração grave","audio_efeito":"Credibilidade e emoção real"},
    "luxury_car": {"keywords":["supercar","lamborghini","ferrari","porsche","carro de luxo"],"nome":"Supercar Cinematic","emocao":"Velocidade · Poder · Exclusividade","paleta":["#1a1a1a","#8B0000","#cc0000","#ff4444"],"tipografia":"Formula1 Bold","ritmo":"30 cortes/min","bpm":128,"iluminacao":"Luz de estúdio · Reflexo de carroceria","enquadramento":"Macro extremo","audio_tipo":"trap","audio_desc":"Rugido de motor + bass drop","audio_efeito":"Velocidade e exclusividade"},
    "perfume": {"keywords":["perfume","fragrance","luxo árabe","dubai","oud","essência"],"nome":"Luxury Fragrance","emocao":"Sensualidade · Exclusividade · Mistério","paleta":["#1a0a00","#4a2800","#C8860A","#F5D78E"],"tipografia":"Cormorant Garamond Italic","ritmo":"10 cortes/min","bpm":66,"iluminacao":"Luz de cristal · Reflexo de frasco","enquadramento":"Macro extremo","audio_tipo":"romance","audio_desc":"Oud árabe + silêncio dramático","audio_efeito":"Sensualidade e exclusividade"},
    "luxury_watch": {"keywords":["relógio de luxo","rolex","patek","audemars","horlogerie"],"nome":"Horology Luxury","emocao":"Precisão · Eternidade · Status","paleta":["#1a0800","#4a2800","#C8860A","#F5D78E"],"tipografia":"Didot Bold","ritmo":"8 cortes/min","bpm":60,"iluminacao":"Luz de joalheria lateral","enquadramento":"Macro extremo","audio_tipo":"romance","audio_desc":"Piano clássico + silêncio preciso","audio_efeito":"Precisão e eternidade"},
    "drone": {"keywords":["drone","aéreo","aerial","topo","altitude","cinematografia aérea"],"nome":"Aerial Cinematic","emocao":"Grandeza · Perspectiva · Silêncio","paleta":["#87CEEB","#4682B4","#1E3A5F","#F0F8FF"],"tipografia":"Raleway Light","ritmo":"8 cortes/min","bpm":65,"iluminacao":"Luz natural aérea · Golden hour","enquadramento":"Grande angular","audio_tipo":"noir","audio_desc":"Ambient orquestral + silêncio","audio_efeito":"Grandeza e perspectiva"},
    "abstract": {"keywords":["abstrato","abstract","arte","experimental","glitch art"],"nome":"Arte Abstrata","emocao":"Criatividade · Caos · Liberdade","paleta":["#ff0080","#00ff80","#0080ff","#ff8000"],"tipografia":"Space Mono Bold","ritmo":"20 cortes/min","bpm":100,"iluminacao":"RGB puro · Projeção mapeada","enquadramento":"Close extremo","audio_tipo":"cyberpunk","audio_desc":"Noise experimental + beats quebrados","audio_efeito":"Criatividade e caos"},
    "ai_tech": {"keywords":["ai","inteligência artificial","machine learning","robot","tech futurista"],"nome":"AI Awakening","emocao":"Fascínio · Medo · Transcendência","paleta":["#001a33","#003366","#0080ff","#00ffff"],"tipografia":"Orbitron Bold","ritmo":"24 cortes/min","bpm":108,"iluminacao":"Data stream · Luz holográfica","enquadramento":"Close extremo","audio_tipo":"cyberpunk","audio_desc":"Glitch eletrônico + voz sintetizada","audio_efeito":"Fascínio tecnológico"},
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
    return {"status": "Neurocinematica API rodando", "version": "2.2.0"}

@app.options("/{rest_of_path:path}")
async def preflight(rest_of_path: str):
    return Response(status_code=200)

@app.post("/cadastro")
def cadastro(req: CadastroRequest):
    db = SessionLocal()
    existe = db.query(Usuario).filter(Usuario.email == req.email).first()
    if existe:
        db.close()
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    usuario = Usuario(nome=req.nome, email=req.email, senha_hash=hash_senha(req.senha), plano="free")
    db.add(usuario)
    db.commit()
    db.close()
    token = criar_token({"sub": req.email, "nome": req.nome})
    return {"token": token, "nome": req.nome, "email": req.email, "plano": "free"}

@app.post("/login")
def login(req: LoginRequest):
    db = SessionLocal()
    usuario = db.query(Usuario).filter(Usuario.email == req.email).first()
    db.close()
    if not usuario or not verificar_senha(req.senha, usuario.senha_hash):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    token = criar_token({"sub": usuario.email, "nome": usuario.nome})
    return {"token": token, "nome": usuario.nome, "email": usuario.email, "plano": usuario.plano or "free"}

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
    return [{"id": k.id, "emocao": k.emocao, "estilo": k.nome_estilo, "formato": k.formato, "share_id": k.share_id, "publico": k.publico, "criado_em": k.criado_em.isoformat() if k.criado_em else None} for k in kits]

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
        raise HTTPException(status_code=404, detail="Kit não encontrado")
    resultado = json.loads(kit.resultado_json)
    return {
        "emocao_input": kit.emocao,
        "formato": kit.formato,
        "estilo": kit.nome_estilo,
        "criado_em": kit.criado_em.isoformat() if kit.criado_em else None,
        **resultado
    }

@app.get("/meu-plano")
def meu_plano(email: str = Depends(verificar_token)):
    db = SessionLocal()
    usuario = db.query(Usuario).filter(Usuario.email == email).first()
    db.close()
    plano = (usuario.plano or "free") if usuario else "free"
    return {"plano": plano}

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