import React, { useState, useMemo } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CheckIcon from '@mui/icons-material/Check';
import { CITIES, REGIONS } from '../../utils/cities';
import type { ParsedCityData } from '../../types/weather';

interface IOSLocationModalProps {
  open: boolean;
  onClose: () => void;
  selectedCity: string;
  selectedTownship: string;
  onSelectCityAndTownship: (city: string, township: string) => void;
  citiesData: ParsedCityData[];
}

export default function IOSLocationModal({
  open,
  onClose,
  selectedCity,
  selectedTownship,
  onSelectCityAndTownship,
  citiesData,
}: IOSLocationModalProps) {
  const [activeRegion, setActiveRegion] = useState('全部');
  const [browsingCity, setBrowsingCity] = useState(selectedCity);
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setBrowsingCity(selectedCity);
    }
  }

  // 取得當前瀏覽縣市的所有行政區
  const townships = useMemo(() => {
    const city = citiesData.find((c) => c.cityName === browsingCity);
    return city?.townships ?? [];
  }, [citiesData, browsingCity]);

  // 依選取的區域過濾縣市
  const filteredCities = useMemo(() => {
    const reg = REGIONS.find((r) => r.region === activeRegion);
    if (!reg || activeRegion === '全部') return CITIES.map((c) => c.name);
    return reg.cities;
  }, [activeRegion]);

  const handlePickTownship = (townshipName: string) => {
    onSelectCityAndTownship(browsingCity, townshipName);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      slotProps={{
        paper: {
          sx: {
            m: { xs: 1.5, sm: 2 },
            width: { xs: 'calc(100% - 24px)', sm: 420 },
            maxHeight: '85vh',
            borderRadius: '26px',
            bgcolor: 'rgba(15, 23, 42, 0.94)',
            backdropFilter: 'blur(35px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)',
            color: '#F8FAFC',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      {/* iOS 頂部拉桿裝飾 */}
      <Box sx={{ pt: 1.5, display: 'flex', justifyContent: 'center' }}>
        <Box
          sx={{
            width: 36,
            height: 4.5,
            borderRadius: 3,
            bgcolor: 'rgba(255, 255, 255, 0.3)',
          }}
        />
      </Box>

      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2.5,
          pt: 1,
          pb: 1.5,
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocationOnIcon sx={{ color: '#60A5FA', fontSize: 22 }} />
          <Typography sx={{ fontWeight: 800, fontSize: 18, letterSpacing: -0.3 }}>
            選擇地點
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: 'rgba(255, 255, 255, 0.65)',
            bgcolor: 'rgba(255, 255, 255, 0.08)',
            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.15)', color: '#FFF' },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 2, overflowY: 'auto' }}>
        {/* iOS 風格地區切換分頁膠囊 (Segmented Control) */}
        <Box
          sx={{
            display: 'flex',
            bgcolor: 'rgba(255, 255, 255, 0.06)',
            p: 0.5,
            borderRadius: '14px',
            gap: 0.5,
            overflowX: 'auto',
            mb: 2,
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {REGIONS.map((r) => {
            const isSelected = activeRegion === r.region;
            return (
              <Box
                key={r.region}
                onClick={() => setActiveRegion(r.region)}
                sx={{
                  flex: '1 0 auto',
                  textAlign: 'center',
                  py: 0.6,
                  px: 1.25,
                  borderRadius: '10px',
                  fontSize: 13,
                  fontWeight: isSelected ? 800 : 500,
                  color: isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.65)',
                  bgcolor: isSelected ? 'rgba(59, 130, 246, 0.4)' : 'transparent',
                  border: isSelected ? '1px solid rgba(96, 165, 250, 0.6)' : '1px solid transparent',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'all 0.15s ease',
                  '&:active': { transform: 'scale(0.96)' },
                }}
              >
                {r.region}
              </Box>
            );
          })}
        </Box>

        {/* 縣市快速按鈕網格 */}
        <Typography
          sx={{
            fontSize: 12,
            fontWeight: 700,
            color: 'rgba(255, 255, 255, 0.45)',
            letterSpacing: 0.8,
            mb: 1,
            textTransform: 'uppercase',
          }}
        >
          1. 選擇縣市
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 1,
            mb: 2.5,
          }}
        >
          {filteredCities.map((cityName) => {
            const isBrowsing = browsingCity === cityName;
            const isCurrent = selectedCity === cityName;
            return (
              <Box
                key={cityName}
                onClick={() => setBrowsingCity(cityName)}
                sx={{
                  py: 1,
                  px: 0.75,
                  textAlign: 'center',
                  borderRadius: '14px',
                  fontSize: 13,
                  fontWeight: isBrowsing ? 800 : 600,
                  bgcolor: isBrowsing
                    ? 'rgba(59, 130, 246, 0.35)'
                    : 'rgba(255, 255, 255, 0.05)',
                  color: isBrowsing ? '#93C5FD' : '#E2E8F0',
                  border: isBrowsing
                    ? '1.5px solid #60A5FA'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  position: 'relative',
                  transition: 'all 0.15s ease',
                  '&:active': { transform: 'scale(0.96)' },
                }}
              >
                {cityName}
                {isCurrent && (
                  <Box
                    component="span"
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      bgcolor: '#34D399',
                    }}
                  />
                )}
              </Box>
            );
          })}
        </Box>

        {/* 鄉鎮區選擇 */}
        <Typography
          sx={{
            fontSize: 12,
            fontWeight: 700,
            color: 'rgba(255, 255, 255, 0.45)',
            letterSpacing: 0.8,
            mb: 1,
            textTransform: 'uppercase',
          }}
        >
          2. 選擇 {browsingCity} 行政區 ({townships.length} 區)
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 1,
            maxHeight: 220,
            overflowY: 'auto',
            pr: 0.5,
            '&::-webkit-scrollbar': { width: 4 },
            '&::-webkit-scrollbar-thumb': {
              borderRadius: 2,
              bgcolor: 'rgba(255, 255, 255, 0.2)',
            },
          }}
        >
          {townships.map((t) => {
            const isTownshipSelected =
              browsingCity === selectedCity && selectedTownship === t.townshipName;
            return (
              <Box
                key={t.townshipName}
                onClick={() => handlePickTownship(t.townshipName)}
                sx={{
                  py: 0.9,
                  px: 0.75,
                  textAlign: 'center',
                  borderRadius: '12px',
                  fontSize: 13,
                  fontWeight: isTownshipSelected ? 800 : 500,
                  bgcolor: isTownshipSelected
                    ? '#2563EB'
                    : 'rgba(255, 255, 255, 0.05)',
                  color: isTownshipSelected ? '#FFFFFF' : '#CBD5E1',
                  border: isTownshipSelected
                    ? '1.5px solid #60A5FA'
                    : '1px solid rgba(255, 255, 255, 0.06)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.5,
                  transition: 'all 0.15s ease',
                  '&:active': { transform: 'scale(0.96)' },
                  '&:hover': {
                    bgcolor: isTownshipSelected
                      ? '#1D4ED8'
                      : 'rgba(255, 255, 255, 0.09)',
                  },
                }}
              >
                {t.townshipName}
                {isTownshipSelected && (
                  <CheckIcon sx={{ fontSize: 14, color: '#FFF' }} />
                )}
              </Box>
            );
          })}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
