# MoveMate 기능 명세서

> 작성일: 2026-04-11  
> 버전: v1.1 (Claude AI 통합)

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

| 전략 | 설명 |
|------|------|
| `WALK` | 거점 → 목적지 도보 이동 |
| `BIKE` | 거점 → 따릉이 대여소 도보 → 목적지 자전거 이동 |
| `LOCKER_WALK (hub)` | 거점 근처 보관함 짐 보관 → 목적지 도보 이동 |
| `LOCKER_WALK (destination)` | 목적지까지 도보 이동 → 도착 후 보관함 짐 보관 |

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
    ├── 경로 카드 목록 (1~4개)
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
       ├─ [4] 후보 전략 점수 계산 (4개)
       │       ├── WALK
       │       ├── BIKE
       │       ├── LOCKER_WALK (hub)
       │       └── LOCKER_WALK (destination)
       │
       ├─ [5] 후보 필터링 + 내림차순 정렬
       │
       ├─ [6] 경로 카드 생성
       │       ├── 소요시간 계산
       │       ├── 출발/도착 시각 계산
       │       ├── failRisk 계산
       │       └── buildReason() — 룰베이스 설명 (fallback)
       │
       └─ [7] Claude AI 설명 강화 (병렬)
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
| 따릉이 | `nearestBike = null` → BIKE 전략 자동 제외 |
| 보관함(허브) | `totalLockersHub = 0` → LOCKER_WALK(hub) stability = LOW |
| 보관함(목적지) | `totalLockersDest = 0` → LOCKER_WALK(destination) stability = LOW |

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

### BIKE

```
자전거 수:   ≥5대 → +3 / ≥1대 → +2 / 0대 → -5
대여소 거리: ≤400m → +3 / ≤800m → +2 / >800m → +1 / 없음 → -2
목적지 거리: ≥1200m → +2 / ≥900m → +1
도보 최소화: +2
짐 있음:     -3 / 없음: +2
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

### 필터링 규칙

| 조건 | 처리 |
|------|------|
| `bikeCount = 0` 또는 대여소 없음 | BIKE 제외 |
| `hasLuggage = false` | LOCKER_WALK 전체 제외 |
| `lockerPreference = "hub"` | LOCKER_WALK destination 제외 |
| `lockerPreference = "destination"` | LOCKER_WALK hub 제외 |
| `lockerPreference = "recommend"` | 두 옵션 모두 포함 |

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

---

## 8. 실패 위험도 계산 (`failRisk`)

5개 요소 가중치 합산 → `LOW / MEDIUM / HIGH`

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

### 요소 2. 시간 촉박 위험 (최대 25점, arrivalTime 입력 시만 활성)

| 잔여 버퍼 | 점수 |
|-----------|------|
| 음수 (이미 지각) | +25 |
| 0~4분 | +20 |
| 5~9분 | +12 |
| 10~19분 | +5 |
| 20분 이상 | 0 |

### 요소 3. 거리/피로 위험 (최대 20점)

| 도보 시간 | 점수 |
|-----------|------|
| 20분 이상 | +20 |
| 15~19분 | +15 |
| 10~14분 | +8 |
| 5~9분 | +3 |
| 5분 미만 | 0 |

### 요소 4. 사용자 조건 불일치 (최대 15점)

| 조건 | 점수 |
|------|------|
| WALK + 도보 싫음 + 거리 1000m 초과 | +15 |
| BIKE + 짐 있음 | +10 |
| LOCKER_WALK + 짐 없음 | +8 |
| WALK + 짐 있음 | +5 |

### 요소 5. 전략 복잡도 (최대 5점)

| 전략 | 점수 |
|------|------|
| LOCKER_WALK | +5 |
| BIKE | +3 |
| WALK | 0 |

---

## 9. 추천 이유 생성 — AI + 룰베이스

### 아키텍처

```
buildReason()         →  룰베이스 설명 생성 (즉시, fallback)
generateAiReason()    →  Claude AI로 강화 (비동기, 병렬)
       │
       ├── 성공 → AI 생성 설명으로 교체
       └── 실패 → buildReason() 결과 그대로 유지
```

### Claude AI 설정

| 항목 | 값 |
|------|-----|
| 모델 | `claude-opus-4-6` |
| 최대 토큰 | 200 |
| 방식 | 스트리밍 (`messages.stream` + `finalMessage()`) |
| API 키 미설정 시 | 즉시 null 반환 → fallback |

### 시스템 프롬프트

```
당신은 서울 이동 경로 추천 앱 MoveMate의 AI 어시스턴트입니다.
사용자의 실시간 상황에 맞는 이동 전략을 자연스럽고 설득력 있는 한국어로 설명해주세요.

설명 작성 규칙:
- 2~3문장으로 간결하게 작성
- 실시간 수치(잔여 자전거 대수, 보관함 여유 칸수 등)를 구체적으로 언급
- 사용자 조건(짐 여부, 도보 선호도)을 자연스럽게 반영
- 이 전략이 왜 지금 이 상황에 최선인지 납득이 가도록 설명
- 존댓말 사용 (합니다/습니다 체)
- 이모지 사용 금지
```

### AI에 전달되는 컨텍스트 예시 (BIKE 경로)

```
이동 전략: 따릉이 자전거
출발지: 강남역 → 목적지: COEX
총 소요 시간: 12분 / 도보 거리: 1400m
사용자 조건: 짐 없음, 도보 최소화 선호
추천 순위: 1위
실시간 데이터 — 대여소: 강남역 1번출구, 잔여 자전거: 7대, 대여소까지: 250m
```

### 룰베이스 설명 (fallback)

#### WALK

| 조건 | 문장 |
|------|------|
| 500m 미만 | "목적지까지 가까워 바로 걸어가는 것이 가장 빠릅니다." |
| 짐 없음 + 도보 OK | "짐이 없고 도보 이동이 무리 없는 거리입니다." |
| 기타 | "목적지까지 도보 약 N분 거리입니다." |

#### BIKE

```
약 {roadM}m 거리 대여소에 자전거 {count}대 이용 가능합니다.
도보 대비 약 {saved}분 빠릅니다.  /  도보와 소요 시간이 비슷합니다.
```

#### LOCKER_WALK

| 조건 | 문장 |
|------|------|
| 보관함 0칸 | "{지역} 인근 보관함 현황을 확인 중입니다. 도착 전 사전 확인을 권장합니다." |
| hub 보관 | "{허브} 도착 후 바로 짐을 맡기고(N칸 여유) 몸만 이동할 수 있습니다." |
| destination 보관 | "{목적지} 도착 후 인근 보관함(N칸 여유)에 짐을 맡기고 자유롭게 탐방할 수 있습니다." |

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
| WALK | 바로 걸어가기 |
| BIKE | 자전거로 빠르게 이동 |
| LOCKER_WALK (hub) | 짐 보관 후 가볍게 이동 |
| LOCKER_WALK (destination) | 목적지 도착 후 짐 보관 |

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
  "hasLuggage": false,
  "preferLessWalking": true,
  "lockerPreference": "recommend"
}
```

| 필드 | 타입 | 필수 |
|------|------|------|
| `hubId` | string | ✅ |
| `destinationId` | string | ✅ |
| `hasLuggage` | boolean | ✅ |
| `preferLessWalking` | boolean | ✅ |
| `lockerPreference` | `"hub" \| "destination" \| "recommend"` | — |
| `arrivalTime` | `HH:mm` | — (현재 비활성) |

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
| `mode` | `WALK \| BIKE \| LOCKER_WALK` | 전략 유형 |
| `lockerLocation` | `"hub" \| "destination"` | LOCKER_WALK 전용 |
| `totalMinutes` | number | 총 소요 시간 |
| `walkMinutes` | number | 도보 구간 합산 |
| `estimatedDepartureTime` | `HH:mm` | 예상 출발 시각 |
| `targetArrivalTime` | `HH:mm` | 예상 도착 시각 |
| `stability` | `HIGH \| MEDIUM \| LOW` | 자원 충분도 |
| `failRisk` | `LOW \| MEDIUM \| HIGH` | 실패 위험도 |
| `score` | number | 내부 추천 점수 |
| `reason` | string | AI 또는 룰베이스 설명 |
| `bike` | TBikeInfo? | 자전거 정보 (BIKE 전략) |
| `locker` | TLockerInfo? | 보관함 정보 (LOCKER_WALK 전략) |

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
| AI 모델 | `claude-opus-4-6` | `aiReasonService.ts` |
| AI 최대 토큰 | 200 | `aiReasonService.ts` |
