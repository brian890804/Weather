import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import { getWeatherIconUrl, getWeatherIconName, isCurrentNight } from '../../utils/weatherUtils';

interface WeatherIconProps {
  weatherCode: string;
  weather: string;
  startTime?: string;
  size?: number;
}

export default function WeatherIcon({
  weatherCode,
  weather,
  startTime,
  size = 64,
}: WeatherIconProps) {
  const night = isCurrentNight(startTime);
  const iconName = getWeatherIconName(weatherCode, weather, night);
  const src = getWeatherIconUrl(iconName);

  return (
    <Tooltip title={weather} arrow>
      <Box
        component="img"
        src={src}
        alt={weather}
        sx={{
          width: size,
          height: size,
          objectFit: 'contain',
          filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))',
        }}
        onError={(e) => {
          // fallback to partly-cloudy-day
          (e.target as HTMLImageElement).src = getWeatherIconUrl('partly-cloudy-day');
        }}
      />
    </Tooltip>
  );
}
