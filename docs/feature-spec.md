# MoveMate 기능 명세서

> 작성일: 2026-04-11 / 최종 수정: 2026-04-11
> 버전: v1.3 (OpenAI 통합, LOCKER_BIKE 추가, arrivalTime 제거)

---

## 목차

1. [서비스 개요](#1-서비스-개요)
2. [화면 흐름](#2-화면-흐름)
3. [입력 폼](#3-입력-폼)
4. [추천 계산 파이프라인](#4-추천-계산-파이프라인)
5. [공공데이터 연동](#5-공공데이터-연동)
6. [전략 점수 계산](#6-전략-점수-계산)
7. [소요시간 계산](#7-소요시간-계산)
8. [실패 위험도 계산](#8-실패-위험도-계산-failrisk)
9. [추천 이유 생성 — AI + 룰베이스](#9-추천-이유-생성--ai--룰베이스)
10. [결과 카드 UI](#10-결과-카드-ui)
11. [지도 화면](#11-지도-화면)
12. [API 명세](#12-api-명세)
13. [데모 데이터](#13-데모-데이터)
14. [상수 및 보정값](#14-상수-및-보정값)

---

## 1. 서비스 개요

**MoveMate**는 서울 주요 교통 거점(역)에서 최종 목적지까지의 최적 이동 전략을 실시간으로 추천하는 웹 앱입니다.

### 핵심 철학

```
추천은 알고리즘이 한다  →  설명은 AI가 한다
```

기존의 이동 추천 서비스는 결과를 제공하는 데 그치는 경우가 많다.
본 서비스는 AI를 활용하여 추천 결과에 대한 이유를 자연어로 설명함으로써,
사용자가 추천을 신뢰하고 실제 행동으로 이어질 수 있도록 설계하였다.

### AI 설계 원칙

- **알고리즘 우선**: 실시간 공공데이터(따릉이, 공영 보관함)를 조합해 점수 기반으로 전략 순위 결정
- **AI는 설명 강화 레이어**: 알고리즘이 결정한 전략에 대해 사용자에게 설득력 있는 자연어 설명 생성
- **AI 없이도 정상 동작**: 본 서비스는 AI 없이도 기본 추천 기능이 완전히 동작하도록 설계되었으며, AI는 사용자 이해도를 높이기 위한 설명 강화 레이어로만 활용된다.
- **룰베이스 fallback**: AI 호출 실패 또는 API 키 미설정 시 규칙 기반 설명으로 자동 대체, 서비스 중단 없음
- **병렬 처리**: AI 설명은 각 경로별로 동시에 생성되며, 모든 경로의 AI 설명이 완성된 후 완전한 결과를 한 번에 제공한다.

### 이동 전략 유형

| 전략 | 설명 | 조건 |
|------|------|------|
| `WALK` | 거점 → 목적지 도보 이동 | 항상 후보 |
| `BIKE` | 거점 → 따릉이 대여소 → 목적지 자전거 이동 | 짐 없음 + 자전거 있음 |
| `LOCKER_WALK (hub)` | 거점 근처 보관함 짐 보관 → 목적지 도보 이동 | 짐 있음 + 보관함 있음 |
| `LOCKER_WALK (destination)` | 목적지까지 도보 이동 → 도착 후 보관함 짐 보관 | 짐 있음 + 보관함 있음 |
| `LOCKER_BIKE` | 거점 근처 보관함 짐 보관 → 자전거 이동 | 짐 있음 + 보관함 있음 + 자전거 있음 |

---

## 2. 화면 흐름

```
온보딩 화면
    └─ "시작하기" →

입력 폼 화면
    └─ "추천받기" →

로딩 화면 (분석 중)
    ├── 4단계 진행 애니메이션 (약 1.8초)
    └── API 응답 완료 시 자동 전환 →

결과 화면
    ├── 경로 카드 목록 (1~5개)
    ├── 카드 클릭 → 상세 바텀시트
    └── "지도에서 보기" → 지도 화면
```

### 로딩 화면 단계

| 단계 | 메시지 |
|------|--------|
| 1 | 📡 공영자전거 실시간 정보 확인 중... |
| 2 | 🧳 주변 보관함 여석 확인 중... |
| 3 | 📍 이동 거리 및 시간 계산 중... |
| 4 | 📊 가장 적합한 이동 전략 분석 중... |

- 각 단계 450ms 간격 자동 진행
- API 응답 도착 시 마지막 단계에서 "최적의 이동 전략을 찾았습니다 ✓" 표시 후 700ms 대기 → 결과 화면 전환

---

## 3. 입력 폼

### 입력 항목

| 항목 | 타입 | 필수 | 설명 |
|------|------|------|------|
| 도착 거점 | 선택 버튼 | ✅ | 서울역 / 강남역 / 성수역 |
| 최종 목적지 | 칩 선택 | ✅ | 거점 선택 후 하위 목적지 표시 |
| 짐 유무 | 토글 | ✅ | 짐이 있어요 / 가볍게 왔어요 |
| 짐 보관 위치 | 카드 선택 | 조건부 | 짐 있을 때만 표시 |
| 걷기 선호 | 토글 | ✅ | 걸어도 괜찮아요 / 적게 걷고 싶어요 |

### 짐 보관 위치 옵션 (hasLuggage = true 시)

| 값 | 레이블 | 설명 |
|----|--------|------|
| `hub` | 도착하자마자 맡기기 | 거점 근처 보관함에 바로 맡기고 이동 |
| `destination` | 목적지 근처에서 맡기기 | 목적지 도착 후 근처 보관함 이용 |
| `recommend` | 아직 모르겠어요 (추천받기) | 두 옵션 모두 비교 제공 |

### 폼 활성화 조건

```
hubId ≠ '' AND destinationId ≠ '' AND hasLuggage ≠ null
AND (hasLuggage = false OR lockerPreference ≠ null)
AND preferLessWalking ≠ null
```

모든 조건이 충족될 때만 "추천받기" 버튼 활성화.

---

## 4. 추천 계산 파이프라인

```
POST /api/route-recommend
       │
       ├─ [1] 입력값 검증 (Zod)
       │
       ├─ [2] 공공데이터 병렬 조회 (Promise.allSettled)
       │       ├── 따릉이 실시간 현황
       │       ├── 공영 보관함 현황 (허브 근처)
       │       └── 공영 보관함 현황 (목적지 근처)
       │
       ├─ [3] 최근접 자원 선택
       │       ├── nearestBike: 허브 1000m 이내 최근접 대여소
       │       └── nearestLocker: 허브/목적지 3000m 이내 최근접 보관함
       │
       ├─ [4] 후보 전략 점수 계산 (5개)
       │       ├── WALK
       │       ├── BIKE
       │       ├── LOCKER_WALK (hub)
       │       ├── LOCKER_WALK (destination)
       │       └── LOCKER_BIKE
       │
       ├─ [5] 후보 필터링 + 내림차순 정렬
       │
       ├─ [6] 경로 카드 생성
       │       ├── 소요시간 계산
       │       ├── 출발/도착 시각 계산 (현재 시각 기준 순산)
       │       ├── failRisk 계산
       │       └── buildReason() — 룰베이스 설명 (fallback)
       │
       └─ [7] OpenAI 설명 강화 (병렬)
               ├── 각 경로별 generateAiReason() 호출
               ├── 성공 → AI 설명으로 reason 교체
               └── 실패 → buildReason() 결과 유지
```

---

## 5. 공공데이터 연동

### 5-1. 따릉이 실시간 현황

| 항목 | 내용 |
|------|------|
| 기관 | 서울시 공공자전거 |
| 엔드포인트 | `GET https://apis.data.go.kr/B551982/pbdo_v2/inf_101_00010002_v2` |
| 파라미터 | `lcgvmnInstCd=1100000000`, `numOfRows=500` |
| 핵심 응답 필드 | `rntstnNm` (대여소명), `lat`, `lot`, `bcyclTpkctNocs` (잔여 대수) |
| 처리 방식 | Haversine 거리 계산 → 허브 1000m 이내 최근접 1개 선택 |

### 5-2. 공영 물품보관함

| 항목 | 내용 |
|------|------|
| 기관 | 행정안전부 |
| 정보 엔드포인트 | `GET https://apis.data.go.kr/B551982/psl_v2/locker_info_v2` |
| 실시간 엔드포인트 | `GET https://apis.data.go.kr/B551982/psl_v2/locker_realtime_use_v2` |
| 여석 계산 | `대형 + 중형 + 소형 여석 합산` |
| 처리 방식 | 서울시 전체 조회 후 좌표 기반 반경 3000m 필터링, stlckId 기준 실시간 조인 |

### 5-3. 장애 대응

`Promise.allSettled` 병렬 호출. 개별 API 실패 시:

| API 실패 | 처리 |
|---------|------|
| 따릉이 | `nearestBike = null` → BIKE / LOCKER_BIKE 자동 제외 |
| 보관함(허브) | `totalLockersHub = 0` → LOCKER_WALK(hub) / LOCKER_BIKE 자동 제외 |
| 보관함(목적지) | `totalLockersDest = 0` → LOCKER_WALK(destination) 자동 제외 |

서비스 중단 없이 가용한 전략만으로 결과 제공.

---

## 6. 전략 점수 계산

점수가 높을수록 1순위. 후보 필터링 후 내림차순 정렬.

### WALK

```
거리 점수:   < 500m → +4 / < 1000m → +3 / < 1500m → +2 / else → +1
짐 없음:     +2
도보 가능:   +2 / 도보 싫음: -1
```

### BIKE (짐 없을 때만 후보)

```
자전거 수:   ≥5대 → +3 / ≥1대 → +2 / 0대 → -5
대여소 거리: ≤400m → +3 / ≤800m → +2 / >800m → +1 / 없음 → -2
목적지 거리: ≥1200m → +2 / ≥900m → +1
도보 최소화: +2
```

### LOCKER_WALK (hub)

```
짐 있음:     +4 / 없음: -1
보관함 수:   ≥5칸 → +3 / ≥1칸 → +2 / 0칸 → -5
거리 효과:   1000~1500m → +2 / ≥1500m → -1
도보 최소화: +1
```

### LOCKER_WALK (destination)

```
짐 있음:     +3 / 없음: -2
보관함 수:   ≥5칸 → +3 / ≥1칸 → +2 / 0칸 → -5
거리 효과:   1000~1500m → +1
도보 최소화: -1  (목적지까지 짐 들고 도보)
```

### LOCKER_BIKE (짐 있고 도보 최소화 원할 때 최우선)

```
짐 있음:     +5 / 없음: -10
자전거 수:   ≥5대 → +3 / ≥1대 → +2 / 0대 → -5
대여소 거리: ≤400m → +3 / ≤800m → +2 / >800m → +1 / 없음 → -2
보관함 수:   ≥5칸 → +3 / ≥1칸 → +2 / 0칸 → -5
목적지 거리: ≥1200m → +2 / ≥900m → +1
도보 최소화: +3
```

### 필터링 규칙

| 조건 | 처리 |
|------|------|
| `bikeCount = 0` 또는 대여소 없음 | BIKE / LOCKER_BIKE 제외 |
| `hasLuggage = true` | BIKE 제외 (짐 들고 따릉이 불가) |
| `hasLuggage = false` | LOCKER_WALK / LOCKER_BIKE 전체 제외 |
| 보관함 여석 = 0 | 해당 LOCKER 전략 제외 |
| `lockerPreference = "hub"` | LOCKER_WALK destination 제외 |
| `lockerPreference = "destination"` | LOCKER_WALK hub / LOCKER_BIKE 제외 |
| `lockerPreference = "recommend"` | 모든 보관 전략 포함 |

---

## 7. 소요시간 계산

### 속도 상수

| 이동 수단 | 속도 | 기준 |
|-----------|------|------|
| 도보 | 67m/분 (≈ 4km/h) | 성인 평균 |
| 따릉이 | 200m/분 (≈ 12km/h) | 따릉이 평균 |
| 도로거리 보정 | 직선거리 × 1.3 | 서울 도심 실측 근사 |

### WALK

```
totalMin    = ceil(walkDistM / 67)
walkMinutes = totalMin
```

### BIKE

```
toStationMin = ceil(nearestBike.roadM / 67)
rideDistM    = max(200, walkDistM - nearestBike.straightM)
rideMin      = ceil(rideDistM / 200)
totalMin     = toStationMin + rideMin
walkMinutes  = toStationMin
```

> `rideDistM`: 대여소가 목적지 방향에 위치 가정. 최소 200m 하한.

### LOCKER_WALK

```
lockerRoadM  = nearestLocker.roadM  (없으면 300m 기본값)
toLockerMin  = ceil(lockerRoadM / 67)
totalMin     = walkMin + toLockerMin + 5
walkMinutes  = walkMin + toLockerMin
```

hub 전략: `허브 → 보관함(toLockerMin) → 짐 보관(5분) → 목적지(walkMin)`
destination 전략: `허브 → 목적지(walkMin) → 보관함(toLockerMin) → 짐 보관(5분)`

### LOCKER_BIKE

```
toLockerMin      = ceil(nearestLocker.roadM / 67)
toStationMin     = ceil(nearestBike.roadM / 67)
walkToResources  = max(toLockerMin, toStationMin)  ← 보관함·대여소 중복 도보 방지
rideDistM        = max(200, walkDistM - nearestBike.straightM)
rideMin          = ceil(rideDistM / 200)
totalMin         = walkToResources + 5 + rideMin
walkMinutes      = walkToResources
```

> 보관함과 대여소가 모두 허브 근처에 위치하므로 두 도보 시간 중 큰 값만 반영.

---

## 8. 실패 위험도 계산 (`failRisk`)

4개 요소 가중치 합산 → `LOW / MEDIUM / HIGH`

| 점수 범위 | 판정 |
|-----------|------|
| 0 ~ 29 | LOW |
| 30 ~ 59 | MEDIUM |
| 60 이상 | HIGH |

### 요소 1. 실시간 자원 부족 (최대 35점)

| BIKE 잔여 대수 | 점수 | LOCKER 여유 칸수 | 점수 |
|----------------|------|-----------------|------|
| 0대 | +35 | 0칸 | +35 |
| 1대 | +25 | 1칸 | +25 |
| 2대 | +15 | 2~3칸 | +15 |
| 3~4대 | +8 | 4~5칸 | +8 |
| 5대 이상 | 0 | 6칸 이상 | 0 |

> `LOCKER_BIKE`: 자전거 위험도와 보관함 위험도 중 높은 값을 반영.

### 요소 2. 거리/피로 위험 (최대 20점)

| 도보 시간 | 점수 |
|-----------|------|
| 20분 이상 | +20 |
| 15~19분 | +15 |
| 10~14분 | +8 |
| 5~9분 | +3 |
| 5분 미만 | 0 |

### 요소 3. 사용자 조건 불일치 (최대 15점)

| 조건 | 점수 |
|------|------|
| WALK + 도보 싫음 + 거리 1000m 초과 | +15 |
| BIKE + 짐 있음 | +10 |
| LOCKER_WALK + 짐 없음 | +8 |
| WALK + 짐 있음 | +5 |

### 요소 4. 전략 복잡도 (최대 5점)

| 전략 | 점수 | 이유 |
|------|------|------|
| LOCKER_BIKE | +5 | 보관함 + 대여소 + 자전거 — 가장 복잡 |
| LOCKER_WALK | +4 | 보관함 찾기 → 보관 → 도보 |
| BIKE | +3 | 대여소 찾기 → 대여 → 이동 |
| WALK | 0 | 단순 이동 |

---

## 9. 추천 이유 생성 — AI + 룰베이스

### 아키텍처

```
buildReason()         →  룰베이스 설명 생성 (즉시, fallback)
generateAiReason()    →  OpenAI로 강화 (비동기, 병렬)
       │
       ├── 성공 → AI 생성 설명으로 교체
       └── 실패 → buildReason() 결과 그대로 유지
```

### OpenAI 설정

| 항목 | 값 |
|------|-----|
| 모델 | `gpt-4.1-mini` |
| 최대 토큰 | 120 |
| temperature | 0.4 |
| API 키 미설정 시 | 즉시 null 반환 → fallback |

### 시스템 프롬프트

```
당신은 서울 이동 경로 추천 앱 MoveMate의 AI 어시스턴트입니다.
사용자의 실시간 상황에 맞는 이동 전략을 자연스럽고 설득력 있는 한국어로 설명해주세요.

설명 작성 규칙:
- 1~2문장으로 간결하게 작성
- 실시간 수치(잔여 자전거 대수, 보관함 여유 칸수 등)를 구체적으로 언급
- 사용자 조건(짐 여부, 도보 선호도)을 자연스럽게 반영
- 이 전략이 왜 지금 이 상황에 최선인지 실제 데이터와 조건을 근거로 설명 (순위 반복 금지)
- 실패 위험도가 MEDIUM 또는 HIGH인 경우, 그 이유를 한 문장 안에서 짧게 언급
- 필요하면 이 전략의 주의점이나 한계도 짧게 함께 언급
- 존댓말 사용 (합니다/습니다 체) / 이모지 사용 금지
```

### AI에 전달되는 컨텍스트 (LOCKER_BIKE 예시)

```
이동 전략: 거점 짐 보관 후 자전거 이동
출발지: 강남역 → 목적지: COEX
총 소요 시간: 14분 / 예상 도보 거리: 1400m
사용자 조건: 짐 있음, 도보 최소화 선호
실행 가능성: HIGH / 실패 위험도: LOW
추천 순위: 1위
실시간 데이터 — 대여소: 강남역 1번출구, 잔여 자전거: 7대, 대여소까지: 250m
실시간 데이터 — 보관함 위치: 강남역 근처(강남역 물품보관함), 여유 칸수: 5칸, 보관함까지: 180m
```

### 룰베이스 설명 (fallback)

| 전략 | 조건 | 문장 |
|------|------|------|
| WALK | 500m 미만 | "목적지까지 가까워 바로 걸어가는 것이 가장 빠릅니다." |
| WALK | 짐 없음 + 도보 OK | "짐이 없고 도보 이동이 무리 없는 거리입니다." |
| WALK | 기타 | "목적지까지 도보 약 N분 거리입니다." |
| BIKE | 기본 | "약 {roadM}m 거리 대여소에 자전거 {count}대 이용 가능합니다. 도보 대비 약 {saved}분 빠릅니다." |
| LOCKER_WALK | hub 보관 | "{허브} 도착 후 바로 짐을 맡기고(N칸 여유) 몸만 이동할 수 있습니다." |
| LOCKER_WALK | destination 보관 | "{목적지} 도착 후 인근 보관함(N칸 여유)에 짐을 맡기고 자유롭게 탐방할 수 있습니다." |
| LOCKER_BIKE | 기본 | "{허브} 도착 후 보관함(N칸 여유)에 짐을 맡기고, 자전거 {count}대 이용 가능한 대여소에서 가볍게 이동하세요." |

---

## 10. 결과 카드 UI

### 카드 구성 요소

| 요소 | 설명 |
|------|------|
| 순위 배지 | 1위는 "⭐ 지금 조건에서 최적 선택" 강조 |
| 액션 레이블 | 전략별 행동 중심 문구 |
| 소요 시간 | `총 N분` (도보 시간 별도 표기) |
| 출발/도착 시각 | `HH:mm → HH:mm` |
| stability 배지 | 자원 충분도 (HIGH/MEDIUM/LOW) |
| failRisk 배지 | 실패 위험도 + 이유 문구 |
| reason | AI 또는 룰베이스 설명 |
| 실시간 데이터 표시 | 자전거 대수 / 보관함 여석 |
| CTA 버튼 (1위) | "이 전략으로 이동하기 →" |
| 지도 버튼 | "지도에서 보기" |

### 액션 레이블 (전략별)

| 전략 | 레이블 |
|------|--------|
| WALK | 도보로 이동 |
| BIKE | 자전거로 빠르게 이동 |
| LOCKER_WALK (hub) | 짐 보관 후 가볍게 이동 |
| LOCKER_WALK (destination) | 이동 후 목적지에서 짐 보관 |
| LOCKER_BIKE | 짐 보관 후 자전거로 이동 |

### 지도 색상 (전략별)

| 전략 | 색상 |
|------|------|
| WALK | 초록 (#22c55e) |
| BIKE | 파랑 (#3b82f6) |
| LOCKER_WALK | 보라 (#a855f7) |
| LOCKER_BIKE | 주황 (#f97316) |

---

## 11. 지도 화면

- Leaflet 기반 인터랙티브 지도 (SSR 비활성화)
- 허브, 목적지, 따릉이 대여소, 보관함 위치 마커 표시
- 전략에 따라 관련 마커만 노출
- 상단 "← 돌아가기" 버튼으로 결과 화면 복귀

---

## 12. API 명세

### `POST /api/route-recommend`

#### Request

```json
{
  "hubId": "gangnam",
  "destinationId": "coex",
  "hasLuggage": true,
  "preferLessWalking": true,
  "lockerPreference": "recommend"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `hubId` | string | ✅ | 도착 거점 ID |
| `destinationId` | string | ✅ | 목적지 ID |
| `hasLuggage` | boolean | ✅ | 짐 소지 여부 |
| `preferLessWalking` | boolean | ✅ | 도보 최소화 선호 여부 |
| `lockerPreference` | `"hub" \| "destination" \| "recommend"` | — | hasLuggage=true 시 유효 |

#### Response

```json
{
  "ok": true,
  "data": {
    "routes": [TRouteOption],
    "targetArrivalTime": "13:05",
    "hubName": "강남역",
    "destinationName": "COEX"
  }
}
```

#### TRouteOption 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | `"A"~"D"` | 순위 식별자 |
| `mode` | `WALK \| BIKE \| LOCKER_WALK \| LOCKER_BIKE` | 전략 유형 |
| `lockerLocation` | `"hub" \| "destination"` | LOCKER 전략 전용 |
| `totalMinutes` | number | 총 소요 시간 |
| `walkMinutes` | number | 도보 구간 합산 |
| `estimatedDepartureTime` | `HH:mm` | 예상 출발 시각 (현재 시각) |
| `targetArrivalTime` | `HH:mm` | 예상 도착 시각 |
| `stability` | `HIGH \| MEDIUM \| LOW` | 자원 충분도 |
| `failRisk` | `LOW \| MEDIUM \| HIGH` | 실패 위험도 |
| `score` | number | 내부 추천 점수 |
| `reason` | string | AI 또는 룰베이스 설명 |
| `bike` | TBikeInfo? | 자전거 정보 (BIKE / LOCKER_BIKE 전략) |
| `locker` | TLockerInfo? | 보관함 정보 (LOCKER_WALK / LOCKER_BIKE 전략) |

#### 오류 응답

```json
{ "ok": false, "message": "오류 메시지" }
```

| HTTP | 상황 |
|------|------|
| 400 | Zod 입력 검증 실패 |
| 500 | 서버 오류 |

---

## 13. 데모 데이터

### 허브

| ID | 이름 | 좌표 |
|----|------|------|
| `seoul_station` | 서울역 | 37.555, 126.9723 |
| `gangnam` | 강남역 | 37.498, 127.0276 |
| `seongsu` | 성수역 | 37.5445, 127.0568 |

### 서울역 목적지

| ID | 이름 | 거리 |
|----|------|------|
| `myeongdong` | 명동 | 1200m |
| `city_hall` | 시청 | 900m |
| `namdaemun` | 남대문시장 | 800m |

### 강남역 목적지

| ID | 이름 | 거리 |
|----|------|------|
| `yeoksam` | 역삼 업무지구 | 800m |
| `seocho` | 서초 일대 | 1000m |
| `coex` | COEX | 1400m |

### 성수역 목적지

| ID | 이름 | 거리 |
|----|------|------|
| `seoulforest` | 서울숲 | 700m |
| `cafedistrict` | 성수 카페거리 | 800m |
| `ttukseom` | 뚝섬 한강공원 | 1200m |

---

## 14. 상수 및 보정값

| 상수 | 값 | 파일 |
|------|----|------|
| 도보 속도 | 67m/분 | `lib/geo.ts` |
| 자전거 속도 | 200m/분 | `lib/geo.ts` |
| 도로거리 보정계수 | ×1.3 | `lib/geo.ts` |
| 보관함 이용 고정 시간 | 5분 | `routeRecommendService.ts` |
| 보관함 기본 거리 (없을 때) | 300m | `routeRecommendService.ts` |
| 자전거 대여소 탐색 반경 | 1000m | `routeRecommendService.ts` |
| 보관함 탐색 반경 | 3000m | `lockerService.ts` |
| 자전거 최소 라이딩 거리 | 200m | `routeRecommendService.ts` |
| TanStack Query 캐시 | 60초 | `useRouteRecommend.ts` |
| AI 모델 | `gpt-4.1-mini` | `aiReasonService.ts` |
| AI 최대 토큰 | 120 | `aiReasonService.ts` |
| AI temperature | 0.4 | `aiReasonService.ts` |
