import type { SkyTheme } from "./types";

export function getSkyTheme(
  weather: string,
  isNight: boolean,
  pop: number,
): SkyTheme {
  // 1. 夜間雷雨 / 大雨 (Rainy / Stormy Night)
  if (
    isNight &&
    (pop >= 40 || weather.includes("雨") || weather.includes("雷"))
  ) {
    return {
      bg: "linear-gradient(165deg, #070e1b 0%, #0d1a2d 45%, #16263d 100%)",
      glow: "radial-gradient(ellipse at 50% 0%, rgba(56, 189, 248, 0.25) 0%, rgba(129, 140, 248, 0.15) 50%, transparent 70%)",
      neonPrimary: "#38BDF8",
      neonSecondary: "#818CF8",
      neonGlow: "rgba(56, 189, 248, 0.65)",
      neonAuraBg:
        "radial-gradient(circle, rgba(56, 189, 248, 0.35) 0%, rgba(129, 140, 248, 0.15) 55%, transparent 72%)",
      glass: "rgba(10, 22, 40, 0.72)",
      glassBorder: "rgba(56, 189, 248, 0.35)",
      dimGlass: "rgba(7, 16, 30, 0.60)",
      dimBorder: "rgba(56, 189, 248, 0.18)",
      cardGradient:
        "linear-gradient(135deg, rgba(56, 189, 248, 0.16) 0%, rgba(13, 26, 45, 0.75) 45%, rgba(7, 14, 27, 0.85) 100%)",
      cardItemGradient:
        "linear-gradient(135deg, rgba(56, 189, 248, 0.14) 0%, rgba(22, 38, 61, 0.40) 60%, rgba(13, 26, 45, 0.25) 100%)",
      textPrimary: "#FFFFFF",
      textSecondary: "rgba(186, 230, 253, 0.75)",
      accentText: "#38BDF8",
      weatherType: weather.includes("雷") ? "storm" : "rainy",
    };
  }

  // 2. 晴朗 / 多雲夜空 (Clear / Cloudy Night - 深邃夜幕藍紫星空)
  if (isNight) {
    return {
      bg: "linear-gradient(165deg, #0a0e1f 0%, #111735 45%, #1a2046 100%)",
      glow: "radial-gradient(ellipse at 72% 8%, rgba(129, 140, 248, 0.32) 0%, rgba(192, 132, 252, 0.15) 45%, transparent 68%)",
      neonPrimary: "#818CF8",
      neonSecondary: "#C084FC",
      neonGlow: "rgba(129, 140, 248, 0.65)",
      neonAuraBg:
        "radial-gradient(circle, rgba(129, 140, 248, 0.35) 0%, rgba(192, 132, 252, 0.16) 55%, transparent 72%)",
      glass: "rgba(17, 23, 53, 0.72)",
      glassBorder: "rgba(129, 140, 248, 0.35)",
      dimGlass: "rgba(12, 17, 39, 0.60)",
      dimBorder: "rgba(129, 140, 248, 0.18)",
      cardGradient:
        "linear-gradient(135deg, rgba(129, 140, 248, 0.16) 0%, rgba(17, 23, 53, 0.75) 45%, rgba(10, 14, 31, 0.85) 100%)",
      cardItemGradient:
        "linear-gradient(135deg, rgba(192, 132, 252, 0.14) 0%, rgba(26, 32, 70, 0.40) 60%, rgba(17, 23, 53, 0.25) 100%)",
      textPrimary: "#FFFFFF",
      textSecondary: "rgba(224, 231, 255, 0.75)",
      accentText: "#A5B4FC",
      weatherType: "night",
    };
  }

  // 3. 白天雷雨 (Thunderstorm - 必須天氣文字明確包含「雷」才觸發)
  if (weather.includes("雷")) {
    return {
      bg: "linear-gradient(165deg, #0f1322 0%, #1a1e36 45%, #2a284e 100%)",
      glow: "radial-gradient(ellipse at 50% 0%, rgba(192, 132, 252, 0.32) 0%, rgba(56, 189, 248, 0.20) 55%, transparent 70%)",
      neonPrimary: "#C084FC",
      neonSecondary: "#38BDF8",
      neonGlow: "rgba(192, 132, 252, 0.65)",
      neonAuraBg:
        "radial-gradient(circle, rgba(192, 132, 252, 0.36) 0%, rgba(56, 189, 248, 0.18) 55%, transparent 72%)",
      glass: "rgba(22, 25, 48, 0.72)",
      glassBorder: "rgba(192, 132, 252, 0.35)",
      dimGlass: "rgba(15, 17, 34, 0.60)",
      dimBorder: "rgba(192, 132, 252, 0.18)",
      cardGradient:
        "linear-gradient(135deg, rgba(192, 132, 252, 0.18) 0%, rgba(26, 30, 54, 0.75) 45%, rgba(15, 19, 34, 0.85) 100%)",
      cardItemGradient:
        "linear-gradient(135deg, rgba(192, 132, 252, 0.14) 0%, rgba(42, 40, 78, 0.40) 60%, rgba(26, 30, 54, 0.25) 100%)",
      textPrimary: "#FFFFFF",
      textSecondary: "rgba(233, 213, 255, 0.75)",
      accentText: "#E879F9",
      weatherType: "storm",
    };
  }

  // 4. 白天雨天 / 局部短暫雨 (Rain / Drizzle - 清澈冷冽水藍雨境)
  if (weather.includes("雨") || pop >= 35) {
    return {
      bg: "linear-gradient(165deg, #0f2038 0%, #183354 45%, #244973 100%)",
      glow: "radial-gradient(ellipse at 50% 5%, rgba(56, 189, 248, 0.35) 0%, rgba(14, 165, 233, 0.20) 48%, transparent 68%)",
      neonPrimary: "#38BDF8",
      neonSecondary: "#0EA5E9",
      neonGlow: "rgba(56, 189, 248, 0.65)",
      neonAuraBg:
        "radial-gradient(circle, rgba(56, 189, 248, 0.35) 0%, rgba(14, 165, 233, 0.18) 55%, transparent 72%)",
      glass: "rgba(17, 37, 66, 0.72)",
      glassBorder: "rgba(56, 189, 248, 0.35)",
      dimGlass: "rgba(11, 26, 48, 0.60)",
      dimBorder: "rgba(56, 189, 248, 0.18)",
      cardGradient:
        "linear-gradient(135deg, rgba(56, 189, 248, 0.18) 0%, rgba(24, 51, 84, 0.75) 45%, rgba(15, 32, 56, 0.85) 100%)",
      cardItemGradient:
        "linear-gradient(135deg, rgba(56, 189, 248, 0.14) 0%, rgba(36, 73, 115, 0.40) 60%, rgba(24, 51, 84, 0.25) 100%)",
      textPrimary: "#FFFFFF",
      textSecondary: "rgba(224, 242, 254, 0.75)",
      accentText: "#7DD3FC",
      weatherType: "rainy",
    };
  }

  // 5. 白天陰天 / 多雲 (Overcast / Cloudy - 柔和沉穩青灰雲霧)
  if (weather.includes("陰") || weather.includes("多雲")) {
    return {
      bg: "linear-gradient(165deg, #162436 0%, #20354e 45%, #2e496a 100%)",
      glow: "radial-gradient(ellipse at 50% 8%, rgba(148, 163, 184, 0.32) 0%, rgba(56, 189, 248, 0.15) 50%, transparent 70%)",
      neonPrimary: "#7DD3FC",
      neonSecondary: "#94A3B8",
      neonGlow: "rgba(125, 211, 252, 0.60)",
      neonAuraBg:
        "radial-gradient(circle, rgba(125, 211, 252, 0.32) 0%, rgba(148, 163, 184, 0.16) 55%, transparent 72%)",
      glass: "rgba(24, 40, 62, 0.72)",
      glassBorder: "rgba(125, 211, 252, 0.32)",
      dimGlass: "rgba(16, 28, 44, 0.60)",
      dimBorder: "rgba(125, 211, 252, 0.16)",
      cardGradient:
        "linear-gradient(135deg, rgba(125, 211, 252, 0.16) 0%, rgba(32, 53, 78, 0.75) 45%, rgba(22, 36, 54, 0.85) 100%)",
      cardItemGradient:
        "linear-gradient(135deg, rgba(148, 163, 184, 0.14) 0%, rgba(46, 73, 106, 0.40) 60%, rgba(32, 53, 78, 0.25) 100%)",
      textPrimary: "#FFFFFF",
      textSecondary: "rgba(226, 232, 240, 0.75)",
      accentText: "#BAE6FD",
      weatherType: "cloudy",
    };
  }

  // 6. 白天大晴天 / 晴朗 (Sunny / Clear - 亮麗金黃暖橘太陽光輝與光線感)
  return {
    bg: "linear-gradient(165deg, #2b1803 0%, #4a2906 35%, #78350f 70%, #92400e 100%)",
    glow: "radial-gradient(ellipse at 80% 5%, rgba(251, 191, 36, 0.60) 0%, rgba(249, 115, 22, 0.32) 40%, transparent 70%)",
    neonPrimary: "#FBBF24",
    neonSecondary: "#F97316",
    neonGlow: "rgba(251, 191, 36, 0.70)",
    neonAuraBg:
      "radial-gradient(circle, rgba(251, 191, 36, 0.45) 0%, rgba(249, 115, 22, 0.25) 55%, transparent 72%)",
    glass: "rgba(48, 26, 6, 0.72)",
    glassBorder: "rgba(251, 191, 36, 0.38)",
    dimGlass: "rgba(32, 17, 4, 0.60)",
    dimBorder: "rgba(251, 191, 36, 0.20)",
    cardGradient:
      "linear-gradient(135deg, rgba(251, 191, 36, 0.22) 0%, rgba(74, 41, 6, 0.78) 45%, rgba(43, 24, 3, 0.88) 100%)",
    cardItemGradient:
      "linear-gradient(135deg, rgba(249, 115, 22, 0.18) 0%, rgba(120, 53, 15, 0.45) 60%, rgba(74, 41, 6, 0.25) 100%)",
    textPrimary: "#FFFFFF",
    textSecondary: "rgba(254, 243, 199, 0.80)",
    accentText: "#FDE68A",
    weatherType: "sunny",
  };
}
