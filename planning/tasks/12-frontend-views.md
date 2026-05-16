# 12 — Frontend: Dashboard / Newsroom / Methodology

Spec refs: `../idea/05-frontend.md` (Dashboard radar, Newsroom dossier feed +
Edition banner + filters, Methodology). Phase 3. Depends on: 10, 09.

## Epic 12.1 — Dashboard ("war room" radar, landing `/`)
- [ ] Reads `GET /stats` (`dashboardStats`): animated counters; the punchline
  **method-breakdown** (≈94.5% Compra Directa) as the hero visual;
  signals-by-family; review-priority distribution; monthly trend;
  top-investigation case-file cards.
  *Done:* matches `../idea/05`; counters animate; respects reduced-motion.

## Epic 12.2 — Newsroom (`/newsroom`)
- [ ] **All current investigations** as dossier/case-file cards (kicker №,
  bilingual headline, buyer + anon supplier, value, signal chips,
  Review-Priority, 🎧).
  *Done:* cards match `../idea/05`; anonymized supplier display only.
- [ ] Current **Edition** as a featured banner/section (lead + highlights).
  *Done:* reflects `GET /editions/current`.
- [ ] Filters (family, priority, buyer, value range, search) + sort
  priority→recency→value; **no period filter**.
  *Done:* filters/sort hit `GET /investigations`; URL-syncable.

## Epic 12.3 — Methodology / About (`/methodology`)
- [ ] Static page (same noir system): data source, period/scope, how
  detection works, limitations, the "signals not proof" stance; linked from
  header + every article Cierre.
  *Done:* content accurate to `../idea/00`/`03`; bilingual.

## Epic 12.4 — Polish (Phase 4 depth)
- [ ] Empty/error states, loading skeletons in noir style; responsive;
  reduced-motion; lightweight motion (count-ups/reveals, no chapter engine).
  *Done:* views usable on small screens and reduced-motion.
