export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export function adjustTimeByStep({
  currentStart,
  currentEnd,
  deltaMinutes,
  minStart,
  minEnd,
  businessStart,
  businessEnd,
  step = 15,
}) {
  const safeDelta = deltaMinutes === 0 ? step : deltaMinutes;

  // Interprétation: si on scrolle sur un champ, le champ correspondant bouge.
  // Ici on suppose que deltaMinutes s'applique à start, et end est recalculé si nécessaire.
  let newStart = currentStart + safeDelta;
  newStart = clamp(newStart, businessStart, businessEnd - 1);

  let duration = Math.max(1, currentEnd - currentStart);
  let newEnd = newStart + duration;
  newEnd = clamp(newEnd, businessStart + 1, businessEnd);

  // Garantir end > start
  if (newEnd <= newStart) {
    newEnd = newStart + 1;
  }

  // Snap to step (optionnel)
  const snap = (m) => Math.round(m / step) * step;
  newStart = clamp(snap(newStart), businessStart, businessEnd - step);
  newEnd = clamp(snap(newEnd), newStart + 1, businessEnd);

  return { start: newStart, end: newEnd };
}

