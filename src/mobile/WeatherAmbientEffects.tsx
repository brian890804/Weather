import React from "react";
import Box from "@mui/material/Box";

interface WeatherAmbientEffectsProps {
  weatherType: "sunny" | "rainy" | "cloudy" | "night" | "storm";
}

export default function WeatherAmbientEffects({
  weatherType,
}: WeatherAmbientEffectsProps) {
  if (weatherType === "sunny") {
    return (
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          overflow: "hidden",
          "@keyframes sunBeamSweep": {
            "0%, 100%": { opacity: 0.35, transform: "rotate(-25deg) translateY(0px)" },
            "50%": { opacity: 0.65, transform: "rotate(-23deg) translateY(-8px)" },
          },
          "@keyframes solarPulse": {
            "0%, 100%": { transform: "scale(1)", opacity: 0.45 },
            "50%": { transform: "scale(1.15)", opacity: 0.75 },
          },
        }}
      >
        {/* 太陽主核心放射光圈 */}
        <Box
          sx={{
            position: "absolute",
            top: -60,
            right: -40,
            width: 320,
            height: 320,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(254, 240, 138, 0.45) 0%, rgba(249, 115, 22, 0.22) 45%, transparent 70%)",
            animation: "solarPulse 7s ease-in-out infinite",
            filter: "blur(20px)",
          }}
        />

        {/* 金黃/暖橘透光斜向神聖光束 (Sun Rays) */}
        <Box
          sx={{
            position: "absolute",
            top: -80,
            right: 0,
            width: 480,
            height: "120%",
            transformOrigin: "top right",
            animation: "sunBeamSweep 9s ease-in-out infinite",
            background:
              "conic-gradient(from 205deg at 90% 5%, transparent 0deg, rgba(253, 224, 71, 0.16) 12deg, transparent 24deg, rgba(251, 146, 60, 0.18) 36deg, transparent 48deg, rgba(254, 240, 138, 0.14) 60deg, transparent 72deg)",
            filter: "blur(8px)",
          }}
        />
      </Box>
    );
  }

  if (weatherType === "rainy" || weatherType === "storm") {
    return (
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          overflow: "hidden",
          "@keyframes raindropFall": {
            "0%": { transform: "translateY(-120px) translateX(0px)", opacity: 0 },
            "40%": { opacity: 0.65 },
            "80%": { opacity: 0.75 },
            "100%": { transform: "translateY(100vh) translateX(-60px)", opacity: 0 },
          },
          "@keyframes lightningFlash": {
            "0%, 93%, 97%, 100%": { opacity: 0 },
            "94%": { opacity: 0.35 },
            "96%": { opacity: 0.7 },
          },
        }}
      >
        {/* 雷雨閃電全域微光 */}
        {weatherType === "storm" && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              bgcolor: "rgba(224, 231, 255, 0.18)",
              animation: "lightningFlash 8s ease-out infinite",
            }}
          />
        )}

        {/* 細緻透明雨絲流動粒子 */}
        {[
          { left: "12%", delay: "0s", dur: "1.4s", h: 32, w: 1.2 },
          { left: "26%", delay: "0.5s", dur: "1.2s", h: 42, w: 1.5 },
          { left: "42%", delay: "0.8s", dur: "1.6s", h: 28, w: 1.2 },
          { left: "58%", delay: "0.2s", dur: "1.3s", h: 38, w: 1.4 },
          { left: "74%", delay: "0.9s", dur: "1.5s", h: 34, w: 1.2 },
          { left: "88%", delay: "0.4s", dur: "1.1s", h: 46, w: 1.6 },
          { left: "95%", delay: "0.7s", dur: "1.4s", h: 26, w: 1.1 },
        ].map((rain, idx) => (
          <Box
            key={idx}
            sx={{
              position: "absolute",
              top: -60,
              left: rain.left,
              width: rain.w,
              height: rain.h,
              borderRadius: "2px",
              background:
                "linear-gradient(180deg, transparent 0%, rgba(125, 211, 252, 0.75) 100%)",
              transform: "rotate(15deg)",
              animation: `raindropFall ${rain.dur} linear infinite`,
              animationDelay: rain.delay,
              filter: "drop-shadow(0 0 4px rgba(56, 189, 248, 0.5))",
            }}
          />
        ))}
      </Box>
    );
  }

  // 多雲 / 陰天 / 夜晚微光柔霧層
  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
        "@keyframes mistFlow": {
          "0%, 100%": { transform: "translateX(-20px) translateY(0px)", opacity: 0.3 },
          "50%": { transform: "translateX(25px) translateY(-10px)", opacity: 0.5 },
        },
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: "10%",
          left: "-15%",
          width: "130%",
          height: "45%",
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(255, 255, 255, 0.08) 0%, transparent 70%)",
          filter: "blur(30px)",
          animation: "mistFlow 14s ease-in-out infinite",
        }}
      />
    </Box>
  );
}
