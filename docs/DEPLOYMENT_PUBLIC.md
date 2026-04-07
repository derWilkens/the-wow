# Public Deployment

## Zielbild

- Frontend: statische Vite-App auf Vercel
- Backend: eigener Managed Node Service auf Render
- Supabase: externer Dienst fuer Auth und Daten

Empfohlene oeffentliche URLs:

- `https://app.<deine-domain>`
- `https://api.<deine-domain>`

## Frontend Deployment

Arbeitsverzeichnis:

- `frontend`

Build:

```bash
npm install
npm run build
```

Output:

- `dist/`

Empfohlene Vercel-Einstellungen:

- Root Directory: `frontend`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`

Produktive Build-Variablen:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL=https://api.<deine-domain>`

Beispiel:

- `frontend/.env.production.example`
- `frontend/vercel.json`

## Backend Deployment

Arbeitsverzeichnis:

- `backend`

Build und Start:

```bash
npm install
npm run build
npm run start
```

Empfohlene Render-Einstellungen:

- Service Type: `Web Service`
- Root Directory: `backend`
- Build Command: `npm install && npm run build`
- Start Command: `npm run start`
- Health Check Path: `/health`

Produktive Runtime-Variablen:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `PORT`
- `FRONTEND_URL=https://app.<deine-domain>`

Beispiel:

- `backend/.env.production.example`
- `render.yaml`

## Produktionsrelevante Details

- Das Backend bietet einen unauthentifizierten Healthcheck unter:
  - `/health`
- CORS ist fuer Public Deployment jetzt auf die in `FRONTEND_URL` konfigurierte Origin begrenzt.
- In lokaler Nicht-Produktionsumgebung bleiben `localhost` und `127.0.0.1` fuer Entwicklung erlaubt.
- Das Frontend verwendet fuer den Public Build keine fest im Code eingebetteten Fallback-URLs mehr.

## Go-Live-Checkliste

1. Produktive Env-Werte auf beiden Hostingsystemen setzen
2. Backend unter `https://api.<deine-domain>/health` pruefen
3. Frontend unter `https://app.<deine-domain>` oeffnen
4. Login pruefen
5. Arbeitsablauf erstellen
6. Canvas-Speichern pruefen
7. Vorlage erzeugen und aus Vorlage instanziieren
8. Browser-Konsole auf CORS- oder Config-Fehler pruefen

## Sicherheitsregel

- Lokale `.env`-Dateien nicht in Deployment-Systeme kopieren
- Produktive Secrets immer neu im Hosting-System hinterlegen
- `SUPABASE_SERVICE_ROLE_KEY` niemals im Frontend verwenden
