"""One-off: remove the white/near-white background from the About page's
moodboard product photos, using connected-component flood fill from the
image border (so enclosed white regions inside the subject, e.g. a donut
hole, are not punched out) plus a light Gaussian feather on the alpha
mask for a clean edge. Run with: python3 scripts/remove_bg.py
"""
import sys
import numpy as np
from PIL import Image, ImageFilter


def flood_fill_from_border(is_bg_color):
    """Boolean mask of pixels that are bg-colored AND reachable from the
    image border by 4-connected bg-colored pixels (avoids scipy, whose
    compiled extension is broken against this numpy install)."""
    visited = np.zeros_like(is_bg_color)
    visited[0, :] = is_bg_color[0, :]
    visited[-1, :] = is_bg_color[-1, :]
    visited[:, 0] = is_bg_color[:, 0]
    visited[:, -1] = is_bg_color[:, -1]
    while True:
        dilated = visited.copy()
        dilated[1:, :] |= visited[:-1, :]
        dilated[:-1, :] |= visited[1:, :]
        dilated[:, 1:] |= visited[:, :-1]
        dilated[:, :-1] |= visited[:, 1:]
        new_visited = dilated & is_bg_color
        if np.array_equal(new_visited, visited):
            return visited
        visited = new_visited

FILES = [
    "assets/reveal-apple.png",
    "assets/reveal-perfume.png",
    "assets/reveal-pushpin.webp",
    "assets/reveal-clock.png",
    "assets/moodboard-moss.webp",
    "assets/moodboard-archiv.png",
    "assets/moodboard-cursor.png",
    "assets/moodboard-safetypin.webp",
    "assets/moodboard-tomato.webp",
    "assets/moodboard-speechbubble.png",
    "assets/moodboard-wing.png",
    "assets/moodboard-figurine.png",
    "assets/moodboard-skincare.png",
    "assets/moodboard-earphones.png",
    "assets/moodboard-candy.png",
    "assets/moodboard-babyfig.png",
    "assets/moodboard-applecake.png",
    "assets/moodboard-peach.png",
    "assets/moodboard-coconut.png",
]


def remove_bg(path, threshold=245, feather=2.5):
    im = Image.open(path).convert("RGB")
    arr = np.array(im)
    is_bg_color = np.all(arr >= threshold, axis=-1)
    bg_mask = flood_fill_from_border(is_bg_color)
    alpha = np.where(bg_mask, 0, 255).astype(np.uint8)
    alpha_img = Image.fromarray(alpha, mode="L").filter(ImageFilter.GaussianBlur(feather))
    out = im.convert("RGBA")
    out.putalpha(alpha_img)
    out_path = path.rsplit(".", 1)[0] + ".png"
    out.save(out_path)
    return out_path, path != out_path


if __name__ == "__main__":
    for f in FILES:
        try:
            out_path, renamed = remove_bg(f)
            print(f"{f} -> {out_path}" + (" (renamed)" if renamed else ""))
        except FileNotFoundError:
            print(f"{f} -> MISSING, skipped")
