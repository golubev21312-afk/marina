"""Реалистичный бесшовный малахит.

Что делает малахит малахитом:
1. Почки — концентрические полосы вокруг центров роста, местами слитые в потоки.
2. Полосы с РЕЗКИМИ краями и сильно разной шириной: тонкие почти чёрные
   линии, широкие яркие полосы, редкие светлые нитки.
3. Шёлковая волокнистость: кристаллы растут поперёк полос, и на полировке
   видны тончайшие волокна, перпендикулярные полосам. Делаем честно —
   размазываем шум вдоль градиента поля (line integral convolution).
Все поля периодические (тор), поэтому плитка бесшовная.
"""
import sys
import numpy as np
from PIL import Image

OUT = sys.argv[1]
SIZE = int(sys.argv[2]) if len(sys.argv) > 2 else 1024
SEED = int(sys.argv[3]) if len(sys.argv) > 3 else 17
N = SIZE * 2  # считаем вдвое крупнее, в конце уменьшаем — сглаживание
rng = np.random.default_rng(SEED)
y, x = np.mgrid[0:N, 0:N] / N


def periodic(n, kmin, kmax, seed, power=1.0):
    r = np.random.default_rng(seed)
    f = np.zeros((N, N))
    for _ in range(n):
        kx, ky = r.integers(-kmax, kmax + 1, 2)
        k = np.hypot(kx, ky)
        if k < kmin:
            continue
        f += np.sin(2 * np.pi * (kx * x + ky * y) + r.uniform(0, 2 * np.pi)) / k**power
    return (f - f.mean()) / (f.std() + 1e-9)


def tdist(ax, ay, cx, cy, sx=1.0, sy=1.0):
    dx = np.abs(ax - cx)
    dy = np.abs(ay - cy)
    dx = np.minimum(dx, 1 - dx) / sx
    dy = np.minimum(dy, 1 - dy) / sy
    return np.sqrt(dx**2 + dy**2)


# --- 1. Поле роста: почки разного размера, немного вытянутые, слитые мягким минимумом
wx = x + 0.03 * periodic(24, 1, 3, SEED + 1) + 0.006 * periodic(40, 4, 9, SEED + 2)
wy = y + 0.03 * periodic(24, 1, 3, SEED + 3) + 0.006 * periodic(40, 4, 9, SEED + 4)

count = 8
centers = rng.uniform(0, 1, (count, 2))
stretch = rng.uniform(0.75, 1.3, (count, 2))
offset = rng.uniform(0, 0.05, count)      # почки разного «возраста»
k = 70.0
acc = np.zeros((N, N))
for i in range(count):
    d = tdist(wx, wy, centers[i, 0], centers[i, 1], *stretch[i]) + offset[i]
    acc += np.exp(-k * d)
field = -np.log(acc + 1e-12) / k

# --- 2. Полосы с резкими краями и неравной шириной.
# Номер полосы растёт по полю неравномерно: ширины берём из случайной таблицы
t = field * 120 + 1.2 * periodic(10, 1, 2, SEED + 5)
widths = rng.gamma(1.6, 1.0, 4096)                 # много узких, редкие широкие
edges = np.concatenate([[0], np.cumsum(widths)])
edges = edges / edges[-1] * 4096 / 38 * 38        # растягиваем на тот же диапазон
tt = np.clip(t, 0, edges[-1] - 1e-6)
idx = np.searchsorted(edges, tt, side='right') - 1
local = (tt - edges[idx]) / widths[idx]            # 0..1 внутри своей полосы

# У каждой полосы свой тон: тёмные, средние, яркие, редкие почти белые нитки
h = np.random.default_rng(SEED + 7).random(4096)
tone = np.select(
    [h < 0.34, h < 0.76, h < 0.96],
    [0.10 + 0.25 * h, 0.40 + 0.16 * h, 0.66 + 0.12 * h],
    default=0.95,
)[idx]
# Внутри полосы — лёгкое затемнение к внешнему краю (так растёт кристалл)
v = tone * (0.86 + 0.14 * (1 - local) ** 0.7)
# Тонкая тёмная линия-шов на границе полос — главный признак малахита
seam = np.exp(-(local / 0.1) ** 2) * (np.random.default_rng(SEED + 8).random(4096) < 0.35)[idx]
v = v * (1 - 0.55 * seam)

# --- 3. Шёлковые волокна поперёк полос (LIC вдоль градиента поля)
gy, gx = np.gradient(field)
norm = np.hypot(gx, gy) + 1e-12
ux, uy = gx / norm, gy / norm
noise = np.random.default_rng(SEED + 9).random((N, N))
acc_n = noise.copy()
px = np.arange(N)[None, :].repeat(N, 0).astype(float)
py = np.arange(N)[:, None].repeat(N, 1).astype(float)
for sign in (1, -1):
    qx, qy = px.copy(), py.copy()
    for _ in range(14):
        ix = qx.astype(int) % N
        iy = qy.astype(int) % N
        qx += sign * ux[iy, ix] * 1.5
        qy += sign * uy[iy, ix] * 1.5
        acc_n += noise[qy.astype(int) % N, qx.astype(int) % N]
fibers = acc_n / 29.0
fibers = (fibers - fibers.mean()) / (fibers.std() + 1e-9)
v = v * (1 + 0.06 * fibers)

# Едва заметная крупная неоднородность — камень не бывает ровным
v = v * (1 + 0.06 * periodic(12, 1, 3, SEED + 10))
v = np.clip(v, 0, 1)

# --- Цвет: насыщенная изумрудная гамма настоящего малахита
stops = np.array([
    [0.00, 2, 24, 15],
    [0.18, 4, 48, 29],
    [0.40, 9, 94, 56],
    [0.60, 17, 134, 80],
    [0.78, 38, 170, 106],
    [0.90, 96, 208, 150],
    [1.00, 186, 238, 206],
], dtype=float)
rgb = np.stack([np.interp(v, stops[:, 0], stops[:, c + 1]) for c in range(3)], -1)

Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)).resize((SIZE, SIZE), Image.LANCZOS).save(OUT, quality=90)
print('saved', OUT)
