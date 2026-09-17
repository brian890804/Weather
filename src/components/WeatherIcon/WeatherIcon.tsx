import React, { useMemo } from 'react';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import { getWeatherIconUrl, getWeatherIconName, isCurrentNight } from '../../utils/weatherUtils';

interface WeatherIconProps {
  weatherCode: string;
  weather: string;
  startTime?: string;
  size?: number;
}

const urlCache = new Map<string, string>();

function getCachedIconUrl(iconName: string): string {
  let url = urlCache.get(iconName);
  if (!url) {
    url = getWeatherIconUrl(iconName);
    urlCache.set(iconName, url);
  }
  return url;
}

function WeatherIconBase({
  weatherCode,
  weather,
  startTime,
  size = 64,
}: WeatherIconProps) {
  const night = useMemo(() => isCurrentNight(startTime), [startTime]);
  const iconName = useMemo(() => getWeatherIconName(weatherCode, weather, night), [weatherCode, weather, night]);
  const src = useMemo(() => getCachedIconUrl(iconName), [iconName]);

  return (
    <Tooltip title={weather} arrow enterTouchDelay={0}>
      <Box
        component="img"
        src={src}
        alt={weather}
        loading="lazy"
        decoding="async"
        sx={{
          width: size,
          height: size,
          objectFit: 'contain',
          filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))',
          pointerEvents: 'none',
        }}
        onError={(e) => {
          (e.target as HTMLImageElement).src = getCachedIconUrl('partly-cloudy-day');
        }}
      />
    </Tooltip>
  );
}

export default React.memo(WeatherIconBase);
