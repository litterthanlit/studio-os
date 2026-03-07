from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math

FONT_DIR = "/sessions/nifty-relaxed-wozniak/mnt/.skills/skills/canvas-design/canvas-fonts/"

W, H = 2400, 1600
SCALE = 2  # retina

BG        = (248, 248, 245)
NAVY      = (25,  34, 95)
BLUE      = (36,  48, 173)
BRIGHT    = (65,  98, 224)
LIGHT     = (140, 170, 240)

img = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(img)

# ─── Fonts ────────────────────────────────────────────────────────────────────
try:
    font_label  = ImageFont.truetype(FONT_DIR + "Outfit-Regular.ttf", 22)
    font_sub    = ImageFont.truetype(FONT_DIR + "GeistMono-Regular.ttf", 17)
    font_header = ImageFont.truetype(FONT_DIR + "PoiretOne-Regular.ttf", 26)
    font_footer = ImageFont.truetype(FONT_DIR + "DMMono-Regular.ttf", 17)
except:
    font_label = font_sub = font_header = font_footer = ImageFont.load_default()

# ─── Dot grid ─────────────────────────────────────────────────────────────────
for x in range(0, W, 48):
    for y in range(0, H, 48):
        draw.ellipse([x-1.4, y-1.4, x+1.4, y+1.4], fill=(0,0,0,20) if img.mode == "RGBA" else (230,230,227))

# ─── Header ───────────────────────────────────────────────────────────────────
title = "STUDIO OS  —  MARK EXPLORATIONS"
tw = draw.textlength(title, font=font_header)
draw.text((W/2 - tw/2, 60), title, fill=(25,34,95,90) if img.mode=="RGBA" else (170,175,200), font=font_header)
draw.line([(120, 108), (W-120, 108)], fill=(200,202,220), width=1)

# ─── Grid: 3 cols × 2 rows ────────────────────────────────────────────────────
COLS, ROWS = 3, 2
CELL_W = (W - 240) // COLS
CELL_H = (H - 180) // ROWS
PAD_TOP = 120

def cell_center(col, row):
    return (120 + col*CELL_W + CELL_W//2,
            PAD_TOP + row*CELL_H + CELL_H//2)

def lerp_color(c1, c2, t):
    return tuple(int(c1[i] + (c2[i]-c1[i])*t) for i in range(3))

def mark_label(name, sub, cx, cy, mark_half_h):
    y0 = int(cy + mark_half_h + 28)
    # divider
    draw.line([(cx-40, y0), (cx+40, y0)], fill=(180,183,210), width=1)
    # name
    tw = draw.textlength(name.upper(), font=font_label)
    draw.text((cx - tw/2, y0+8), name.upper(), fill=(80,88,140), font=font_label)
    # sub
    tw2 = draw.textlength(sub, font=font_sub)
    draw.text((cx - tw2/2, y0+36), sub, fill=(160,165,195), font=font_sub)


# ─── Helper: gradient circle ──────────────────────────────────────────────────
def gradient_circle(cx, cy, r, c_inner, c_outer):
    """Draw a filled circle with radial gradient approximation."""
    steps = int(r)
    for i in range(steps, 0, -1):
        t = 1 - i/steps
        col = lerp_color(c_outer, c_inner, t)
        draw.ellipse([cx-i, cy-i, cx+i, cy+i], fill=col)

def gradient_rect_h(x0, y0, x1, y1, c_left, c_right, radius=0):
    """Horizontal gradient rect drawn as vertical stripes."""
    for x in range(int(x0), int(x1)):
        t = (x - x0) / max(x1 - x0, 1)
        col = lerp_color(c_left, c_right, t)
        draw.line([(x, y0), (x, y1)], fill=col)

def rounded_rect_gradient(x, y, w, h, r, c_tl, c_br):
    """Draw rounded rect with diagonal gradient."""
    for px in range(int(x), int(x+w)):
        for py in range(int(y), int(y+h)):
            # Corner masking
            in_tl = (px < x+r and py < y+r and (px-x-r)**2+(py-y-r)**2 > r**2)
            in_tr = (px > x+w-r and py < y+r and (px-x-w+r)**2+(py-y-r)**2 > r**2)
            in_bl = (px < x+r and py > y+h-r and (px-x-r)**2+(py-y-h+r)**2 > r**2)
            in_br_c = (px > x+w-r and py > y+h-r and (px-x-w+r)**2+(py-y-h+r)**2 > r**2)
            if in_tl or in_tr or in_bl or in_br_c:
                continue
            t = ((px-x)/w + (py-y)/h) / 2
            col = lerp_color(c_tl, c_br, t)
            img.putpixel((px, py), col)


# ══════════════════════════════════════════════════════════════════════════════
# MARK 1 — Connected Nodes
# ══════════════════════════════════════════════════════════════════════════════
cx, cy = cell_center(0, 0)
S = 88
nodes = [
    (cx,        cy - int(S*0.72)),
    (cx - int(S*0.62), cy + int(S*0.36)),
    (cx + int(S*0.62), cy + int(S*0.36)),
]

# Glow halos
for nx, ny in nodes:
    for ri in range(36, 0, -1):
        t = ri/36
        alpha = int(18 * (1-t))
        col = lerp_color(BG, BRIGHT, t*0.15)
        draw.ellipse([nx-ri, ny-ri, nx+ri, ny+ri], fill=col)

# Lines between nodes (gradient simulation via segments)
for i in range(len(nodes)):
    for j in range(i+1, len(nodes)):
        x0, y0 = nodes[i]
        x1, y1 = nodes[j]
        steps = 60
        for s in range(steps):
            t0, t1 = s/steps, (s+1)/steps
            px0 = int(x0 + (x1-x0)*t0); py0 = int(y0 + (y1-y0)*t0)
            px1 = int(x0 + (x1-x0)*t1); py1 = int(y0 + (y1-y0)*t1)
            col = lerp_color(NAVY, BRIGHT, (t0+t1)/2)
            draw.line([(px0,py0),(px1,py1)], fill=col, width=3)

# Filled nodes
radii = [20, 16, 16]
for (nx, ny), r in zip(nodes, radii):
    gradient_circle(nx, ny, r, BRIGHT, NAVY)

mark_label("Connected Nodes", "three linked workspaces", cx, cy, int(S*0.72)+20)


# ══════════════════════════════════════════════════════════════════════════════
# MARK 2 — Abstract Stack
# ══════════════════════════════════════════════════════════════════════════════
cx, cy = cell_center(1, 0)
bars = [
    (110, 14, cy - 58),
    ( 80, 14, cy - 22),
    ( 56, 14, cy + 14),
    ( 36, 14, cy + 50),
]
for i, (bw, bh, by) in enumerate(bars):
    t = i / (len(bars)-1)
    c_l = lerp_color(NAVY, BLUE, t*0.3)
    c_r = lerp_color(BLUE, BRIGHT, t)
    x0 = cx - bw//2; x1 = cx + bw//2
    r = bh//2
    # Draw as gradient horizontal stripe
    for px in range(x0, x1+1):
        tt = (px - x0) / max(x1-x0, 1)
        col = lerp_color(c_l, c_r, tt)
        draw.line([(px, by-r), (px, by+r)], fill=col)
    # Rounded end caps
    draw.ellipse([x0-r, by-r, x0+r, by+r],
                 fill=lerp_color(NAVY, BLUE, t*0.3))
    draw.ellipse([x1-r, by-r, x1+r, by+r],
                 fill=lerp_color(BLUE, BRIGHT, t))

mark_label("Abstract Stack", "layered information system", cx, cy, 58+7)


# ══════════════════════════════════════════════════════════════════════════════
# MARK 3 — Split Diamond
# ══════════════════════════════════════════════════════════════════════════════
cx, cy = cell_center(2, 0)
S = 76

def fill_triangle(pts, fill):
    draw.polygon(pts, fill=fill)

# Four quadrant fills
quads = [
    [(cx, cy-S), (cx, cy), (cx+S, cy)],  # top-right
    [(cx+S, cy), (cx, cy), (cx, cy+S)],  # bottom-right
    [(cx, cy+S), (cx, cy), (cx-S, cy)],  # bottom-left
    [(cx-S, cy), (cx, cy), (cx, cy-S)],  # top-left
]
fills = [NAVY, lerp_color(BRIGHT, NAVY, 0.45), NAVY, lerp_color(BRIGHT, NAVY, 0.45)]
for q, f in zip(quads, fills):
    fill_triangle(q, f)

# Cross dividers
draw.line([(cx, cy-S-2), (cx, cy+S+2)], fill=BG, width=3)
draw.line([(cx-S-2, cy), (cx+S+2, cy)], fill=BG, width=3)

# Outer edge (no fill, just outline suggestion via 1px lighter)
mark_label("Split Diamond", "four quadrant workspace", cx, cy, S)


# ══════════════════════════════════════════════════════════════════════════════
# MARK 4 — Converging Paths
# ══════════════════════════════════════════════════════════════════════════════
cx, cy = cell_center(0, 1)
S = 80

convergence = (cx, cy + int(S*0.5))
ax0, ay0 = cx - int(S*0.75), cy - int(S*0.6)
bx0, by0 = cx + int(S*0.75), cy - int(S*0.6)

def bezier_point(p0, p1, p2, p3, t):
    x = (1-t)**3*p0[0] + 3*(1-t)**2*t*p1[0] + 3*(1-t)*t**2*p2[0] + t**3*p3[0]
    y = (1-t)**3*p0[1] + 3*(1-t)**2*t*p1[1] + 3*(1-t)*t**2*p2[1] + t**3*p3[1]
    return (int(x), int(y))

ctrl_a = (cx - int(S*0.2), cy + int(S*0.1))
ctrl_b = (cx + int(S*0.2), cy + int(S*0.1))

# Draw tapered paths
for width, alpha_t in [(14, 0.08), (9, 0.15), (5, 0.4), (2, 1.0)]:
    steps = 80
    # Path A
    pts_a = [bezier_point((ax0, ay0), ctrl_a, (cx-8, cy+int(S*0.3)), convergence, t/steps) for t in range(steps+1)]
    for k in range(len(pts_a)-1):
        t_val = k/steps
        col = lerp_color(BRIGHT, NAVY, t_val)
        draw.line([pts_a[k], pts_a[k+1]], fill=col, width=max(1,width))

    # Path B
    pts_b = [bezier_point((bx0, by0), ctrl_b, (cx+8, cy+int(S*0.3)), convergence, t/steps) for t in range(steps+1)]
    for k in range(len(pts_b)-1):
        t_val = k/steps
        col = lerp_color(BRIGHT, NAVY, t_val)
        draw.line([pts_b[k], pts_b[k+1]], fill=col, width=max(1,width))

# Terminal dot
gradient_circle(*convergence, 13, BRIGHT, NAVY)
mark_label("Converging Paths", "unified creative process", cx, cy, int(S*0.5)+13)


# ══════════════════════════════════════════════════════════════════════════════
# MARK 5 — Modular Grid
# ══════════════════════════════════════════════════════════════════════════════
cx, cy = cell_center(1, 1)
SZ = 72; GAP = 14; R = 12
ox = cx - SZ - GAP//2
oy = cy - SZ - GAP//2

modules = [
    (ox,         oy,         NAVY,  BRIGHT),
    (ox+SZ+GAP,  oy,         BLUE,  BRIGHT),
    (ox,         oy+SZ+GAP,  BLUE,  BRIGHT),
    (ox+SZ+GAP,  oy+SZ+GAP,  BRIGHT, NAVY),
]

for mx, my, c1, c2 in modules:
    # gradient fill via scan
    for px in range(int(mx), int(mx+SZ)):
        for py in range(int(my), int(my+SZ)):
            # corner masking
            in_tl = px < mx+R and py < my+R and (px-mx-R)**2+(py-my-R)**2 > R**2
            in_tr = px > mx+SZ-R and py < my+R and (px-mx-SZ+R)**2+(py-my-R)**2 > R**2
            in_bl = px < mx+R and py > my+SZ-R and (px-mx-R)**2+(py-my-SZ+R)**2 > R**2
            in_br = px > mx+SZ-R and py > my+SZ-R and (px-mx-SZ+R)**2+(py-my-SZ+R)**2 > R**2
            if in_tl or in_tr or in_bl or in_br:
                continue
            t = ((px-mx)/SZ + (py-my)/SZ) / 2
            col = lerp_color(c1, c2, t)
            img.putpixel((px, py), col)

mark_label("Modular Grid", "structured design system", cx, cy, SZ+GAP//2)


# ══════════════════════════════════════════════════════════════════════════════
# MARK 6 — Layered Panels
# ══════════════════════════════════════════════════════════════════════════════
cx, cy = cell_center(2, 1)
PW, PH, PR = 96, 124, 14

panels = [
    (22, -18, BRIGHT, NAVY,   0.32),
    (10,  -8, BLUE,   BRIGHT, 0.6),
    ( 0,   0, NAVY,   BRIGHT, 1.0),
]

for ox2, oy2, c1, c2, al in panels:
    px = cx - PW//2 + ox2
    py = cy - PH//2 + oy2
    for ppx in range(int(px), int(px+PW)):
        for ppy in range(int(py), int(py+PH)):
            in_tl = ppx < px+PR and ppy < py+PR and (ppx-px-PR)**2+(ppy-py-PR)**2 > PR**2
            in_tr = ppx > px+PW-PR and ppy < py+PR and (ppx-px-PW+PR)**2+(ppy-py-PR)**2 > PR**2
            in_bl = ppx < px+PR and ppy > py+PH-PR and (ppx-px-PR)**2+(ppy-py-PH+PR)**2 > PR**2
            in_br = ppx > px+PW-PR and ppy > py+PH-PR and (ppx-px-PW+PR)**2+(ppy-py-PH+PR)**2 > PR**2
            if in_tl or in_tr or in_bl or in_br:
                continue
            t = ((ppx-px)/PW + (ppy-py)/PH) / 2
            base = lerp_color(c1, c2, t)
            # blend with background for alpha
            col = lerp_color(BG, base, al)
            img.putpixel((ppx, ppy), col)

# Two white bars on front panel
bw, bh, br = 12, 42, 4
for bx_off in [-bw-6, 6]:
    bx = int(cx + bx_off)
    by_bar = int(cy - bh//2 + 4)
    for ppx in range(bx, bx+bw):
        for ppy in range(by_bar, by_bar+bh):
            in_tl = ppx < bx+br and ppy < by_bar+br and (ppx-bx-br)**2+(ppy-by_bar-br)**2 > br**2
            in_tr = ppx > bx+bw-br and ppy < by_bar+br and (ppx-bx-bw+br)**2+(ppy-by_bar-br)**2 > br**2
            in_bl = ppx < bx+br and ppy > by_bar+bh-br and (ppx-bx-br)**2+(ppy-by_bar-bh+br)**2 > br**2
            in_br = ppx > bx+bw-br and ppy > by_bar+bh-br and (ppx-bx-bw+br)**2+(ppy-by_bar-bh+br)**2 > br**2
            if in_tl or in_tr or in_bl or in_br:
                continue
            img.putpixel((ppx, ppy), (245, 247, 255))

mark_label("Layered Panels", "stacked project workspaces", cx, cy, PH//2 + 18)


# ─── Grid cell dividers ───────────────────────────────────────────────────────
for col in range(1, COLS):
    x_div = 120 + col * CELL_W
    for y in range(PAD_TOP+20, H-40):
        if y % 2 == 0:
            draw.point((x_div, y), fill=(210,212,225))

draw.line([(120, PAD_TOP+CELL_H), (W-120, PAD_TOP+CELL_H)], fill=(210,212,225), width=1)

# ─── Footer ───────────────────────────────────────────────────────────────────
draw.line([(120, H-56), (W-120, H-56)], fill=(200,202,220), width=1)
footer_txt = "IDENTITY CONCEPTS  ·  2024  ·  BRAND IDENTITY SYSTEM"
ftw = draw.textlength(footer_txt, font=font_footer)
draw.text((W/2 - ftw/2, H-40), footer_txt, fill=(170,175,200), font=font_footer)

# ─── Light vignette ───────────────────────────────────────────────────────────
vignette = Image.new("L", (W, H), 0)
vd = ImageDraw.Draw(vignette)
for i in range(120):
    t = i / 120
    alpha = int(28 * (1 - t))
    vd.rectangle([i, i, W-i, H-i], outline=alpha)
# Apply as soft darken
vig_rgb = Image.new("RGB", (W, H), (0, 0, 0))
img = Image.composite(vig_rgb, img, vignette)

# ─── Save ─────────────────────────────────────────────────────────────────────
out = "/sessions/nifty-relaxed-wozniak/mnt/studio OS/studio-os/studio-os-logo-concepts.png"
img.save(out, "PNG", dpi=(144, 144))
print(f"Saved → {out}")
