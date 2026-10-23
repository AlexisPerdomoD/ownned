# Healthcheck de PostgreSQL en tests locales (2026-10-22)

- **Estado:** resuelto (commit `702197c`).
- **Referencias:** `db-docker-compose.test.yaml`, `db-docker-compose.yaml`.

## Problema

Race condition de arranque: el compose de test monta data en `tmpfs` (initdb completo por contenedor fresco) y no definía healthcheck, así que `up -d --wait` no esperaba disponibilidad real de Postgres; `sleep 1` corría migrate durante la ventana de init (proxy aceptaba TCP, socket daba `connection reset by peer`). Contenedor fresco → migrate falla; warm → OK.

## Decisión técnica

Añadir healthcheck `pg_isready` por TCP (2s/30 reintentos/`start_period` 10s) en ambos compose (test y dev, mismo riesgo latente en primer arranque/`db-local-reset`).

## Justificación

Esperar disponibilidad real antes de migrate; verificado con ciclo completo desde cero: Healthy → migración OK → tests PASS. No afectaba código en `postgres.go`.
EOF
echo done