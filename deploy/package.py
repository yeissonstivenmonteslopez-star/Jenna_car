"""Create a source-only deployment ZIP without local secrets or runtime data."""
from pathlib import Path
import zipfile

root = Path(__file__).resolve().parent.parent
output = root / 'dist-deploy' / 'jenna-car-servidor.zip'
output.parent.mkdir(exist_ok=True)
excluded_dirs = {'node_modules', '__pycache__', '.pytest_cache', '.git', 'dist', 'uploads', '.venv'}


def allowed(path):
    relative = path.relative_to(root)
    name = path.name.lower()
    if any(part in excluded_dirs for part in relative.parts):
        return False
    migration_environment = relative.as_posix() == 'backend/migrations/env.py'
    if not migration_environment and (name.startswith('.env') or name == 'env' or name.startswith('env.')):
        return False
    if any(marker in name for marker in ('client_secret', 'credentials', 'service_account')):
        return False
    return path.suffix.lower() not in {'.pem', '.key', '.p12', '.pfx', '.db', '.sqlite', '.sqlite3', '.log', '.pyc', '.sql'}


files = [root / name for name in (
    'Dockerfile.production', 'compose.production.yml', '.dockerignore', '.env.production.example', 'README.md',
)]
for folder in ('backend', 'frontend', 'deploy'):
    files.extend(path for path in (root / folder).rglob('*') if path.is_file() and allowed(path))

with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(files):
        archive.write(path, path.relative_to(root).as_posix())
with zipfile.ZipFile(output) as archive:
    assert archive.testzip() is None
    assert '.env.production.example' in archive.namelist()
    assert 'backend/migrations/env.py' in archive.namelist()
    assert not any(Path(name).name in {'.env', 'env', 'env.local', '.env.production'} for name in archive.namelist())
    print(f'{output}: {len(archive.namelist())} files, {output.stat().st_size:,} bytes; ZIP verified')
