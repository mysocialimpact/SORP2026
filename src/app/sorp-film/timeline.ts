/** Capture timing only. Interactive slides never advance automatically. */
export const FILM_DURATION = 30;
export const scenes = [
  { start: 0, end: 2, title: "Requirement → opportunity" },
  { start: 2, end: 4, title: "Why impact matters now" },
  { start: 4, end: 8, title: "We do the public homework" },
  { start: 8, end: 13, title: "Then · Historical Snapshot" },
  { start: 13, end: 17, title: "Now · Your current position" },
  { start: 17, end: 22, title: "Next · Your free report" },
  { start: 22, end: 25, title: "Every conclusion explained" },
  { start: 25, end: 28.3, title: "Beyond compliance" },
  { start: 28.3, end: 30, title: "Start free" },
] as const;
export const slideTimes = scenes.map((scene) => (scene.start + scene.end) / 2);
export function frameAt(seconds: number) {
  const time = Math.max(
    0,
    Math.min(FILM_DURATION, Number.isFinite(seconds) ? seconds : 0),
  );
  const index = scenes.findIndex((scene) => time < scene.end);
  const scene = index < 0 ? scenes.length - 1 : index;
  return {
    time,
    scene,
    progress:
      (time - scenes[scene].start) / (scenes[scene].end - scenes[scene].start),
  };
}
