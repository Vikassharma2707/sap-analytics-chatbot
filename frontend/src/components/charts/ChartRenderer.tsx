'use client';

import React, { useRef, useEffect } from 'react';
import type { EChartsOption } from '@/types';

interface Props {
  option: EChartsOption;
  height?: number;
  className?: string;
}

export function ChartRenderer({ option, height = 300, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<unknown>(null);

  useEffect(() => {
    if (!ref.current) return;

    const initChart = async () => {
      const echarts = await import('echarts');
      const existing = echarts.getInstanceByDom(ref.current!);
      if (existing) existing.dispose();

      const chart = echarts.init(ref.current!, 'dark');
      chartRef.current = chart;

      const themedOption = {
        backgroundColor: 'transparent',
        ...option,
      };

      chart.setOption(themedOption);
    };

    initChart();

    const handleResize = () => {
      if (chartRef.current) {
        (chartRef.current as { resize: () => void }).resize();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        (chartRef.current as { dispose: () => void }).dispose();
      }
    };
  }, [option]);

  return (
    <div
      ref={ref}
      style={{ height: `${height}px`, width: '100%' }}
      className={className}
    />
  );
}
