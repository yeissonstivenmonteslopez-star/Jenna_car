# --- Etapa 1: Construcción del Frontend ---
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend

# Parche de seguridad para actualizar paquetes base de Alpine y eliminar vulnerabilidades
RUN apk update && apk upgrade --no-cache

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# --- Etapa 2: Runtime del Backend y Servidor de Archivos ---
FROM python:3.12-slim AS runtime
WORKDIR /app/backend

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=5000 \
    HOST=0.0.0.0 \
    FLASK_DEBUG=false

# Parche de seguridad para la imagen base de Debian
RUN apt-get update && apt-get upgrade -y && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY backend/ ./

# Transferencia correcta de archivos estáticos del frontend
COPY --from=frontend-build /app/frontend/dist /app/backend/static

EXPOSE 5000

CMD ["python", "run.py"]