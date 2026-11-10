# Builds index.html from model.js and template.html.  Run after editing either:  python3 build.py
# Then python3 check.py proves model.js still matches calc/split.py (the numbers in library/seed-split-dilution-model.md).
import pathlib
here = pathlib.Path(__file__).parent
model = (here / 'model.js').read_text()
tpl = (here / 'template.html').read_text()
(here / 'index.html').write_text(tpl.replace('/*MODEL*/', model))
print('built index.html')
