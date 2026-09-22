#!/usr/bin/env python3
"""生成 Android 自适应图标前景图（mipmap-*/ic_launcher_foreground.png）与背景色。

背景：`tauri icon` 生成的自适应图标前景是把源图整幅铺满 108dp 画布的，
金色螺旋占到画布高度约 70%（≈75.5dp），超出 Android 保证可见的内圈 72dp，
启动器按遮罩裁切后图案几乎贴满整个图标（真机实测螺旋占瓦片 100%，四周被切）。
本脚本改为：从源图抠出螺旋本身（透明底、纯品牌金），按画布高度的
FOREGROUND_RATIO 居中放置，落在 66dp 安全区内。

重新执行过 `tauri icon` 之后需要重跑本脚本覆盖（`npm run android:icons`）。
旧启动器用的 mipmap-*/ic_launcher.png、ic_launcher_round.png 不在本脚本范围内：
它们本身已是"整块瓦片 + 留白图案"的画法，比例与新前景一致。

依赖：Pillow（pip install pillow）。
"""

from pathlib import Path

from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
RES = REPO_ROOT / "src-tauri/gen/android/app/src/main/res"
SRC_ICON = REPO_ROOT / "src-tauri/icons/icon.png"

# 品牌金 = 暗色主题 --primary: hsl(37 42% 67%)；与源图颜色一致
GOLD = (206, 179, 136)
# 螺旋（含边缘抗锯齿）占 108dp 画布高度的比例：
# 0.40 → 43.2dp，启动器可视内圈 72dp 的 60%，与主流应用图标观感一致
FOREGROUND_RATIO = 0.40
# 抠图时判定"属于图案"的 alpha 下限（源图为纯黑底 + 金色图案）
ALPHA_CUTOFF = 0.35
# 自适应图标背景层：桌面图标里的黑色瓦片
BACKGROUND_COLOR = "#000000"

DENSITIES = {"mdpi": 1.0, "hdpi": 1.5, "xhdpi": 2.0, "xxhdpi": 3.0, "xxxhdpi": 4.0}
ADAPTIVE_CANVAS_DP = 108


def extract_mark() -> Image.Image:
    """从桌面图标中抠出图案：亮度当 alpha，颜色统一为品牌金。"""
    src = Image.open(SRC_ICON).convert("RGBA")
    pixels = src.load()
    alpha = Image.new("L", src.size)
    alpha_px = alpha.load()
    for y in range(src.height):
        for x in range(src.width):
            r, g, b, a = pixels[x, y]
            alpha_px[x, y] = round(min(max(r, g, b) / GOLD[0], 1.0) * a)

    mark = Image.merge("RGBA", (
        Image.new("L", src.size, GOLD[0]),
        Image.new("L", src.size, GOLD[1]),
        Image.new("L", src.size, GOLD[2]),
        alpha,
    ))
    box = mark.getchannel("A").point(lambda v: 255 if v >= ALPHA_CUTOFF * 255 else 0).getbbox()
    if box is None:
        raise SystemExit(f"未能从 {SRC_ICON} 抠出图案，请检查源图是否为深底亮色图案")
    return mark.crop(box)


def build_foreground(mark: Image.Image, canvas_px: int) -> Image.Image:
    """图案高度按 FOREGROUND_RATIO 缩放后居中放在透明的 108dp 画布上。"""
    height = max(1, round(canvas_px * FOREGROUND_RATIO))
    width = max(1, round(height * mark.width / mark.height))
    layer = Image.new("RGBA", (canvas_px, canvas_px), (0, 0, 0, 0))
    layer.alpha_composite(
        mark.resize((width, height), Image.LANCZOS),
        ((canvas_px - width) // 2, (canvas_px - height) // 2),
    )
    return layer


def report(path: Path) -> str:
    """回读产物，核对图案实际占比与居中情况。"""
    image = Image.open(path).convert("RGBA")
    alpha = image.getchannel("A")
    box = alpha.point(lambda v: 255 if v >= 128 else 0).getbbox()
    canvas = image.width
    if box is None:
        return "空图！"
    w, h = box[2] - box[0], box[3] - box[1]
    off_x = (box[0] + box[2]) / 2 - canvas / 2
    off_y = (box[1] + box[3]) / 2 - canvas / 2
    return (f"{canvas}px 画布 图案 {w}x{h} = 画布高度 {100 * h / canvas:.1f}% "
            f"居中偏差 ({off_x:+.1f}, {off_y:+.1f})px")


def main() -> None:
    mark = extract_mark()
    print(f"图案源 {SRC_ICON.name}: {mark.width}x{mark.height}（裁剪自桌面图标）")

    for density, scale in DENSITIES.items():
        canvas_px = round(ADAPTIVE_CANVAS_DP * scale)
        layer = build_foreground(mark, canvas_px)
        out = RES / f"mipmap-{density}/ic_launcher_foreground.png"
        layer.save(out, optimize=True)
        print(f"  {out.relative_to(REPO_ROOT)}: {report(out)}")

    background = RES / "values/ic_launcher_background.xml"
    background.write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n'
        "<resources>\n"
        f'  <color name="ic_launcher_background">{BACKGROUND_COLOR}</color>\n'
        "</resources>\n",
        encoding="utf-8",
    )
    print(f"  {background.relative_to(REPO_ROOT)}: 背景层 {BACKGROUND_COLOR}")


if __name__ == "__main__":
    main()
