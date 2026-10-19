# HEYFANS temsili görsel tanımları — karakterler scripts/db/characters.json'dan okunur.
# Yalnız metinden üretim; referans ekran görüntüsü kullanılmaz. Tüm kişiler yetişkin ve tamamen giyinik.
import json
import os

CHAR_PATH = os.environ["HF_CHARACTERS"]
DATA = json.load(open(CHAR_PATH, encoding="utf-8"))

BRAND = "natural true-to-life colors, soft daylight"

PERSON_NEG = (
    "nsfw, nude, naked, topless, nipples, cleavage, lingerie, bikini, swimsuit, underwear, bra, see-through, sheer, "
    "bare shoulders, off-shoulder, strapless, bare back, backless, crop top, midriff, short shorts, miniskirt, sexy, seductive, "
    "suggestive, provocative, revealing clothes, tongue out, bed, bedroom, "
    "child, kid, teen, teenager, young girl, minor, school uniform, "
    "plastic skin, airbrushed, doll, mannequin, overly smooth skin, heavy makeup, beauty filter, instagram filter, "
    "deformed iris, deformed pupils, semi-realistic, cgi, 3d, render, sketch, cartoon, drawing, anime, painting, "
    "text, watermark, logo, signature, frame, border, cropped head, out of frame, worst quality, low quality, "
    "jpeg artifacts, ugly, duplicate, mutated hands, poorly drawn hands, poorly drawn face, extra fingers, "
    "fused fingers, too many fingers, deformed, blurry, bad anatomy, bad proportions, extra limbs, long neck, cross-eyed"
)
SCENE_NEG = (
    "people, person, woman, girl, man, model, human, face, body, legs, arms, crowd, pink tint, monochrome pink, nsfw, nude, text, watermark, logo, signature, frame, border, "
    "cartoon, anime, painting, cgi, 3d render, worst quality, low quality, jpeg artifacts, blurry, deformed, ugly, duplicate"
)
CANDID_NEG = PERSON_NEG + ", face, looking at camera, portrait, close-up of face"


def portrait_prompt(c):
    # Önemli kısıtlar başta: CLIP 77 token sınırı sondaki ifadeleri keser.
    p = c["portrait"]
    return (
        f"RAW photo, portrait of a {c['age']} year old Turkish woman, {c['look']}, wearing {p['outfit']}, fully clothed, "
        f"{p['setting']}, upper body, natural expression, natural skin texture, soft natural light, 50mm, photorealistic"
    )


def scene_prompt(desc):
    return f"RAW photo, empty scene with no people, {desc}, {BRAND}, beautiful composition, high detail, photorealistic, 35mm lens, authentic social media photo"


def candid_prompt(desc):
    return f"RAW photo, {desc}, modest fully clothed, face not visible, {BRAND}, candid lifestyle photo, high detail, photorealistic, authentic social media photo"


CREATORS = {c["username"]: portrait_prompt(c) for c in DATA["creators"]}
COVERS = {c["username"]: scene_prompt(c["cover"]) for c in DATA["creators"]}
CATEGORIES = {
    "yasam-tarzi": scene_prompt("cozy stylish Istanbul apartment living room with plants, coffee and books"),
    "fitness": scene_prompt("dumbbells, water bottle and towel on a gym bench"),
    "seyahat": scene_prompt("travel flat lay with passport, map of Turkey, camera and sunglasses"),
    "oyun": scene_prompt("gaming controller and headset on a desk with neon lights"),
    "muzik": scene_prompt("studio microphone and headphones with soft bokeh lights"),
    "egitim": scene_prompt("open notebook, books and a laptop on a bright desk"),
    "moda": scene_prompt("clothing rack with elegant garments in a boutique"),
    "sanat": scene_prompt("paint palette, brushes and a colorful canvas"),
    "is-dunyasi": scene_prompt("modern workspace with laptop, notebook and Turkish coffee by a window"),
    "wellness": scene_prompt("candles, yoga mat and eucalyptus in a calm room"),
    "yemek": scene_prompt("traditional Turkish breakfast spread on a rustic table, top view"),
    "ev-yasam": scene_prompt("bright scandinavian home interior with sofa and plants"),
    "evcil-dostlar": scene_prompt("cute ginger cat sleeping on a cozy blanket by a window"),
}
CONTENT = {}
for c in DATA["creators"]:
    for i, item in enumerate(c["content"]):
        if not item.get("img"):
            continue
        prompt = candid_prompt(item["img"]) if item.get("person") else scene_prompt(item["img"])
        neg = CANDID_NEG if item.get("person") else SCENE_NEG
        CONTENT[f"{c['username']}-{i}"] = (prompt, neg, bool(item.get("person")))
