
**Instrucciones para otra PC Windows**

1. Instala:
   - Git
   - Python 3.11 o superior
   - Node.js LTS
   - MySQL Server

2. Descarga el proyecto:

```powershell
git clone URL_DE_TU_REPOSITORIO jenna-car
cd jenna-car
```

3. Crea la base de datos. Abre MySQL Workbench y ejecuta:

```sql
SOURCE C:/ruta/jenna-car/backend/jenna_car.sql;
```

4. Configura el backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edita el archivo `.env` recién copiado. Configura principalmente `DATABASE_URL`
(o las variables `DB_*`) y una clave segura:

```env
DATABASE_URL=mysql+pymysql://root:tu_clave_mysql@127.0.0.1:3306/jenna_sql?charset=utf8mb4
SECRET_KEY=una-clave-segura
```

Inicia el backend:

```powershell
python app.py
```

Quedará disponible en:

```text
http://localhost:5000
```

Para aplicar o crear migraciones de la base de datos desde `backend`:

```powershell
flask --app run:app db upgrade
```

Para generar una nueva revisión después de cambiar modelos:

```powershell
$env:SKIP_DB_INIT="1"
flask --app run:app db migrate -m "describe el cambio"
Remove-Item Env:SKIP_DB_INIT
```

5. En otra terminal configura el frontend migrado (Vite):

```powershell
cd frontend/jenna_car
npm install
```

Crea `.env`:

```env
VITE_API_URL=http://localhost:5000
```

Inicia Vite:

```powershell
npm run dev
```

Abre:

```text
http://localhost:3000
```

6. Para iniciar la aplicación mobile:

```powershell
cd mobile
npm install
Copy-Item .env.example .env
```

En `mobile/.env`, coloca la IP del computador donde corre Flask:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.10:5000
```

Reemplaza `192.168.1.10` por la IP real de esa PC. Luego ejecuta:

```powershell
npm start
```

Abre la aplicación con Expo Go. El computador y el celular deben estar conectados a la misma red Wi-Fi.

Las imágenes de `public` y `assets`, los archivos SQL, `package.json`, los lockfiles y `requirements.txt` sí deben subirse al repositorio. Los archivos `.env` y `google_client_secret.json` deben configurarse manualmente en cada PC.
