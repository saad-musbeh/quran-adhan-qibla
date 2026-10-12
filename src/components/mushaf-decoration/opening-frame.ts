/** Original floral illumination. Text slots are empty; verified source glyphs
 * are rendered separately above this decoration. No Quran text is drawn here. */
const ornament = (id: string, x: number, y: number, scale = 1, angle = 0) =>
  `<use href="#${id}" transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})"/>`;
const sideFlowers = Array.from({length:11},(_,i)=>
  ornament('rose',24,50+i*50,.78)+ornament('sprig',24,72+i*50,.65,90)).join('');
const endFlowers = Array.from({length:9},(_,i)=>
  ornament('rose',60+i*30,24,.78)+ornament('sprig',75+i*30,24,.58)).join('');
const petals = Array.from({length:8},(_,i)=>`<use href="#petal" transform="rotate(${i*45})"/>`).join('');

export const OPENING_FRAME = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 600" preserveAspectRatio="none" aria-hidden="true">
  <defs>
    <path id="petal" d="M0 2C-8-1-9-8-4-11-3-13-1-14 0-11 1-14 3-13 4-11 9-8 8-1 0 2Z" fill="var(--illum-rose)" stroke="var(--illum-outline)" stroke-width=".65"/>
    <g id="rose">
      ${petals}
      <circle r="4.3" fill="var(--illum-scroll)" stroke="var(--illum-outline)" stroke-width=".8"/>
      <circle r="1.8" fill="var(--illum-green)"/>
    </g>
    <g id="sprig">
      <path d="M-13 0C-10-9-3-9 0 0 3-9 10-9 13 0 10 9 3 9 0 0-3 9-10 9-13 0Z" fill="var(--illum-leaf)" stroke="var(--illum-outline)" stroke-width=".8"/>
      <path d="M-12 0H12" stroke="var(--illum-scroll)" stroke-width=".9"/>
    </g>
    <g id="finial">
      <path d="M0 15C-10 10-8 4-6 0-3 2-2 7 0 9-3-4-2-11 0-15 2-11 3-4 0 9 2 7 3 2 6 0 8 4 10 10 0 15Z" fill="var(--illum-leaf)" stroke="var(--illum-outline)" stroke-width=".8"/>
      <path d="M0 11V-9" stroke="var(--illum-rose)" stroke-width="2"/>
      <circle cy="17" r="1.7" fill="var(--illum-green)"/>
    </g>
    <g id="corner-vine">
      <path d="M0 60C2 35 27 46 27 23 27 6 3 9 10 24 16 37 40 29 37 12 33-5 61 0 68 1M9 47C35 57 42 33 56 34 72 35 60 53 49 43M33 14C47 14 48 1 63 5" fill="none" stroke="var(--illum-green)" stroke-width="2.3" stroke-linecap="round"/>
      <path d="M3 45C-1 33 3 28 14 27 15 38 11 43 3 45M30 29C30 17 38 12 47 13 46 24 40 30 30 29M49 39C55 27 65 27 70 31 65 40 59 44 49 39" fill="var(--illum-leaf)" stroke="var(--illum-outline)" stroke-width=".7"/>
      ${ornament('rose',23,33,.7)}${ornament('sprig',55,10,.65,-20)}
    </g>
    <g id="banner-end">
      <path d="M0-25C10-22 9-8 0 0 9 8 10 22 0 25M0 0C-14-18-22-10-17 0-22 10-14 18 0 0" fill="none" stroke="var(--illum-scroll)" stroke-width="1.3"/>
      ${ornament('rose',0,0,.9)}${ornament('sprig',-16,0,.5,90)}
    </g>
  </defs>
  <!-- Gilt rules and a continuous green garden around the paper. -->
  <rect x="11" y="11" width="338" height="578" rx="4" fill="none" stroke="var(--illum-gold)" stroke-width="1.3"/>
  <rect x="24" y="24" width="312" height="552" rx="2" fill="none" stroke="var(--illum-green)" stroke-width="22"/>
  <rect x="12" y="12" width="336" height="576" rx="4" fill="none" stroke="var(--illum-outline)" stroke-width=".8"/>
  <rect x="37" y="37" width="286" height="526" fill="none" stroke="var(--illum-rose)" stroke-width="2.5"/>
  <rect x="41" y="41" width="278" height="518" fill="none" stroke="var(--illum-gold)" stroke-width="2"/>
  <rect x="44" y="44" width="272" height="512" fill="none" stroke="var(--illum-outline)" stroke-width=".9" stroke-dasharray="2 2"/>
  <path d="M24 38C8 55 40 68 24 88S8 122 24 138 40 172 24 188 8 222 24 238 40 272 24 288 8 322 24 338 40 372 24 388 8 422 24 438 40 472 24 488 8 522 24 538 40 557 24 563" fill="none" stroke="var(--illum-scroll)" stroke-width="1.1"/>
  <g>${sideFlowers}</g><g transform="translate(360 0) scale(-1 1)">${sideFlowers}</g>
  <g>${endFlowers}</g><g transform="translate(0 600) scale(1 -1)">${endFlowers}</g>
  ${Array.from({length:9},(_,i)=>ornament('finial',60+i*30,8,.5)).join('')}
  <g transform="translate(0 600) scale(1 -1)">${Array.from({length:9},(_,i)=>ornament('finial',60+i*30,8,.5)).join('')}</g>
  <!-- Scalloped heading cartouche, with a clear slot for original calligraphy. -->
  <rect x="47" y="51" width="266" height="66" fill="var(--illum-green)" stroke="var(--illum-gold)" stroke-width="1.3"/>
  ${ornament('banner-end',69,84)}${ornament('banner-end',291,84,1,180)}
  <path d="M105 58H255C257 70 270 71 271 84 270 97 257 98 255 110H105C103 98 90 97 89 84 90 71 103 70 105 58Z" fill="#FAF7EF" stroke="var(--illum-scroll)" stroke-width="1.6"/>
  <path d="M109 61H251C253 71 265 74 267 84 265 94 253 97 251 107H109C107 97 95 94 93 84 95 74 107 71 109 61Z" fill="none" stroke="var(--illum-gold)" stroke-width=".9"/>
  <!-- Central paper medallion and paired floral corner scrolls. -->
  <ellipse cx="180" cy="303" rx="138" ry="165" fill="#FAF7EF" stroke="var(--illum-green)" stroke-width="3.5"/>
  <ellipse cx="180" cy="303" rx="134" ry="161" fill="none" stroke="var(--illum-gold)" stroke-width="1.1"/>
  <ellipse cx="180" cy="303" rx="131" ry="158" fill="none" stroke="var(--illum-outline)" stroke-width=".8" stroke-dasharray="1 2.7"/>
  ${ornament('corner-vine',48,129,.72)}
  <g transform="translate(312 129) scale(-.72 .72)"><use href="#corner-vine"/></g>
  <g transform="translate(48 477) scale(.72 -.72)"><use href="#corner-vine"/></g>
  <g transform="translate(312 477) scale(-.72 -.72)"><use href="#corner-vine"/></g>
  <!-- The footer is decorative only; no text is invented for its panel. -->
  <rect x="47" y="489" width="266" height="60" fill="var(--illum-green)" stroke="var(--illum-gold)" stroke-width="1.3"/>
  <path d="M77 519C112 488 125 550 158 519 174 503 186 503 202 519 235 550 248 488 283 519M77 519C112 550 125 488 158 519 174 535 186 535 202 519 235 488 248 550 283 519" fill="none" stroke="var(--illum-scroll)" stroke-width="1.1"/>
  ${ornament('banner-end',68,519,.8)}${ornament('banner-end',292,519,.8,180)}
  ${ornament('rose',180,519,1.35)}${ornament('sprig',132,519,.85)}${ornament('sprig',228,519,.85)}
</svg>`;
