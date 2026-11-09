#!/usr/bin/env python3
"""Conservatively repair small enclosed alpha holes in existing Papi badge atlases.

No character is regenerated or renumbered. Existing opaque pixels are never changed.
Run against all v2 sheets before publishing; generated assets are versioned in Git.
"""
from pathlib import Path
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parents[1] / "ingilizce" / "parkur-badges" / "v2"
CELL = 256
MAX_HOLE = 220   # leave large intentional spaces (e.g. between wheel spokes)
TOTAL_HOLES = 0


def repair_tile(tile):
    global TOTAL_HOLES
    rgba = np.array(tile.convert("RGBA"), copy=True)
    alpha = rgba[:, :, 3]
    opaque = alpha >= 128
    holes = ndi.binary_fill_holes(opaque) & ~opaque
    labels, count = ndi.label(holes, structure=np.ones((3, 3), dtype=bool))
    if not count:
        return tile, 0
    sizes = np.bincount(labels.ravel())
    eligible = (labels > 0) & (sizes[labels] <= MAX_HOLE)
    if not eligible.any():
        return tile, 0
    # Copy the nearest trustworthy pixel instead of painting a flat color.
    _, nearest = ndi.distance_transform_edt(~opaque, return_indices=True)
    rgba[eligible, :3] = rgba[nearest[0][eligible], nearest[1][eligible], :3]
    rgba[eligible, 3] = 255
    n = int(eligible.sum())
    TOTAL_HOLES += n
    return Image.fromarray(rgba, "RGBA"), n


def repair_file(path):
    image = Image.open(path).convert("RGBA")
    if image.width % CELL or image.height % CELL:
        raise ValueError(f"Unexpected atlas grid: {path} {image.size}")
    output = image.copy()
    fixed = 0
    for y in range(0, image.height, CELL):
        for x in range(0, image.width, CELL):
            tile = image.crop((x, y, x+CELL, y+CELL))
            result, count = repair_tile(tile)
            if count:
                output.paste(result, (x, y))
                fixed += count
    if fixed:
        output.save(path, "WEBP", lossless=True, method=6)
    return fixed


def main():
    if not ROOT.exists():
        raise FileNotFoundError(ROOT)
    fixed = 0
    files = sorted(ROOT.glob("*.webp"))
    if len(files) != 8:
        raise ValueError(f"Expected 8 approved badge atlases, found {len(files)}")
    for file in files:
        n = repair_file(file)
        fixed += n
        print(f"{file.name}: {n} repaired transparent pixels", flush=True)
    print(f"Total repaired pixels: {fixed}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
