from __future__ import annotations

import json
import math
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pixel-loops"
FRAME_COUNT = 16
BASE_W, BASE_H = 128, 72
SCALE = 4
FRAME_W, FRAME_H = BASE_W * SCALE, BASE_H * SCALE

COLORS = {
    "bg": (18, 6, 43, 255),
    "panel": (31, 17, 71, 255),
    "line": (68, 48, 122, 255),
    "ink": (244, 236, 255, 255),
    "muted": (139, 127, 184, 255),
    "pink": (255, 46, 99, 255),
    "cyan": (8, 217, 214, 255),
    "gold": (255, 210, 63, 255),
    "crust": (190, 135, 55, 255),
    "cheese": (247, 215, 92, 255),
    "pep": (188, 24, 60, 255),
    "green": (66, 198, 92, 255),
    "brown": (152, 104, 62, 255),
    "white": (240, 232, 214, 255),
}


def font():
    return ImageFont.load_default()


def new_frame() -> Image.Image:
    img = Image.new("RGBA", (BASE_W, BASE_H), COLORS["bg"])
    d = ImageDraw.Draw(img)
    for y in range(0, BASE_H, 3):
        d.line((0, y, BASE_W, y), fill=(255, 255, 255, 10))
    d.rectangle((2, 2, BASE_W - 3, BASE_H - 3), outline=COLORS["line"], width=2)
    return img


def rect(d: ImageDraw.ImageDraw, x: float, y: float, w: float, h: float, c: tuple[int, int, int, int]) -> None:
    if w < 1 or h < 1:
        return
    d.rectangle((round(x), round(y), round(x + w - 1), round(y + h - 1)), fill=c)


def outline_rect(d: ImageDraw.ImageDraw, box, c=COLORS["line"], width=1) -> None:
    d.rectangle(tuple(round(v) for v in box), outline=c, width=width)


def draw_pizza(d: ImageDraw.ImageDraw, cx: float, cy: float, s: int, toppings_shift: int = 0, glow: bool = False) -> None:
    if glow:
        d.rectangle((cx - s // 2 - 3, cy - s // 2 - 3, cx + s // 2 + 2, cy + s // 2 + 2), fill=(255, 210, 63, 35))
    # Pixel circle silhouette.
    rows = [0.35, 0.55, 0.75, 0.9, 1.0, 1.0, 0.9, 0.75, 0.55, 0.35]
    step = max(2, s // 10)
    top = cy - step * len(rows) / 2
    for i, r in enumerate(rows):
        w = s * r
        x = cx - w / 2
        y = top + i * step
        rect(d, x, y, w, step, COLORS["crust"])
        rect(d, x + 2, y + 1, max(1, w - 4), max(1, step - 1), COLORS["cheese"])
    toppings = [
        (-9, -8, COLORS["pep"]), (9, -5, COLORS["pep"]), (-2, 6, COLORS["pep"]),
        (-14, 6, COLORS["green"]), (11, 9, COLORS["green"]), (0, -12, COLORS["white"]),
    ]
    for i, (tx, ty, col) in enumerate(toppings):
        ox = ((toppings_shift + i) % 3) - 1
        rect(d, cx + tx + ox, cy + ty, 5, 4, col)


def draw_card(d: ImageDraw.ImageDraw, x: float, y: float, w: int, h: int, color: tuple[int, int, int, int], label: str = "") -> None:
    rect(d, x, y, w, h, COLORS["panel"])
    outline_rect(d, (x, y, x + w, y + h), color, 2)
    rect(d, x + 4, y + 4, w - 8, h - 8, (10, 2, 28, 255))
    if label:
        d.text((x + 6, y + h - 12), label, font=font(), fill=color)


def draw_bg_terminal(d: ImageDraw.ImageDraw, title: str) -> None:
    d.text((7, 6), title, font=font(), fill=COLORS["cyan"])
    d.rectangle((6, 57, 122, 65), outline=COLORS["line"])
    rect(d, 8, 59, 18, 3, COLORS["cyan"])
    rect(d, 28, 59, 10, 3, COLORS["pink"])
    rect(d, 40, 59, 14, 3, COLORS["gold"])


def anim_pizza_core_click() -> list[Image.Image]:
    frames = []
    for f in range(FRAME_COUNT):
        t = f / FRAME_COUNT
        img = new_frame()
        d = ImageDraw.Draw(img)
        draw_bg_terminal(d, "LIVE FEED")
        pulse = math.sin(t * math.tau)
        size = 42 + int(max(0, pulse) * 4) - (3 if f in (2, 3) else 0)
        draw_pizza(d, 64, 35, size, f // 2)
        # Cursor tap.
        tap_y = 44 - min(f, 5) * 2 if f < 6 else 34
        rect(d, 87, tap_y, 4, 12, COLORS["ink"])
        rect(d, 84, tap_y + 5, 10, 4, COLORS["ink"])
        if 2 <= f <= 11:
            for i in range(12):
                a = (i / 12) * math.tau
                dist = (f - 2) * (1.6 + (i % 3) * 0.25)
                x = 64 + math.cos(a) * dist
                y = 35 + math.sin(a) * dist * 0.65
                color = [COLORS["pep"], COLORS["gold"], COLORS["green"], COLORS["crust"]][i % 4]
                rect(d, x, y, 2, 2, color)
            d.text((72, 13 - (f - 2)), "+BYTE", font=font(), fill=COLORS["gold"])
        frames.append(img)
    return frames


def anim_gacha_scan_card() -> list[Image.Image]:
    frames = []
    for f in range(FRAME_COUNT):
        img = new_frame()
        d = ImageDraw.Draw(img)
        draw_bg_terminal(d, "INGREDIENT SCAN")
        # Gacha cabinet.
        rect(d, 13, 18, 32, 38, COLORS["panel"])
        outline_rect(d, (13, 18, 45, 56), COLORS["cyan"], 2)
        rect(d, 18, 23, 22, 12, (6, 1, 20, 255))
        rect(d, 20 + (f % 8), 25, 9, 2, COLORS["cyan"])
        rect(d, 20, 40, 20, 5, COLORS["pink"])
        rect(d, 25, 49, 9, 4, COLORS["gold"])
        # Scanner beam.
        bx = 52 + (f * 4) % 50
        rect(d, bx, 13, 2, 44, (8, 217, 214, 190))
        d.line((bx + 3, 14, bx + 15, 57), fill=(8, 217, 214, 80), width=1)
        # Dropping card.
        card_y = 18 + max(0, f - 4) * 2.2
        card_x = 76 + math.sin(f * 0.7) * 2
        draw_card(d, card_x, card_y, 27, 32, COLORS["gold"], "NEW")
        draw_pizza(d, card_x + 14, card_y + 15, 16, f)
        frames.append(img)
    return frames


def anim_kitchen_bake_timer() -> list[Image.Image]:
    frames = []
    for f in range(FRAME_COUNT):
        img = new_frame()
        d = ImageDraw.Draw(img)
        draw_bg_terminal(d, "BAKE STATION")
        rect(d, 14, 23, 46, 29, COLORS["panel"])
        outline_rect(d, (14, 23, 60, 52), COLORS["pink"], 2)
        rect(d, 20, 30, 34, 14, (9, 2, 26, 255))
        heat = 30 + int(math.sin(f * 0.8) * 8)
        rect(d, 23, 42, heat, 3, COLORS["gold"])
        rect(d, 18, 17, 38, 5, COLORS["line"])
        progress = min(1, f / 11)
        rect(d, 67, 27, 45, 8, COLORS["panel"])
        outline_rect(d, (67, 27, 112, 35), COLORS["line"])
        rect(d, 69, 29, progress * 41, 4, COLORS["cyan"])
        d.text((69, 15), "TIMER", font=font(), fill=COLORS["muted"])
        if f < 12:
            d.text((78, 40), str(max(0, 12 - f)), font=font(), fill=COLORS["gold"])
        else:
            draw_pizza(d, 89, 46 - (f - 12) * 2, 24, f, glow=True)
            d.text((76, 58), "READY!", font=font(), fill=COLORS["cyan"])
        frames.append(img)
    return frames


def anim_dex_book_lightup() -> list[Image.Image]:
    frames = []
    for f in range(FRAME_COUNT):
        img = new_frame()
        d = ImageDraw.Draw(img)
        draw_bg_terminal(d, "RECIPE DEX")
        # Book.
        rect(d, 21, 18, 38, 38, COLORS["panel"])
        rect(d, 59, 18, 38, 38, (26, 14, 58, 255))
        outline_rect(d, (21, 18, 97, 56), COLORS["line"], 2)
        rect(d, 58, 19, 2, 36, COLORS["line"])
        # Flip page.
        flip = abs(math.sin(f / FRAME_COUNT * math.tau))
        rect(d, 58 - flip * 14, 19, 3 + flip * 26, 36, (42, 28, 86, 255))
        # Recipe slots.
        for i in range(6):
            x = 27 + (i % 3) * 21
            y = 25 + (i // 3) * 16
            on = f > 3 + i
            outline_rect(d, (x, y, x + 13, y + 10), COLORS["cyan"] if on else COLORS["line"])
            if on:
                draw_pizza(d, x + 7, y + 5, 8, i, glow=i == (f % 6))
        if f > 9:
            d.text((76, 58), "+1%", font=font(), fill=COLORS["gold"])
        frames.append(img)
    return frames


def anim_idle_line_bytes() -> list[Image.Image]:
    frames = []
    for f in range(FRAME_COUNT):
        img = new_frame()
        d = ImageDraw.Draw(img)
        draw_bg_terminal(d, "IDLE LINE")
        rect(d, 8, 45, 112, 7, COLORS["line"])
        for x in range(-12, 126, 16):
            rect(d, (x + f * 3) % 140 - 10, 47, 8, 2, COLORS["cyan"])
        for i, x in enumerate([22, 50, 78]):
            rect(d, x, 24, 18, 17, COLORS["panel"])
            outline_rect(d, (x, 24, x + 18, 41), COLORS["pink"] if i == 1 else COLORS["line"])
            rect(d, x + 4, 29, 10, 7, COLORS["gold"] if (f + i) % 4 < 2 else COLORS["crust"])
        draw_pizza(d, (f * 7) % 116 + 6, 47, 13, f)
        for i in range(3):
            y = 16 - ((f + i * 3) % 8)
            d.text((88 + i * 9, y), "+8", font=font(), fill=COLORS["gold"] if i % 2 else COLORS["cyan"])
        frames.append(img)
    return frames


def anim_golden_pizza_bonus() -> list[Image.Image]:
    frames = []
    for f in range(FRAME_COUNT):
        img = new_frame()
        d = ImageDraw.Draw(img)
        draw_bg_terminal(d, "BONUS EVENT")
        cx = 64 + math.sin(f * 0.45) * 4
        cy = 35 + math.sin(f * 0.8) * 3
        for r in range(30, 10, -6):
            alpha = max(20, 70 - r)
            d.rectangle((cx - r // 2, cy - r // 2, cx + r // 2, cy + r // 2), fill=(255, 210, 63, alpha))
        draw_pizza(d, cx, cy, 33 + (f % 4), 3, glow=True)
        if f >= 5:
            for i in range(10):
                a = i / 10 * math.tau
                dist = (f - 5) * 2.1
                rect(d, cx + math.cos(a) * dist, cy + math.sin(a) * dist * 0.7, 3, 3, [COLORS["gold"], COLORS["cyan"], COLORS["pink"]][i % 3])
            d.text((80, 16 - (f - 5)), "+PULL", font=font(), fill=COLORS["cyan"])
            d.text((82, 27 - (f - 5)), "+BYTE", font=font(), fill=COLORS["gold"])
        frames.append(img)
    return frames


ANIMS = [
    ("pizza-core-click", "披萨核心被点击，碎屑飞出", anim_pizza_core_click),
    ("gacha-scan-card", "抽卡机扫描并掉出食材卡", anim_gacha_scan_card),
    ("kitchen-bake-timer", "厨房烘焙台倒计时，披萨出炉", anim_kitchen_bake_timer),
    ("dex-book-lightup", "图鉴书翻页，配方格子点亮", anim_dex_book_lightup),
    ("idle-line-bytes", "挂机产线运行，字节数字跳动", anim_idle_line_bytes),
    ("golden-pizza-bonus", "金色披萨奖励出现并爆出字节", anim_golden_pizza_bonus),
]


def scale(img: Image.Image) -> Image.Image:
    return img.resize((FRAME_W, FRAME_H), Image.Resampling.NEAREST)


def save_animation(slug: str, title: str, frames: list[Image.Image]) -> dict:
    anim_dir = OUT / slug
    frames_dir = anim_dir / "frames"
    frames_dir.mkdir(parents=True, exist_ok=True)
    scaled = [scale(frame) for frame in frames]
    for i, frame in enumerate(scaled):
        frame.save(frames_dir / f"{slug}_{i:03d}.png")

    sheet = Image.new("RGBA", (FRAME_W * len(scaled), FRAME_H), (0, 0, 0, 0))
    for i, frame in enumerate(scaled):
        sheet.paste(frame, (i * FRAME_W, 0))
    sheet_path = anim_dir / f"{slug}_spritesheet.png"
    sheet.save(sheet_path)

    meta = {
        "slug": slug,
        "title": title,
        "style": "cute 8-bit pixel art, bright colors, bouncy loop",
        "frame_width": FRAME_W,
        "frame_height": FRAME_H,
        "frame_count": len(scaled),
        "spritesheet": sheet_path.name,
        "spritesheet_columns": len(scaled),
        "loop": True,
        "recommended_fps": 12,
        "frames_pattern": f"frames/{slug}_###.png",
    }
    (anim_dir / "metadata.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    return meta


def save_contact_sheet(metas: list[dict], first_frames: list[Image.Image]) -> None:
    thumb_w, thumb_h = FRAME_W // 2, FRAME_H // 2
    contact = Image.new("RGBA", (thumb_w * 2, (thumb_h + 24) * 3), COLORS["bg"])
    d = ImageDraw.Draw(contact)
    for idx, (meta, frame) in enumerate(zip(metas, first_frames)):
        x = (idx % 2) * thumb_w
        y = (idx // 2) * (thumb_h + 24)
        contact.paste(frame.resize((thumb_w, thumb_h), Image.Resampling.NEAREST), (x, y))
        d.text((x + 6, y + thumb_h + 5), meta["slug"], font=font(), fill=COLORS["cyan"])
    contact.save(OUT / "contact-sheet.png")


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True, exist_ok=True)

    metas = []
    first_frames = []
    for slug, title, factory in ANIMS:
        frames = factory()
        metas.append(save_animation(slug, title, frames))
        first_frames.append(scale(frames[0]))

    index = {
        "asset_pack": "digital-pizza-factory-pixel-loops",
        "description": "6 cute 8-bit horizontal looping animations inspired by the pizza factory website.",
        "frame_width": FRAME_W,
        "frame_height": FRAME_H,
        "frame_count_per_animation": FRAME_COUNT,
        "recommended_fps": 12,
        "animations": metas,
    }
    (OUT / "manifest.json").write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")
    save_contact_sheet(metas, first_frames)
    print(f"Generated {len(metas)} animations in {OUT}")


if __name__ == "__main__":
    main()
