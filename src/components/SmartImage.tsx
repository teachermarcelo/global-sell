import React, { useEffect, useMemo, useState } from 'react';
import { getAssetUrlFallbacks } from '../lib/i18n';

interface SmartImageProps {
  src?: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  fallback?: React.ReactNode;
  onAllFailed?: () => void;
}

export const SmartImage: React.FC<SmartImageProps> = ({
  src,
  alt,
  className,
  style,
  fallback = null,
  onAllFailed,
}) => {
  const candidates = useMemo(() => getAssetUrlFallbacks(src), [src]);
  const candidatesKey = candidates.join('|');
  const [attemptIndex, setAttemptIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setAttemptIndex(0);
    setFailed(false);
  }, [candidatesKey]);

  if (candidates.length === 0) {
    return <>{fallback}</>;
  }

  if (failed || attemptIndex >= candidates.length) {
    return <>{fallback}</>;
  }

  return (
    <img
      src={candidates[attemptIndex]}
      alt={alt}
      className={className}
      style={style}
      referrerPolicy="no-referrer"
      onError={() => {
        if (attemptIndex + 1 < candidates.length) {
          setAttemptIndex((prev) => prev + 1);
        } else {
          setFailed(true);
          onAllFailed?.();
        }
      }}
    />
  );
};
