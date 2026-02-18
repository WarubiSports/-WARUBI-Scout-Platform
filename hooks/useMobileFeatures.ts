import { useState, useEffect, useCallback, useRef } from 'react';

// Haptic feedback utility
export const haptic = {
  light: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },
  medium: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(25);
    }
  },
  heavy: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  },
  success: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 50, 30]);
    }
  },
  error: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 30, 50]);
    }
  }
};

// Online/Offline detection hook
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        // Show "back online" briefly
        setTimeout(() => setWasOffline(false), 3000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  return { isOnline, wasOffline };
};

// Pull-to-refresh hook
export const usePullToRefresh = (onRefresh: () => Promise<void>, threshold = 80) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 0 && containerRef.current && containerRef.current.scrollTop === 0) {
      // Apply resistance
      const distance = Math.min(diff * 0.5, threshold * 1.5);
      setPullDistance(distance);

      if (distance >= threshold) {
        haptic.light();
      }
    }
  }, [isPulling, isRefreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      haptic.medium();

      try {
        await onRefresh();
        haptic.success();
      } catch (e) {
        haptic.error();
      } finally {
        setIsRefreshing(false);
      }
    }

    setIsPulling(false);
    setPullDistance(0);
  }, [isPulling, pullDistance, threshold, isRefreshing, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    containerRef,
    isPulling,
    pullDistance,
    isRefreshing,
    pullProgress: Math.min(pullDistance / threshold, 1)
  };
};

// Mobile keyboard detection and handling
export const useMobileKeyboard = () => {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    // Detect viewport height changes (keyboard appearing/disappearing)
    const initialHeight = window.innerHeight;
    let wasKeyboardOpen = false;

    const handleResize = () => {
      const heightDiff = initialHeight - window.innerHeight;
      const keyboardNowOpen = heightDiff > 150; // Keyboard typically > 150px

      if (keyboardNowOpen !== wasKeyboardOpen) {
        setIsKeyboardOpen(keyboardNowOpen);
        setKeyboardHeight(keyboardNowOpen ? heightDiff : 0);
        wasKeyboardOpen = keyboardNowOpen;
      }
    };

    // Also handle visual viewport API if available (more accurate on mobile)
    const handleVisualViewport = () => {
      if (window.visualViewport) {
        const heightDiff = window.innerHeight - window.visualViewport.height;
        const keyboardNowOpen = heightDiff > 150;

        if (keyboardNowOpen !== wasKeyboardOpen) {
          setIsKeyboardOpen(keyboardNowOpen);
          setKeyboardHeight(keyboardNowOpen ? heightDiff : 0);
          wasKeyboardOpen = keyboardNowOpen;
        }
      }
    };

    window.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('resize', handleVisualViewport);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('resize', handleVisualViewport);
    };
  }, []);

  // Helper to scroll element into view when focused
  const scrollIntoView = useCallback((element: HTMLElement | null) => {
    if (element && isKeyboardOpen) {
      setTimeout(() => {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [isKeyboardOpen]);

  return { isKeyboardOpen, keyboardHeight, scrollIntoView };
};

// Focus handler that scrolls input into view on mobile
export const handleMobileFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  const element = e.target;
  // Small delay to let keyboard appear
  setTimeout(() => {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 300);
};

// Swipe gesture hook for cards
export const useSwipeGesture = (
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  threshold = 100
) => {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const isHorizontalSwipe = useRef(false);
  const elementRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isHorizontalSwipe.current = false;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - startX.current;
    const diffY = currentY - startY.current;

    // Determine if this is a horizontal swipe (only on first significant move)
    if (!isHorizontalSwipe.current && (Math.abs(diffX) > 10 || Math.abs(diffY) > 10)) {
      isHorizontalSwipe.current = Math.abs(diffX) > Math.abs(diffY);
    }

    if (isHorizontalSwipe.current) {
      // Apply resistance at edges
      const resistance = 0.6;
      const newOffset = diffX * resistance;

      // Limit the offset
      const maxOffset = threshold * 1.2;
      setOffset(Math.max(-maxOffset, Math.min(maxOffset, newOffset)));

      // Haptic feedback at threshold
      if (Math.abs(newOffset) >= threshold && Math.abs(offset) < threshold) {
        haptic.light();
      }
    }
  }, [isDragging, offset, threshold]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    if (offset >= threshold && onSwipeRight) {
      haptic.success();
      onSwipeRight();
    } else if (offset <= -threshold && onSwipeLeft) {
      haptic.medium();
      onSwipeLeft();
    }

    // Animate back to center
    setOffset(0);
  }, [isDragging, offset, threshold, onSwipeLeft, onSwipeRight]);

  const swipeDirection = offset >= threshold ? 'right' : offset <= -threshold ? 'left' : null;
  const swipeProgress = Math.min(Math.abs(offset) / threshold, 1);

  return {
    elementRef,
    offset,
    isDragging,
    swipeDirection,
    swipeProgress,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    }
  };
};
