MCP Data service

Setup
- Copy .env.example to .env and set `DATABASE_URL` and `INGESTION_SECRET`
- Optionally set `MODERATION_SECRET` for admin-only endpoints
- Run migrations and start the server

Endpoints
- POST /ingest/event
- POST /index/run
- GET /events/summary?origin=
- GET /servers?include=approved|all&sort=score|recent&limit=&offset=
- GET /server/:id
- POST /servers/:id/moderate  (Header: Authorization: Bearer ${MODERATION_SECRET})
  - body: { status: 'pending|approved|rejected|disabled|flagged', notes?: string, verifiedBy?: string }
- POST /score/recompute        (Header: Authorization: Bearer ${MODERATION_SECRET})
  - body: { id?: string } // recomputes one or recent batch

Moderation & Scoring
- moderation_status: pending|approved|rejected|disabled|flagged (default pending)
- quality_score: 0–100, computed from recent rpc_logs (success rate, latency p95, error rate)
- Public queries default to approved only; pass include=all to retrieve all


