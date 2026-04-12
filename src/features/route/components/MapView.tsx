"use client";

import "leaflet/dist/leaflet.css";

import { findHub, findSubDestination } from "@/config/demoPlaces";
import { haversineDistanceM } from "@/lib/geo";
import type { TRouteInput, TRouteOption } from "@/types";
import { Geolocation } from "@capacitor/geolocation";
import { ArrowLeft, Bike, Footprints, Locate, Package } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  input: TRouteInput;
  route: TRouteOption;
  hubName: string;
  destinationName: string;
  onBack: () => void;
};

const MODE_LABEL = {
  WALK: "도보 이동",
  BIKE: "자전거 이용",
  LOCKER_WALK: "보관함 후 이동",
  LOCKER_BIKE: "짐 보관 후 자전거 이동",
};

// 지도 화면 브랜드 주색 — 모드 색 대신 블루 하나로 통일
const BRAND_BLUE = "#3b82f6";

// 라벨 공통 스타일 팩토리

export default function MapView({
  input,
  route,
  hubName,
  destinationName,
  onBack,
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const userLatLngRef = useRef<[number, number] | null>(null);
  const [locationStatus, setLocationStatus] = useState<
    "idle" | "loading" | "granted" | "denied"
  >("idle");
  const [distanceToHub, setDistanceToHub] = useState<number | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const hub = findHub(input.hubId);
    const dest = findSubDestination(input.destinationId);
    if (!hub || !dest) return;

    import("leaflet").then((L) => {
      if (!mapContainerRef.current || mapRef.current) return;

      const centerLat = (hub.lat + dest.lat) / 2;
      const centerLon = (hub.lot + dest.lot) / 2;

      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLon],
        zoom: 15,
        zoomControl: false,
      });

      L.control.zoom({ position: "bottomright" }).addTo(map);

      // CartoDB Voyager — 앱 톤 유지
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 20,
        }
      ).addTo(map);

      // ── 마커 ──────────────────────────────────────────────────────

      // 출발지 — 작은 블루 점 + permanent tooltip 라벨
      const hubIcon = L.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:${BRAND_BLUE};border:2.5px solid white;box-shadow:0 1px 6px rgba(59,130,246,0.4);"></div>`,
        className: "",
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      L.marker([hub.lat, hub.lot], { icon: hubIcon })
        .addTo(map)
        .bindTooltip(hubName, {
          permanent: true,
          direction: "top",
          className: "mm-pill",
          offset: [0, -4],
        });

      // 도착지 — 더 크고 링 강조 + permanent tooltip 라벨
      const destIcon = L.divIcon({
        html: `<div style="width:24px;height:24px;border-radius:50%;background:${BRAND_BLUE};border:3px solid white;box-shadow:0 0 0 5px rgba(59,130,246,0.2),0 2px 10px rgba(59,130,246,0.3);"></div>`,
        className: "",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      L.marker([dest.lat, dest.lot], { icon: destIcon })
        .addTo(map)
        .bindTooltip(destinationName, {
          permanent: true,
          direction: "top",
          className: "mm-pill",
          offset: [0, -6],
        });

      // ── 경로선 (2중선) ────────────────────────────────────────────
      const midLat = (hub.lat + dest.lat) / 2 + 0.0015;
      const midLon = (hub.lot + dest.lot) / 2;
      const coords: [number, number][] = [
        [hub.lat, hub.lot],
        [midLat, midLon],
        [dest.lat, dest.lot],
      ];
      const isDashed = route.mode !== "WALK";

      // 흰 바닥선
      L.polyline(coords, {
        color: "white",
        weight: 7,
        opacity: 0.85,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      // 블루 상단선
      L.polyline(coords, {
        color: BRAND_BLUE,
        weight: 3.5,
        opacity: 0.9,
        lineCap: "round",
        lineJoin: "round",
        dashArray: isDashed ? "6, 6" : undefined,
      }).addTo(map);

      // flyToBounds 진입 애니메이션
      map.flyToBounds(
        [
          [hub.lat, hub.lot],
          [dest.lat, dest.lot],
        ],
        { padding: [60, 60], animate: true, duration: 0.8 }
      );

      mapRef.current = map;

      // ── 현재 위치 ─────────────────────────────────────────────────
      setLocationStatus("loading");
      Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      })
        .then((pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          userLatLngRef.current = [lat, lng];
          setLocationStatus("granted");

          // 현재 위치 마커 — 파란 점 + 약한 펄스
          const userIcon = L.divIcon({
            html: `
              <div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
                <div class="mm-pulse" style="position:absolute;background:rgba(59,130,246,0.2);border-radius:50%;width:36px;height:36px;"></div>
                <div style="background:${BRAND_BLUE};border-radius:50%;width:12px;height:12px;border:2px solid white;box-shadow:0 1px 5px rgba(59,130,246,0.5);position:relative;z-index:1;"></div>
              </div>`,
            className: "",
            iconSize: [36, 36],
            iconAnchor: [18, 18],
          });
          L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 })
            .addTo(map)
            .bindPopup("현재 위치", { closeButton: false });

          // 현재 위치 → 거점 얇은 점선
          L.polyline(
            [
              [lat, lng],
              [hub.lat, hub.lot],
            ],
            {
              color: "#94a3b8",
              weight: 2,
              opacity: 0.5,
              dashArray: "4, 6",
            }
          ).addTo(map);

          // 1km 미만일 때만 거리 표시
          const distM = haversineDistanceM(lat, lng, hub.lat, hub.lot);
          if (distM < 1000) setDistanceToHub(Math.round(distM));
        })
        .catch(() => setLocationStatus("denied"));
    });

    return () => {
      if (mapRef.current) {
        (mapRef.current as { remove: () => void }).remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLocate = () => {
    if (!userLatLngRef.current || !mapRef.current) return;
    (
      mapRef.current as {
        setView: (latlng: [number, number], zoom: number) => void;
      }
    ).setView(userLatLngRef.current, 17);
  };

  const ModeIcon =
    route.mode === "WALK" ? Footprints : route.mode === "BIKE" ? Bike : Package;

  // 카드 공통 스타일
  const cardCls =
    "bg-white/92 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm";

  return (
    <>
      <style>{`
        @keyframes mm-pulse {
          0%   { transform: scale(0.8); opacity: 0.8; }
          70%  { transform: scale(2.4); opacity: 0; }
          100% { transform: scale(0.8); opacity: 0; }
        }
        .mm-pulse { animation: mm-pulse 2.2s ease-out infinite; }
        .leaflet-bottom.leaflet-right { bottom: 160px !important; }
        .mm-pill {
          background: white !important;
          border: none !important;
          border-radius: 999px !important;
          padding: 3px 9px !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          color: #1d4ed8 !important;
          box-shadow: 0 1px 5px rgba(0,0,0,0.13) !important;
          white-space: nowrap !important;
        }
        .mm-pill::before { display: none !important; }
      `}</style>

      {/* 지도 레이어 */}
      <div className="fixed inset-0 z-50">
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>

      {/* UI 오버레이 */}
      <div className="fixed inset-0 z-200 pointer-events-none">
        {/* 상단 카드 — 작고 얇게 */}
        <div className="absolute top-12 left-4 right-4 pointer-events-auto">
          <div className={`${cardCls} px-4 py-2.5 flex items-center gap-3`}>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-gray-400 truncate">
                {hubName} → {destinationName}
              </p>
              <p className="text-[13px] font-semibold text-gray-800 mt-0.5">
                {MODE_LABEL[route.mode]}
                {distanceToHub !== null && (
                  <span className="ml-2 text-[11px] font-normal text-blue-400">
                    · 현재 위치에서 {distanceToHub}m
                  </span>
                )}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] text-gray-400">예상 소요</p>
              <p className="text-[20px] font-bold text-gray-900 leading-tight">
                {route.totalMinutes}
                <span className="text-[12px] font-medium text-gray-400">
                  분
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* 좌측 버튼 — 40px로 작게 */}
        <button
          onClick={onBack}
          className={`absolute top-[120px] left-4 pointer-events-auto w-10 h-10 ${cardCls} flex items-center justify-center active:bg-gray-100 active:scale-95 transition-all`}
          aria-label="뒤로가기"
        >
          <ArrowLeft size={17} className="text-gray-600" />
        </button>

        <button
          onClick={handleLocate}
          disabled={locationStatus !== "granted"}
          className={[
            `absolute top-[172px] left-4 pointer-events-auto w-10 h-10 ${cardCls} flex items-center justify-center transition-all active:scale-95`,
            locationStatus !== "granted" && "opacity-40",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-label="내 위치로"
        >
          {locationStatus === "loading" ? (
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Locate
              size={17}
              className={
                locationStatus === "granted" ? "text-blue-500" : "text-gray-400"
              }
            />
          )}
        </button>

        {locationStatus === "denied" && (
          <div className="absolute top-[104px] left-[60px] pointer-events-auto bg-gray-800/80 text-white text-[11px] px-3 py-1.5 rounded-full whitespace-nowrap">
            위치 권한이 필요합니다
          </div>
        )}

        {/* 하단 카드 — 낮고 컴팩트하게 */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-auto">
          <div className={`mx-4 mb-5 ${cardCls} px-4 py-3`}>
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${BRAND_BLUE}15` }}
              >
                <ModeIcon size={18} style={{ color: BRAND_BLUE }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-gray-900 truncate">
                  {route.label}
                </p>
                <p className="text-[11px] text-gray-400">
                  도보 {route.walkMinutes}분 포함 · 추정
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-gray-400">예상 도착</p>
                <p className="text-[15px] font-bold text-gray-900">
                  {route.targetArrivalTime}
                </p>
              </div>
            </div>

            {/* 범례 */}
            <div className="flex items-center gap-3 pt-2.5 mt-2.5 border-t border-gray-100">
              <Legend color={BRAND_BLUE} label={hubName} />
              <Legend
                color={BRAND_BLUE}
                label={destinationName}
                solid={false}
              />
              {route.mode !== "WALK" && (
                <p className="text-[10px] text-gray-400 ml-auto">
                  점선 = {route.mode === "LOCKER_WALK" ? "도보" : "자전거"} 구간
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Legend({
  color,
  label,
  solid = true,
}: {
  color: string;
  label: string;
  solid?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{
          backgroundColor: solid ? color : "white",
          border: `2px solid ${color}`,
        }}
      />
      <span className="text-[10px] text-gray-500">{label}</span>
    </div>
  );
}
