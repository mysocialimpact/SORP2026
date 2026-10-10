export const homeworkMinimumMs = 20000;
export const homeworkMessages = [
  { title: "SORP 2026 IS OUR SOURCE OF TRUTH.", copy: "" },
  { title: "EVIDENCE FIRST. JUDGEMENT EXPLAINED. SCORING FIXED.", copy: "" },
  { title: "WE’RE ONLY LOOKING BACK HERE. YOU’LL BRING THE PICTURE UP TO DATE NEXT.", copy: "" },
  { title: "NO REPORT READ = NO SCORE.", copy: "" },
] as const;

export const homeworkMessageDuration = (message: typeof homeworkMessages[number]) =>
  Math.max(5000, Math.ceil(`${message.title} ${message.copy}`.split(/\s+/).length / 220 * 60000 + 1000));

export function homeworkMessageAt(elapsed: number) {
  const cycle = homeworkMessages.reduce((total, message) => total + homeworkMessageDuration(message), 0);
  let endAt = Math.floor(elapsed / cycle) * cycle;
  for (let index = 0; index < homeworkMessages.length; index++) {
    endAt += homeworkMessageDuration(homeworkMessages[index]);
    if (elapsed < endAt) return { index, endAt };
  }
  return { index: 0, endAt: endAt + homeworkMessageDuration(homeworkMessages[0]) };
}

// Complete the current sentence, without forcing a complete message cycle.
export function homeworkFinishDelay(elapsed: number) {
  return homeworkMessageAt(Math.max(homeworkMinimumMs, elapsed) - 1).endAt - elapsed;
}
