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
    "assets/reveal-pushpin-src.webp",
    "assets/moodboard-safetypin-src.webp",
]


def remove_bg(path, margin=10, feather=2.5):
    """margin: how far below the lightest border pixel (per channel) the
    cutoff sits. Adaptive per image instead of one fixed threshold, so a
    light-gray studio background or a textured paper background (both
    well below pure white) still gets caught."""
    im = Image.open(path).convert("RGB")
    arr = np.array(im)
    border = np.concatenate([arr[0, :], arr[-1, :], arr[:, 0], arr[:, -1]])
    threshold = border.min(axis=0).astype(int) - margin
    is_bg_color = np.all(arr >= threshold, axis=-1)
    bg_mask = flood_fill_from_border(is_bg_color)
    alpha = np.where(bg_mask, 0, 255).astype(np.uint8)
    alpha_img = Image.fromarray(alpha, mode="L").filter(ImageFilter.GaussianBlur(feather))
    out = im.convert("RGBA")
    out.putalpha(alpha_img)
    out_path = path.rsplit(".", 1)[0].replace("-src", "") + ".png"
    out.save(out_path)
    return out_path, path != out_path


if __name__ == "__main__":
    for f in FILES:
        try:
            out_path, renamed = remove_bg(f)
            print(f"{f} -> {out_path}" + (" (renamed)" if renamed else ""))
        except FileNotFoundError:
            print(f"{f} -> MISSING, skipped")
