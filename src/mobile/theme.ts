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
      bg: "linear-gradient(165deg, #050b16 0%, #0a1424 45%, #0f1c30 100%)",
      glow: "radial-gradient(ellipse 90% 50% at 50% -10%, rgba(56, 189, 248, 0.45) 0%, rgba(129, 140, 248, 0.25) 45%, transparent 75%), radial-gradient(circle 380px at 85% 80%, rgba(56, 189, 248, 0.20) 0%, transparent 70%), radial-gradient(circle 320px at 15% 45%, rgba(129, 140, 248, 0.18) 0%, transparent 65%)",
      neonPrimary: "#38BDF8",
      neonSecondary: "#818CF8",
      neonGlow: "rgba(56, 189, 248, 0.65)",
      neonAuraBg:
        "radial-gradient(circle, rgba(56, 189, 248, 0.35) 0%, rgba(129, 140, 248, 0.15) 55%, transparent 72%)",
      glass: "rgba(255, 255, 255, 0.04)",
      glassBorder: "rgba(255, 255, 255, 0.14)",
      dimGlass: "rgba(255, 255, 255, 0.02)",
      dimBorder: "rgba(255, 255, 255, 0.09)",
      cardGradient:
        "linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.015) 100%)",
      cardItemGradient:
        "linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%)",
      textPrimary: "#FFFFFF",
      textSecondary: "rgba(186, 230, 253, 0.85)",
      accentText: "#38BDF8",
      weatherType: weather.includes("雷") ? "storm" : "rainy",
    };
  }

  // 2. 晴朗 / 多雲夜空 (Clear / Cloudy Night - 深邃夜幕藍紫星空)
  if (isNight) {
    return {
      bg: "linear-gradient(165deg, #070a17 0%, #0d122b 45%, #141a38 100%)",
      glow: "radial-gradient(ellipse 90% 55% at 75% -5%, rgba(129, 140, 248, 0.48) 0%, rgba(192, 132, 252, 0.28) 45%, transparent 72%), radial-gradient(circle 360px at 15% 75%, rgba(192, 132, 252, 0.22) 0%, transparent 68%), radial-gradient(circle 300px at 85% 45%, rgba(129, 140, 248, 0.16) 0%, transparent 65%)",
      neonPrimary: "#818CF8",
      neonSecondary: "#C084FC",
      neonGlow: "rgba(129, 140, 248, 0.65)",
      neonAuraBg:
        "radial-gradient(circle, rgba(129, 140, 248, 0.35) 0%, rgba(192, 132, 252, 0.16) 55%, transparent 72%)",
      glass: "rgba(255, 255, 255, 0.04)",
      glassBorder: "rgba(255, 255, 255, 0.14)",
      dimGlass: "rgba(255, 255, 255, 0.02)",
      dimBorder: "rgba(255, 255, 255, 0.09)",
      cardGradient:
        "linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.015) 100%)",
      cardItemGradient:
        "linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%)",
      textPrimary: "#FFFFFF",
      textSecondary: "rgba(224, 231, 255, 0.85)",
      accentText: "#A5B4FC",
      weatherType: "night",
    };
  }

  // 3. 白天雷雨 (Thunderstorm - 必須天氣文字明確包含「雷」才觸發)
  if (weather.includes("雷")) {
    return {
      bg: "linear-gradient(165deg, #090c17 0%, #12152a 45%, #1e1e3b 100%)",
      glow: "radial-gradient(ellipse 95% 55% at 50% -8%, rgba(192, 132, 252, 0.48) 0%, rgba(56, 189, 248, 0.28) 50%, transparent 75%), radial-gradient(circle 380px at 85% 70%, rgba(192, 132, 252, 0.24) 0%, transparent 70%), radial-gradient(circle 320px at 15% 45%, rgba(56, 189, 248, 0.20) 0%, transparent 65%)",
      neonPrimary: "#C084FC",
      neonSecondary: "#38BDF8",
      neonGlow: "rgba(192, 132, 252, 0.65)",
      neonAuraBg:
        "radial-gradient(circle, rgba(192, 132, 252, 0.36) 0%, rgba(56, 189, 248, 0.18) 55%, transparent 72%)",
      glass: "rgba(255, 255, 255, 0.04)",
      glassBorder: "rgba(255, 255, 255, 0.14)",
      dimGlass: "rgba(255, 255, 255, 0.02)",
      dimBorder: "rgba(255, 255, 255, 0.09)",
      cardGradient:
        "linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.015) 100%)",
      cardItemGradient:
        "linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%)",
      textPrimary: "#FFFFFF",
      textSecondary: "rgba(233, 213, 255, 0.85)",
      accentText: "#E879F9",
      weatherType: "storm",
    };
  }

  // 4. 白天雨天 / 局部短暫雨 (Rain / Drizzle - 清澈冷冽水藍雨境)
  if (weather.includes("雨") || pop >= 35) {
    return {
      bg: "linear-gradient(165deg, #091728 0%, #10263f 45%, #18385a 100%)",
      glow: "radial-gradient(ellipse 95% 55% at 50% -5%, rgba(56, 189, 248, 0.52) 0%, rgba(148, 163, 184, 0.30) 45%, transparent 75%), radial-gradient(circle 380px at 85% 75%, rgba(56, 189, 248, 0.22) 0%, transparent 68%), radial-gradient(circle 320px at 15% 40%, rgba(14, 165, 233, 0.18) 0%, transparent 65%)",
      neonPrimary: "#38BDF8",
      neonSecondary: "#0EA5E9",
      neonGlow: "rgba(56, 189, 248, 0.65)",
      neonAuraBg:
        "radial-gradient(circle, rgba(56, 189, 248, 0.35) 0%, rgba(14, 165, 233, 0.18) 55%, transparent 72%)",
      glass: "rgba(255, 255, 255, 0.04)",
      glassBorder: "rgba(255, 255, 255, 0.14)",
      dimGlass: "rgba(255, 255, 255, 0.02)",
      dimBorder: "rgba(255, 255, 255, 0.09)",
      cardGradient:
        "linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.015) 100%)",
      cardItemGradient:
        "linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%)",
      textPrimary: "#FFFFFF",
      textSecondary: "rgba(224, 242, 254, 0.85)",
      accentText: "#7DD3FC",
      weatherType: "rainy",
    };
  }

  // 5. 白天大晴天 / 晴朗 (Sunny / Clear - 包含「晴」、「晴時多雲」、「多雲時晴」且無雨)
  const isSunnyCondition =
    weather === "晴" ||
    weather === "晴天" ||
    weather.startsWith("晴") ||
    weather.includes("晴時多雲") ||
    (weather.includes("多雲時晴") && pop < 30) ||
    (weather.includes("晴") && !weather.includes("陰") && pop < 30);

  if (isSunnyCondition) {
    return {
      bg: "linear-gradient(165deg, #1f1102 0%, #351d04 40%, #4e2607 70%, #632d09 100%)",
      glow: "radial-gradient(ellipse 95% 60% at 80% -5%, rgba(251, 191, 36, 0.65) 0%, rgba(249, 115, 22, 0.38) 42%, transparent 75%), radial-gradient(circle 420px at 15% 75%, rgba(249, 115, 22, 0.26) 0%, transparent 68%), radial-gradient(circle 340px at 85% 45%, rgba(251, 191, 36, 0.22) 0%, transparent 65%)",
      neonPrimary: "#FBBF24",
      neonSecondary: "#F97316",
      neonGlow: "rgba(251, 191, 36, 0.70)",
      neonAuraBg:
        "radial-gradient(circle, rgba(251, 191, 36, 0.45) 0%, rgba(249, 115, 22, 0.25) 55%, transparent 72%)",
      glass: "rgba(255, 255, 255, 0.04)",
      glassBorder: "rgba(255, 255, 255, 0.14)",
      dimGlass: "rgba(255, 255, 255, 0.02)",
      dimBorder: "rgba(255, 255, 255, 0.09)",
      cardGradient:
        "linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.015) 100%)",
      cardItemGradient:
        "linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%)",
      textPrimary: "#FFFFFF",
      textSecondary: "rgba(254, 243, 199, 0.85)",
      accentText: "#FDE68A",
      weatherType: "sunny",
    };
  }

  // 6. 白天陰天 / 多雲 (Overcast / Cloudy - 柔和沉穩青灰雲霧)
  return {
    bg: "linear-gradient(165deg, #0e1824 0%, #17283c 45%, #213752 100%)",
    glow: "radial-gradient(ellipse 95% 55% at 50% -5%, rgba(125, 211, 252, 0.42) 0%, rgba(148, 163, 184, 0.25) 45%, transparent 72%), radial-gradient(circle 380px at 85% 75%, rgba(125, 211, 252, 0.18) 0%, transparent 68%), radial-gradient(circle 320px at 15% 40%, rgba(148, 163, 184, 0.15) 0%, transparent 65%)",
    neonPrimary: "#7DD3FC",
    neonSecondary: "#94A3B8",
    neonGlow: "rgba(125, 211, 252, 0.60)",
    neonAuraBg:
      "radial-gradient(circle, rgba(125, 211, 252, 0.32) 0%, rgba(148, 163, 184, 0.16) 55%, transparent 72%)",
    glass: "rgba(255, 255, 255, 0.04)",
    glassBorder: "rgba(255, 255, 255, 0.14)",
    dimGlass: "rgba(255, 255, 255, 0.02)",
    dimBorder: "rgba(255, 255, 255, 0.09)",
    cardGradient:
      "linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.015) 100%)",
    cardItemGradient:
      "linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%)",
    textPrimary: "#FFFFFF",
    textSecondary: "rgba(226, 232, 240, 0.85)",
    accentText: "#BAE6FD",
    weatherType: "cloudy",
  };
}
