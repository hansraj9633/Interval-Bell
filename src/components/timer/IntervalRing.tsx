import React from 'react';
import {computeReminderSchedule, formatDurationHMS} from '../../utils/time';

interface IntervalRingProps {
  durationSec: number;
  intervalSec: number;
  activeElapsedMs: number;
  statusLabel: string;
  nextReminderLabel: string;
  isAlertActive: boolean;
}

export const IntervalRing: React.FC<IntervalRingProps> = ({
  durationSec,
  intervalSec,
  activeElapsedMs,
  statusLabel,
  nextReminderLabel,
  isAlertActive,
}) => {
  const size = 280;
  const strokeWidth = 10;
  const center = size / 2;
  const radius = center - strokeWidth * 2;
  const circumference = 2 * Math.PI * radius;

  const totalMs = Math.max(1, durationSec * 1000);
  const progress = Math.max(0, Math.min(1, activeElapsedMs / totalMs));
  const strokeDashoffset = circumference * (1 - progress);
  const remainingSec = Math.max(0, Math.ceil((totalMs - activeElapsedMs) / 1000));

  const schedule = computeReminderSchedule(durationSec, intervalSec);

  return (
    <div className="relative flex flex-col items-center justify-center w-64 h-64 sm:w-72 sm:h-72 max-w-full">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="w-full h-full"
        role="img"
        aria-label={`Session countdown ${formatDurationHMS(remainingSec)} remaining`}
      >
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-[#E4E4DD] dark:text-[#2B322B]"
        />

        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${center} ${center})`}
          className={`transition-[stroke-dashoffset] duration-200 ease-out ${
            isAlertActive
              ? 'text-[#B45309] dark:text-[#F59E0B]'
              : 'text-[#2D5A3C] dark:text-[#6BA37C]'
          }`}
        />

        {/* Interval notch markers along the ring */}
        {schedule.length <= 24 &&
          schedule.map((offsetSec, idx) => {
            const angle = (offsetSec / durationSec) * 2 * Math.PI - Math.PI / 2;
            const innerR = radius - 9;
            const outerR = radius + 9;
            const x1 = center + innerR * Math.cos(angle);
            const y1 = center + innerR * Math.sin(angle);
            const x2 = center + outerR * Math.cos(angle);
            const y2 = center + outerR * Math.sin(angle);
            const passed = activeElapsedMs >= offsetSec * 1000;
            return (
              <line
                key={idx}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                strokeWidth={2}
                strokeLinecap="round"
                className={
                  passed
                    ? 'stroke-[#2D5A3C] dark:stroke-[#6BA37C]'
                    : 'stroke-[#C9CBC2] dark:stroke-[#3D463D]'
                }
              />
            );
          })}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
        <span className="text-xs font-medium text-[#565E55] dark:text-[#9CA69B]">
          {statusLabel}
        </span>
        <span className="mt-1 font-mono tabular-nums text-3xl sm:text-4xl font-semibold tracking-tight text-[#181C18] dark:text-[#F2F4F0]">
          {formatDurationHMS(remainingSec)}
        </span>
        <span className="mt-2 text-[11px] sm:text-xs font-mono tabular-nums text-[#565E55] dark:text-[#9CA69B] max-w-[180px] truncate">
          {nextReminderLabel}
        </span>
      </div>
    </div>
  );
};
