export function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(max, Math.max(min, value));
}
export function cellAtPoint(px: number, py: number, size: number, scale: number, offsetX: number, offsetY: number) {
  'worklet';
  const x = (px - size / 2 - offsetX) / scale + size / 2;
  const y = (py - size / 2 - offsetY) / scale + size / 2;
  if (size <= 0 || x < 0 || y < 0 || x >= size || y >= size) return -1;
  return Math.floor(y / (size / 15)) * 15 + Math.floor(x / (size / 15));
}
