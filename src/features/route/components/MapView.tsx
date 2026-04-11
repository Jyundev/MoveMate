"use client";

import "leaflet/dist/leaflet.css";

import { findHub, findSubDestination } from "@/config/demoPlaces";
import type { TRouteInput, TRouteOption } from "@/types";
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

const MODE_COLOR = {
  WALK: "#22c55e",
  BIKE: "#3b82f6",
  LOCKER_WALK: "#a855f7",
  LOCKER_BIKE: "#f97316",
};

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

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      // 허브 마커
      const hubMarker = L.divIcon({
        html: `<div style="background:#3b82f6;color:white;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 2px 10px rgba(59,130,246,0.5);border:3px solid white;">🚉</div>`,
        className: "",
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });
      L.marker([hub.lat, hub.lot], { icon: hubMarker })
        .addTo(map)
        .bindPopup(`<b>${hubName}</b><br/>도착 거점`, { closeButton: false });

      // 목적지 마커
      const destColor = MODE_COLOR[route.mode];
      const destMarker = L.divIcon({
        html: `<div style="background:${destColor};color:white;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 2px 10px rgba(0,0,0,0.3);border:3px solid white;">📍</div>`,
        className: "",
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });
      L.marker([dest.lat, dest.lot], { icon: destMarker })
        .addTo(map)
        .bindPopup(`<b>${destinationName}</b><br/>최종 목적지`, {
          closeButton: false,
        });

      // 경로선
      L.polyline(
        [
          [hub.lat, hub.lot],
          [dest.lat, dest.lot],
        ],
        {
          color: destColor,
          weight: 4,
          opacity: 0.7,
          dashArray: route.mode === "WALK" ? undefined : "8, 6",
        }
      ).addTo(map);

      // 허브·목적지가 모두 보이도록
      map.fitBounds(
        [
          [hub.lat, hub.lot],
          [dest.lat, dest.lot],
        ],
        { padding: [60, 60] }
      );

      mapRef.current = map;

      // 사용자 현재 위치 요청
      if ("geolocation" in navigator) {
        setLocationStatus("loading");
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude: lat, longitude: lng } = pos.coords;
            userLatLngRef.current = [lat, lng];
            setLocationStatus("granted");

            // 현재 위치 마커 (파란 점 + 펄스 링)
            const userIcon = L.divIcon({
              html: `
                <div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
                  <div class="mm-pulse" style="position:absolute;background:rgba(59,130,246,0.25);border-radius:50%;width:40px;height:40px;"></div>
                  <div style="background:#3b82f6;border-radius:50%;width:14px;height:14px;border:2.5px solid white;box-shadow:0 1px 6px rgba(59,130,246,0.6);position:relative;z-index:1;"></div>
                </div>`,
              className: "",
              iconSize: [40, 40],
              iconAnchor: [20, 20],
            });

            L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 })
              .addTo(map)
              .bindPopup("현재 위치", { closeButton: false });
          },
          () => setLocationStatus("denied"),
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }
    });

    return () => {
      if (mapRef.current) {
        (mapRef.current as { remove: () => void }).remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 내 위치로 지도 이동
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

  return (
    <>
      {/* 펄스 애니메이션 키프레임 */}
      <style>{`
        @keyframes mm-pulse {
          0%   { transform: scale(0.8); opacity: 0.8; }
          70%  { transform: scale(2.2); opacity: 0; }
          100% { transform: scale(0.8); opacity: 0; }
        }
        .mm-pulse { animation: mm-pulse 2s ease-out infinite; }
      `}</style>

      {/* 지도 레이어 (z-50) */}
      <div className="fixed inset-0 z-50">
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>

      {/* UI 오버레이 레이어 — 지도와 완전히 분리된 별도 fixed (z-[200]) */}
      {/* pointer-events-none으로 지도 터치를 막지 않고, 버튼만 pointer-events-auto */}
      <div className="fixed inset-0 z-[200] pointer-events-none">
        {/* 상단 정보 카드 */}
        <div className="absolute top-12 left-4 right-4 pointer-events-auto">
          <div className="bg-white rounded-2xl shadow-md px-4 py-3">
            <p className="text-[13px] font-semibold text-gray-900">
              {hubName} → {destinationName}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {MODE_LABEL[route.mode]} · {route.totalMinutes}분 소요
            </p>
          </div>
        </div>

        {/* 뒤로가기 플로팅 버튼 */}
        <button
          onClick={onBack}
          className="absolute top-32 left-4 pointer-events-auto w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center active:bg-gray-100 active:scale-95 transition-all"
          aria-label="뒤로가기"
        >
          <ArrowLeft size={20} className="text-gray-700" />
        </button>

        {/* 내 위치 FAB */}
        <button
          onClick={handleLocate}
          disabled={locationStatus !== "granted"}
          className={[
            "absolute top-[188px] left-4 pointer-events-auto w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95",
            locationStatus === "granted"
              ? "bg-white active:bg-gray-100"
              : locationStatus === "loading"
              ? "bg-white opacity-60"
              : "bg-white opacity-40",
          ].join(" ")}
          aria-label="내 위치로"
        >
          {locationStatus === "loading" ? (
            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Locate
              size={20}
              className={
                locationStatus === "granted" ? "text-blue-500" : "text-gray-400"
              }
            />
          )}
        </button>

        {/* 위치 권한 거부 안내 */}
        {locationStatus === "denied" && (
          <div className="absolute top-32 left-16 pointer-events-auto bg-gray-800/80 text-white text-[11px] px-3 py-1.5 rounded-full whitespace-nowrap">
            위치 권한이 필요합니다
          </div>
        )}

        {/* 하단 정보 패널 */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-auto">
          <div className="mx-4 mb-6 bg-white rounded-2xl shadow-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${MODE_COLOR[route.mode]}20` }}
              >
                <ModeIcon size={20} style={{ color: MODE_COLOR[route.mode] }} />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-bold text-gray-900">
                  {route.label}
                </p>
                <p className="text-[12px] text-gray-500">
                  총 {route.totalMinutes}분 · 도보 {route.walkMinutes}분 포함
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-gray-400">예상 도착</p>
                <p className="text-[16px] font-bold text-gray-900">
                  {route.targetArrivalTime}
                </p>
              </div>
            </div>

            {/* 범례 */}
            <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
              <Legend color="#3b82f6" emoji="🚉" label={hubName} />
              <Legend
                color={MODE_COLOR[route.mode]}
                emoji="📍"
                label={destinationName}
              />
              {route.mode !== "WALK" && (
                <p className="text-[11px] text-gray-400 ml-auto">
                  점선 = {route.mode === "BIKE" ? "자전거" : "도보"} 구간
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
  emoji,
  label,
}: {
  color: string;
  emoji: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="w-3 h-3 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="text-[11px] text-gray-600">
        {emoji} {label}
      </span>
    </div>
  );
}
