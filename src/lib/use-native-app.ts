// True only inside the App Store / Google Play app, after hydration, so the
// website's server render and first paint are unchanged.
import { useEffect, useState } from "react";

export function useInNativeApp(): boolean {
  const [native, setNative] = useState(false);
  useEffect(() => {
    try {
      setNative(Boolean((window as any).Capacitor?.isNativePlatform?.()));
    } catch {
      setNative(false);
    }
  }, []);
  return native;
}
