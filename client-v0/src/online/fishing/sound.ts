// Âm báo tạm cho tới khi ART-06 giao âm thanh thật.
let context: AudioContext | null = null;

export function playBiteBeep(): void {
  try {
    context ??= new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 880;
    gain.gain.value = 0.08;
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.12);
  } catch (error) {
    console.warn('Không phát được âm báo', error);
  }
}
