// Farming (Hugglehen Farms). A mock/simplified version: plots are shared (not per-player),
// planting costs coins, watering starts the grow timer, and anyone can harvest a ready plot.
// Plot positions sit within the farm's open, walkable area over the existing farm tile art
// (no new art — see ASSETS.md); they are an approximation, not a pixel-exact match to every
// painted "PLOT" tile.
export const FARM_REACH = 50;
export const SEED_COST = 5;

export const CROPS = [
  { id: 'carrot', name: 'Carrot', growMs: 20000, value: 10, color: '#e67e22' },
  { id: 'sunflower', name: 'Sunflower', growMs: 35000, value: 18, color: '#f1c40f' },
  { id: 'pumpkin', name: 'Pumpkin', growMs: 60000, value: 35, color: '#d35400' },
];
export const CROP_BY_ID = Object.fromEntries(CROPS.map((c) => [c.id, c]));

export const PLOTS = [
  { id: 0, room: 'hugglehenFarms', x: 2340, y: 1740 },
  { id: 1, room: 'hugglehenFarms', x: 2340, y: 1830 },
  { id: 2, room: 'hugglehenFarms', x: 2430, y: 1740 },
  { id: 3, room: 'hugglehenFarms', x: 2430, y: 1830 },
  { id: 4, room: 'hugglehenFarms', x: 2250, y: 1800 },
  { id: 5, room: 'hugglehenFarms', x: 2280, y: 1680 },
  { id: 6, room: 'hugglehenFarms', x: 2280, y: 1890 },
  { id: 7, room: 'hugglehenFarms', x: 2370, y: 1650 },
  { id: 8, room: 'hugglehenFarms', x: 2370, y: 1920 },
  { id: 9, room: 'hugglehenFarms', x: 2520, y: 1800 },
  { id: 10, room: 'hugglehenFarms', x: 2460, y: 1650 },
  { id: 11, room: 'hugglehenFarms', x: 2490, y: 1890 },
  { id: 12, room: 'hugglehenFarms', x: 2190, y: 1680 },
  { id: 13, room: 'hugglehenFarms', x: 2160, y: 1800 },
];
export const plotsInRoom = (room) => PLOTS.filter((p) => p.room === room);

// stage: 'empty' | 'planted' (needs water) | 'growing' | 'ready'
export function plotStage(plot, now = Date.now()) {
  if (!plot) return 'empty';
  if (!plot.wateredAt) return 'planted';
  const crop = CROP_BY_ID[plot.cropId];
  return now - plot.wateredAt >= crop.growMs ? 'ready' : 'growing';
}

export function plotProgress(plot, now = Date.now()) {
  if (!plot?.wateredAt) return 0;
  const crop = CROP_BY_ID[plot.cropId];
  return Math.min(1, (now - plot.wateredAt) / crop.growMs);
}
