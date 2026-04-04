# CLAUDE.md

## Commands

```bash
npm run dev    # Next.js dev server (port 3000)
npm run build  # Production build
npm run lint   # ESLint
```

## Architecture Overview

**MoveMate** is a Next.js 15 / React 19 web app that recommends optimal transit routes based on real-time public data (bus, bike, locker).

### Routing

```
src/app/
  page.tsx              # 홈 (입력 폼 + 결과)
  api/
    route-recommend/    # 추천 경로 계산 API
    realtime/
      bus/              # 버스 도착 정보
      bike/             # 자전거 가용 여부
      locker/           # 보관함 여석
```

### Feature Module Structure

```
src/features/<feature>/
  components/   # UI 컴포넌트
  hooks/        # TanStack Query 훅
  queries/      # Query key factories
  schemas/      # Zod 스키마
  services/     # 외부 API 클라이언트
```

### Key Conventions

- Path alias: `@/` → `src/`
- Types: `T` prefix (e.g. `TRouteInput`, `TRouteOption`)
- Zod for input validation (client + server)
- TanStack Query for server state
- API response envelope: `{ ok: true, data: {...} }` / `{ ok: false, message: "..." }`
- Prettier: single quotes, semi, 80 cols
