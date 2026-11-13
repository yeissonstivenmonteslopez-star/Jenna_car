"""Initialize local deployment settings and start Docker Compose."""
from pathlib import Path
import secrets
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent


def main():
    if not shutil.which('docker'):
        sys.exit('Instala Docker Desktop (Windows/macOS) o Docker Engine y Compose (Linux).')
    env = ROOT / '.env.production'
    if not env.exists():
        settings = (ROOT / '.env.production.example').read_text(encoding='utf-8')
        for placeholder in (
            'REEMPLAZAR_POR_CLAVE_ALEATORIA_DE_64_CARACTERES',
            'REEMPLAZAR_POR_OTRA_CLAVE_ALEATORIA',
            'REEMPLAZAR_POR_CLAVE_ALEATORIA',
        ):
            settings = settings.replace(placeholder, secrets.token_hex(32))
        settings = settings.replace('HTTP_PORT=80', 'HTTP_PORT=8080')
        settings = settings.replace('http://IP_DEL_SERVIDOR', 'http://localhost:8080')
        with env.open('x', encoding='utf-8') as output:
            output.write(settings)
        print('Configuracion local creada en .env.production; conserva este archivo.', flush=True)
    check = subprocess.run(['docker', 'info'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if check.returncode:
        sys.exit('El motor Docker no esta disponible. Inicia Docker Desktop y vuelve a ejecutar este comando.')
    command = ['docker', 'compose', '--env-file', str(env), '-f', str(ROOT / 'compose.production.yml')]
    subprocess.run(command + ['config', '--quiet'], cwd=ROOT, check=True)
    subprocess.run(command + ['up', '-d', '--build', '--wait', '--wait-timeout', '300'], cwd=ROOT, check=True)
    subprocess.run(command + ['ps'], cwd=ROOT, check=True)
    print('Aplicacion iniciada. Usa el puerto HTTP_PORT de .env.production (8080 para configuraciones nuevas).')


if __name__ == '__main__':
    main()
