/**
 * Optional Buddy sound. Off by default; only ever started by an explicit setting or button.
 * No audio files: the chime is synthesised, the voice is the device's own speech engine.
 */
let ctx: AudioContext | undefined;

export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;

export function chime(kind: "soft" | "win" = "soft") {
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx ??= new Ctor();
    const notes = kind === "win" ? [523.25, 659.25, 783.99] : [659.25, 880];
    const t0 = ctx.currentTime;
    notes.forEach((freq, i) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = t0 + i * 0.12;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.08, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(start);
      osc.stop(start + 0.55);
    });
  } catch {
    /* audio unavailable or blocked: stay silent */
  }
}

export function speak(text: string) {
  if (!canSpeak()) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.98;
    u.volume = 0.9;
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}
export const stopSpeaking = () => {
  try {
    if (canSpeak()) window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
};
