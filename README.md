# Transcriptor de Gacetas

Aplicación web ligera para **transcribir personas nombradas en Gacetas Oficiales** (PDF de texto o escaneados). El operador visualiza el PDF a un lado y captura registros en un formulario al otro, con paneles redimensionables e intercambiables. Incluye autenticación, roles, bitácora de auditoría y exportación a Excel.

## Stack

- **Backend:** Node.js + Express + MongoDB (Mongoose), JWT, GridFS para los PDF.
- **Frontend:** React + Vite, react-pdf (pdf.js), react-resizable-panels, react-hook-form, TanStack Table.
- **Base de datos:** MongoDB.
- **Despliegue:** Docker Compose (Mongo + API + Nginx).

## Requisitos

- Docker y Docker Compose
- (Para desarrollo) Node.js 18+ y npm

## Puesta en marcha con Docker (recomendado)

Todo el sistema corre en contenedores: MongoDB, la API y el frontend (Nginx).

```bash
cp .env.example .env   # opcional: ajusta secretos y puertos
docker compose up -d --build
```

- App disponible en **http://localhost:8080**
- Usuario admin inicial: `admin` / `Admin1234*` (configurable en `.env`)
- Nginx sirve el frontend y hace de proxy de `/api` al backend; solo se publica el puerto del frontend.

Comandos útiles:

```bash
docker compose logs -f          # ver logs
docker compose down             # detener (conserva los datos)
docker compose down -v          # detener y borrar la base de datos
```

> En producción cambia `JWT_SECRET`, y si sirves por HTTPS pon `COOKIE_SECURE=true` y ajusta `CLIENT_ORIGIN`.

## Desarrollo local (sin contenedores de app)

Para desarrollar con recarga en caliente puedes correr solo MongoDB en Docker y la API/Front con Node.

### 1. Base de datos

Descomenta el bloque `ports` del servicio `mongo` en `docker-compose.yml` (para exponer `27017` al host) y levántalo:

```bash
docker compose up -d mongo
```

MongoDB queda en `localhost:27017` (usuario `root` / clave `rootpass`).

### 2. Backend

```bash
cd server
npm install
cp .env.example .env   # ya viene un .env de desarrollo listo
npm run dev
```

API en `http://localhost:4000`. Al arrancar crea el usuario admin inicial
(`admin` / `Admin1234*`, configurable en `.env`).

### 3. Frontend

```bash
cd client
npm install
npm run dev
```

App en `http://localhost:5173` (proxy de `/api` al backend).

## Roles

- **admin:** ingesta las gacetas (script), gestiona usuarios, ve el panel de métricas y la bitácora, puede eliminar gacetas.
- **transcriptor:** recibe gacetas por cola automática y captura registros.

## Ingesta de gacetas (solo admin)

Las gacetas no se suben por la interfaz: entran por un script que lee una carpeta-repositorio de PDFs.

1. Coloca los PDFs en la carpeta `import/` (o define `IMPORT_DIR_HOST` con la ruta de tu repositorio).
2. Con la pila corriendo, ejecuta:

```bash
docker compose exec server npm run import
```

El script omite duplicados (por hash), cuenta páginas y crea cada gaceta en estado **en_cola** con metadatos vacíos. El transcriptor podrá completar número/fecha/tipo.

## Flujo de uso (transcriptor)

1. Inicia sesión: el sistema le asigna automáticamente **una** gaceta de la cola global.
2. Completa/edita los datos de la gaceta (Nº, fecha, tipo) si vienen vacíos.
3. Lee el PDF; selecciona texto y pulsa **"Enviar selección al contexto"**.
4. Captura cada persona/acción y pulsa **Guardar y siguiente** (o `Ctrl+Enter`).
5. El botón **"Finalizar transcripción"** se habilita al haber visto **todas** las páginas.
6. Al finalizar, ya no puede volver a esa gaceta y se le asigna la siguiente de la cola.

El **administrador** ve en su panel: gacetas en cola/en proceso/finalizadas, quién trabaja qué, procesadas por usuario, por mes y productividad, con filtros por transcriptor y fechas.

## Campos del formulario

Gaceta (Nº), Fecha, Tipo (ordinaria/extraordinaria) — cabecera editable de la gaceta;
Nombres, Apellidos, ID (Cédula/Pasaporte con validación), Acción (9 opciones),
Página y Contexto — por cada persona.

## Notas

- Los PDF se almacenan en GridFS (MongoDB) y se sirven por streaming.
- La validación de cédula asume formato venezolano por defecto; ajustable en
  `server/src/utils/validators.js` y `client/src/utils/constants.js`.
