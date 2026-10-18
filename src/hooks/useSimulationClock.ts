import { useEffect } from 'react';
import { useLab } from '../store/useLab';
/** Wall-clock playback is independent of the pure logical scheduler. */
export function useSimulationClock() {
  const running = useLab((s) => s.running),
    speed = useLab((s) => s.speed),
    pulse = useLab((s) => s.pulse);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(pulse, 850 / speed);
    return () => clearInterval(id);
  }, [running, speed, pulse]);
}
