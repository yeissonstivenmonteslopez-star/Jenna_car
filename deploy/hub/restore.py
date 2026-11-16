"""Initialize empty deployment volumes from the private Docker Hub snapshot."""
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import tarfile

import pymysql

TRANSFER = Path('/transfer')
SNAPSHOT = TRANSFER / 'snapshot.tar.gz'
MARKER = TRANSFER / 'restore-complete'


def main():
    digest = hashlib.sha256(SNAPSHOT.read_bytes()).hexdigest()
    if MARKER.exists():
        if MARKER.read_text().strip() != digest:
            raise SystemExit('Los volúmenes corresponden a otro respaldo. No se reemplazaron datos.')
        print('Restauración ya realizada; se conservan los datos actuales.')
        return
    connection = pymysql.connect(host=os.getenv('DB_HOST', 'db'), port=int(os.getenv('DB_PORT', '3306')),
        user=os.environ['DB_USER'], password=os.environ['DB_PASSWORD'], database=os.environ['DB_NAME'])
    try:
        with connection.cursor() as cursor:
            cursor.execute('SHOW TABLES')
            if cursor.fetchone():
                raise SystemExit('La base no está vacía. No se sobrescribirá automáticamente.')
    finally:
        connection.close()
    destinations = {'profile': Path('/restore/profile'), 'repairs': Path('/restore/repairs')}
    with tarfile.open(SNAPSHOT, 'r:gz') as archive:
        manifest = json.load(archive.extractfile('manifest.json'))
        for entry in archive:
            relative = PurePosixPath(entry.name)
            if relative.is_absolute() or '..' in relative.parts or not entry.isfile():
                raise SystemExit('El respaldo contiene una ruta no válida.')
            if entry.name == 'manifest.json':
                continue
            if entry.name == 'database.sql':
                target = TRANSFER / 'database.sql'
            elif relative.parts[0] in destinations:
                target = destinations[relative.parts[0]].joinpath(*relative.parts[1:])
            else:
                raise SystemExit('El respaldo contiene un archivo no reconocido.')
            source = archive.extractfile(entry)
            target.parent.mkdir(parents=True, exist_ok=True)
            with target.open('wb') as output:
                shutil.copyfileobj(source, output)
            if relative.parts[0] in destinations:
                os.chown(target, 1000, 1000)
    # Uploaded directories must remain writable by the application user.
    for root in destinations.values():
        os.chown(root, 1000, 1000)
        for directory in root.rglob('*'):
            if directory.is_dir():
                os.chown(directory, 1000, 1000)
    if not (TRANSFER / 'database.sql').is_file():
        raise SystemExit('Falta el archivo de base de datos.')
    (TRANSFER / 'restore-pending').write_text(digest + '\n')
    print(f"Archivos restaurados: {manifest['profile_files']} de perfil y {manifest['repair_files']} de reparaciones.")


if __name__ == '__main__':
    main()
