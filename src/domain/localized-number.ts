// Decimal keyboards can emit native digits even when the app uses another language.
const zeroes = [0x30, 0x660, 0x6f0, 0x966, 0x9e6, 0xa66, 0xae6, 0xb66, 0xbe6, 0xc66, 0xce6, 0xd66, 0xff10];
export function parseLocalizedInteger(value: string): number | null {
  const normalized = [...value.trim()].map(character => {
    const point = character.codePointAt(0)!;
    const zero = zeroes.find(start => point >= start && point <= start + 9);
    return zero === undefined ? character : String(point - zero);
  }).join('');
  if (!/^\d+$/.test(normalized)) return null;
  const number = Number(normalized);
  return Number.isSafeInteger(number) ? number : null;
}
