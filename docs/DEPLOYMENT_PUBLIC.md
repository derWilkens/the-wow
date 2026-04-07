# Public Deployment

## Zielbild

- Frontend: statische Vite-App auf einem Static Host/CDN
- Backend: eigener Managed Node Service
- Supabase: externer Dienst fuer Auth und Daten

Empfohlene oeffentliche URLs:

- `https://app.example.com`
- `https://api.example.com`

## Frontend Deployment

Arbeitsverzeichnis:

- `superpowers/frontend`

Build:

```bash
npm install
npm run build
```

Output:

- `dist/`

Produktive Build-Variablen:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL=https://api.example.com`

Beispiel:

- `frontend/.env.production.example`

## Backend Deployment

Arbeitsverzeichnis:

- `superpowers/backend`

Build und Start:

```bash
npm install
npm run build
npm run start
```

Produktive Runtime-Variablen:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `PORT`
- `FRONTEND_URL=https://app.example.com`

Beispiel:

- `backend/.env.production.example`

## Produktionsrelevante Details

- Das Backend bietet einen unauthentifizierten Healthcheck unter:
  - `/health`
- CORS ist fuer Public Deployment jetzt auf die in `FRONTEND_URL` konfigurierte Origin begrenzt.
- In lokaler Nicht-Produktionsumgebung bleiben `localhost` und `127.0.0.1` fuer Entwicklung erlaubt.
- Das Frontend verwendet fuer den Public Build keine fest im Code eingebetteten Fallback-URLs mehr.

## Go-Live-Checkliste

1. Produktive Env-Werte auf beiden Hostingsystemen setzen
2. Backend unter `https://api.example.com/health` pruefen
3. Frontend unter `https://app.example.com` oeffnen
4. Login pruefen
5. Arbeitsablauf erstellen
6. Canvas-Speichern pruefen
7. Vorlage erzeugen und aus Vorlage instanziieren
8. Browser-Konsole auf CORS- oder Config-Fehler pruefen

## Sicherheitsregel

- Lokale `.env`-Dateien nicht in Deployment-Systeme kopieren
- Produktive Secrets immer neu im Hosting-System hinterlegen
- `SUPABASE_SERVICE_ROLE_KEY` niemals im Frontend verwenden
