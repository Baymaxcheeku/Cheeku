# Builds index.html from the financial model engine, the role roster and the page template.
# Run after any change to vision-board/engine.js so the spend model stays in sync:  python3 build.py
import pathlib
here = pathlib.Path(__file__).parent
engine = (here.parent / 'vision-board' / 'engine.js').read_text()
roles = (here / 'roles.js').read_text()
tpl = (here / 'template.html').read_text()
(here / 'index.html').write_text(tpl.replace('/*ENGINE*/', engine).replace('/*ROLES*/', roles))
print('built index.html')
