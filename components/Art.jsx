// Simple illustrations drawn in code, so the app ships with no image files.
const BG = {
  museum: "#ECE7FD", play: "#ECE7FD", "indoor play": "#ECE7FD", indoor: "#ECE7FD",
  park: "#E3F5DD", playground: "#E3F5DD", outdoor: "#E3F5DD", animals: "#FFF3D1",
  farm: "#FFF3D1", library: "#FFE3EA", water: "#E4F2FC", lake: "#E4F2FC",
  swimming: "#E4F2FC", mixed: "#E4F2FC", garden: "#E3F5DD", dinosaurs: "#FFF3D1",
  art: "#F3EEE6", experiments: "#FFF3D1", running: "#E3F5DD", "indoor halls": "#ECE7FD",
};

export default function Art({ kind }) {
  const bg = BG[kind] || "#EEF5F2";
  const scene = sceneFor(kind);
  return (
    <svg viewBox="0 0 360 140" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="360" height="140" fill={bg} />
      {scene}
    </svg>
  );
}

function sceneFor(kind) {
  switch (kind) {
    case "animals":
    case "farm":
      return (
        <>
          <circle cx="300" cy="34" r="20" fill="#FFC845" />
          <path d="M0 110 Q90 84 180 106 T360 100 V140H0z" fill="#9ED98B" />
          <rect x="70" y="60" width="80" height="54" fill="#F2668B" />
          <path d="M60 64l50-34 50 34z" fill="#15202A" />
          <rect x="98" y="86" width="24" height="28" fill="#fff" />
          <ellipse cx="240" cy="104" rx="30" ry="17" fill="#fff" />
          <circle cx="267" cy="92" r="11" fill="#fff" />
        </>
      );
    case "water":
    case "lake":
    case "swimming":
      return (
        <>
          <circle cx="300" cy="32" r="20" fill="#FFC845" />
          <path d="M0 86 Q45 72 90 86 T180 86 T270 86 T360 86 V140H0z" fill="#8FD0F5" />
          <path d="M0 108 Q45 94 90 108 T180 108 T270 108 T360 108" stroke="#fff" strokeWidth="5" fill="none" />
          <circle cx="90" cy="62" r="12" fill="#F2668B" />
        </>
      );
    case "library":
      return (
        <>
          <rect x="60" y="42" width="24" height="80" rx="3" fill="#0E6B5C" />
          <rect x="86" y="34" width="20" height="88" rx="3" fill="#FFC845" />
          <rect x="108" y="52" width="28" height="70" rx="3" fill="#8FD0F5" />
          <rect x="140" y="40" width="18" height="82" rx="3" fill="#B9A6F5" />
          <circle cx="262" cy="70" r="40" fill="#fff" />
        </>
      );
    case "park":
    case "playground":
    case "outdoor":
    case "running":
    case "garden":
      return (
        <>
          <circle cx="58" cy="34" r="18" fill="#FFC845" />
          <path d="M0 112 Q120 86 360 110 V140H0z" fill="#9ED98B" />
          <path d="M190 116V50h12l56 66" stroke="#15202A" strokeWidth="6" fill="none" strokeLinecap="round" />
          <rect x="172" y="44" width="42" height="10" rx="5" fill="#F2668B" />
          <circle cx="298" cy="74" r="28" fill="#0E6B5C" />
          <rect x="294" y="90" width="8" height="26" fill="#15202A" />
        </>
      );
    case "art":
      return (
        <>
          <rect x="44" y="30" width="66" height="84" rx="4" fill="#fff" stroke="#15202A" strokeWidth="3" />
          <circle cx="77" cy="64" r="17" fill="#F2668B" />
          <rect x="240" y="26" width="76" height="92" rx="38" fill="#B9A6F5" />
          <rect x="150" y="84" width="34" height="32" rx="4" fill="#FFC845" />
          <rect x="186" y="84" width="34" height="32" rx="4" fill="#8FD0F5" />
        </>
      );
    case "dinosaurs":
      return (
        <>
          <path d="M0 116 Q180 100 360 116V140H0z" fill="#9ED98B" />
          <path d="M60 116c0-34 24-52 54-52 18 0 26 8 40 8 20 0 28-14 44-14 22 0 36 18 36 40" stroke="#15202A" strokeWidth="8" fill="none" strokeLinecap="round" />
          <circle cx="232" cy="92" r="4" fill="#15202A" />
        </>
      );
    default:
      return (
        <>
          <rect x="206" y="80" width="42" height="42" rx="6" fill="#B9A6F5" />
          <rect x="250" y="80" width="42" height="42" rx="6" fill="#FFC845" />
          <rect x="228" y="36" width="42" height="42" rx="6" fill="#F2668B" />
          <circle cx="88" cy="56" r="26" fill="#8FD0F5" />
          <rect x="40" y="100" width="110" height="16" rx="8" fill="#fff" />
        </>
      );
  }
}
