# MoveMate API 명세서

> 작성일: 2026-04-11  
> 대상: 내부 개발 / 발표용 기술 설명

---

## 목차

1. [전체 아키텍처](#1-전체-아키텍처)
2. [추천 경로 API](#2-추천-경로-api-post-apiroute-recommend)
3. [외부 공공데이터 API 연동](#3-외부-공공데이터-api-연동)
4. [계산 로직 상세](#4-계산-로직-상세)
5. [실패 위험도 계산](#5-실패-위험도-계산-failrisk)
6. [추천 이유 생성](#6-추천-이유-생성-buildreason)
7. [상수 및 보정값](#7-상수-및-보정값)

---

## 1. 전체 아키텍처

```
사용자 입력 (허브, 목적지, 짐 유무, 도보 선호)
    │
    ▼
POST /api/route-recommend
    │
    ├── 공공데이터 API 병렬 조회 (Promise.allSettled)
    │     ├── 자전거 실시간 현황 (따릉이)
    │     ├── 보관함 현황 (허브 근처)
    │     └── 보관함 현황 (목적지 근처)
    │
    ├── 후보 전략 점수 계산 (WALK / BIKE / LOCKER_WALK × 2)
    ├── 필터링 (짐 없으면 LOCKER_WALK 제외, 자전거 0대면 BIKE 제외)
    ├── 점수 내림차순 정렬
    └── 카드별 소요시간 / 실패위험도 / 추천이유 생성
            │
            ▼
    { ok: true, data: TRecommendResult }
```

---

## 2. 추천 경로 API `POST /api/route-recommend`

### Request

```json
{
  "hubId": "seoul_station",
  "destinationId": "myeongdong",
  "hasLuggage": true,
  "preferLessWalking": false,
  "lockerPreference": "hub"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `hubId` | string | ✅ | 도착 거점 ID (`seoul_station` / `gangnam` / `seongsu`) |
| `destinationId` | string | ✅ | 목적지 ID (`myeongdong`, `city_hall` 등) |
| `hasLuggage` | boolean | ✅ | 짐 소지 여부 |
| `preferLessWalking` | boolean | ✅ | 도보 최소화 선호 여부 |
| `lockerPreference` | `"hub" \| "destination" \| "recommend"` | — | 짐 보관 위치 선호 (hasLuggage=true일 때 유효) |
| `arrivalTime` | string (`HH:mm`) | — | 목표 도착 시각 (미입력 시 현재 시각 기준 순산) ※ 현재 비활성화 |

### Response

```json
{
  "ok": true,
  "data": {
    "routes": [ TRouteOption, ... ],
    "targetArrivalTime": "13:05",
    "hubName": "서울역",
    "destinationName": "명동"
  }
}
```

#### TRouteOption

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | `"A" \| "B" \| "C" \| "D"` | 순위 식별자 |
| `label` | string | 원본 전략명 (내부용) |
| `mode` | `"WALK" \| "BIKE" \| "LOCKER_WALK"` | 이동 전략 |
| `lockerLocation` | `"hub" \| "destination"` | LOCKER_WALK 전용: 보관 위치 |
| `totalMinutes` | number | 총 예상 소요 시간 (분) |
| `walkMinutes` | number | 도보 구간 합산 시간 (분) |
| `estimatedDepartureTime` | string | 예상 출발 시각 (`HH:mm`) |
| `targetArrivalTime` | string | 예상/목표 도착 시각 (`HH:mm`) |
| `stability` | `"HIGH" \| "MEDIUM" \| "LOW"` | 현재 자원 충분도 |
| `failRisk` | `"LOW" \| "MEDIUM" \| "HIGH"` | 실제 이동 실패 가능성 |
| `score` | number | 내부 추천 점수 |
| `reason` | string | 추천 이유 문장 |
| `bike` | TBikeInfo? | 자전거 실시간 정보 (BIKE 전략 시) |
| `locker` | TLockerInfo? | 보관함 실시간 정보 (LOCKER_WALK 전략 시) |

#### 오류 응답

```json
{ "ok": false, "message": "오류 메시지" }
```

| HTTP | 상황 |
|------|------|
| 400 | 입력값 검증 실패 (Zod) |
| 500 | 내부 서버 오류 / 공공데이터 API 장애 |

---

## 3. 외부 공공데이터 API 연동

### 3-1. 자전거 실시간 현황 (따릉이)

| 항목 | 내용 |
|------|------|
| 기관 | 서울시 공공자전거 |
| 엔드포인트 | `GET https://apis.data.go.kr/B551982/pbdo_v2/inf_101_00010002_v2` |
| 주요 파라미터 | `lcgvmnInstCd=1100000000` (서울시), `numOfRows=500` |
| 응답 핵심 필드 | `rntstnNm` (대여소명), `lat`, `lot`, `bcyclTpkctNocs` (대여 가능 대수) |
| 처리 방식 | 전체 대여소 조회 후 허브 좌표 기준 Haversine 거리 계산 → 1000m 이내 최근접 대여소 선택 |

```
nearestBike 선택 기준:
  haversineDistanceM(허브 좌표, 대여소 좌표) ≤ 1000m 인 것 중 최소 거리
```

### 3-2. 공영 물품보관함

| 항목 | 내용 |
|------|------|
| 기관 | 행정안전부 공영 물품보관함 |
| 정보 엔드포인트 | `GET https://apis.data.go.kr/B551982/psl_v2/locker_info_v2` |
| 실시간 엔드포인트 | `GET https://apis.data.go.kr/B551982/psl_v2/locker_realtime_use_v2` |
| 주요 파라미터 | `stdgCd=1100000000` (서울특별시), `numOfRows=500` |
| 실시간 핵심 필드 | `usePsbltyLrgszStlckCnt` (대형), `usePsbltyMdmszStlckCnt` (중형), `usePsbltySmlszStlckCnt` (소형) |
| 처리 방식 | 전체 조회 후 좌표 기반 필터링 (기본 반경 3000m), stlckId 기준 실시간 데이터 조인 |

```
totalAvailable = large + medium + small (여석 합산)
```

> ⚠ 보관함 API는 구(區) 단위 코드 조회 불가. 서울시 전체(1100000000)로 조회 후 좌표 필터링 필수.

### 3-3. 데이터 조회 실패 처리

세 API를 `Promise.allSettled`로 병렬 호출. 개별 실패 시 빈 배열/0으로 폴백 처리 → 서비스 중단 없음.

```ts
// 자전거 API 실패 시
bikeData = []  →  nearestBike = null  →  BIKE 전략 결과에서 제외

// 보관함 API 실패 시
totalLockers = 0  →  stability = LOW, failRisk 가중치 최대
```

---

## 4. 계산 로직 상세

### 4-1. 거리 및 시간 계산 상수

| 항목 | 값 | 근거 |
|------|-----|------|
| 도보 속도 | 67m/분 (≈ 4km/h) | 성인 평균 |
| 자전거 속도 | 200m/분 (≈ 12km/h) | 따릉이 평균 |
| 도로거리 보정 | 직선거리 × 1.3 | 서울 도심 실측 근사 |
| 보관함 이용 시간 | 5분 고정 | 짐 넣기 + 잠금 |

### 4-2. WALK 소요시간

```
walkDistM  = demoPlaces.distanceM (허브→목적지 추정 거리)
totalMin   = ceil(walkDistM / 67)
walkMinutes = totalMin
```

### 4-3. BIKE 소요시간

```
toStationMin  = ceil(nearestBike.roadM / 67)        # 허브→대여소 도보
rideDistM     = max(200, walkDistM - nearestBike.straightM)  # 대여소→목적지 (직선 보정)
rideMin       = ceil(rideDistM / 200)               # 자전거 이동
totalMin      = toStationMin + rideMin
walkMinutes   = toStationMin
```

> `rideDistM` 산출 근거: 대여소가 목적지 방향에 위치한다고 가정.  
> 최소 200m 하한 적용 (대여소가 목적지를 초과한 경우 보정).

### 4-4. LOCKER_WALK 소요시간

```
lockerRoadM  = nearestLocker.roadM (없으면 300m 기본값)
toLockerMin  = ceil(lockerRoadM / 67)    # 허브/목적지→보관함 도보
totalMin     = walkDistM 도보 + toLockerMin + 5분
walkMinutes  = ceil(walkDistM/67) + toLockerMin   # 실제 도보 합산
```

hub 전략: `허브 → 보관함(toLockerMin) → 짐 보관(5분) → 목적지(walkMin)`  
destination 전략: `허브 → 목적지(walkMin) → 보관함(toLockerMin) → 짐 보관(5분)`

### 4-5. 출발/도착 시각 계산

| 조건 | 계산 방향 |
|------|----------|
| `arrivalTime` 입력 있음 | `targetArrivalTime` 고정, `estimatedDepartureTime = targetArrivalTime - totalMin` |
| `arrivalTime` 없음 | `estimatedDepartureTime = 현재 시각`, `targetArrivalTime = 현재 + totalMin` |

### 4-6. 전략 점수 계산

점수가 높을수록 1순위. 후보 4개(WALK, BIKE, LOCKER_HUB, LOCKER_DEST) 정렬 후 필터링.

#### WALK 점수

```
거리 점수   : distanceM < 500 → +4 / <1000 → +3 / <1500 → +2 / else → +1
짐 없음     : +2
도보 OK     : +2  / 도보 싫음: -1
```

#### BIKE 점수

```
자전거 수   : ≥5 → +3 / ≥1 → +2 / 0 → -5
대여소 거리 : ≤400m → +3 / ≤800m → +2 / >800m → +1 / 없음 → -2
목적지 거리 : ≥1200m → +2 / ≥900m → +1
도보 최소화 : +2
짐 있음     : -3 / 없음: +2
```

#### LOCKER_WALK (hub) 점수

```
짐 있음     : +4 / 없음: -1
보관함 수   : ≥5 → +3 / ≥1 → +2 / 0 → -5
거리 효과   : 1000~1500m → +2 / ≥1500m → -1
도보 최소화 : +1
```

#### LOCKER_WALK (destination) 점수

```
짐 있음     : +3 / 없음: -2
보관함 수   : ≥5 → +3 / ≥1 → +2 / 0 → -5
거리 효과   : 1000~1500m → +1
도보 최소화 : -1 (목적지 도착 후 보관 → 짐 들고 걷는 구간 있음)
```

### 4-7. 후보 필터링 규칙

| 조건 | 동작 |
|------|------|
| `nearestBike = null` 또는 `bikeCount = 0` | BIKE 제외 |
| `hasLuggage = false` | LOCKER_WALK 전체 제외 |
| `lockerPreference = "hub"` | LOCKER_WALK destination 제외 |
| `lockerPreference = "destination"` | LOCKER_WALK hub 제외 |
| `lockerPreference = "recommend"` | 두 옵션 모두 포함 |

---

## 5. 실패 위험도 계산 (`failRisk`)

5개 요소 가중치 합산 → `LOW / MEDIUM / HIGH`

| 구간 | 판정 |
|------|------|
| 0 ~ 29점 | LOW |
| 30 ~ 59점 | MEDIUM |
| 60점 이상 | HIGH |

### 요소별 점수

#### 1. 실시간 자원 부족 위험 (최대 35점)

| BIKE 자전거 수 | 점수 |
|---|---|
| 0대 | +35 |
| 1대 | +25 |
| 2대 | +15 |
| 3~4대 | +8 |
| 5대 이상 | 0 |

| LOCKER 보관함 여석 | 점수 |
|---|---|
| 0칸 | +35 |
| 1칸 | +25 |
| 2~3칸 | +15 |
| 4~5칸 | +8 |
| 6칸 이상 | 0 |

#### 2. 시간 촉박 위험 (최대 25점, arrivalTime 입력 시만 활성)

| 잔여 버퍼 (목표 도착까지 - 소요시간) | 점수 |
|---|---|
| 음수 (이미 불가) | +25 |
| 0~4분 | +20 |
| 5~9분 | +12 |
| 10~19분 | +5 |
| 20분 이상 | 0 |

#### 3. 거리/피로 위험 (최대 20점)

| 도보 시간 (walkMin) | 점수 |
|---|---|
| 20분 이상 | +20 |
| 15~19분 | +15 |
| 10~14분 | +8 |
| 5~9분 | +3 |
| 5분 미만 | 0 |

#### 4. 사용자 조건 불일치 위험 (최대 15점)

| 조건 | 점수 |
|---|---|
| WALK + 도보 싫음 + 1000m 초과 | +15 |
| BIKE + 짐 있음 | +10 |
| LOCKER_WALK + 짐 없음 | +8 |
| WALK + 짐 있음 | +5 |

#### 5. 전략 복잡도 위험 (최대 5점)

| 전략 | 점수 |
|---|---|
| LOCKER_WALK (보관함 찾기 → 보관 → 도보) | +5 |
| BIKE (대여소 찾기 → 대여 → 이동) | +3 |
| WALK | 0 |

---

## 6. 추천 이유 생성 (`buildReason`)

### WALK

| 조건 | 문장 |
|------|------|
| 500m 미만 | "목적지까지 가까워 바로 걸어가는 것이 가장 빠릅니다." |
| 짐 없음 + 도보 OK | "짐이 없고 도보 이동이 무리 없는 거리입니다." |
| 기타 | "목적지까지 도보 약 N분 거리입니다." |

### BIKE

```
약 {roadM}m 거리 대여소에 자전거 {count}대 이용 가능합니다.
도보 대비 약 {saved}분 빠릅니다. / 도보와 소요 시간이 비슷합니다.
```

> `saved = walkTotal - bikeTotal` (실제 계산값 기반)

### LOCKER_WALK

| 조건 | 문장 |
|------|------|
| 보관함 0칸 | "{지역} 인근 보관함 현황을 확인 중입니다. 도착 전 사전 확인을 권장합니다." |
| hub 보관 | "{허브} 도착 후 바로 짐을 맡기고(N칸 여유) 몸만 이동할 수 있습니다." |
| destination 보관 | "{목적지} 도착 후 인근 보관함(N칸 여유)에 짐을 맡기고 자유롭게 탐방할 수 있습니다." |

---

## 7. 상수 및 보정값

| 상수 | 값 | 위치 |
|------|-----|------|
| 도보 속도 | 67m/분 | `geo.ts:walkMinutes` |
| 자전거 속도 | 200m/분 | `geo.ts:bikeMinutes` |
| 도로거리 보정계수 | 1.3 | `geo.ts:ROAD_FACTOR` |
| 보관함 이용 고정 시간 | 5분 | `routeRecommendService.ts:LOCKER_USE_MIN` |
| 보관함 없을 때 기본 거리 | 300m | `routeRecommendService.ts:lockerRoadM 기본값` |
| 자전거 대여소 탐색 반경 | 1000m | `routeRecommendService.ts:minDist <= 1000` |
| 보관함 탐색 반경 | 3000m | `lockerService.ts:maxDistM` |
| 자전거 최소 라이딩 거리 | 200m | `routeRecommendService.ts:rideDistM 하한` |
| TanStack Query 캐시 | 60초 | `useRouteRecommend.ts:staleTime` |

---

## 데모 허브 / 목적지

### 허브

| ID | 이름 | 좌표 |
|---|---|---|
| `seoul_station` | 서울역 | 37.555, 126.9723 |
| `gangnam` | 강남역 | 37.498, 127.0276 |
| `seongsu` | 성수역 | 37.5445, 127.0568 |

### 서울역 목적지

| ID | 이름 | 거리 |
|---|---|---|
| `myeongdong` | 명동 | 1200m |
| `city_hall` | 시청 | 900m |
| `namdaemun` | 남대문시장 | 800m |

### 강남역 목적지

| ID | 이름 | 거리 |
|---|---|---|
| `yeoksam` | 역삼 업무지구 | 800m |
| `seocho` | 서초 일대 | 1000m |
| `coex` | COEX | 1400m |

### 성수역 목적지

| ID | 이름 | 거리 |
|---|---|---|
| `seoulforest` | 서울숲 | 700m |
| `cafedistrict` | 성수 카페거리 | 800m |
| `ttukseom` | 뚝섬 한강공원 | 1200m |
