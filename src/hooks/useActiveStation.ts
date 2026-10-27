import { useWeatherStore } from '../store/weatherStore';
import { resolveActiveStation, type ActiveStationState } from '../utils/liveConditions';

/** 取得目前鄉鎮實際使用的測站（含使用者手動切換），所有面板共用同一個來源 */
export function useActiveStation(): ActiveStationState {
  const selectedCity = useWeatherStore((s) => s.selectedCity);
  const selectedTownship = useWeatherStore((s) => s.selectedTownship);
  const townshipStations = useWeatherStore((s) => s.townshipStations);
  const userSelectedStations = useWeatherStore((s) => s.userSelectedStations);
  const realtimeWeather = useWeatherStore((s) => s.realtimeWeather);

  return resolveActiveStation({
    selectedCity,
    selectedTownship,
    townshipStations,
    userSelectedStations,
    realtimeWeather,
  });
}
