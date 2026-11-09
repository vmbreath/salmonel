"""Materialize the reviewed frontend without rebuilding/modifying legacy repos.

Legacy compiled assets are archived in backups/frontend-v1.tar.gz.
Backend routes, DB role configuration and seed data are maintained separately.
"""
from pathlib import Path
import shutil

root = Path(__file__).resolve().parent
source = root / 'frontend-v2'
public = root / 'app/public'
files = {
    'index.html': 'index.html',
    'app.js': 'static/js/search-v2.js',
    'app.css': 'static/css/search-v2.css',
    'mark.svg': 'static/media/mark.svg',
}
for src in files:
    if not (source / src).is_file():
        raise SystemExit(f'Missing reviewed frontend file: {source / src}')
for src, dst in files.items():
    target = public / dst
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source / src, target)
print('Prepared reviewed frontend v2; backend, seed and legacy repositories unchanged.')
