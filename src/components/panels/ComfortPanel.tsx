import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';
import SentimentNeutralIcon from '@mui/icons-material/SentimentNeutral';
import dayjs from 'dayjs';
import type { WeatherPeriod } from '../../types/weather';
import { tempColor } from '../../utils/weatherUtils';
import { R } from '../../App';


function comfortIcon(desc: string) {
  if (desc.includes('舒適')) return <SentimentSatisfiedAltIcon sx={{ color: '#66BB6A' }} />;
  if (desc.includes('悶熱') || desc.includes('炎熱')) return <SentimentVeryDissatisfiedIcon sx={{ color: '#EF5350' }} />;
  return <SentimentNeutralIcon sx={{ color: '#FFA726' }} />;
}

function comfortColor(desc: string): string {
  if (desc.includes('舒適')) return '#66BB6A';
  if (desc.includes('悶熱') || desc.includes('炎熱')) return '#EF5350';
  if (desc.includes('寒冷') || desc.includes('偏涼')) return '#42A5F5';
  return '#FFA726';
}

interface ComfortPanelProps {
  periods: WeatherPeriod[];
  currentPeriod?: WeatherPeriod;
}

export default function ComfortPanel({ periods, currentPeriod }: ComfortPanelProps) {
  return (
    <Box>
      {currentPeriod && (
        <Box
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: `${R.md}px`,
            mb: { xs: 2, sm: 3 },
            background: 'linear-gradient(135deg, rgba(102,187,106,0.15), rgba(129,199,132,0.08))',
            border: '1px solid rgba(102,187,106,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 2, sm: 3 },
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ fontSize: 64, lineHeight: 1 }}>
            {comfortIcon(currentPeriod.maxComfortIndexDescription)}
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: comfortColor(currentPeriod.maxComfortIndexDescription) }}>
              {currentPeriod.maxComfortIndexDescription}
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              舒適度指數 {currentPeriod.minComfortIndex} – {currentPeriod.maxComfortIndex}
            </Typography>
          </Box>
          <Stack spacing={0.5}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              最高體感 <strong style={{ color: tempColor(currentPeriod.maxApparentTemperature) }}>{currentPeriod.maxApparentTemperature}°C</strong>
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              最低體感 <strong style={{ color: tempColor(currentPeriod.minApparentTemperature) }}>{currentPeriod.minApparentTemperature}°C</strong>
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              相對濕度 <strong>{currentPeriod.relativeHumidity}%</strong>
            </Typography>
          </Stack>
        </Box>
      )}

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: 'text.secondary' }}>
        逐 12 小時舒適度
      </Typography>
      <Box
        sx={{
          maxHeight: { xs: 400, sm: 520 },
          overflowY: 'auto',
          pr: 0.5,
          '&::-webkit-scrollbar': { width: 5 },
          '&::-webkit-scrollbar-track': { borderRadius: 3, bgcolor: 'rgba(255,255,255,0.04)' },
          '&::-webkit-scrollbar-thumb': { borderRadius: 3, bgcolor: 'rgba(255,255,255,0.18)' },
        }}
      >
      <Stack spacing={1.5}>
        {periods.map((p) => {
          const start = dayjs(p.startTime);
          return (
            <Card
              key={p.startTime}
              elevation={0}
              sx={{
                borderRadius: `${R.md}px`,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
                  <Box sx={{ minWidth: 130 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {start.format('M/D (dd)')}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {start.format('HH:mm')}–{dayjs(p.endTime).format('HH:mm')}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1} alignItems="center" flex={1} flexWrap="wrap">
                    {comfortIcon(p.maxComfortIndexDescription)}
                    <Chip
                      label={p.maxComfortIndexDescription}
                      size="small"
                      sx={{
                        bgcolor: `${comfortColor(p.maxComfortIndexDescription)}22`,
                        color: comfortColor(p.maxComfortIndexDescription),
                        border: `1px solid ${comfortColor(p.maxComfortIndexDescription)}44`,
                        fontWeight: 700,
                      }}
                    />
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      指數 {p.minComfortIndex}–{p.maxComfortIndex}
                    </Typography>
                    <Typography variant="caption" sx={{ color: tempColor(p.maxApparentTemperature) }}>
                      體感 {p.minApparentTemperature}°–{p.maxApparentTemperature}°
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#42A5F5' }}>
                      濕度 {p.relativeHumidity}%
                    </Typography>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Stack>
      </Box>
    </Box>
  );
}
