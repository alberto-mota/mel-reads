'use strict';
/* Mel Reads — Sparkle the unicorn (original character) + garden flower art.
   sparkleSVG({ mood, outfit, aura, view }) → inline SVG. Moods: happy | cheer | think | sleepy | wow.
   outfit slots: head, face, neck, back, mane, horn, coat, hooves.  aura: [colors] when a full set is worn.
   While speech plays, <body class="talking"> animates her mouth (CSS). */

const INK = '#3B1E4A';
const MANES = {
  default: ['#FF8FB1', '#C3A6FF', '#8CC8FF', '#8EE3B5'],
  'mane-rose': ['#FF5FA2', '#FF9EC6', '#FFC2DA', '#FF7FB5'],
  'mane-mint': ['#5FD39E', '#B6F0D0', '#8EE3B5', '#FFC2DA'],
  'mane-night': ['#5B4BC4', '#8C7BFF', '#C9C0FF', '#FFE27A'],
  'mane-ocean': ['#2EA8D8', '#7FE0D6', '#4FC3E8', '#A6ECFF'],
};
const HORNS = {
  default: { fill: '#FFD66B', lines: ['#E0A93A', '#E0A93A', '#E0A93A'] },
  'horn-crystal': { fill: '#DDF4FF', lines: ['#7CC8EE', '#A7DBF5', '#7CC8EE'] },
  'horn-rainbow': { fill: '#FFF3B0', lines: ['#FF5FA2', '#4DA8FF', '#2BC48A'] },
  'horn-pearl': { fill: '#FFF7FB', lines: ['#F2B8D2', '#E9C9F2', '#F2B8D2'] },
};
const COATS = {
  default: { main: '#fff', alt: '#F6EFFA', muzzle: '#FFE3EF', ear: '#FFC2DA' },
  'coat-lavender': { main: '#F1E6FF', alt: '#E5D6FB', muzzle: '#FBE1F2', ear: '#E2BDF2' },
  'coat-sky': { main: '#E4F4FF', alt: '#D2EAFB', muzzle: '#FFE6EF', ear: '#B9DDF5' },
};
const HOOVES = {
  default: ['#C9B3F5', '#C9B3F5', '#C9B3F5', '#C9B3F5'],
  slippers: ['#BFE9FF', '#BFE9FF', '#BFE9FF', '#BFE9FF'],
  'boots-petal': ['#FF8FB1', '#FF8FB1', '#FF8FB1', '#FF8FB1'],
  'boots-rainbow': ['#FF8FB1', '#FFD66B', '#8CC8FF', '#8EE3B5'],
};
const star4 = (x, y, r, c) => `<path d="M${x} ${y - r} Q${x + r * 0.22} ${y - r * 0.22} ${x + r} ${y} Q${x + r * 0.22} ${y + r * 0.22} ${x} ${y + r} Q${x - r * 0.22} ${y + r * 0.22} ${x - r} ${y} Q${x - r * 0.22} ${y - r * 0.22} ${x} ${y - r} Z" fill="${c}"/>`;

function sparkleSVG(o = {}) {
  const mood = o.mood || 'happy';
  const fit = o.outfit || {};
  const mane = MANES[fit.mane] || MANES.default;
  const horn = HORNS[fit.horn] || HORNS.default;
  const coat = COATS[fit.coat] || COATS.default;
  const hoof = HOOVES[fit.hooves] || HOOVES.default;
  const ol = `stroke="${INK}" stroke-width="7" stroke-linejoin="round" fill="${INK}"`;
  const legs = [[66, 134], [88, 138], [120, 138], [142, 134]];
  const legShape = (x, y) => `<rect x="${x}" y="${y}" width="17" height="40" rx="8.5"/>`;
  const body = `<ellipse cx="108" cy="122" rx="50" ry="32"/><ellipse cx="80" cy="102" rx="19" ry="27" transform="rotate(-28 80 102)"/><circle cx="60" cy="72" r="34"/><ellipse cx="38" cy="89" rx="23" ry="17"/><path d="M73 44 L87 28 L90 56 Z"/>`;
  const curls = [[84, 50, 13, 0], [95, 66, 13, 1], [100, 84, 12, 2], [102, 102, 11, 3], [70, 38, 10, 1], [57, 41, 10, 0]];
  const eye = {
    happy: `<ellipse cx="46" cy="70" rx="6.5" ry="9" fill="${INK}"/><circle cx="48.6" cy="66" r="2.7" fill="#fff"/><circle cx="44" cy="74" r="1.3" fill="#fff"/><path d="M39 62 L35.5 58 M43 60 L42 55 M48 60 L50 55" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`,
    cheer: `<path d="M38 73 Q46 61 54 73" stroke="${INK}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`,
    sleepy: `<path d="M38 70 Q46 77 54 70" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    think: `<ellipse cx="47" cy="68" rx="6.5" ry="9" fill="${INK}"/><circle cx="49" cy="63.5" r="2.7" fill="#fff"/><path d="M38 56 Q46 52 54 57" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    wow: `<ellipse cx="46" cy="70" rx="7.5" ry="10" fill="${INK}"/><circle cx="49" cy="65.5" r="3" fill="#fff"/><circle cx="44" cy="75" r="1.4" fill="#fff"/>`,
  }[mood] || '';
  const mouth = {
    happy: `<path d="M24 97 Q32 104 41 97" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
    cheer: `<path d="M23 95 Q32 110 42 95 Z" fill="#C2306F" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`,
    sleepy: `<path d="M27 99 Q32 102 37 99" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    think: `<path d="M26 100 Q32 97 38 100" stroke="${INK}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`,
    wow: `<ellipse cx="32" cy="100" rx="4.5" ry="5.5" fill="#C2306F" stroke="${INK}" stroke-width="2.5"/>`,
  }[mood] || '';
  const talkMouth = `<g class="m-talk"><path d="M23 95 Q32 108 42 95 Z" fill="#C2306F" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/></g>`;
  const pearls = (fill, stroke) => [[66, 108], [71, 113], [77, 117], [84, 119], [91, 118], [97, 115]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.4" fill="${fill}" stroke="${stroke}" stroke-width="1.6"/>`).join('');
  const acc = {
    // back
    wings: `<g opacity=".92"><path d="M112 98 Q112 38 162 40 Q156 78 128 104 Z" fill="#E6DAFF" stroke="#9B7BFF" stroke-width="3" stroke-linejoin="round"/><path d="M120 100 Q132 58 172 66 Q160 92 132 108 Z" fill="#FFE3F0" stroke="#FF8FB1" stroke-width="3" stroke-linejoin="round"/></g>`,
    cape: `<path d="M86 94 Q120 86 148 104 Q148 128 126 138 Q108 120 86 94 Z" fill="#B57BFF" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M100 100 Q124 95 142 108" stroke="#D9C6FF" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="86" cy="92" r="5" fill="#FFD66B" stroke="#E0A93A" stroke-width="2"/>`,
    starcape: `<path d="M86 94 Q120 86 148 104 Q148 128 126 138 Q108 120 86 94 Z" fill="#3E3A9C" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>${star4(112, 104, 5, '#FFE27A')}${star4(130, 114, 4, '#FFE27A')}${star4(122, 126, 3.5, '#fff')}${star4(138, 104, 3, '#fff')}${star4(86, 92, 6, '#FFD66B')}`,
    // head
    bow: `<g stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"><path d="M86 36 L71 25 Q66 36 71 46 Z" fill="#FF5FA2"/><path d="M86 36 L101 25 Q106 36 101 46 Z" fill="#FF5FA2"/><circle cx="86" cy="36" r="5.5" fill="#FF8FB1"/></g>`,
    flowers: [[64, 40, '#FF8FB1'], [75, 36, '#FFE27A'], [86, 41, '#8CC8FF'], [93, 52, '#C3A6FF']].map(([x, y, c]) => `<g><circle cx="${x}" cy="${y}" r="7" fill="${c}" stroke="${INK}" stroke-width="2"/><circle cx="${x}" cy="${y}" r="2.6" fill="#FFD66B"/></g>`).join(''),
    tiara: `<path d="M64 46 L67 31 L74 40 L80 26 L86 40 L93 31 L95 48 Z" fill="#FFD66B" stroke="#C98A12" stroke-width="2.5" stroke-linejoin="round"/><circle cx="80" cy="35" r="3.4" fill="#FF5FA2"/><circle cx="67" cy="33" r="2" fill="#8CC8FF"/><circle cx="93" cy="33" r="2" fill="#8CC8FF"/>`,
    starhat: `<path d="M68 44 Q80 30 88 2 Q92 26 98 44 Z" fill="#5B4BC4" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><ellipse cx="83" cy="45" rx="20" ry="5.5" fill="#463AA8" stroke="${INK}" stroke-width="2.5"/>${star4(84, 24, 4.5, '#FFE27A')}${star4(90, 36, 3.2, '#fff')}${star4(78, 37, 2.6, '#FFE27A')}`,
    shellcrown: `<path d="M67 47 Q66 22 82 18 Q98 22 97 47 Z" fill="#FFC9DD" stroke="#D9709C" stroke-width="2.5" stroke-linejoin="round"/><path d="M82 46 L72 26 M82 46 L78 21 M82 46 L86 21 M82 46 L92 26" stroke="#E58AB0" stroke-width="2" stroke-linecap="round"/><circle cx="82" cy="45" r="4" fill="#fff" stroke="#D9C3E3" stroke-width="1.5"/>`,
    // face
    glasses: `<path d="M46 85 C30 74 34 58 46 66 C58 58 62 74 46 85 Z" fill="rgba(255,95,162,.28)" stroke="#FF2E88" stroke-width="3.2" stroke-linejoin="round"/><path d="M57 67 L74 64" stroke="#FF2E88" stroke-width="3" stroke-linecap="round"/>`,
    'heart-cheeks': `<path d="M60 92 c-5 -4 -3 -9 0 -7.5 c3 -1.5 5 3.5 0 7.5 z" fill="#FF5FA2"/><path d="M68 84 c-3.5 -3 -2 -6.5 0 -5.3 c2 -1.2 3.5 2.3 0 5.3 z" fill="#FF8FB1"/>`,
    'star-stickers': `${star4(62, 86, 5, '#FFD66B')}${star4(70, 78, 3.6, '#8CC8FF')}${star4(57, 79, 2.8, '#FF8FB1')}`,
    // neck
    necklace: pearls('#fff', '#D9C3E3') + `<path d="M81 122 c-4 -4 -2 -8 1 -7 c3 -1 5 3 1 7 z" fill="#FF5FA2"/>`,
    scarf: `<path d="M58 100 Q80 118 102 104 L104 116 Q80 130 58 112 Z" fill="#FF8FB1" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M64 106 Q80 118 98 110" stroke="#FFE27A" stroke-width="3" fill="none"/><path d="M68 110 Q80 120 96 114" stroke="#8CC8FF" stroke-width="2.5" fill="none"/><path d="M90 114 L98 140 L86 137 Z" fill="#C3A6FF" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`,
    moon: `<path d="M64 106 Q82 124 99 112" stroke="#E0A93A" stroke-width="2.2" fill="none"/><path d="M86 116 A8 8 0 1 0 86 132 A6 6 0 1 1 86 116 Z" fill="#FFE27A" stroke="#C98A12" stroke-width="2" stroke-linejoin="round"/>`,
    shellneck: pearls('#E8F8FF', '#9FD3EE') + `<path d="M76 130 Q75 119 82 117 Q89 119 88 130 Z" fill="#FFC9DD" stroke="#D9709C" stroke-width="1.8" stroke-linejoin="round"/><path d="M82 129 L79 120 M82 129 L85 120" stroke="#E58AB0" stroke-width="1.4"/>`,
  };
  const pick = slot => (fit[slot] && acc[fit[slot]]) || '';
  const behind = fit.back === 'wings' ? acc.wings : '';
  const front = fit.back && fit.back !== 'wings' ? pick('back') : '';
  const aura = o.aura ? `<g class="aura"><circle cx="100" cy="98" r="96" fill="${o.aura[0]}" opacity=".16"/>${[[16, 36, 9], [184, 30, 8], [192, 112, 6], [8, 150, 7], [118, 8, 6], [170, 178, 5]].map(([x, y, r], k) => `<g class="tw tw${k % 3}">${star4(x, y, r, o.aura[k % o.aura.length])}</g>`).join('')}</g>` : '';
  const view = o.view || '0 0 200 190';
  return `<svg class="sparkle-svg mood-${mood}" viewBox="${view}" aria-hidden="true">
    ${aura}${behind}
    <g class="tail"><path d="M150 112 C178 98 194 126 177 150" stroke="${mane[0]}" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M152 120 C172 114 183 134 170 154" stroke="${mane[1]}" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M150 128 C163 128 170 142 161 158" stroke="${mane[2]}" stroke-width="8" fill="none" stroke-linecap="round"/></g>
    <g ${ol}>${legs.map(([x, y]) => legShape(x, y)).join('')}${body}${curls.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}<path d="M50 46 L44 6 L64 41 Z"/></g>
    <g fill="${coat.main}">${legs.map(([x, y], k) => `<rect x="${x}" y="${y}" width="17" height="40" rx="8.5" fill="${k === 1 || k === 3 ? coat.alt : coat.main}"/><rect x="${x}" y="${y + 30}" width="17" height="10" rx="5" fill="${hoof[k]}"/>`).join('')}
      <ellipse cx="108" cy="122" rx="50" ry="32"/><ellipse cx="80" cy="102" rx="19" ry="27" transform="rotate(-28 80 102)"/><circle cx="60" cy="72" r="34"/><ellipse cx="38" cy="89" rx="23" ry="17" fill="${coat.muzzle}"/><path d="M73 44 L87 28 L90 56 Z"/><path d="M78 42 L85 34 L87 51 Z" fill="${coat.ear}"/></g>
    ${fit.hooves === 'slippers' ? legs.map(([x, y]) => `<path d="M${x + 3} ${y + 32} l3 3 l3 -3" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>`).join('') : ''}
    <path d="M50 46 L44 6 L64 41 Z" fill="${horn.fill}"/><path d="M47 32 L58 28" stroke="${horn.lines[0]}" stroke-width="2.4" stroke-linecap="round"/><path d="M46 21 L54 18" stroke="${horn.lines[1]}" stroke-width="2.4" stroke-linecap="round"/><path d="M49 40 L61 36" stroke="${horn.lines[2]}" stroke-width="2.4" stroke-linecap="round"/>
    ${curls.map(([x, y, r, c]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${mane[c]}"/>`).join('')}
    ${front}
    ${pick('neck')}
    <circle cx="60" cy="88" r="7" fill="#FF8FB1" opacity=".45"/><circle cx="24" cy="86" r="2.2" fill="${INK}"/>
    ${eye}${pick('face')}
    <g class="m-rest">${mouth}</g>${talkMouth}
    ${pick('head')}
    ${mood === 'sleepy' ? `<text x="78" y="22" font-family="Fredoka, sans-serif" font-size="18" font-weight="700" fill="#B79CF0">z</text><text x="92" y="10" font-family="Fredoka, sans-serif" font-size="13" font-weight="700" fill="#B79CF0">z</text>` : ''}
  </svg>`;
}

/* ---------- garden flowers: 0 seed · 1 sprout · 2 bud · 3 flower ---------- */
const PETALS = ['#FF8FB1', '#FFB86B', '#C3A6FF', '#8CC8FF', '#FF6FB0', '#FFD66B', '#7FE0B4', '#F7A8FF'];
function hueFor(w) { let h = 0; for (const ch of String(w)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return PETALS[h % PETALS.length]; }
function flowerSVG(stage, color = '#FF8FB1', size = 64) {
  const soil = `<ellipse cx="32" cy="57" rx="19" ry="6" fill="#C9A27E"/><ellipse cx="32" cy="55" rx="15" ry="4" fill="#B08560"/>`;
  const leaf = (d) => `<path d="${d}" fill="#7FD49B" stroke="#3E9A60" stroke-width="1.6" stroke-linejoin="round"/>`;
  let g = '';
  if (stage <= 0) g = `<ellipse cx="32" cy="51" rx="5" ry="3.6" fill="#8A5A3B"/><path d="M32 48 Q33 44 36 43" stroke="#7FD49B" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  else if (stage === 1) g = `<path d="M32 55 L32 40" stroke="#3E9A60" stroke-width="3" stroke-linecap="round"/>${leaf('M32 44 Q20 40 21 31 Q31 33 32 44 Z')}${leaf('M32 41 Q44 37 43 28 Q33 31 32 41 Z')}`;
  else if (stage === 2) g = `<path d="M32 55 L32 26" stroke="#3E9A60" stroke-width="3" stroke-linecap="round"/>${leaf('M32 46 Q19 43 19 34 Q30 35 32 46 Z')}${leaf('M32 40 Q45 37 45 28 Q34 30 32 40 Z')}<path d="M32 27 Q23 20 27 11 Q32 14 32 14 Q32 14 37 11 Q41 20 32 27 Z" fill="${color}" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>`;
  else g = `<path d="M32 55 L32 30" stroke="#3E9A60" stroke-width="3" stroke-linecap="round"/>${leaf('M32 48 Q19 45 19 36 Q30 37 32 48 Z')}${leaf('M32 42 Q45 39 45 30 Q34 32 32 42 Z')}${[0, 72, 144, 216, 288].map(a => `<ellipse cx="32" cy="10" rx="7.5" ry="10" fill="${color}" stroke="${INK}" stroke-width="1.6" transform="rotate(${a} 32 21)"/>`).join('')}<circle cx="32" cy="21" r="6" fill="#FFD66B" stroke="#C98A12" stroke-width="1.6"/>`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">${soil}${g}</svg>`;
}
