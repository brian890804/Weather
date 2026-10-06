import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { HudMetricItem, SkyTheme } from "./types";

interface MobileHudMetricsProps {
  metrics: HudMetricItem[];
  sky: SkyTheme;
}

export default function MobileHudMetrics({
  metrics,
  sky: _sky,
}: MobileHudMetricsProps) {
  return (
    <Box
      sx={{
        width: "100%",
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: { xs: 0.8, sm: 1.5 },
        mt: { xs: 1, sm: 1.5 },
        mb: { xs: 0.5, sm: 0.8 },
        px: 0.25,
        // 外圈虛線慢速旋轉
        "@keyframes hudRotate": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
      }}
    >
      {metrics.map((item) => (
        <Box
          key={item.key}
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
            py: "2px",
          }}
        >
          {/* 圓形 Cyberpunk HUD 儀表圈（3 個一排，寬高約 78~84px） */}
          <Box
            sx={{
              position: "relative",
              width: { xs: 78, sm: 84 },
              height: { xs: 78, sm: 84 },
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* SVG 圓形進度環與科技刻度 */}
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 80 80"
              style={{ position: "absolute", inset: 0 }}
            >
              {/* 內底暗層 (清透毛玻璃微透黑底) */}
              <circle
                cx="40"
                cy="40"
                r="31"
                fill="rgba(255, 255, 255, 0.04)"
                stroke="rgba(255, 255, 255, 0.12)"
                strokeWidth="2"
              />
              {/* 外圈科技點狀刻度 (慢速旋轉科技雷達轉盤 - 保留旋轉動畫) */}
              <circle
                cx="40"
                cy="40"
                r="36.5"
                fill="none"
                stroke={item.neonColor}
                strokeWidth="1.2"
                strokeDasharray="2.5 5.5"
                opacity="0.45"
                style={{
                  animation: "hudRotate 24s linear infinite",
                  transformOrigin: "40px 40px",
                }}
              />
              {/* 動態霓虹數據量測環 */}
              <circle
                cx="40"
                cy="40"
                r="31"
                fill="none"
                stroke={item.neonColor}
                strokeWidth="3.6"
                strokeLinecap="round"
                strokeDasharray="194.8 194.8"
                strokeDashoffset={
                  194.8 - (194.8 * Math.max(item.percent, 8)) / 100
                }
                style={{
                  transform: "rotate(-90deg)",
                  transformOrigin: "40px 40px",
                  filter: `drop-shadow(0 0 7px ${item.neonColor})`,
                  transition: "stroke-dashoffset 0.8s ease",
                }}
              />
            </svg>

            {/* 圓心內容：Icon (純針對 SVG 邊緣輪廓環繞發光，無額外圈圈) + 數值 */}
            <Box
              sx={{
                position: "relative",
                zIndex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
              }}
            >
              {/* Icon 本身 */}
              <Box
                sx={{
                  color: item.neonColor,
                  mb: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  filter: `drop-shadow(0 0 5px ${item.neonColor}66)`,
                  "& svg": {
                    overflow: "visible",
                  },
                }}
              >
                {item.miniIcon}
              </Box>

              {/* 數值（放大字體） */}
              <Typography
                sx={{
                  fontSize: { xs: 15.5, sm: 17.5 },
                  fontWeight: 800,
                  color: "#FFFFFF",
                  letterSpacing: -0.5,
                  textShadow: `0 0 10px ${item.neonGlow}`,
                  lineHeight: 1.1,
                }}
              >
                {item.value}
              </Typography>
            </Box>
          </Box>

          {/* 儀表下方標籤 */}
          <Typography
            sx={{
              fontSize: { xs: 16, sm: 17 },
              fontWeight: 800,
              color: "#FFF",
              letterSpacing: 0.5,
            }}
          >
            {item.label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
