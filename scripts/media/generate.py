"""Kullanım:
  python -I generate.py candidates <models_dir> <out_dir> [kind] [n]
  python -I generate.py finalize   <models_dir> <out_dir> <selection.json> <export_dir>
kind: portraits | covers | categories | content | all
"""
import json
import os
import sys

import torch
from diffusers import AutoencoderKL, DPMSolverMultistepScheduler, StableDiffusionImg2ImgPipeline, StableDiffusionPipeline
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import specs  # noqa: E402

SIZES = {"portraits": (512, 704), "covers": (768, 448), "categories": (640, 480), "content": (640, 480)}


def load(models_dir):
    vae = AutoencoderKL.from_pretrained(os.path.join(models_dir, "vae"), torch_dtype=torch.float16)
    pipe = StableDiffusionPipeline.from_single_file(
        os.path.join(models_dir, "rv6_fp16.safetensors"), torch_dtype=torch.float16, vae=vae, safety_checker=None, requires_safety_checker=False
    )
    pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config, use_karras_sigmas=True, algorithm_type="dpmsolver++")
    pipe = pipe.to("cuda")
    pipe.set_progress_bar_config(disable=True)
    img2img = StableDiffusionImg2ImgPipeline(**pipe.components).to("cuda")
    img2img.set_progress_bar_config(disable=True)
    return pipe, img2img


def jobs(kind):
    """(grup, anahtar, istem, olumsuz istem, aday sayısı)"""
    out = []
    if kind in ("portraits", "all"):
        out += [("portraits", k, p, specs.PERSON_NEG, 3) for k, p in specs.CREATORS.items()]
    if kind in ("covers", "all"):
        out += [("covers", k, p, specs.SCENE_NEG, 2) for k, p in specs.COVERS.items()]
    if kind in ("categories", "all"):
        out += [("categories", k, p, specs.SCENE_NEG, 2) for k, p in specs.CATEGORIES.items()]
    if kind in ("content", "all"):
        out += [("content", k, p, neg, 2 if person else 1) for k, (p, neg, person) in specs.CONTENT.items()]
    return out


def candidates(models_dir, out_dir, kind="all", n=0, only=None):
    pipe, _ = load(models_dir)
    os.makedirs(out_dir, exist_ok=True)
    for group, key, prompt, neg, default_n in jobs(kind):
        if only and key not in only:
            continue
        w, h = SIZES[group]
        for s in range(n or default_n):
            seed = 1000 + s * 7919 + sum(map(ord, key))
            path = os.path.join(out_dir, f"{group}__{key}__{s}.png")
            if os.path.exists(path):
                continue
            g = torch.Generator("cuda").manual_seed(seed)
            img = pipe(prompt, negative_prompt=neg, width=w, height=h, num_inference_steps=30, guidance_scale=5.5, generator=g).images[0]
            img.save(path)
        print("ok", group, key, flush=True)
    sheets(out_dir)


def sheets(out_dir):
    """Gözden geçirme için grup bazlı numaralı temas tabakaları."""
    files = sorted(f for f in os.listdir(out_dir) if f.endswith(".png") and "__" in f)
    by_group = {}
    for f in files:
        by_group.setdefault(f.split("__")[0], []).append(f)
    for group, fs in by_group.items():
        thumbs = []
        for f in fs:
            im = Image.open(os.path.join(out_dir, f)).convert("RGB")
            im.thumbnail((220, 220))
            canvas = Image.new("RGB", (224, 240), "white")
            canvas.paste(im, (2, 2))
            ImageDraw.Draw(canvas).text((4, 224), f.replace(".png", "").split("__", 1)[1], fill=(0, 0, 0))
            thumbs.append(canvas)
        cols = 6
        rows = (len(thumbs) + cols - 1) // cols
        sheet = Image.new("RGB", (224 * cols, 240 * rows), "white")
        for i, t in enumerate(thumbs):
            sheet.paste(t, ((i % cols) * 224, (i // cols) * 240))
        sheet.save(os.path.join(out_dir, f"sheet_{group}.jpg"), quality=85)


def finalize(models_dir, out_dir, selection_path, export_dir):
    """Seçilen adaylar: 1.5x büyütme + düşük güçlü img2img (hires fix) → WebP."""
    _, img2img = load(models_dir)
    selection = json.load(open(selection_path, encoding="utf-8"))
    os.makedirs(export_dir, exist_ok=True)
    prompts = {}
    for group, key, prompt, neg, _n in jobs("all"):
        prompts[(group, key)] = (prompt, neg)
    manifest = []
    for item in selection:
        group, key, idx = item["group"], item["key"], item["idx"]
        src = Image.open(os.path.join(out_dir, f"{group}__{key}__{idx}.png")).convert("RGB")
        w, h = src.size
        up = src.resize((int(w * 1.5) // 8 * 8, int(h * 1.5) // 8 * 8), Image.LANCZOS)
        prompt, neg = prompts[(group, key)]
        g = torch.Generator("cuda").manual_seed(42 + idx)
        out = img2img(prompt, negative_prompt=neg, image=up, strength=0.33, num_inference_steps=24, guidance_scale=5.0, generator=g).images[0]
        name = {"portraits": f"creators/{key}-portrait.webp", "covers": f"creators/{key}-cover.webp", "categories": f"categories/{key}.webp", "content": f"content/{key}.webp"}[group]
        # İçerik görselleri ücretli/özel olabileceği için public/ yerine seed medya klasörüne (seed depolamaya yükler)
        base = os.environ["HF_PRIVATE_EXPORT"] if group == "content" else export_dir
        dest = os.path.join(base, name)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        out.save(dest, "WEBP", quality=86, method=6)
        manifest.append({"file": ("seed-media/" if group == "content" else "/images/seed/") + name, "group": group, "key": key, "width": out.size[0], "height": out.size[1], "origin": "generated", "model": "Realistic Vision V6.0 B1 (CreativeML OpenRAIL-M)", "prompt": prompt})
        print("final", name, flush=True)
    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "manifest.json"), "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "candidates":
        candidates(sys.argv[2], sys.argv[3], sys.argv[4] if len(sys.argv) > 4 else "all", int(sys.argv[5]) if len(sys.argv) > 5 else 0, set(sys.argv[6].split(",")) if len(sys.argv) > 6 else None)
    elif cmd == "sheets":
        sheets(sys.argv[2])
    elif cmd == "finalize":
        finalize(sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5])
