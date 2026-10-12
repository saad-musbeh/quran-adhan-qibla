/** Original geometric opening frame; intentionally transparent behind the source Quran artwork. */
export const OPENING_FRAME = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 600" preserveAspectRatio="none" aria-hidden="true">
  <defs>
    <g id="corner-star">
      <path d="M0-11 2.8-4.7 8.5-8.5 4.7-2.8 11 0 4.7 2.8 8.5 8.5 2.8 4.7 0 11-2.8 4.7-8.5 8.5-4.7 2.8-11 0-4.7-2.8-8.5-8.5-2.8-4.7Z" fill="#FAF7EF" stroke="#18334A" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M0-5.2 1.5-1.5 5.2 0 1.5 1.5 0 5.2-1.5 1.5-5.2 0-1.5-1.5Z" fill="#DBAB68" stroke="#18334A" stroke-width=".65"/>
      <circle r="1.2" fill="#18334A"/>
    </g>
    <g id="medallion">
      <path d="M0-22 5-18 12-19 15-12 21-8 19 0 21 8 15 12 12 19 5 18 0 22-5 18-12 19-15 12-21 8-19 0-21-8-15-12-12-19-5-18Z" fill="#FAF7EF" stroke="#18334A" stroke-width="1.3" stroke-linejoin="round"/>
      <path d="M0-17 4-10 11-11 10-4 17 0 10 4 11 11 4 10 0 17-4 10-11 11-10 4-17 0-10-4-11-11-4-10Z" fill="none" stroke="#DBAB68" stroke-width="1" stroke-linejoin="round"/>
      <path d="M0-9 2.4-2.4 9 0 2.4 2.4 0 9-2.4 2.4-9 0-2.4-2.4Z" fill="#DBAB68" stroke="#18334A" stroke-width=".8"/>
      <circle r="1.5" fill="#18334A"/>
    </g>
  </defs>
  <path d="M18 7H342L353 18V582L342 593H18L7 582V18Z" fill="none" stroke="#18334A" stroke-width="1.5"/>
  <path d="M24 13H336L347 24V576L336 587H24L13 576V24Z" fill="none" stroke="#DBAB68" stroke-width=".9"/>
  <path d="M31 18V582M329 18V582" fill="none" stroke="#18334A" stroke-width=".8"/>
  <path d="M34 70V530M326 70V530" fill="none" stroke="#DBAB68" stroke-width=".55"/>
  <path d="M24 56H154M206 56H336M24 544H154M206 544H336" fill="none" stroke="#18334A" stroke-width=".8"/>
  <path d="M28 62H147M213 62H332M28 538H147M213 538H332" fill="none" stroke="#DBAB68" stroke-width=".6"/>
  <use href="#corner-star" x="23" y="23"/><use href="#corner-star" x="337" y="23"/>
  <use href="#corner-star" x="23" y="577"/><use href="#corner-star" x="337" y="577"/>
  <use href="#medallion" x="180" y="34"/><use href="#medallion" x="180" y="566"/>
  <path d="M23 48V57M337 48V57M23 543V552M337 543V552" stroke="#DBAB68" stroke-width="1"/>
</svg>`;
