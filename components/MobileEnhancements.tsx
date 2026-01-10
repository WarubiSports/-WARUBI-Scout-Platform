import React from 'react';
import { WifiOff, Wifi, RefreshCw, Loader2 } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useMobileFeatures';

// Offline/Online indicator banner
export const ConnectionStatus: React.FC = () => {
  const { isOnline, wasOffline } = useOnlineStatus();

  if (isOnline && !wasOffline) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[200] transition-all duration-300 ${
        isOnline ? 'bg-emerald-500' : 'bg-red-500'
      }`}
    >
      <div className="flex items-center justify-center gap-2 py-2 px-4 text-white text-xs font-bold">
        {isOnline ? (
          <>
            <Wifi size={14} />
            <span>Back online</span>
          </>
        ) : (
          <>
            <WifiOff size={14} className="animate-pulse" />
            <span>No internet connection</span>
          </>
        )}
      </div>
    </div>
  );
};

// Pull-to-refresh indicator
interface PullIndicatorProps {
  pullProgress: number;
  isRefreshing: boolean;
  pullDistance: number;
}

export const PullIndicator: React.FC<PullIndicatorProps> = ({
  pullProgress,
  isRefreshing,
  pullDistance
}) => {
  if (pullDistance === 0 && !isRefreshing) return null;

  return (
    <div
      className="absolute left-0 right-0 flex justify-center pointer-events-none transition-transform"
      style={{
        top: -40,
        transform: `translateY(${Math.min(pullDistance, 80)}px)`
      }}
    >
      <div
        className={`w-10 h-10 rounded-full bg-scout-800 border border-scout-700 flex items-center justify-center shadow-lg transition-all ${
          pullProgress >= 1 ? 'bg-scout-accent border-scout-accent' : ''
        }`}
      >
        {isRefreshing ? (
          <Loader2 size={20} className="text-scout-accent animate-spin" />
        ) : (
          <RefreshCw
            size={20}
            className={`transition-all ${
              pullProgress >= 1 ? 'text-scout-900' : 'text-gray-400'
            }`}
            style={{
              transform: `rotate(${pullProgress * 180}deg)`
            }}
          />
        )}
      </div>
    </div>
  );
};

// Swipeable card wrapper
interface SwipeableCardProps {
  children: React.ReactNode;
  offset: number;
  isDragging: boolean;
  swipeDirection: 'left' | 'right' | null;
  swipeProgress: number;
  leftLabel?: string;
  rightLabel?: string;
  leftColor?: string;
  rightColor?: string;
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  offset,
  isDragging,
  swipeDirection,
  swipeProgress,
  leftLabel = 'Archive',
  rightLabel = 'Promote',
  leftColor = 'bg-gray-600',
  rightColor = 'bg-scout-accent',
  handlers
}) => {
  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Background actions */}
      <div className="absolute inset-0 flex">
        {/* Left action (shown when swiping right) */}
        <div
          className={`flex-1 ${rightColor} flex items-center justify-start pl-6 transition-opacity`}
          style={{ opacity: offset > 0 ? swipeProgress : 0 }}
        >
          <span className="text-white font-black text-xs uppercase tracking-wider">
            {rightLabel}
          </span>
        </div>
        {/* Right action (shown when swiping left) */}
        <div
          className={`flex-1 ${leftColor} flex items-center justify-end pr-6 transition-opacity`}
          style={{ opacity: offset < 0 ? swipeProgress : 0 }}
        >
          <span className="text-white font-black text-xs uppercase tracking-wider">
            {leftLabel}
          </span>
        </div>
      </div>

      {/* Card content */}
      <div
        className={`relative bg-scout-800 transition-transform ${
          isDragging ? '' : 'duration-300'
        }`}
        style={{ transform: `translateX(${offset}px)` }}
        {...handlers}
      >
        {children}
      </div>
    </div>
  );
};

// Touch feedback wrapper - adds visual feedback on touch
interface TouchFeedbackProps {
  children: React.ReactNode;
  onPress?: () => void;
  className?: string;
  disabled?: boolean;
}

export const TouchFeedback: React.FC<TouchFeedbackProps> = ({
  children,
  onPress,
  className = '',
  disabled = false
}) => {
  const [isPressed, setIsPressed] = React.useState(false);

  return (
    <div
      className={`${className} transition-all duration-100 ${
        isPressed && !disabled ? 'scale-[0.97] opacity-80' : ''
      } ${disabled ? 'opacity-50' : ''}`}
      onTouchStart={() => !disabled && setIsPressed(true)}
      onTouchEnd={() => {
        setIsPressed(false);
        if (!disabled && onPress) onPress();
      }}
      onTouchCancel={() => setIsPressed(false)}
    >
      {children}
    </div>
  );
};
