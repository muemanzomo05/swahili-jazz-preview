"""Build optimized WebP derivatives for the site from the supplied Assets/.

    python build/build-images.py     (needs Pillow)

Writes static/img/** plus manifest.json, which build/generate.mjs reads to
emit accurate srcset widths. Never upscales: a requested width is clamped to
the source size while keeping the requested filename.
"""
import os, json, shutil
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "Assets")
OUT = os.path.join(ROOT, "static", "img")
Image.MAX_IMAGE_PIXELS = None

if os.path.isdir(OUT):
    shutil.rmtree(OUT)
os.makedirs(OUT)

manifest = {}
total = [0, 0.0]


# Three supplied photos carry third-party watermarks burnt into the pixels.
# The band is trimmed off here, before any crop, so every derivative of that
# source is clean no matter where it is used.
#   43655174…  "#GalleryKhately" across the lower left
#   480328604… a coloured photographer badge, lower left
#   89945664…  "ED&FRAY Photography 2012. All Rights Reserved."
WATERMARK_TRIM = {
    "43655174_2245029319063944_7382900566797582336_n.jpg": 0.13,
    "480328604_4044623399104518_6663332959742383511_n.jpg": 0.17,
    "89945664_2621442111422661_2273650180630773760_n.jpg": 0.23,
}


def load(name):
    im = ImageOps.exif_transpose(Image.open(os.path.join(SRC, name)))
    cut = WATERMARK_TRIM.get(name)
    if cut:
        im = im.crop((0, 0, im.width, int(im.height * (1 - cut))))
    return im


def emit(im, rel, q=82, alpha=False):
    path = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im = im.convert("RGBA" if alpha else "RGB")
    im.save(path, "WEBP", quality=q, method=6)
    kb = os.path.getsize(path) / 1024
    total[0] += 1
    total[1] += kb
    return im.width, im.height, kb


def cover(name, slug, ratio, labels, focus=(0.5, 0.4), q=82):
    """Crop to ratio around focus; emit one file per label width.

    Requested widths are clamped to the native size (never upscale), but the
    FILENAME always uses the requested label so markup stays predictable.
    Real pixel widths are recorded in the manifest for accurate srcset.
    """
    im = load(name).convert("RGB")
    tw, th = im.width, int(round(im.width / ratio))
    if th > im.height:
        th, tw = im.height, int(round(im.height * ratio))
    x = int((im.width - tw) * focus[0])
    y = int((im.height - th) * focus[1])
    im = im.crop((x, y, x + tw, y + th))

    entries, seen = [], {}
    for label in labels:
        w = min(label, im.width)
        h = max(1, int(round(w / ratio)))
        rel = f"{slug}-{label}.webp"
        if w in seen:                      # identical pixels -> copy, keep name
            shutil.copy(os.path.join(OUT, seen[w]), os.path.join(OUT, rel))
            entries.append({"src": rel.replace("\\", "/"), "w": w})
            continue
        rw, rh, kb = emit(im.resize((w, h), Image.LANCZOS), rel, q)
        seen[w] = rel
        entries.append({"src": rel.replace("\\", "/"), "w": rw})
        print(f"  {rel:36s} {rw:5d}x{rh:<5d} {kb:7.1f} KB")
    manifest[slug] = entries
    return entries


print("hero")
cover("home-hero-2026.png", "hero", 3 / 2, [1536, 1100, 760], focus=(0.5, 0.5), q=80)
cover("home-hero-2026.png", "hero-portrait", 3 / 4, [900, 620], focus=(0.5, 0.5), q=80)

print("about / studio")
cover("studio.png", "studio", 5 / 4, [1240, 900, 640], focus=(0.5, 0.5))

print("services")
for f, slug, foc in [
    ("43655174_2245029319063944_7382900566797582336_n.jpg", "svc-live", (0.5, 0.40)),
    ("53218975_2326026067630935_7309705124253794304_n.jpg", "svc-agency", (0.5, 0.40)),
    ("480555761_4044623175771207_812781330418235097_n.jpg", "svc-events", (0.5, 0.40)),
    ("studio.png", "svc-record", (0.5, 0.50)),
    ("59295909_2368651253368416_6739314109927391232_n.jpg", "svc-artist", (0.5, 0.40)),
]:
    cover(f, slug, 4 / 3, [900, 620], focus=foc, q=80)

print("why-choose background")
cover("why choose us.png", "why-bg", 5 / 2, [2000, 1400, 900], focus=(0.5, 0.5), q=76)

print("gallery")
GALLERY = [
    ("43655174_2245029319063944_7382900566797582336_n.jpg", (0.5, 0.35)),
    ("collab.png", (0.5, 0.40)),
    ("National Hero.png", (0.5, 0.40)),
    ("59787536_2368651173368424_4421678224325476352_n.jpg", (0.5, 0.40)),
    ("53556623_2336371169929758_4009656587076501504_n.jpg", (0.5, 0.45)),
    ("480555761_4044623175771207_812781330418235097_n.jpg", (0.5, 0.40)),
    ("Jimmy Dludlu.png", (0.5, 0.35)),
    ("53110679_2336371203263088_775428956286353408_n.jpg", (0.5, 0.40)),
    ("480328604_4044623399104518_6663332959742383511_n.jpg", (0.5, 0.40)),
    ("59295909_2368651253368416_6739314109927391232_n.jpg", (0.5, 0.40)),
]
for i, (f, foc) in enumerate(GALLERY, 1):
    cover(f, f"gallery/g{i:02d}", 16 / 9, [1600, 1000], focus=foc, q=80)
    cover(f, f"gallery/g{i:02d}-thumb", 4 / 3, [260], focus=foc, q=74)

print("service page banners")
PAGE_HERO = {
    "live-entertainment": ("43655174_2245029319063944_7382900566797582336_n.jpg", (0.5, 0.34)),
    "entertainment-agency": ("53218975_2326026067630935_7309705124253794304_n.jpg", (0.5, 0.36)),
    "events-production": ("480328604_4044623399104518_6663332959742383511_n.jpg", (0.5, 0.40)),
    "record-label": ("studio.png", (0.5, 0.50)),
    "artist-management": ("Macho Man.jpeg", (0.5, 0.30)),
}
for slug, (f, foc) in PAGE_HERO.items():
    cover(f, f"pages/{slug}-hero", 2.4, [1800, 1200, 800], focus=foc, q=78)

print("service page feature images (5:4)")
PAGE_FEATURE = {
    "live-entertainment": ("89945664_2621442111422661_2273650180630773760_n.jpg", (0.5, 0.35)),
    "entertainment-agency": ("59787536_2368651173368424_4421678224325476352_n.jpg", (0.5, 0.40)),
    "events-production": ("480555761_4044623175771207_812781330418235097_n.jpg", (0.5, 0.40)),
    "record-label": ("WhatsApp Image 2026-08-01 at 1.55.24 PM (2).jpeg", (0.5, 0.45)),
    "artist-management": ("WhatsApp Image 2026-08-01 at 3.53.48 PM.jpeg", (0.5, 0.30)),
}
for slug, (f, foc) in PAGE_FEATURE.items():
    cover(f, f"pages/{slug}-feature", 5 / 4, [900, 620], focus=foc, q=80)

print("service page media grids (4:3)")
PAGE_MEDIA = {
    "live-entertainment": [
        ("43655174_2245029319063944_7382900566797582336_n.jpg", (0.5, 0.35)),
        ("53218975_2326026067630935_7309705124253794304_n.jpg", (0.5, 0.38)),
        ("480328604_4044623399104518_6663332959742383511_n.jpg", (0.5, 0.40)),
        ("53556623_2336371169929758_4009656587076501504_n.jpg", (0.5, 0.45)),
        ("59787536_2368651173368424_4421678224325476352_n.jpg", (0.5, 0.40)),
        ("53110679_2336371203263088_775428956286353408_n.jpg", (0.5, 0.40)),
        ("487503460_4088586334708224_685374931644666226_n.jpg", (0.5, 0.40)),
        ("53794367_2336371269929748_4937209531185758208_n.jpg", (0.5, 0.40)),
    ],
    "entertainment-agency": [
        ("59295909_2368651253368416_6739314109927391232_n.jpg", (0.5, 0.40)),
        ("480555761_4044623175771207_812781330418235097_n.jpg", (0.5, 0.40)),
        ("Jimmy Dludlu.png", (0.5, 0.35)),
        ("53503873_2336371856596356_5397682647256268800_n.jpg", (0.5, 0.45)),
    ],
    "events-production": [
        ("480328604_4044623399104518_6663332959742383511_n.jpg", (0.5, 0.40)),
        ("53556623_2336371169929758_4009656587076501504_n.jpg", (0.5, 0.45)),
        ("87818679_2609259549307584_2460358172834004992_n.jpg", (0.5, 0.35)),
        ("58902214_2365340540366154_6881347157987688448_n.jpg", (0.5, 0.35)),
    ],
    "record-label": [
        ("studio.png", (0.5, 0.50)),
        ("WhatsApp Image 2026-08-01 at 1.55.24 PM.jpeg", (0.5, 0.45)),
        ("WhatsApp Image 2026-08-01 at 1.55.24 PM (1).jpeg", (0.5, 0.45)),
        ("WhatsApp Image 2026-08-01 at 1.58.13 PM.jpeg", (0.5, 0.40)),
    ],
    "artist-management": [
        ("Tutu3.jpg", (0.5, 0.28)),
        ("Macho Man.jpeg", (0.5, 0.30)),
        ("WhatsApp Image 2026-08-01 at 3.53.48 PM (3).jpeg", (0.5, 0.30)),
        ("M an Tutu.jpeg", (0.5, 0.35)),
    ],
}
for slug, items in PAGE_MEDIA.items():
    for i, (f, foc) in enumerate(items, 1):
        cover(f, f"pages/{slug}-m{i}", 4 / 3, [760, 520], focus=foc, q=80)

print("logo + favicons")
lg = load("Logo.png").convert("RGBA")
lg = lg.crop(lg.getbbox())
logo_entries = []
for w in (320, 160, 96):
    h = int(round(lg.height * w / lg.width))
    rw, rh, kb = emit(lg.resize((w, h), Image.LANCZOS), f"logo-{w}.webp", 90, alpha=True)
    logo_entries.append({"src": f"logo-{w}.webp", "w": rw})
    print(f"  logo-{w}.webp {rw}x{rh} {kb:.1f} KB")
manifest["logo"] = logo_entries
for px in (180, 32):
    ic = lg.resize((px, int(round(lg.height * px / lg.width))), Image.LANCZOS)
    canvas = Image.new("RGBA", (px, px), (0, 0, 0, 0))
    canvas.paste(ic, (0, (px - ic.height) // 2), ic)
    canvas.save(os.path.join(OUT, f"icon-{px}.png"))
    print(f"  icon-{px}.png")

print("client logos")
for f in ["absa-logo-bg.png", "acek-logo.webp", "icipe-logo-monochrome.png",
          "rotary-clubs-of-kenya.webp", "safaricom.png", "safaricom-international-jazz-festival.png"]:
    im = load(f).convert("RGBA")
    if im.width > 400:
        im = im.resize((400, int(round(im.height * 400 / im.width))), Image.LANCZOS)
    slug = os.path.splitext(f)[0]
    rw, rh, kb = emit(im, f"clients/{slug}.webp", 88, alpha=True)
    manifest[f"client:{slug}"] = [{"src": f"clients/{slug}.webp", "w": rw, "h": rh}]
    print(f"  clients/{slug}.webp {rw}x{rh} {kb:.1f} KB")

with open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8") as fh:
    json.dump(manifest, fh, indent=1)

missing = [k for k, v in manifest.items() if not v]
print(f"\n{total[0]} files, {total[1]/1024:.2f} MB. empty slugs: {missing or 'none'}")
