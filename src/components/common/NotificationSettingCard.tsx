import React, { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Switch from "@mui/material/Switch";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import SendIcon from "@mui/icons-material/Send";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
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
  getWorkerUrl,
  syncSubscriptionToWorker,
  triggerWorkerTestPush,
} from "../../utils/notificationService";
import type { WeatherPeriod } from "../../types/weather";
import CloudQueueIcon from "@mui/icons-material/CloudQueue";

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
  const [permissionState, setPermissionState] =
    useState<NotificationPermission>(() => {
      if (typeof Notification === "undefined") return "denied";
      return Notification.permission;
    });
  const [subscribed, setSubscribed] = useState(() => {
    if (!isNotificationSupported()) return false;
    return isNotificationSubscribed() && Notification.permission === "granted";
  });
  const [scheduledTime, setScheduledTime] = useState(() =>
    getNotificationTime(),
  );
  const [tempTime, setTempTime] = useState(() => getNotificationTime());
  const [testing, setTesting] = useState(false);
  const [syncingTime, setSyncingTime] = useState(false);
  const workerUrl = getWorkerUrl();

  const handleConfirmTime = async (targetTime?: string) => {
    const newTime = targetTime || tempTime;
    if (!newTime) return;
    setTempTime(newTime);
    setScheduledTime(newTime);
    setNotificationTime(newTime);

    // 若尚未開啟推播開關，自動為使用者嘗試請求權限並開啟
    if (!subscribed) {
      if (!supported) {
        onShowMessage?.(
          `推播時間已設定為 ${newTime}（目前瀏覽器不支援 Notification API）`,
        );
        return;
      }

      let currentPerm =
        typeof Notification !== "undefined"
          ? Notification.permission
          : "denied";
      if (currentPerm !== "granted") {
        currentPerm = await requestNotificationPermission();
        setPermissionState(currentPerm);
      }

      if (currentPerm === "granted") {
        setNotificationSubscribed(true);
        setSubscribed(true);
        onShowMessage?.(`推播時間已設定為 ${newTime}，並已成功啟用每日推播！`);
      } else {
        onShowMessage?.(
          `推播時間已設定為 ${newTime}（請記得允許瀏覽器通知權限並開啟開關）`,
        );
        return;
      }
    }

    if (workerUrl) {
      setSyncingTime(true);
      syncSubscriptionToWorker({
        cityName,
        townshipName,
        scheduledTime: newTime,
      })
        .then((res) => {
          if (res.ok) {
            onShowMessage?.(`每日 ${newTime} 已成功同步至雲端伺服器！`);
          } else {
            onShowMessage?.(`排程同步失敗: ${res.message}`);
          }
        })
        .finally(() => {
          setSyncingTime(false);
        });
    } else {
      onShowMessage?.(`每日推播時間已更新為 ${newTime}`);
    }
  };

  const handleToggle = async (checked: boolean) => {
    if (!supported) {
      onShowMessage?.("目前瀏覽器環境不支援 Web Push/Notification API");
      return;
    }

    if (checked) {
      let currentPerm =
        typeof Notification !== "undefined"
          ? Notification.permission
          : "denied";
      if (currentPerm !== "granted") {
        currentPerm = await requestNotificationPermission();
        setPermissionState(currentPerm);
      }

      if (currentPerm === "granted") {
        setNotificationSubscribed(true);
        setSubscribed(true);
        onShowMessage?.(`已開啟每日 ${scheduledTime} 晨間天氣靜音推播！`);

        if (workerUrl) {
          syncSubscriptionToWorker({
            cityName,
            townshipName,
            scheduledTime,
          }).then((res) => {
            onShowMessage?.(res.message);
          });
        }
      } else {
        setNotificationSubscribed(false);
        setSubscribed(false);
        onShowMessage?.("未授予通知權限，無法開啟晨間推播");
      }
    } else {
      setNotificationSubscribed(false);
      setSubscribed(false);
      onShowMessage?.("已關閉每日定時晨間天氣推播");
    }
  };

  const handleTestNotification = async () => {
    if (!supported) {
      onShowMessage?.("目前瀏覽器環境不支援 Web Push/Notification API");
      return;
    }

    let currentPerm =
      typeof Notification !== "undefined" ? Notification.permission : "denied";
    if (currentPerm !== "granted") {
      currentPerm = await requestNotificationPermission();
      setPermissionState(currentPerm);
    }

    if (currentPerm !== "granted") {
      onShowMessage?.("請先允許通知權限以測試推播");
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
        realtimeRainNow,
      );

      if (workerUrl) {
        const res = await triggerWorkerTestPush({
          title: content.title,
          body: content.body,
          cityName,
          townshipName,
        });
        if (res.ok) {
          onShowMessage?.(
            "已發出雲端靜音推播！因設定為嚴格靜音，請由螢幕頂端下滑檢視「通知中心」或鎖定螢幕查看。",
          );
        } else {
          onShowMessage?.(`測試失敗: ${res.message}`);
        }
      } else {
        const ok = await sendSilentNotification({
          title: content.title,
          body: content.body,
          tag: `test-silent-${Date.now()}`,
        });

        if (ok) {
          onShowMessage?.(
            "已發送本機靜音測試推播！(若要關閉網頁也能收到，請點擊「設定雲端」綁定 Cloudflare Worker)",
          );
        } else {
          onShowMessage?.("測試推播觸發失敗，請確認是否已授權通知權限");
        }
      }
    } catch (err) {
      console.warn("Test notification error:", err);
      onShowMessage?.("測試推播觸發異常");
    } finally {
      setTesting(false);
    }
  };

  const containerSx = isCyberpunkMobile
    ? {
        p: { xs: "10px 12px", sm: "12px 14px" },
        borderRadius: "14px",
        background:
          "linear-gradient(135deg, rgba(20, 30, 48, 0.78) 0%, rgba(12, 18, 30, 0.9) 100%)",
        border: "1px solid rgba(0, 240, 255, 0.22)",
        boxShadow:
          "0 4px 20px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        touchAction: "pan-y",
      }
    : {
        p: { xs: 1.5, sm: 2 },
        borderRadius: "14px",
        bgcolor: "rgba(255, 255, 255, 0.035)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
        touchAction: "pan-y",
      };

  return (
    <Box sx={containerSx}>
      {/* 頂部：標題、雲端狀態與開關 */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          touchAction: "pan-y",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <NotificationsActiveIcon sx={{ color: "#00F0FF", fontSize: 19 }} />
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: 14.5,
              color: "#FFF",
              letterSpacing: 0.2,
            }}
          >
            晨間天氣靜音推播
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {/* Cloudflare Worker 連線狀態指示 */}
          {workerUrl && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                px: 0.9,
                py: 0.25,
                borderRadius: "12px",
                bgcolor: "rgba(0, 240, 255, 0.12)",
                border: "1px solid rgba(0, 240, 255, 0.35)",
                userSelect: "none",
              }}
            >
              <CloudQueueIcon sx={{ fontSize: 13, color: "#00F0FF" }} />
              <Typography
                sx={{ fontSize: 10.5, fontWeight: 700, color: "#00F0FF" }}
              >
                雲端
              </Typography>
            </Box>
          )}

          <Switch
            checked={subscribed}
            onChange={(e) => handleToggle(e.target.checked)}
            color="primary"
            size="small"
            sx={{
              "& .MuiSwitch-switchBase.Mui-checked": {
                color: "#00F0FF",
              },
              "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                backgroundColor: "#00F0FF",
              },
            }}
          />
        </Box>
      </Box>

      {/* 權限被封鎖提示 (僅在 denied 時顯示精簡警示) */}
      {permissionState === "denied" && (
        <Box
          sx={{
            mt: 0.75,
            px: 1,
            py: 0.5,
            borderRadius: "6px",
            bgcolor: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.35)",
          }}
        >
          <Typography
            sx={{
              fontSize: 11,
              color: "#FCA5A5",
              fontWeight: 600,
              lineHeight: 1.3,
            }}
          >
            ⚠️ 瀏覽器通知被封鎖，請於網址列設定改為「允許」
          </Typography>
        </Box>
      )}

      {/* 中間功能列：時間設定 + 測試按鈕同一行 */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          bgcolor: "rgba(255, 255, 255, 0.04)",
          border: "1px solid rgba(255, 255, 255, 0.07)",
          borderRadius: "8px",
          px: 1,
          py: 0.6,
          mt: 0.85,
          touchAction: "pan-y",
        }}
      >
        {/* 左側：時鐘與時間輸入框 */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.8,
            flexWrap: "wrap",
          }}
        >
          <AccessTimeIcon sx={{ color: "#00F0FF", fontSize: 16 }} />
          <input
            type="time"
            value={tempTime}
            onChange={(e) => setTempTime(e.target.value)}
            onClick={(e) => {
              try {
                (e.currentTarget as any).showPicker?.();
              } catch {
                /* ignore */
              }
            }}
            style={{
              background: "rgba(15, 23, 42, 0.95)",
              border:
                tempTime !== scheduledTime
                  ? "1px solid #00F0FF"
                  : "1px solid rgba(0, 240, 255, 0.45)",
              boxShadow:
                tempTime !== scheduledTime
                  ? "0 0 10px rgba(0, 240, 255, 0.35)"
                  : "none",
              color: "#00F0FF",
              borderRadius: "6px",
              padding: "4px 8px",
              fontSize: "13.5px",
              fontWeight: "700",
              fontFamily: "inherit",
              outline: "none",
              cursor: "pointer",
              colorScheme: "dark",
              WebkitUserSelect: "auto",
              userSelect: "auto",
              display: "inline-block",
              transition: "all 0.2s ease",
            }}
          />

          {/* 當選擇新時間尚未確認時，呈現明確的確認按鈕，點擊後才正式訂閱與同步 */}
          {tempTime !== scheduledTime && (
            <Button
              size="small"
              variant="contained"
              onClick={() => handleConfirmTime(tempTime)}
              disabled={syncingTime}
              startIcon={
                syncingTime ? (
                  <CircularProgress size={10} color="inherit" />
                ) : undefined
              }
              sx={{
                fontSize: 11,
                fontWeight: 800,
                bgcolor: "#00F0FF",
                color: "#0a0f1e",
                py: 0.3,
                px: 1.1,
                minWidth: "auto",
                borderRadius: "6px",
                boxShadow: "0 0 12px rgba(0, 240, 255, 0.55)",
                "&:hover": { bgcolor: "#38BDF8" },
                "&:active": { transform: "scale(0.96)" },
              }}
            >
              確認時間
            </Button>
          )}

          {tempTime !== DEFAULT_NOTIFICATION_TIME && (
            <Button
              size="small"
              onClick={() => handleConfirmTime(DEFAULT_NOTIFICATION_TIME)}
              sx={{
                fontSize: 10.5,
                color: "#94A3B8",
                py: 0,
                px: 0.5,
                minWidth: "auto",
                "&:hover": { color: "#00F0FF" },
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
          startIcon={
            testing ? (
              <CircularProgress size={11} color="inherit" />
            ) : (
              <SendIcon sx={{ fontSize: 12 }} />
            )
          }
          onClick={handleTestNotification}
          disabled={testing}
          sx={{
            borderColor: "rgba(0, 240, 255, 0.3)",
            color: "#00F0FF",
            fontSize: 11,
            fontWeight: 700,
            textTransform: "none",
            borderRadius: "6px",
            py: 0.25,
            px: 0.85,
            minWidth: "auto",
            "&:hover": {
              borderColor: "#00F0FF",
              bgcolor: "rgba(0, 240, 255, 0.1)",
            },
          }}
        >
          測試
        </Button>
      </Box>

      {/* 底部精簡說明 */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          mt: 0.7,
          px: 0.2,
        }}
      >
        <VolumeOffIcon sx={{ color: "#00F0FF", fontSize: 13, flexShrink: 0 }} />
        <Typography
          sx={{
            fontSize: 11,
            color: "rgba(255, 255, 255, 0.65)",
            fontWeight: 500,
            lineHeight: 1.3,
          }}
        >
          嚴格靜音 · 涵蓋氣溫、室內外體感、降雨機率與穿衣帶傘
        </Typography>
      </Box>
    </Box>
  );
}
