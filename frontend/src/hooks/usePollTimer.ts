import { useEffect, useState } from "react";

const usePollTimer = (initialSeconds: number | null): number => {
  const [seconds, setSeconds] = useState<number>(initialSeconds || 0);

  useEffect(() => {
    setSeconds(initialSeconds || 0);
    if (initialSeconds == null) {
      return;
    }

    const interval = setInterval(() => {
      setSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [initialSeconds]);

  return seconds;
};

export default usePollTimer;
