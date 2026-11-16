$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    if (-not (Test-Path -LiteralPath '.env.production')) {
        throw 'Falta el archivo privado .env.production del paquete de instalación.'
    }
    docker compose --env-file .env.production pull
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo descargar. Ejecuta docker login con acceso al repositorio privado.' }
    docker compose --env-file .env.production up -d --wait --wait-timeout 300
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo iniciar. Revisa docker compose logs.' }
    docker compose --env-file .env.production ps
    Write-Host 'Jenna Car está disponible en http://localhost (o el puerto HTTP_PORT que hayas configurado).'
} finally {
    Pop-Location
}
