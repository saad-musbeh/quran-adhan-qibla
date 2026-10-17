#!/usr/bin/env python3
"""Build stable, outlined Arabic dua sheets without touching the Quran assets.

Requires PyGObject/PangoCairo, pycairo, fontconfig and the zstd CLI. The bundled
Amiri Quran font is registered only in this build process, not installed.
"""
import ctypes
from ctypes.util import find_library
import json
from html import escape
from pathlib import Path
import subprocess

import cairo
import gi

gi.require_version('Pango', '1.0')
gi.require_version('PangoCairo', '1.0')
from gi.repository import Pango, PangoCairo

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/mushaf/pages-src'
CONTENT = json.loads((SOURCE / 'khatm-dua.json').read_text())
FONT = ROOT / 'assets/quran/AmiriQuran.ttf'
fontconfig = find_library('fontconfig')
assert fontconfig, 'Install fontconfig to register the bundled Arabic font'
fc = ctypes.CDLL(fontconfig)
fc.FcConfigAppFontAddFile.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
fc.FcConfigAppFontAddFile.restype = ctypes.c_int
assert fc.FcConfigAppFontAddFile(None, str(FONT).encode()), 'Cannot register bundled Arabic font'

surface = cairo.RecordingSurface(cairo.CONTENT_COLOR_ALPHA, None)
context = cairo.Context(surface)
options = cairo.FontOptions()
options.set_hint_metrics(cairo.HINT_METRICS_OFF)
options.set_hint_style(cairo.HINT_STYLE_NONE)
context.set_font_options(options)
layout = PangoCairo.create_layout(context)
layout.get_context().set_base_dir(Pango.Direction.RTL)
layout.get_context().set_language(Pango.Language.from_string('ar'))


def set_text(text, size):
    font = Pango.FontDescription.from_string('Amiri Quran')
    font.set_absolute_size(round(size * Pango.SCALE))
    layout.set_font_description(font)
    assert layout.get_context().load_font(font).describe().get_family() == 'Amiri Quran'
    layout.set_text(text, -1)


def shape(text, size):
    set_text(text, size)
    context.new_path()
    PangoCairo.layout_path(context, layout)
    x0, y0, x1, y1 = context.path_extents()
    commands = []
    for kind, points in context.copy_path():
        if kind == cairo.PATH_CLOSE_PATH:
            commands.append('Z')
        else:
            command = {cairo.PATH_MOVE_TO: 'M', cairo.PATH_LINE_TO: 'L', cairo.PATH_CURVE_TO: 'C'}[kind]
            commands.append(command + ' '.join(f'{n:.4f}' for n in points))
    baseline = layout.get_baseline() / Pango.SCALE
    return {'text': text, 'path': ''.join(commands), 'box': (x0, y0, x1, y1), 'baseline': baseline}


def lines_for(paragraphs, size):
    lines = []
    for paragraph in paragraphs:
        line = ''
        for word in paragraph.split():
            candidate = f'{line} {word}'.strip()
            set_text(candidate, size)
            width = layout.get_extents()[0].width / Pango.SCALE
            if line and width > 291:
                lines.append(shape(line, size))
                line = word
            else:
                line = candidate
        lines.append(shape(line, size))
    ascent = min(line['box'][1] - line['baseline'] for line in lines)
    descent = max(line['box'][3] - line['baseline'] for line in lines)
    pitch = descent - ascent + 3
    height = (len(lines) - 1) * pitch + descent - ascent
    return lines, ascent, pitch, height


# Use the same readable size on both sheets. Fit actual ink, not the font's em
# size or browser text boxes; every adjacent row has at least three SVG units
# of clear space, including tall letters and below-baseline strokes.
size = 19
while True:
    pages = [lines_for(page['paragraphs'], size) for page in CONTENT['pages']]
    if all(page[3] <= 444 for page in pages):
        break
    size -= .25
    assert size >= 13, 'Dua needs another sheet rather than illegibly small type'


def outlined(line, x_center, baseline, kind, index):
    x0, y0, x1, y1 = line['box']
    dx, dy = x_center - (x0 + x1) / 2, baseline - line['baseline']
    return (f'<g data-kind="{kind}" data-line="{index}" data-text="{escape(line["text"], quote=True)}" '
            f'role="img" aria-label="{escape(line["text"], quote=True)}" '
            f'transform="translate({dx:.4f} {dy:.4f})"><path d="{line["path"]}"/></g>')


for part, (page, fitted) in enumerate(zip(CONTENT['pages'], pages), 1):
    lines, ascent, pitch, height = fitted
    baseline = 76 - ascent + (444 - height) / 2
    rows = []
    previous_bottom = None
    for index, line in enumerate(lines):
        top = baseline + line['box'][1] - line['baseline']
        bottom = baseline + line['box'][3] - line['baseline']
        assert top >= 76 and bottom <= 520
        assert previous_bottom is None or top - previous_bottom >= 2.999
        assert line['box'][2] - line['box'][0] <= 293
        rows.append(outlined(line, 172.5, baseline, 'body', index))
        previous_bottom = bottom
        baseline += pitch
    title = shape(CONTENT['title'], 22)
    title_baseline = 42.5 - (title['box'][1] + title['box'][3]) / 2 + title['baseline']
    title_svg = outlined(title, 172.5, title_baseline, 'title', 0)
    svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<!-- Original app layout; words transcribed from the user's printed dua photos.
     Outlined from the bundled Amiri Quran font: no runtime font substitution.
     This is supplication artwork, not another page of Quran verse content. -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 345 550">
<g id="page-{page['page']}-content" fill="#18334A">
<rect x="9" y="9" width="327" height="532" rx="5" fill="none" stroke="#BD8744" stroke-width="1.3"/>
<rect x="13" y="13" width="319" height="524" rx="3" fill="none" stroke="#18334A" stroke-width=".65"/>
<path d="M19 19h18M19 19v18M326 19h-18M326 19v18M19 531h18M19 531v-18M326 531h-18M326 531v-18" fill="none" stroke="#BD8744" stroke-width="1.5"/>
<rect x="55" y="23" width="235" height="39" rx="4" fill="none" stroke="#BD8744" stroke-width=".8"/>
{title_svg}
<g id="khatm-text-{part}" data-font-size="{size}">
{chr(10).join(rows)}
</g>
</g></svg>
'''
    path = SOURCE / f"{page['page']}.svg"
    path.write_text(svg)
    subprocess.run(['zstd', '-19', '-q', '-f', str(path), '-o', str(ROOT / f"assets/mushaf/pages/{page['page']}.svg.zst")], check=True)
    print(f"{page['page']}: {len(lines)} outlined lines, size {size:g}, pitch {pitch:g}, ink height {height:g}")
