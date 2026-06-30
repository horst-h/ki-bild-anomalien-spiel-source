export type AvatarType = "jungfuchs" | "waldfuchs" | "erzfuchs";

export const AVATAR_DEFS: Record<AvatarType, { name: string; desc: string; color: string }> = {
  jungfuchs: { name: "Jungfuchs", desc: "Einstieg · Kinderfreundliche Szenen", color: "#00FF41" },
  waldfuchs: { name: "Waldfuchs", desc: "Standard · Allgemeine Bilder", color: "#FEE600" },
  erzfuchs: { name: "Erzfuchs", desc: "Experte · Anspruchsvolle KI-Bilder", color: "#8A2BE2" },
};

export function FoxIcon({ type, size = 64 }: { type: AvatarType | string; size?: number }) {
  const c = AVATAR_DEFS[type as AvatarType]?.color ?? "#A8ABA7";
  const dark = "#121414";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="30" fill="#1A1C1A" stroke={c} strokeWidth="1.5" />
      <ellipse cx="32" cy="42" rx="14" ry="10" fill={c} opacity="0.85" />
      <ellipse cx="32" cy="27" rx="13" ry="11" fill={c} />
      <polygon points="20,19 14,3 27,15" fill={c} />
      <polygon points="44,19 50,3 37,15" fill={c} />
      <polygon points="21,18 16,7 27,15" fill={dark} opacity="0.35" />
      <polygon points="43,18 48,7 37,15" fill={dark} opacity="0.35" />
      <ellipse cx="32" cy="30" rx="6" ry="4" fill={c} opacity="0.6" />
      <ellipse cx="26" cy="25" rx="2.8" ry="2.8" fill={dark} />
      <ellipse cx="38" cy="25" rx="2.8" ry="2.8" fill={dark} />
      <circle cx="27" cy="24.2" r="0.9" fill="white" />
      <circle cx="39" cy="24.2" r="0.9" fill="white" />
      <ellipse cx="32" cy="30" rx="2" ry="1.6" fill={dark} />
      {type === "erzfuchs" && <circle cx="52" cy="12" r="5" fill="#8A2BE2" stroke="#FEE600" strokeWidth="1.5" />}
      {type === "jungfuchs" && <circle cx="52" cy="12" r="5" fill="#00FF41" stroke={dark} strokeWidth="1.5" />}
    </svg>
  );
}
