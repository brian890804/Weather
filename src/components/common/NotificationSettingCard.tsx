import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SendIcon from '@mui/icons-material/Send';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  isNotificationSupported,
  isNotificationSubscribed,
  setNotificationSubscribed,
  requestNotificationPermission,
  sendSilentNotification,
  buildMorningNotificationContent,
  getNotificationTime,
  setNotificationTime,
  DEFAULT_NOTIFICATION_TIME,
} from '../../utils/notificationService';
import type { WeatherPeriod } from '../../types/weather';

interface NotificationSettingCardProps {
  cityName: string;
  townshipName: string;
  currentPeriod: WeatherPeriod | null;
  realtimeTemp?: string;
  realtimeHumidity?: string;
  realtimeWindSpeed?: string;
  realtimeRainNow?: number;
  onShowMessage?: (msg: string) => void;
  isCyberpunkMobile?: boolean;
}

export default function NotificationSettingCard({
  cityName,
  townshipName,
  currentPeriod,
  realtimeTemp,
  realtimeHumidity,
  realtimeWindSpeed,
  realtimeRainNow,
  onShowMessage,
  isCyberpunkMobile = false,
}: NotificationSettingCardProps) {
  const [supported] = useState(() => isNotificationSupported());
  const [permissionState, setPermissionState] = useState<NotificationPermission>(() => {
    if (typeof Notification === 'undefined') return 'denied';
    return Notification.permission;
  });
  const [subscribed, setSubscribed] = useState(() => {
    if (!isNotificationSupported()) return false;
    return isNotificationSubscribed() && Notification.permission === 'granted';
  });
  const [scheduledTime, setScheduledTime] = useState(() => getNotificationTime());
  const [testing, setTesting] = useState(false);

  const handleTimeChange = async (newTime: string) => {
    if (!newTime) return;
    setScheduledTime(newTime);
    setNotificationTime(newTime);

    // 若尚未開啟推播開關，自動為使用者嘗試請求權限並開啟
    if (!subscribed) {
      if (!supported) {
        onShowMessage?.(`推播時間已設定為 ${newTime}（目前瀏覽器不支援 Notification API）`);
        return;
      }

      let currentPerm = typeof Notification !== 'undefined' ? Notification.permission : 'denied';
      if (currentPerm !== 'granted') {
        currentPerm = await requestNotificationPermission();
        setPermissionState(currentPerm);
      }

      if (currentPerm === 'granted') {
        setNotificationSubscribed(true);
        setSubscribed(true);
        onShowMessage?.(`推播時間已設定為 ${newTime}，並已成功啟用每日推播！`);
        return;
      } else {
        onShowMessage?.(`推播時間已設定為 ${newTime}（請記得允許瀏覽器通知權限並開啟開關）`);
        return;
      }
    }

    onShowMessage?.(`每日推播時間已更新為 ${newTime}`);
  };

  const handleToggle = async (checked: boolean) => {
    if (!supported) {
      onShowMessage?.('目前瀏覽器環境不支援 Web Push/Notification API');
      return;
    }

    if (checked) {
      let currentPerm = typeof Notification !== 'undefined' ? Notification.permission : 'denied';
      if (currentPerm !== 'granted') {
        currentPerm = await requestNotificationPermission();
        setPermissionState(currentPerm);
      }

      if (currentPerm === 'granted') {
        setNotificationSubscribed(true);
        setSubscribed(true);
        onShowMessage?.(`已開啟每日 ${scheduledTime} 晨間天氣靜音推播！`);
      } else {
        setNotificationSubscribed(false);
        setSubscribed(false);
        onShowMessage?.('未授予通知權限，無法開啟晨間推播');
      }
    } else {
      setNotificationSubscribed(false);
      setSubscribed(false);
      onShowMessage?.('已關閉每日定時晨間天氣推播');
    }
  };

  const handleTestNotification = async () => {
    if (!supported) {
      onShowMessage?.('目前瀏覽器環境不支援 Web Push/Notification API');
      return;
    }

    let currentPerm = typeof Notification !== 'undefined' ? Notification.permission : 'denied';
    if (currentPerm !== 'granted') {
      currentPerm = await requestNotificationPermission();
      setPermissionState(currentPerm);
    }

    if (currentPerm !== 'granted') {
      onShowMessage?.('請先允許通知權限以測試推播');
      return;
    }

    setTesting(true);
    try {
      const content = buildMorningNotificationContent(
        cityName,
        townshipName,
        currentPeriod,
        realtimeTemp,
        realtimeHumidity,
        realtimeWindSpeed,
        realtimeRainNow
      );

      const ok = await sendSilentNotification({
        title: content.title,
        body: content.body,
        tag: `test-silent-${Date.now()}`,
      });

      if (ok) {
        onShowMessage?.('已發送靜音測試推播！請查看系統通知欄（無鈴聲、無震動）');
      } else {
        onShowMessage?.('發送失敗，請確認 Service Worker 是否已啟用');
      }
    } catch (err) {
      console.warn('Test notification error:', err);
      onShowMessage?.('測試推播觸發異常');
    } finally {
      setTesting(false);
    }
  };

  const containerSx = isCyberpunkMobile
    ? {
        p: { xs: '10px 12px', sm: '12px 14px' },
        borderRadius: '14px',
        background: 'linear-gradient(135deg, rgba(20, 30, 48, 0.78) 0%, rgba(12, 18, 30, 0.9) 100%)',
        border: '1px solid rgba(0, 240, 255, 0.22)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        touchAction: 'pan-y',
      }
    : {
        p: { xs: 1.5, sm: 2 },
        borderRadius: '14px',
        bgcolor: 'rgba(255, 255, 255, 0.035)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
        touchAction: 'pan-y',
      };

  return (
    <Box sx={containerSx}>
      {/* 頂部：標題與開關 */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', touchAction: 'pan-y' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <NotificationsActiveIcon sx={{ color: '#00F0FF', fontSize: 19 }} />
          <Typography sx={{ fontWeight: 800, fontSize: 14.5, color: '#FFF', letterSpacing: 0.2 }}>
            晨間天氣靜音推播
          </Typography>
        </Box>
        <Switch
          checked={subscribed}
          onChange={(e) => handleToggle(e.target.checked)}
          color="primary"
          size="small"
          sx={{
            '& .MuiSwitch-switchBase.Mui-checked': {
              color: '#00F0FF',
            },
            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
              backgroundColor: '#00F0FF',
            },
          }}
        />
      </Box>

      {/* 權限被封鎖提示 (僅在 denied 時顯示精簡警示) */}
      {permissionState === 'denied' && (
        <Box
          sx={{
            mt: 0.75,
            px: 1,
            py: 0.5,
            borderRadius: '6px',
            bgcolor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
          }}
        >
          <Typography sx={{ fontSize: 11, color: '#FCA5A5', fontWeight: 600, lineHeight: 1.3 }}>
            ⚠️ 瀏覽器通知被封鎖，請於網址列設定改為「允許」
          </Typography>
        </Box>
      )}

      {/* 中間功能列：時間設定 + 測試按鈕同一行 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          bgcolor: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          borderRadius: '8px',
          px: 1,
          py: 0.6,
          mt: 0.85,
          touchAction: 'pan-y',
        }}
      >
        {/* 左側：時鐘與時間輸入框 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
          <AccessTimeIcon sx={{ color: '#00F0FF', fontSize: 16 }} />
          <input
            type="time"
            value={scheduledTime}
            onChange={(e) => handleTimeChange(e.target.value)}
            style={{
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(0, 240, 255, 0.35)',
              color: '#00F0FF',
              borderRadius: '5px',
              padding: '2px 6px',
              fontSize: '13px',
              fontWeight: '700',
              fontFamily: 'inherit',
              outline: 'none',
              cursor: 'pointer',
              touchAction: 'pan-y',
            }}
          />
          {scheduledTime !== DEFAULT_NOTIFICATION_TIME && (
            <Button
              size="small"
              onClick={() => handleTimeChange(DEFAULT_NOTIFICATION_TIME)}
              sx={{
                fontSize: 10.5,
                color: '#94A3B8',
                py: 0,
                px: 0.5,
                minWidth: 'auto',
                '&:hover': { color: '#00F0FF' },
              }}
            >
              預設
            </Button>
          )}
        </Box>

        {/* 右側：測試推播按鈕 */}
        <Button
          variant="outlined"
          size="small"
          startIcon={testing ? <CircularProgress size={11} color="inherit" /> : <SendIcon sx={{ fontSize: 12 }} />}
          onClick={handleTestNotification}
          disabled={testing}
          sx={{
            borderColor: 'rgba(0, 240, 255, 0.3)',
            color: '#00F0FF',
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'none',
            borderRadius: '6px',
            py: 0.25,
            px: 0.85,
            minWidth: 'auto',
            '&:hover': {
              borderColor: '#00F0FF',
              bgcolor: 'rgba(0, 240, 255, 0.1)',
            },
          }}
        >
          測試
        </Button>
      </Box>

      {/* 底部精簡說明 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.7, px: 0.2 }}>
        <VolumeOffIcon sx={{ color: '#00F0FF', fontSize: 13, flexShrink: 0 }} />
        <Typography sx={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.65)', fontWeight: 500, lineHeight: 1.3 }}>
          嚴格靜音 · 涵蓋氣溫、室內外體感、降雨機率與穿衣帶傘
        </Typography>
      </Box>
    </Box>
  );
}
