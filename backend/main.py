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

# Redis opcional — se não estiver configurado, funciona sem cache
try:
    import redis as redis_lib
    REDIS_URL = os.environ.get("REDIS_URL", "")
    if REDIS_URL:
        redis_client = redis_lib.from_url(REDIS_URL, decode_responses=True, socket_connect_timeout=2)
        redis_client.ping()
        REDIS_ON = True
    else:
        REDIS_ON = False
except Exception:
    REDIS_ON = False
    redis_client = None

def cache_get(key):
    if not REDIS_ON: return None
    try: v = redis_client.get(key); return json.loads(v) if v else None
    except: return None

def cache_set(key, value, ttl=3600):
    if not REDIS_ON: return
    try: redis_client.setex(key, ttl, json.dumps(value))
    except: pass

def cache_del(key):
    if not REDIS_ON: return
    try: redis_client.delete(key)
    except: pass

PLANOS = {
    "free":       {"kits_por_mes": -1, "formatos": ["youtube","instagram","filme","clipe"], "marca_dagua": False},
    "creator":    {"kits_por_mes": -1, "formatos": ["youtube","instagram","filme","clipe"], "marca_dagua": False},
    "studio":     {"kits_por_mes": -1, "formatos": ["youtube","instagram","filme","clipe"], "marca_dagua": False},
    "pro":        {"kits_por_mes": -1, "formatos": ["youtube","instagram","filme","clipe"], "marca_dagua": False},
    "enterprise": {"kits_por_mes": -1, "formatos": ["youtube","instagram","filme","clipe"], "marca_dagua": False},
}

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
    "travel": {"keywords":["viagem","travel","aventura","explore","wanderlust","mochileiro"],"nome":"Travel Cinematic","emocao":"Liberdade · Descoberta · Aventura","paleta":["#003049","#fcbf49","#eae2b7","#f77f00"],"tipografia":"Raleway Bold","ritmo":"16 cortes/min","bpm":84,"iluminacao":"Golden hour · Luz natural intensa","enquadramento":"Grande angular","audio_tipo":"epic","audio_desc":"World music + percussão étnica","audio_efeito":"Ansiedade por descoberta"},
    "kpop": {"keywords":["k-pop","kpop","coreano","k-drama","hallyu"],"nome":"K-Pop Hyper","emocao":"Energia · Perfeição · Impacto","paleta":["#ff006e","#8338ec","#3a86ff","#ffbe0b"],"tipografia":"Nanum Gothic Bold","ritmo":"40 cortes/min","bpm":155,"iluminacao":"RGB strobo · Holográfico","enquadramento":"Close extremo","audio_tipo":"cyberpunk","audio_desc":"Hyperpop + 808 coreano","audio_efeito":"Energia explosiva"},
    "gothic": {"keywords":["gótico","gothic","vampiro","cemitério","dark romance","medieval"],"nome":"Dark Gothic","emocao":"Beleza Sombria · Eternidade · Mistério","paleta":["#0d0014","#2d1b4e","#7b2d8b","#c77dff"],"tipografia":"Cinzel Decorative","ritmo":"16 cortes/min","bpm":78,"iluminacao":"Velas · Luz de lua · Névoa","enquadramento":"Plano médio","audio_tipo":"noir","audio_desc":"Órgão de catedral + violinos","audio_efeito":"Beleza sombria"},
    "rave": {"keywords":["rave","festival","eletrônica","dj","club","techno"],"nome":"Rave Underground","emocao":"Êxtase · Libertação · Comunidade","paleta":["#000000","#39ff14","#ff00ff","#00ffff"],"tipografia":"Chakra Petch Bold","ritmo":"45 cortes/min","bpm":160,"iluminacao":"Strobo · Laser · Fumaça","enquadramento":"Grande angular","audio_tipo":"cyberpunk","audio_desc":"Techno acelerado 160bpm","audio_efeito":"Êxtase e libertação"},
    "wedding": {"keywords":["casamento","wedding","noiva","noivo","amor eterno"],"nome":"Casamento Cinematográfico","emocao":"Amor Eterno · Alegria · Emoção","paleta":["#fff5f5","#f9dcc4","#fcd5ce","#ffffff"],"tipografia":"Great Vibes","ritmo":"10 cortes/min","bpm":68,"iluminacao":"Golden hour · Luz difusa romântica","enquadramento":"Plano aberto","audio_tipo":"romance","audio_desc":"Piano clássico + cordas suaves","audio_efeito":"Amor e emoção profunda"},
    "hiphop": {"keywords":["hip-hop","hiphop","rap","street","urbano","graffiti"],"nome":"Hip-Hop Urbano","emocao":"Autenticidade · Atitude · Flow","paleta":["#1a1a1a","#333333","#ff6b00","#ffffff"],"tipografia":"Anton","ritmo":"26 cortes/min","bpm":95,"iluminacao":"Luz de rua · Néon urbano","enquadramento":"Ângulo baixo","audio_tipo":"trap","audio_desc":"Boom bap + scratching","audio_efeito":"Autenticidade e flow"},
    "western": {"keywords":["faroeste","western","cowboy","sertão","deserto","bang"],"nome":"Neo-Western","emocao":"Honra · Solidão · Justiça","paleta":["#8B4513","#D2691E","#F4A460","#FAEBD7"],"tipografia":"Rye","ritmo":"14 cortes/min","bpm":72,"iluminacao":"Sol forte de meio-dia","enquadramento":"Grande angular","audio_tipo":"epic","audio_desc":"Guitarra slide + percussão western","audio_efeito":"Tensão e honra"},
    "underwater": {"keywords":["submarino","underwater","oceano","mergulho","coral","profundezas"],"nome":"Submersão Profunda","emocao":"Mistério · Silêncio · Profundidade","paleta":["#03045e","#0077b6","#00b4d8","#90e0ef"],"tipografia":"Josefin Sans Light","ritmo":"8 cortes/min","bpm":60,"iluminacao":"Luz filtrada pela água","enquadramento":"Plano aberto","audio_tipo":"romance","audio_desc":"Ambient aquático + low bass","audio_efeito":"Calma e mistério"},
    "anime": {"keywords":["anime","mangá","japonês","sakura","katana","samurai"],"nome":"Anime Cinematográfico","emocao":"Intensidade · Honra · Beleza","paleta":["#1a0a2e","#c9184a","#ff758c","#ffd6e0"],"tipografia":"Noto Sans JP Bold","ritmo":"28 cortes/min","bpm":130,"iluminacao":"Luz dura lateral · Pétalas de sakura","enquadramento":"Close extremo","audio_tipo":"epic","audio_desc":"Orchestral japonês + shamisen","audio_efeito":"Intensidade e honra"},
    "jazz": {"keywords":["jazz","blues","improviso","sax","trompete","clube de jazz"],"nome":"Jazz Club","emocao":"Sofisticação · Improviso · Alma","paleta":["#1a0f00","#4a2800","#8B5E3C","#F4D03F"],"tipografia":"Abril Fatface","ritmo":"10 cortes/min","bpm":72,"iluminacao":"Spot light de palco · Fumaça de clube","enquadramento":"Plano médio","audio_tipo":"noir","audio_desc":"Sax ao vivo + contrabaixo","audio_efeito":"Sofisticação e alma"},
    "desert": {"keywords":["deserto","duna","areia","marocco","sahara","oriente médio"],"nome":"Desert Mirage","emocao":"Solidão · Mistério · Eternidade","paleta":["#c2a06b","#8B6914","#D4914F","#F5CBA7"],"tipografia":"Cinzel","ritmo":"12 cortes/min","bpm":68,"iluminacao":"Sol de deserto · Shimmer de calor","enquadramento":"Grande angular","audio_tipo":"epic","audio_desc":"Oud árabe + percussão do deserto","audio_efeito":"Solidão e eternidade"},
    "vhs": {"keywords":["vhs","fita","vintage","old school","cassete","glitch vhs"],"nome":"VHS Glitch","emocao":"Nostalgia · Deterioração · Memória","paleta":["#2b2b2b","#c0392b","#e8e8e8","#f39c12"],"tipografia":"VT323","ritmo":"18 cortes/min","bpm":82,"iluminacao":"Luz de TV CRT · Scan lines","enquadramento":"Plano médio","audio_tipo":"cyberpunk","audio_desc":"Lo-fi glitch + cassete noise","audio_efeito":"Nostalgia e deterioração"},
    "surf": {"keywords":["surf","onda","praia","ocean","wave","hawaii"],"nome":"Ocean Wave","emocao":"Liberdade · Flow · Leveza","paleta":["#0077b6","#00b4d8","#90e0ef","#f0f9ff"],"tipografia":"Pacifico","ritmo":"14 cortes/min","bpm":76,"iluminacao":"Sol tropical · Spray de onda","enquadramento":"Plano aberto","audio_tipo":"romance","audio_desc":"Ukulele + surf drums","audio_efeito":"Liberdade e flow"},
    "gaming": {"keywords":["gaming","gamer","esports","streamer","videogame"],"nome":"Gaming Cinematic","emocao":"Competição · Foco · Vitória","paleta":["#0d0d0d","#39ff14","#ff00ff","#0080ff"],"tipografia":"Rajdhani Bold","ritmo":"30 cortes/min","bpm":132,"iluminacao":"RGB de setup · Monitor glow","enquadramento":"Close extremo","audio_tipo":"cyberpunk","audio_desc":"Chiptune + EDM de arena","audio_efeito":"Adrenalina competitiva"},
    "carnival": {"keywords":["carnaval","carnival","samba","rio","fantasia","bloco"],"nome":"Carnaval Brasileiro","emocao":"Alegria Máxima · Sensualidade · Caos Bom","paleta":["#ff0000","#ffff00","#00ff00","#ff69b4"],"tipografia":"Bangers","ritmo":"40 cortes/min","bpm":150,"iluminacao":"Strobo colorido · Luz de trio elétrico","enquadramento":"Plano aberto","audio_tipo":"trap","audio_desc":"Samba acelerado + bateria ao vivo","audio_efeito":"Alegria máxima"},
    "spiritual": {"keywords":["espiritual","spiritual","transcendência","divino","cosmos","energia"],"nome":"Transcendência Espiritual","emocao":"Paz Profunda · Infinito · Conexão","paleta":["#fff8dc","#ffd700","#daa520","#b8860b"],"tipografia":"IM Fell English Italic","ritmo":"6 cortes/min","bpm":58,"iluminacao":"Luz celestial · Raios divinos","enquadramento":"Grande angular","audio_tipo":"romance","audio_desc":"Gregoriano + singing bowls","audio_efeito":"Transcendência"},
    "boxing": {"keywords":["boxe","mma","luta","ringue","knockout","fighter"],"nome":"Fight Night","emocao":"Determinação · Dor · Glória","paleta":["#1a0000","#8B0000","#ff4444","#ffffff"],"tipografia":"Impact","ritmo":"35 cortes/min","bpm":142,"iluminacao":"Luz de ringue · Suor e vapor","enquadramento":"Close extremo","audio_tipo":"trap","audio_desc":"Trap agressivo + crowd chanting","audio_efeito":"Adrenalina e determinação"},
    "architecture": {"keywords":["arquitetura","architecture","prédio","edifício","brutalismo"],"nome":"Architectural Vision","emocao":"Precisão · Grandeza · Forma","paleta":["#f5f5f5","#e0e0e0","#9e9e9e","#212121"],"tipografia":"Futura Bold","ritmo":"10 cortes/min","bpm":72,"iluminacao":"Luz natural rasante · Sombra geométrica","enquadramento":"Grande angular","audio_tipo":"noir","audio_desc":"Minimalismo eletrônico","audio_efeito":"Precisão e contemplação"},
    "tattoo": {"keywords":["tatuagem","tattoo","ink","artista","tattoo artist"],"nome":"Ink Culture","emocao":"Arte · Identidade · Permanência","paleta":["#1a1a1a","#333333","#ff4444","#ffffff"],"tipografia":"Special Elite","ritmo":"16 cortes/min","bpm":82,"iluminacao":"Luz de estúdio focada","enquadramento":"Macro extremo","audio_tipo":"noir","audio_desc":"Underground hip-hop + guitar riff","audio_efeito":"Arte e identidade"},
    "luxury_car": {"keywords":["supercar","lamborghini","ferrari","porsche","carro de luxo"],"nome":"Supercar Cinematic","emocao":"Velocidade · Poder · Exclusividade","paleta":["#1a1a1a","#8B0000","#cc0000","#ff4444"],"tipografia":"Formula1 Bold","ritmo":"30 cortes/min","bpm":128,"iluminacao":"Luz de estúdio · Reflexo de carroceria","enquadramento":"Macro extremo","audio_tipo":"trap","audio_desc":"Rugido de motor + bass drop","audio_efeito":"Velocidade e exclusividade"},
    "skate": {"keywords":["skate","skateboard","street","trick","ollie"],"nome":"Skate Street","emocao":"Liberdade · Atitude · Cultura","paleta":["#1a1a1a","#ff4500","#00ff00","#ffffff"],"tipografia":"Permanent Marker","ritmo":"28 cortes/min","bpm":120,"iluminacao":"Luz de rua · Urbano","enquadramento":"Ângulo baixo","audio_tipo":"trap","audio_desc":"Punk + hip-hop de skate","audio_efeito":"Liberdade e atitude"},
    "meditation": {"keywords":["meditação","meditation","yoga","paz interior","mindfulness","zen"],"nome":"Zen Meditativo","emocao":"Paz · Equilíbrio · Presença","paleta":["#f8f9fa","#e9ecef","#adb5bd","#6c757d"],"tipografia":"Lora Italic","ritmo":"6 cortes/min","bpm":60,"iluminacao":"Luz matinal difusa","enquadramento":"Plano aberto","audio_tipo":"romance","audio_desc":"Bowls tibetanos + respiração","audio_efeito":"Relaxamento profundo"},
    "protest": {"keywords":["protesto","protest","revolução","manifestação","ativismo"],"nome":"Manifesto Político","emocao":"Raiva · Esperança · Resistência","paleta":["#e63946","#f1faee","#a8dadc","#1d3557"],"tipografia":"Oswald Bold","ritmo":"28 cortes/min","bpm":110,"iluminacao":"Luz de flash · Fogo","enquadramento":"Ângulo baixo","audio_tipo":"epic","audio_desc":"Percussão tribal + discurso","audio_efeito":"Raiva e esperança"},
    "foodporn": {"keywords":["gastronomia","food","restaurante","chef","culinária","comida"],"nome":"Gastronomia Cinematográfica","emocao":"Prazer · Sofisticação · Desejo","paleta":["#1a0a00","#4a2800","#8B5E3C","#F4A261"],"tipografia":"Playfair Display Italic","ritmo":"12 cortes/min","bpm":70,"iluminacao":"Luz lateral quente · Vapor","enquadramento":"Macro extremo","audio_tipo":"romance","audio_desc":"Jazz suave + ambiente","audio_efeito":"Apetite e sofisticação"},
    "storm": {"keywords":["tempestade","relâmpago","lightning","thunder","tormenta"],"nome":"Storm Chaser","emocao":"Poder Natural · Medo · Maravilha","paleta":["#1a1a2e","#4a4a8a","#9090ff","#ffffff"],"tipografia":"Bebas Neue","ritmo":"20 cortes/min","bpm":95,"iluminacao":"Relâmpago · Luz dramática","enquadramento":"Grande angular","audio_tipo":"epic","audio_desc":"Trovão + orquestra dramática","audio_efeito":"Poder da natureza"},
    "future_bass": {"keywords":["future bass","future","phonk","hyperpop","digital"],"nome":"Future Bass Digital","emocao":"Euforia Digital · Transcendência · Hype","paleta":["#ff006e","#3a0ca3","#4361ee","#4cc9f0"],"tipografia":"Space Grotesk Bold","ritmo":"36 cortes/min","bpm":150,"iluminacao":"Holo · Digital · Plasma","enquadramento":"Close extremo","audio_tipo":"cyberpunk","audio_desc":"Future bass + synth drop","audio_efeito":"Euforia digital máxima"},
    "classical": {"keywords":["clássico","orquestra","violino","ópera","sinfonia"],"nome":"Classical Music","emocao":"Nobreza · Profundidade · Eternidade","paleta":["#1a0f00","#4a3800","#8B7355","#F5DEB3"],"tipografia":"Cormorant SC Bold","ritmo":"10 cortes/min","bpm":68,"iluminacao":"Luz de teatro · Dourado dramático","enquadramento":"Plano médio","audio_tipo":"epic","audio_desc":"Orquestra sinfônica completa","audio_efeito":"Nobreza e profundidade"},
    "perfume": {"keywords":["perfume","fragrance","luxo árabe","dubai","oud","essência"],"nome":"Luxury Fragrance","emocao":"Sensualidade · Exclusividade · Mistério","paleta":["#1a0a00","#4a2800","#C8860A","#F5D78E"],"tipografia":"Cormorant Garamond Italic","ritmo":"10 cortes/min","bpm":66,"iluminacao":"Luz de cristal · Reflexo de frasco","enquadramento":"Macro extremo","audio_tipo":"romance","audio_desc":"Oud árabe + silêncio dramático","audio_efeito":"Sensualidade e exclusividade"},
    "luxury_watch": {"keywords":["relógio de luxo","rolex","patek","audemars","horlogerie"],"nome":"Horology Luxury","emocao":"Precisão · Eternidade · Status","paleta":["#1a0800","#4a2800","#C8860A","#F5D78E"],"tipografia":"Didot Bold","ritmo":"8 cortes/min","bpm":60,"iluminacao":"Luz de joalheria lateral","enquadramento":"Macro extremo","audio_tipo":"romance","audio_desc":"Piano clássico + silêncio preciso","audio_efeito":"Precisão e eternidade"},
    "documentary": {"keywords":["documentário","documentary","jornalismo","verdade","real"],"nome":"Documentário Realista","emocao":"Verdade · Urgência · Empatia","paleta":["#2c2c2c","#4a4a4a","#888888","#cccccc"],"tipografia":"Roboto Condensed","ritmo":"14 cortes/min","bpm":78,"iluminacao":"Luz natural · Sem fill","enquadramento":"Plano médio","audio_tipo":"noir","audio_desc":"Ambient + narração grave","audio_efeito":"Credibilidade e emoção real"},
    "drone": {"keywords":["drone","aéreo","aerial","topo","altitude","cinematografia aérea"],"nome":"Aerial Cinematic","emocao":"Grandeza · Perspectiva · Silêncio","paleta":["#87CEEB","#4682B4","#1E3A5F","#F0F8FF"],"tipografia":"Raleway Light","ritmo":"8 cortes/min","bpm":65,"iluminacao":"Luz natural aérea · Golden hour","enquadramento":"Grande angular","audio_tipo":"epic","audio_desc":"Ambient orquestral + silêncio","audio_efeito":"Grandeza e perspectiva"},
    "military": {"keywords":["militar","soldado","guerra real","battlefield","operação"],"nome":"Military Operations","emocao":"Tensão · Dever · Adrenalina","paleta":["#1a1a00","#2d3a00","#4a5200","#8B8B00"],"tipografia":"Bebas Neue","ritmo":"32 cortes/min","bpm":135,"iluminacao":"Night vision · Explosão","enquadramento":"Plano médio","audio_tipo":"epic","audio_desc":"Percussão militar + rádio","audio_efeito":"Tensão e dever"},
    "abstract": {"keywords":["abstrato","abstract","arte","experimental","glitch art"],"nome":"Arte Abstrata","emocao":"Criatividade · Caos · Liberdade","paleta":["#ff0080","#00ff80","#0080ff","#ff8000"],"tipografia":"Space Mono Bold","ritmo":"20 cortes/min","bpm":100,"iluminacao":"RGB puro · Projeção mapeada","enquadramento":"Close extremo","audio_tipo":"cyberpunk","audio_desc":"Noise experimental + beats quebrados","audio_efeito":"Criatividade e caos"},
    "vintage_car": {"keywords":["carro antigo","muscle car","vintage car","clássico","americana"],"nome":"Americana Classic","emocao":"Nostalgia · Americana · Liberdade","paleta":["#1a0a00","#4a2000","#cc6600","#ff9933"],"tipografia":"Ultra","ritmo":"14 cortes/min","bpm":74,"iluminacao":"Sol americano · Reflexo de cromo","enquadramento":"Plano aberto","audio_tipo":"epic","audio_desc":"Rock americano + motor V8","audio_efeito":"Nostalgia e liberdade"},
    "motovlog": {"keywords":["moto","motocicleta","estrada","road trip","helmet"],"nome":"Moto Road Trip","emocao":"Liberdade · Velocidade · Adrenalina","paleta":["#1a1a1a","#ff4500","#ffffff","#333333"],"tipografia":"Exo 2 Bold","ritmo":"25 cortes/min","bpm":112,"iluminacao":"Luz de estrada · Velocidade","enquadramento":"Plano aberto","audio_tipo":"trap","audio_desc":"Rock + motor rugindo","audio_efeito":"Liberdade e adrenalina"},
    "supernatural": {"keywords":["sobrenatural","supernatural","magia","bruxaria","ocultismo"],"nome":"Supernatural Mystic","emocao":"Mistério · Poder Oculto · Fascínio","paleta":["#0d0020","#2d0060","#7b2fff","#c77dff"],"tipografia":"MedievalSharp","ritmo":"18 cortes/min","bpm":82,"iluminacao":"Luz de runa · Magia emanando","enquadramento":"Close extremo","audio_tipo":"noir","audio_desc":"Theremin + ambient misterioso","audio_efeito":"Mistério e poder oculto"},
    "ai_tech": {"keywords":["ai","inteligência artificial","machine learning","robot","tech futurista"],"nome":"AI Awakening","emocao":"Fascínio · Medo · Transcendência","paleta":["#001a33","#003366","#0080ff","#00ffff"],"tipografia":"Orbitron Bold","ritmo":"24 cortes/min","bpm":108,"iluminacao":"Data stream · Luz holográfica","enquadramento":"Close extremo","audio_tipo":"cyberpunk","audio_desc":"Glitch eletrônico + voz sintetizada","audio_efeito":"Fascínio tecnológico"},
}

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
    kits_mes_atual = Column(Integer, default=0)
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

# Migração automática
with engine.connect() as conn:
    inspector = inspect(engine)
    cols_u = [c["name"] for c in inspector.get_columns("usuarios")]
    cols_k = [c["name"] for c in inspector.get_columns("kits")]
    for col, ddl in [("plano","ALTER TABLE usuarios ADD COLUMN plano VARCHAR DEFAULT 'free'"),("stripe_id","ALTER TABLE usuarios ADD COLUMN stripe_id VARCHAR"),("kits_mes_atual","ALTER TABLE usuarios ADD COLUMN kits_mes_atual INTEGER DEFAULT 0")]:
        if col not in cols_u:
            try: conn.execute(text(ddl))
            except: pass
    for col, ddl in [("share_id","ALTER TABLE kits ADD COLUMN share_id VARCHAR"),("publico","ALTER TABLE kits ADD COLUMN publico BOOLEAN DEFAULT 0")]:
        if col not in cols_k:
            try: conn.execute(text(ddl))
            except: pass
    conn.commit()

app = FastAPI(title="Neurocinematica API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

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
    return {"status": "Neurocinematica API rodando", "version": "2.1.0", "redis": REDIS_ON}

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
        "audio": {"tipo": preset["audio_tipo"], "descricao": preset["audio_desc"], "efeito": preset["audio_efeito"]},
    }
    db = SessionLocal()
    kit = KitSalvo(usuario_email=email, emocao=req.emocao, formato=req.formato, nome_estilo=preset["nome"], resultado_json=json.dumps(resultado))
    db.add(kit)
    db.commit()
    db.refresh(kit)
    kit_id = kit.id
    db.close()
    cache_del(f"meus_kits:{email}")
    return {**resultado, "kit_id": kit_id}

@app.get("/meus-kits")
def meus_kits(email: str = Depends(verificar_token)):
    cached = cache_get(f"meus_kits:{email}")
    if cached: return cached
    db = SessionLocal()
    kits = db.query(KitSalvo).filter(KitSalvo.usuario_email == email).order_by(KitSalvo.criado_em.desc()).limit(20).all()
    db.close()
    resultado = [{"id":k.id,"emocao":k.emocao,"estilo":k.nome_estilo,"formato":k.formato,"share_id":k.share_id,"publico":k.publico,"criado_em":k.criado_em.isoformat() if k.criado_em else None} for k in kits]
    cache_set(f"meus_kits:{email}", resultado, 3600)
    return resultado

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
    cache_del(f"meus_kits:{email}")
    return {"share_id": share_id, "url": f"https://intencao-visual.vercel.app/kit/{share_id}"}

@app.get("/kit/{share_id}")
def ver_kit_publico(share_id: str):
    cached = cache_get(f"kit_pub:{share_id}")
    if cached: return cached
    db = SessionLocal()
    kit = db.query(KitSalvo).filter(KitSalvo.share_id == share_id, KitSalvo.publico == True).first()
    db.close()
    if not kit:
        raise HTTPException(status_code=404, detail="Kit não encontrado")
    resultado = {"emocao_input":kit.emocao,"formato":kit.formato,"estilo":kit.nome_estilo,"criado_em":kit.criado_em.isoformat() if kit.criado_em else None,**json.loads(kit.resultado_json)}
    cache_set(f"kit_pub:{share_id}", resultado, 86400)
    return resultado

@app.post("/criar-assinatura")
def criar_assinatura(email: str = Depends(verificar_token)):
    try:
        cliente = stripe.Customer.create(email=email)
        sessao = stripe.checkout.Session.create(
            customer=cliente.id,
            payment_method_types=["card"],
            line_items=[{"price_data":{"currency":"usd","product_data":{"name":"Kit de Intenção Visual Pro"},"unit_amount":900,"recurring":{"interval":"month"}},"quantity":1}],
            mode="subscription",
            success_url="https://intencao-visual.vercel.app?plano=pro",
            cancel_url="https://intencao-visual.vercel.app",
        )
        return {"url": sessao.url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/meu-plano")
def meu_plano(email: str = Depends(verificar_token)):
    db = SessionLocal()
    usuario = db.query(Usuario).filter(Usuario.email == email).first()
    db.close()
    plano = (usuario.plano or "free") if usuario else "free"
    return {"plano": plano, "kits_usados": usuario.kits_mes_atual or 0 if usuario else 0, "kits_limite": -1}