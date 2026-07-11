#!/usr/bin/env python3
"""Generate the CELL: INFINITE source app icon (1024×1024 PNG).

Run this, then let the Tauri CLI fan it out into every platform size:

    python3 scripts/generate_icon.py
    npm run tauri icon src-tauri/icon-source.png

The generated icons land in src-tauri/icons/ (git-ignored build artifacts).
Requires Pillow:  pip install pillow
"""
from PIL import Image, ImageDraw, ImageFilter

S = 1024


def main() -> None:
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))

    # Rounded graphite background with a soft vertical gradient.
    bg = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    bgd = ImageDraw.Draw(bg)
    for y in range(S):
        t = y / S
        bgd.line(
            [(0, y), (S, y)],
            fill=(int(10 + 8 * (1 - t)), int(12 + 10 * (1 - t)), int(20 + 14 * (1 - t)), 255),
        )
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, S, S], radius=int(S * 0.22), fill=255)
    img.paste(bg, (0, 0), mask)

    cx, cy = S // 2, S // 2

    # Radial glow, cyan → violet toward the centre.
    glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for rr in range(int(S * 0.42), 0, -6):
        t = rr / (S * 0.42)
        gd.ellipse(
            [cx - rr, cy - rr, cx + rr, cy + rr],
            fill=(int(56 + (150 - 56) * t), int(225 - (225 - 90) * t), 255, int(180 * (1 - t) ** 1.4)),
        )
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(18)))

    # Bright core with a thin containment ring.
    core = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    cd = ImageDraw.Draw(core)
    cr = int(S * 0.17)
    cd.ellipse([cx - cr, cy - cr, cx + cr, cy + cr], fill=(230, 250, 255, 255))
    cr2 = int(S * 0.24)
    cd.ellipse([cx - cr2, cy - cr2, cx + cr2, cy + cr2], outline=(180, 235, 255, 220), width=6)
    img.alpha_composite(core.filter(ImageFilter.GaussianBlur(2)))

    # Orbiting split ring.
    ring = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    rd = ImageDraw.Draw(ring)
    rr = int(S * 0.33)
    rd.arc([cx - rr, cy - rr, cx + rr, cy + rr], start=20, end=200, fill=(138, 123, 255, 220), width=10)
    rd.arc([cx - rr, cy - rr, cx + rr, cy + rr], start=210, end=350, fill=(56, 225, 255, 200), width=10)
    img.alpha_composite(ring)

    img.save("src-tauri/icon-source.png")
    print("wrote src-tauri/icon-source.png", img.size)


if __name__ == "__main__":
    main()
