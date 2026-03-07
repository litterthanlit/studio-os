"""
Studio OS — High-Quality Individual Logo Renders
Each mark at 800×800px, 2× retina, crisp gradients via numpy
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
import math, numpy as np, os

FONT_DIR = "/sessions/nifty-relaxed-wozniak/mnt/.skills/skills/canvas-design/canvas-fonts/"
OUT_DIR  = "/sessions/nifty-relaxed-wozniak/mnt/studio OS/studio-os/logo-concepts/"
os.makedirs(OUT_DIR, exist_ok=True)

SZ   = 800          # canvas size (square)
BG   = (250, 250, 248)
NAVY   = np.array([25,  34,  95],  dtype=float)
BLUE   = np.array([36,  48,  173], dtype=float)
BRIGHT = np.array([78, 115, 234],  dtype=float)
WHITE  = np.array([255, 255, 255], dtype=float)

def lerp(a, b, t):
    t = np.clip(t, 0, 1)
    return a + (b - a) * t

def col(arr):
    return tuple(int(v) for v in np.clip(arr, 0, 255))

# ── Fonts ──────────────────────────────────────────────────────────────────────
try:
    f_name  = ImageFont.truetype(FONT_DIR + "BricolageGrotesque-Bold.ttf",   28)
    f_sub   = ImageFont.truetype(FONT_DIR + "GeistMono-Regular.ttf",          20)
    f_idx   = ImageFont.truetype(FONT_DIR + "GeistMono-Regular.ttf",          18)
except:
    f_name = f_sub = f_idx = ImageFont.load_default()

# ── Base canvas factory ────────────────────────────────────────────────────────
def make_canvas():
    img = Image.new("RGB", (SZ, SZ), BG)
    draw = ImageDraw.Draw(img)
    # dot grid
    for x in range(0, SZ, 40):
        for y in range(0, SZ, 40):
            draw.ellipse([x-1.2, y-1.2, x+1.2, y+1.2], fill=(218, 218, 215))
    return img, draw

def add_label(img, draw, name, sub, idx):
    """Bottom label area."""
    draw.line([(SZ//2 - 48, 680), (SZ//2 + 48, 680)], fill=(190,193,215), width=1)
    tw = draw.textlength(name.upper(), font=f_name)
    draw.text((SZ//2 - tw/2, 692), name.upper(), fill=(40, 50, 110), font=f_name)
    tw2 = draw.textlength(sub, font=f_sub)
    draw.text((SZ//2 - tw2/2, 730), sub, fill=(150, 155, 185), font=f_sub)
    # index badge top-right
    draw.text((SZ - 60, 32), f"0{idx}", fill=(190, 195, 220), font=f_idx)

def gradient_circle_np(img, cx, cy, r, c_inner, c_outer):
    """Draw anti-aliased gradient circle via numpy pixel ops."""
    arr = np.array(img, dtype=float)
    ys, xs = np.mgrid[0:SZ, 0:SZ]
    dist = np.sqrt((xs - cx)**2 + (ys - cy)**2)
    mask = dist < r
    t = np.clip(dist / r, 0, 1)
    for ch in range(3):
        base = arr[:,:,ch]
        filled = c_inner[ch] + (c_outer[ch] - c_inner[ch]) * t
        # anti-alias edge
        aa = np.clip((r - dist) / 1.5, 0, 1)
        base[mask] = base[mask] * (1 - aa[mask]) + filled[mask] * aa[mask]
        arr[:,:,ch] = base
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))

def gradient_roundrect_np(img, x, y, w, h, r, c_tl, c_br, alpha=1.0):
    """Draw anti-aliased rounded rect with diagonal gradient."""
    arr = np.array(img, dtype=float)
    ys, xs = np.mgrid[0:SZ, 0:SZ]
    x0, y0, x1, y1 = x, y, x+w, y+h

    # SDF for rounded rect
    qx = np.abs(xs - (x0+x1)/2) - (x1-x0)/2 + r
    qy = np.abs(ys - (y0+y1)/2) - (y1-y0)/2 + r
    dist = np.sqrt(np.maximum(qx,0)**2 + np.maximum(qy,0)**2) - r
    inside = dist < 0.5

    t_diag = np.clip(((xs - x0)/max(w,1) + (ys - y0)/max(h,1)) / 2, 0, 1)
    for ch in range(3):
        filled = c_tl[ch] + (c_br[ch] - c_tl[ch]) * t_diag
        aa = np.clip(0.5 - dist, 0, 1) * alpha
        arr[:,:,ch] = arr[:,:,ch] * (1-aa) + filled * aa
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))

def draw_line_gradient(arr, x0,y0,x1,y1, c0,c1, width=3):
    """Bresenham-style thick line with gradient color."""
    steps = max(abs(x1-x0), abs(y1-y0), 1) * 3
    for i in range(int(steps)+1):
        t = i / steps
        x = int(x0 + (x1-x0)*t)
        y = int(y0 + (y1-y0)*t)
        col_v = c0 + (c1-c0)*t
        r_half = width / 2
        for dx in range(-int(r_half)-1, int(r_half)+2):
            for dy in range(-int(r_half)-1, int(r_half)+2):
                if dx*dx + dy*dy <= r_half*r_half + 0.5:
                    px, py = x+dx, y+dy
                    if 0 <= px < SZ and 0 <= py < SZ:
                        d = math.sqrt(dx*dx+dy*dy)
                        aa = max(0, 1 - max(0, d - r_half))
                        for ch in range(3):
                            arr[py,px,ch] = arr[py,px,ch]*(1-aa) + col_v[ch]*aa
    return arr

# ══════════════════════════════════════════════════════════════════════════════
# 1 — Connected Nodes
# ══════════════════════════════════════════════════════════════════════════════
def mark_connected_nodes():
    img, draw = make_canvas()
    cx, cy = SZ//2, SZ//2 - 20
    S = 130
    nodes = [
        (cx,               cy - int(S*0.78)),
        (cx - int(S*0.68), cy + int(S*0.40)),
        (cx + int(S*0.68), cy + int(S*0.40)),
    ]
    # glow halos
    for nx, ny in nodes:
        for ri in range(52, 0, -2):
            t = ri / 52
            a = int(8 * (1-t))
            c = col(lerp(np.array(BG, dtype=float), BRIGHT, 0.18*(1-t)))
            draw.ellipse([nx-ri, ny-ri, nx+ri, ny+ri], fill=c)

    # connecting lines (gradient segments)
    arr = np.array(img, dtype=float)
    pairs = [(0,1),(1,2),(0,2)]
    for i, j in pairs:
        x0,y0 = nodes[i]; x1,y1 = nodes[j]
        arr = draw_line_gradient(arr, x0,y0,x1,y1, NAVY*0.9, BRIGHT*0.9, width=4)
    img = Image.fromarray(np.clip(arr,0,255).astype(np.uint8))

    # nodes
    radii = [28, 22, 22]
    for (nx, ny), r in zip(nodes, radii):
        # soft outer ring
        img = gradient_circle_np(img, nx, ny, r+10, np.array(BG,dtype=float), BRIGHT*0.25)
        img = gradient_circle_np(img, nx, ny, r,    BRIGHT,                    NAVY)

    add_label(img, ImageDraw.Draw(img), "Connected Nodes", "three linked workspaces", 1)
    img.save(OUT_DIR + "01-connected-nodes.png", dpi=(144,144))
    print("✓ 01 Connected Nodes")


# ══════════════════════════════════════════════════════════════════════════════
# 2 — Abstract Stack
# ══════════════════════════════════════════════════════════════════════════════
def mark_abstract_stack():
    img, draw = make_canvas()
    cx, cy = SZ//2, SZ//2 - 10
    bars = [
        (160, 18, cy - 88),
        (118, 18, cy - 44),
        ( 84, 18, cy),
        ( 56, 18, cy + 44),
        ( 34, 18, cy + 88),
    ]
    arr = np.array(img, dtype=float)
    for i, (bw, bh, by) in enumerate(bars):
        t = i / (len(bars)-1)
        c_l = NAVY + (BLUE - NAVY) * t * 0.4
        c_r = BLUE + (BRIGHT - BLUE) * t
        # draw gradient bar
        x0, x1 = cx - bw//2, cx + bw//2
        r = bh//2
        for px in range(x0, x1+1):
            tt = (px-x0)/max(x1-x0,1)
            col_v = c_l + (c_r-c_l)*tt
            for py in range(int(by)-r, int(by)+r+1):
                if 0 <= py < SZ and 0 <= px < SZ:
                    d_center = abs(py - by)
                    aa = max(0, 1 - max(0, d_center - r + 1))
                    for ch in range(3):
                        arr[py,px,ch] = arr[py,px,ch]*(1-aa) + col_v[ch]*aa
        # rounded end caps
        for side, sx in [(-1, x0), (1, x1)]:
            for dy in range(-r-1, r+2):
                for dx in range(0, r+2):
                    if dx*dx + dy*dy <= r*r:
                        epx = sx - side*dx
                        epy = int(by) + dy
                        if 0 <= epx < SZ and 0 <= epy < SZ:
                            tt2 = 0.0 if side==-1 else 1.0
                            col_v2 = c_l + (c_r-c_l)*tt2
                            d2 = math.sqrt(dx*dx+dy*dy)
                            aa2 = max(0, 1 - max(0, d2 - r + 1))
                            for ch in range(3):
                                arr[epy,epx,ch] = arr[epy,epx,ch]*(1-aa2) + col_v2[ch]*aa2

    img = Image.fromarray(np.clip(arr,0,255).astype(np.uint8))
    add_label(img, ImageDraw.Draw(img), "Abstract Stack", "layered information system", 2)
    img.save(OUT_DIR + "02-abstract-stack.png", dpi=(144,144))
    print("✓ 02 Abstract Stack")


# ══════════════════════════════════════════════════════════════════════════════
# 3 — Split Diamond
# ══════════════════════════════════════════════════════════════════════════════
def mark_split_diamond():
    img, draw = make_canvas()
    cx, cy = SZ//2, SZ//2 - 16
    S = 148

    arr = np.array(img, dtype=float)
    ys, xs = np.mgrid[0:SZ, 0:SZ]

    # Four quadrants of the diamond
    # top-right: navy→bright going diagonally
    for py in range(SZ):
        for px in range(SZ):
            rx, ry = px-cx, py-cy
            norm = abs(rx)/S + abs(ry)/S
            if norm > 1.02: continue
            in_tr = rx >= 0 and ry <= 0
            in_br = rx >= 0 and ry > 0
            in_bl = rx < 0  and ry > 0
            in_tl = rx < 0  and ry <= 0

            if in_tr:
                t = (rx/S - ry/S) / 2
                cv = lerp(NAVY, BRIGHT, np.clip(t*0.9+0.1,0,1))
            elif in_br:
                t = (rx/S + ry/S) / 2
                cv = lerp(lerp(NAVY,BRIGHT,0.45), NAVY, np.clip(t*0.7,0,1))
            elif in_bl:
                t = (-rx/S + ry/S) / 2
                cv = lerp(BLUE, NAVY, np.clip(t*0.7+0.15,0,1))
            else:  # tl
                t = (-rx/S - ry/S) / 2
                cv = lerp(BRIGHT, NAVY*0.9, np.clip(t*0.6+0.2,0,1))

            # edge AA
            aa = np.clip((1.02 - norm) / 0.04, 0, 1)
            bg = np.array(BG, dtype=float)
            cv = lerp(bg, cv, aa)
            for ch in range(3):
                arr[py,px,ch] = cv[ch]

    img = Image.fromarray(np.clip(arr,0,255).astype(np.uint8))
    draw2 = ImageDraw.Draw(img)
    # Dividers
    draw2.line([(cx, cy-S-2),(cx, cy+S+2)], fill=BG, width=3)
    draw2.line([(cx-S-2,cy),(cx+S+2,cy)],   fill=BG, width=3)
    add_label(img, draw2, "Split Diamond", "four-quadrant workspace", 3)
    img.save(OUT_DIR + "03-split-diamond.png", dpi=(144,144))
    print("✓ 03 Split Diamond")


# ══════════════════════════════════════════════════════════════════════════════
# 4 — Converging Paths
# ══════════════════════════════════════════════════════════════════════════════
def mark_converging_paths():
    img, draw = make_canvas()
    cx, cy = SZ//2, SZ//2 - 10
    S = 140

    conv = (cx, cy + int(S*0.52))
    a_start = (cx - int(S*0.72), cy - int(S*0.62))
    b_start = (cx + int(S*0.72), cy - int(S*0.62))
    a_ctrl  = (cx - int(S*0.18), cy + int(S*0.08))
    b_ctrl  = (cx + int(S*0.18), cy + int(S*0.08))

    def bezier(p0, p1, p2, p3, t):
        return (
            (1-t)**3*p0[0] + 3*(1-t)**2*t*p1[0] + 3*(1-t)*t**2*p2[0] + t**3*p3[0],
            (1-t)**3*p0[1] + 3*(1-t)**2*t*p1[1] + 3*(1-t)*t**2*p2[1] + t**3*p3[1],
        )

    steps = 200
    arr = np.array(img, dtype=float)

    for width, layer_alpha in [(22,0.06),(14,0.12),(8,0.3),(4,0.7),(2,1.0)]:
        for path_start, ctrl in [(a_start, a_ctrl), (b_start, b_ctrl)]:
            prev = None
            for i in range(steps+1):
                t = i/steps
                pt = bezier(path_start, ctrl,
                            (cx + (conv[0]-cx)*0.1*(1 if path_start==b_start else -1),
                             cy + int(S*0.35)),
                            conv, t)
                if prev:
                    cv = lerp(BRIGHT, NAVY, t) * layer_alpha + np.array(BG,dtype=float)*(1-layer_alpha)
                    arr = draw_line_gradient(arr,
                        int(prev[0]), int(prev[1]), int(pt[0]), int(pt[1]),
                        lerp(BRIGHT,NAVY,t-0.01), lerp(BRIGHT,NAVY,t+0.01), width=width)
                prev = pt

    img = Image.fromarray(np.clip(arr,0,255).astype(np.uint8))
    # terminal dot
    img = gradient_circle_np(img, conv[0], conv[1], 18, BRIGHT, NAVY)
    add_label(img, ImageDraw.Draw(img), "Converging Paths", "unified creative process", 4)
    img.save(OUT_DIR + "04-converging-paths.png", dpi=(144,144))
    print("✓ 04 Converging Paths")


# ══════════════════════════════════════════════════════════════════════════════
# 5 — Modular Grid
# ══════════════════════════════════════════════════════════════════════════════
def mark_modular_grid():
    img, draw = make_canvas()
    cx, cy = SZ//2, SZ//2 - 16
    SQ = 112; GAP = 18; R = 18
    ox = cx - SQ - GAP//2
    oy = cy - SQ - GAP//2

    mods = [
        (ox,        oy,        NAVY,  BRIGHT),
        (ox+SQ+GAP, oy,        BLUE,  BRIGHT),
        (ox,        oy+SQ+GAP, BLUE,  BRIGHT),
        (ox+SQ+GAP, oy+SQ+GAP, BRIGHT, NAVY),
    ]
    for mx, my, c1, c2 in mods:
        img = gradient_roundrect_np(img, mx, my, SQ, SQ, R, c1, c2, alpha=1.0)

    add_label(img, ImageDraw.Draw(img), "Modular Grid", "structured design system", 5)
    img.save(OUT_DIR + "05-modular-grid.png", dpi=(144,144))
    print("✓ 05 Modular Grid")


# ══════════════════════════════════════════════════════════════════════════════
# 6 — Layered Panels
# ══════════════════════════════════════════════════════════════════════════════
def mark_layered_panels():
    img, draw = make_canvas()
    cx, cy = SZ//2, SZ//2 - 16
    PW, PH, PR = 152, 192, 22

    panels = [
        ( 34, -28, lerp(BRIGHT,WHITE,0.1), NAVY,  0.28),
        ( 16, -12, BLUE,                   BRIGHT, 0.58),
        (  0,   0, NAVY,                   BRIGHT, 1.00),
    ]
    for ox2, oy2, c1, c2, al in panels:
        px = cx - PW//2 + ox2
        py = cy - PH//2 + oy2
        img = gradient_roundrect_np(img, px, py, PW, PH, PR, c1, c2, alpha=al)

    # Two white pill bars on front panel
    bw, bh, br2 = 18, 62, 6
    draw2 = ImageDraw.Draw(img)
    for bx_off in [-bw-10, 10]:
        bx = int(cx + bx_off)
        by2 = int(cy - bh//2 + 8)
        # rounded rect white bar
        draw2.rounded_rectangle([bx, by2, bx+bw, by2+bh], radius=br2, fill=(240,243,255))

    add_label(img, draw2, "Layered Panels", "stacked project workspaces", 6)
    img.save(OUT_DIR + "06-layered-panels.png", dpi=(144,144))
    print("✓ 06 Layered Panels")


# ══════════════════════════════════════════════════════════════════════════════
# OVERVIEW SHEET — 3×2 grid
# ══════════════════════════════════════════════════════════════════════════════
def make_overview():
    OW, OH = 2800, 2000
    sheet = Image.new("RGB", (OW, OH), BG)
    ds = ImageDraw.Draw(sheet)

    # dot grid
    for x in range(0, OW, 52):
        for y in range(0, OH, 52):
            ds.ellipse([x-1.3,y-1.3,x+1.3,y+1.3], fill=(218,218,215))

    # header
    try:
        fh  = ImageFont.truetype(FONT_DIR + "PoiretOne-Regular.ttf",    30)
        fft = ImageFont.truetype(FONT_DIR + "DMMono-Regular.ttf",       19)
    except:
        fh = fft = ImageFont.load_default()

    htxt = "STUDIO OS  —  MARK EXPLORATIONS"
    hw = ds.textlength(htxt, font=fh)
    ds.text((OW/2-hw/2, 64), htxt, fill=(120,128,175), font=fh)
    ds.line([(140,116),(OW-140,116)], fill=(210,213,228), width=1)

    COLS, ROWS, PAD = 3, 2, 140
    CW = (OW - 2*PAD) // COLS
    CH = (OH - 180) // ROWS

    names = [
        "01-connected-nodes.png", "02-abstract-stack.png", "03-split-diamond.png",
        "04-converging-paths.png","05-modular-grid.png",   "06-layered-panels.png",
    ]
    for i, fname in enumerate(names):
        col_i = i % COLS; row_i = i // COLS
        tile_x = PAD + col_i * CW
        tile_y = 130 + row_i * CH
        try:
            tile = Image.open(OUT_DIR + fname)
            tile = tile.resize((CW-20, CH-20), Image.LANCZOS)
            sheet.paste(tile, (tile_x+10, tile_y+10))
        except Exception as e:
            print(f"  Could not load {fname}: {e}")

    # cell dividers
    for c in range(1, COLS):
        xd = PAD + c*CW
        ds.line([(xd,136),(xd,OH-64)], fill=(212,214,228), width=1)
    ds.line([(PAD,130+CH),(OW-PAD,130+CH)], fill=(212,214,228), width=1)

    # footer
    ds.line([(140,OH-60),(OW-140,OH-60)], fill=(210,213,228), width=1)
    ftxt = "IDENTITY CONCEPTS  ·  2024  ·  BRAND IDENTITY SYSTEM"
    fw = ds.textlength(ftxt, font=fft)
    ds.text((OW/2-fw/2, OH-42), ftxt, fill=(170,175,200), font=fft)

    sheet.save(OUT_DIR + "00-overview.png", dpi=(144,144))
    print("✓ 00 Overview sheet")


# ── Run all ────────────────────────────────────────────────────────────────────
print("Generating marks…")
mark_connected_nodes()
mark_abstract_stack()
mark_split_diamond()
mark_converging_paths()
mark_modular_grid()
mark_layered_panels()
make_overview()
print("\nAll done →", OUT_DIR)
