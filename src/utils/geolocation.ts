import type { ParsedCityData } from '../types/weather';

/** 計算兩點經緯度之半正矢距離（Haversine formula），單位：公里 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // 地球平均半徑 (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface NearestLocationResult {
  cityName: string;
  townshipName: string;
  distanceKm: number;
}

/**
 * 遍歷全台 22 縣市的所有行政區 (包含其緯度、經度)，找出與傳入經緯度直線距離最近的縣市與鄉鎮區
 */
export function findNearestTownship(
  latitude: number,
  longitude: number,
  citiesData: ParsedCityData[]
): NearestLocationResult | null {
  if (!citiesData || citiesData.length === 0) return null;

  let nearestResult: NearestLocationResult | null = null;
  let minDistance = Infinity;

  for (const city of citiesData) {
    if (!city.townships || city.townships.length === 0) continue;

    for (const town of city.townships) {
      const townLat = parseFloat(town.latitude);
      const townLon = parseFloat(town.longitude);

      if (Number.isNaN(townLat) || Number.isNaN(townLon)) continue;

      const dist = calculateDistanceKm(latitude, longitude, townLat, townLon);
      if (dist < minDistance) {
        minDistance = dist;
        nearestResult = {
          cityName: city.cityName,
          townshipName: town.townshipName,
          distanceKm: dist,
        };
      }
    }
  }

  return nearestResult;
}

export interface GeolocationPositionResult {
  latitude: number;
  longitude: number;
}

/**
 * 透過瀏覽器 navigator.geolocation 取得使用者當前座標
 */
export function getCurrentPosition(
  options?: PositionOptions
): Promise<GeolocationPositionResult> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('您的瀏覽器不支援地理位置定位功能'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (err) => {
        let msg = '無法取得您的目前位置';
        switch (err.code) {
          case err.PERMISSION_DENIED:
            msg = '定位權限已被拒絕，請在瀏覽器設定中允許讀取位置';
            break;
          case err.POSITION_UNAVAILABLE:
            msg = '位置資訊無法取得，請確認 GPS 或網路訊號';
            break;
          case err.TIMEOUT:
            msg = '定位請求逾時，請稍後再試';
            break;
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // 快取 1 分鐘內的位置
        ...options,
      }
    );
  });
}
