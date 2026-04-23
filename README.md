# Meridian

Meridian is a Flask + Leaflet web app for plotting maritime routes between major global ports.

Live site: https://meridian-route-intel-aru.fly.dev/

The refreshed product direction focuses on:

- a stronger planning cockpit instead of a bare calculator
- a cleaner mobile and desktop map experience
- directness and detour insight using a great-circle comparison
- shareable live links for a chosen route and speed profile

## Stack

- Flask
- searoute
- Leaflet
- Gunicorn

## Local run

```bash
pip install -r requirements.txt
python app.py
```

The app runs on `http://127.0.0.1:5050` by default.

## Production entrypoints

- `Procfile` for simple Gunicorn hosting
- `Dockerfile` for container deploys
- `render.yaml` for Render web service setup
- `/health` endpoint for platform health checks

## Fly.io deploy

```bash
fly launch --copy-config --no-deploy
fly deploy
```

## Render deploy

Use the values below if you create the service manually:

- Build command: `pip install -r requirements.txt`
- Start command: `gunicorn app:app`
- Health check path: `/health`
