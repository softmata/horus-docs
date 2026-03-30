'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  Cell,
} from 'recharts';

// Theme-aware colors - these are the actual color values
// HORUS branding colors (consistent across themes)
const BRAND_COLORS = {
  horus: '#22c55e',      // Green - HORUS
  horusLink: '#10b981',  // Emerald - HORUS Link
  horusHub: '#22c55e',   // Green - HORUS Hub
  ros2: '#ef4444',       // Red - ROS2
  accent: '#06b6d4',     // Cyan accent
};

// Hook to get current theme
function useTheme() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute('data-theme');
      if (theme) {
        setIsDark(theme === 'dark');
      } else {
        // Check system preference
        setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
      }
    };

    checkTheme();

    // Watch for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    // Also watch for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkTheme);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', checkTheme);
    };
  }, []);

  return isDark;
}

// Get theme-aware colors
function useColors() {
  const isDark = useTheme();

  return {
    ...BRAND_COLORS,
    // Theme-adaptive colors
    grid: isDark ? '#374151' : '#d1d5db',
    text: isDark ? '#9ca3af' : '#6b7280',
    textBold: isDark ? '#f5f5f5' : '#1a1a1a',
    background: isDark ? '#1f2937' : '#f3f4f6',
    surface: isDark ? 'rgba(17, 24, 39, 0.5)' : 'rgba(243, 244, 246, 0.8)',
    cardBg: isDark ? 'rgba(31, 41, 55, 0.5)' : 'rgba(229, 231, 235, 0.5)',
    border: isDark ? '#374151' : '#d1d5db',
    tooltipBg: isDark ? '#1f2937' : '#ffffff',
    tooltipBorder: isDark ? '#374151' : '#e5e7eb',
  };
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label, colors }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="rounded-lg p-3 shadow-lg"
        style={{
          backgroundColor: colors.tooltipBg,
          border: `1px solid ${colors.border}`
        }}
      >
        <p className="font-medium mb-2" style={{ color: colors.textBold }}>{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.name}: <span className="font-mono font-bold">{entry.value}</span>
            {entry.payload.unit && ` ${entry.payload.unit}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

/**
 * Bar chart comparing HORUS vs ROS2 latency
 */
export function LatencyComparisonChart() {
  const colors = useColors();

  const data = [
    {
      name: 'CmdVel\n(16B)',
      'HORUS Link': 0.087,
      'HORUS Hub': 0.313,
      'ROS2 DDS': 75,
      unit: 'μs',
    },
    {
      name: 'IMU\n(304B)',
      'HORUS Link': 0.16,
      'HORUS Hub': 0.5,
      'ROS2 DDS': 115,
      unit: 'μs',
    },
    {
      name: 'LaserScan\n(1.5KB)',
      'HORUS Link': 0.4,
      'HORUS Hub': 2.2,
      'ROS2 DDS': 225,
      unit: 'μs',
    },
    {
      name: 'PointCloud\n(120KB)',
      'HORUS Link': 120,
      'HORUS Hub': 360,
      'ROS2 DDS': 750,
      unit: 'μs',
    },
  ];

  return (
    <div
      className="w-full rounded-xl p-6 my-6"
      style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
    >
      <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textBold }}>
        Latency Comparison: HORUS vs ROS2
      </h3>
      <p className="text-sm mb-4" style={{ color: colors.text }}>
        Lower is better. Logarithmic scale (send-only latency in μs)
      </p>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis
            dataKey="name"
            stroke={colors.text}
            tick={{ fill: colors.text, fontSize: 11 }}
            interval={0}
            angle={0}
            textAnchor="middle"
            height={60}
          />
          <YAxis
            stroke={colors.text}
            tick={{ fill: colors.text }}
            scale="log"
            domain={[0.05, 1000]}
            tickFormatter={(value) => value < 1 ? `${(value * 1000).toFixed(0)}ns` : `${value}μs`}
            label={{ value: 'Latency (log scale)', angle: -90, position: 'insideLeft', fill: colors.text }}
          />
          <Tooltip content={<CustomTooltip colors={colors} />} />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            formatter={(value: any) => <span style={{ color: colors.text }}>{value}</span>}
          />
          <Bar dataKey="HORUS Link" fill={colors.horusLink} radius={[4, 4, 0, 0]} />
          <Bar dataKey="HORUS Hub" fill={colors.horusHub} radius={[4, 4, 0, 0]} />
          <Bar dataKey="ROS2 DDS" fill={colors.ros2} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 flex flex-wrap justify-center gap-4 md:gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.horusLink }}></div>
          <span style={{ color: colors.text }}>HORUS Link (SPSC, wait-free)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.horusHub }}></div>
          <span style={{ color: colors.text }}>HORUS Hub (MPMC, lock-free)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.ros2 }}></div>
          <span style={{ color: colors.text }}>ROS2 DDS (typical)</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Line chart showing message size vs latency (linear scaling)
 */
export function LatencyScalingChart() {
  const colors = useColors();

  const data = [
    { size: 16, sizeLabel: '16B', horusLink: 87, horusHub: 313, ros2: 75000 },
    { size: 104, sizeLabel: '104B', horusLink: 350, horusHub: 600, ros2: 80000 },
    { size: 304, sizeLabel: '304B', horusLink: 400, horusHub: 940, ros2: 115000 },
    { size: 736, sizeLabel: '736B', horusLink: 600, horusHub: 1100, ros2: 150000 },
    { size: 1480, sizeLabel: '1.5KB', horusLink: 900, horusHub: 2200, ros2: 225000 },
    { size: 12000, sizeLabel: '12KB', horusLink: 7550, horusHub: 12000, ros2: 400000 },
    { size: 120000, sizeLabel: '120KB', horusLink: 120000, horusHub: 360000, ros2: 750000 },
  ];

  return (
    <div
      className="w-full rounded-xl p-6 my-6"
      style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
    >
      <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textBold }}>
        Latency vs Message Size
      </h3>
      <p className="text-sm mb-4" style={{ color: colors.text }}>
        HORUS shows linear scaling. Values in nanoseconds.
      </p>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis
            dataKey="sizeLabel"
            stroke={colors.text}
            tick={{ fill: colors.text }}
            label={{ value: 'Message Size', position: 'bottom', fill: colors.text, offset: 0 }}
          />
          <YAxis
            stroke={colors.text}
            tick={{ fill: colors.text }}
            scale="log"
            domain={[50, 1000000]}
            tickFormatter={(value) => {
              if (value >= 1000000) return `${(value/1000000).toFixed(0)}ms`;
              if (value >= 1000) return `${(value/1000).toFixed(0)}μs`;
              return `${value}ns`;
            }}
            label={{ value: 'Latency (log scale)', angle: -90, position: 'insideLeft', fill: colors.text }}
          />
          <Tooltip
            formatter={(value: any) => {
              if (value === undefined || value === null) return ['', ''];
              if (value >= 1000000) return [`${(value/1000000).toFixed(2)}ms`, ''];
              if (value >= 1000) return [`${(value/1000).toFixed(2)}μs`, ''];
              return [`${value}ns`, ''];
            }}
            contentStyle={{ backgroundColor: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, borderRadius: '8px' }}
            labelStyle={{ color: colors.text }}
          />
          <Legend
            formatter={(value: any) => <span style={{ color: colors.text }}>{value}</span>}
          />
          <Line
            type="monotone"
            dataKey="horusLink"
            stroke={colors.horusLink}
            strokeWidth={3}
            dot={{ fill: colors.horusLink, strokeWidth: 2, r: 5 }}
            name="HORUS Link"
          />
          <Line
            type="monotone"
            dataKey="horusHub"
            stroke={colors.horusHub}
            strokeWidth={3}
            dot={{ fill: colors.horusHub, strokeWidth: 2, r: 5 }}
            name="HORUS Hub"
          />
          <Line
            type="monotone"
            dataKey="ros2"
            stroke={colors.ros2}
            strokeWidth={3}
            dot={{ fill: colors.ros2, strokeWidth: 2, r: 5 }}
            name="ROS2 DDS"
            strokeDasharray="5 5"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Line chart showing node count vs execution time (scalability)
 */
export function ScalabilityChart() {
  const colors = useColors();

  const data = [
    { nodes: 10, time: 106.93, label: '10 nodes' },
    { nodes: 50, time: 113.93, label: '50 nodes' },
    { nodes: 100, time: 116.49, label: '100 nodes' },
    { nodes: 200, time: 119.55, label: '200 nodes' },
  ];

  // Calculate theoretical linear scaling for reference
  const linearData = data.map(d => ({
    ...d,
    linear: 106.93 * (d.nodes / 10), // What it would be with linear (bad) scaling
  }));

  return (
    <div
      className="w-full rounded-xl p-6 my-6"
      style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
    >
      <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textBold }}>
        Scheduler Scalability
      </h3>
      <p className="text-sm mb-4" style={{ color: colors.text }}>
        Near-constant execution time regardless of node count
      </p>
      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={linearData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <defs>
            <linearGradient id="colorHorus" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.horus} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={colors.horus} stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorLinear" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.ros2} stopOpacity={0.1}/>
              <stop offset="95%" stopColor={colors.ros2} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis
            dataKey="nodes"
            stroke={colors.text}
            tick={{ fill: colors.text }}
            label={{ value: 'Number of Nodes', position: 'bottom', fill: colors.text, offset: 0 }}
          />
          <YAxis
            stroke={colors.text}
            tick={{ fill: colors.text }}
            domain={[0, 2500]}
            tickFormatter={(value) => `${value}ms`}
            label={{ value: 'Execution Time', angle: -90, position: 'insideLeft', fill: colors.text }}
          />
          <Tooltip
            formatter={(value: any, name: any) => [
              value !== undefined && value !== null ? `${value.toFixed(2)}ms` : '',
              name === 'linear' ? 'Linear Scaling (bad)' : 'HORUS Actual'
            ]}
            contentStyle={{ backgroundColor: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, borderRadius: '8px' }}
            labelStyle={{ color: colors.text }}
            labelFormatter={(label: any) => `${label} nodes`}
          />
          <Legend
            formatter={(value: any) => (
              <span style={{ color: colors.text }}>
                {value === 'linear' ? 'Linear Scaling (what to avoid)' : 'HORUS Actual'}
              </span>
            )}
          />
          <Area
            type="monotone"
            dataKey="linear"
            stroke={colors.ros2}
            strokeWidth={2}
            strokeDasharray="5 5"
            fillOpacity={1}
            fill="url(#colorLinear)"
            name="linear"
          />
          <Area
            type="monotone"
            dataKey="time"
            stroke={colors.horus}
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorHorus)"
            name="HORUS"
            dot={{ fill: colors.horus, strokeWidth: 2, r: 6 }}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        {data.map((d) => (
          <div
            key={d.nodes}
            className="rounded-lg p-3"
            style={{ backgroundColor: colors.cardBg }}
          >
            <div className="text-2xl font-bold" style={{ color: colors.horus }}>{d.time.toFixed(1)}ms</div>
            <div className="text-sm" style={{ color: colors.text }}>{d.nodes} nodes</div>
            <div className="text-xs mt-1" style={{ color: colors.text }}>
              {d.nodes > 10 ? `${((d.time / 106.93 - 1) * 100).toFixed(1)}% overhead` : 'baseline'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Speedup comparison chart - shows how much faster HORUS is
 */
export function SpeedupChart() {
  const colors = useColors();

  const data = [
    { name: 'CmdVel', speedup: 575, category: 'Control' },
    { name: 'IMU', speedup: 940, category: 'Sensor' },
    { name: 'LaserScan', speedup: 750, category: 'Perception' },
    { name: 'Odometry', speedup: 167, category: 'Localization' },
    { name: 'PointCloud', speedup: 8, category: 'Vision' },
  ];

  return (
    <div
      className="w-full rounded-xl p-6 my-6"
      style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
    >
      <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textBold }}>
        HORUS Speedup vs ROS2
      </h3>
      <p className="text-sm mb-4" style={{ color: colors.text }}>
        How many times faster HORUS Link is compared to ROS2 DDS
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ top: 20, right: 80, left: 80, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} horizontal={true} vertical={false} />
          <XAxis
            type="number"
            stroke={colors.text}
            tick={{ fill: colors.text }}
            tickFormatter={(value) => `${value}x`}
            domain={[0, 1000]}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke={colors.text}
            tick={{ fill: colors.text }}
            width={80}
          />
          <Tooltip
            formatter={(value: any) => [`${value}x faster`, 'Speedup']}
            contentStyle={{ backgroundColor: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, borderRadius: '8px' }}
            labelStyle={{ color: colors.text }}
          />
          <Bar dataKey="speedup" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.speedup > 500 ? colors.horus : entry.speedup > 100 ? colors.horusLink : colors.accent}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 flex flex-wrap justify-center gap-4 md:gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.horus }}></div>
          <span style={{ color: colors.text }}>&gt;500x faster</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.horusLink }}></div>
          <span style={{ color: colors.text }}>100-500x faster</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.accent }}></div>
          <span style={{ color: colors.text }}>&lt;100x faster</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Throughput comparison chart
 */
export function ThroughputChart() {
  const colors = useColors();

  const data = [
    { name: 'Small\n(16B)', horusLink: 12, horusHub: 3, ros2: 0.02 },
    { name: 'Medium\n(1KB)', horusLink: 3, horusHub: 1.5, ros2: 0.01 },
    { name: 'Large\n(100KB)', horusLink: 0.5, horusHub: 0.1, ros2: 0.002 },
  ];

  return (
    <div
      className="w-full rounded-xl p-6 my-6"
      style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
    >
      <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textBold }}>
        Throughput Comparison
      </h3>
      <p className="text-sm mb-4" style={{ color: colors.text }}>
        Messages per second (millions). Higher is better.
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis
            dataKey="name"
            stroke={colors.text}
            tick={{ fill: colors.text, fontSize: 11 }}
            interval={0}
          />
          <YAxis
            stroke={colors.text}
            tick={{ fill: colors.text }}
            scale="log"
            domain={[0.001, 20]}
            tickFormatter={(value) => `${value}M`}
            label={{ value: 'Messages/sec (millions, log)', angle: -90, position: 'insideLeft', fill: colors.text }}
          />
          <Tooltip
            formatter={(value: any) => [`${value}M msg/s`, '']}
            contentStyle={{ backgroundColor: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, borderRadius: '8px' }}
            labelStyle={{ color: colors.text }}
          />
          <Legend
            formatter={(value: any) => <span style={{ color: colors.text }}>{value}</span>}
          />
          <Bar dataKey="horusLink" fill={colors.horusLink} radius={[4, 4, 0, 0]} name="HORUS Link" />
          <Bar dataKey="horusHub" fill={colors.horusHub} radius={[4, 4, 0, 0]} name="HORUS Hub" />
          <Bar dataKey="ros2" fill={colors.ros2} radius={[4, 4, 0, 0]} name="ROS2 DDS" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Real-time performance chart showing jitter and deadline accuracy
 */
export function RealTimeChart() {
  const colors = useColors();

  const data = [
    { name: 'RT Critical\n1000 Hz', target: 1000, achieved: 999.8, jitter: 10, misses: 0 },
    { name: 'RT High\n500 Hz', target: 500, achieved: 499.9, jitter: 15, misses: 0 },
    { name: 'Normal\n100 Hz', target: 100, achieved: 99.9, jitter: 50, misses: 0.1 },
    { name: 'Background\n10 Hz', target: 10, achieved: 10, jitter: 200, misses: 0.5 },
  ];

  return (
    <div
      className="w-full rounded-xl p-6 my-6"
      style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
    >
      <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textBold }}>
        Real-Time Node Performance
      </h3>
      <p className="text-sm mb-4" style={{ color: colors.text }}>
        Target rate achievement and jitter measurements
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {data.map((d) => (
          <div
            key={d.name}
            className="rounded-lg p-4 text-center"
            style={{ backgroundColor: colors.cardBg }}
          >
            <div className="text-xs mb-1 whitespace-pre-line" style={{ color: colors.text }}>{d.name}</div>
            <div className="text-2xl font-bold" style={{ color: colors.horus }}>
              {((d.achieved / d.target) * 100).toFixed(1)}%
            </div>
            <div className="text-xs" style={{ color: colors.text }}>rate achieved</div>
            <div className="mt-2 text-sm">
              <span style={{ color: colors.accent }}>±{d.jitter}μs</span>
              <span style={{ color: colors.text }}> jitter</span>
            </div>
            <div className="text-xs" style={{ color: colors.text }}>
              {d.misses}% deadline misses
            </div>
          </div>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis
            dataKey="name"
            stroke={colors.text}
            tick={{ fill: colors.text, fontSize: 10 }}
            interval={0}
          />
          <YAxis
            stroke={colors.text}
            tick={{ fill: colors.text }}
            domain={[0, 250]}
            tickFormatter={(value) => `${value}μs`}
            label={{ value: 'Jitter', angle: -90, position: 'insideLeft', fill: colors.text }}
          />
          <Tooltip
            formatter={(value: any) => [`±${value}μs`, 'Jitter']}
            contentStyle={{ backgroundColor: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, borderRadius: '8px' }}
            labelStyle={{ color: colors.text }}
          />
          <Bar dataKey="jitter" fill={colors.accent} radius={[4, 4, 0, 0]} name="Jitter" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Python vs Alternatives comparison chart
 */
export function PythonComparisonChart() {
  const colors = useColors();

  const data = [
    { name: 'HORUS\nPython', latency: 8, color: colors.horus },
    { name: 'ZeroMQ\n(Python)', latency: 75, color: colors.accent },
    { name: 'MP Queue', latency: 150, color: '#f59e0b' },
    { name: 'Redis\npub/sub', latency: 350, color: colors.ros2 },
    { name: 'ROS2\nrclpy', latency: 300, color: '#8b5cf6' },
  ];

  return (
    <div
      className="w-full rounded-xl p-6 my-6"
      style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
    >
      <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textBold }}>
        Python IPC Latency Comparison
      </h3>
      <p className="text-sm mb-4" style={{ color: colors.text }}>
        Average send latency in microseconds. Lower is better.
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis
            dataKey="name"
            stroke={colors.text}
            tick={{ fill: colors.text, fontSize: 11 }}
            interval={0}
            angle={0}
            textAnchor="middle"
            height={60}
          />
          <YAxis
            stroke={colors.text}
            tick={{ fill: colors.text }}
            domain={[0, 400]}
            tickFormatter={(value) => `${value}μs`}
            label={{ value: 'Latency (μs)', angle: -90, position: 'insideLeft', fill: colors.text }}
          />
          <Tooltip
            formatter={(value: any) => [`${value} μs`, 'Latency']}
            contentStyle={{ backgroundColor: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, borderRadius: '8px' }}
            labelStyle={{ color: colors.text }}
          />
          <Bar dataKey="latency" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 text-center text-sm" style={{ color: colors.text }}>
        HORUS Python is <span style={{ color: colors.horus, fontWeight: 'bold' }}>10-40x faster</span> than traditional Python IPC
      </div>
    </div>
  );
}

/**
 * Python throughput by message size chart
 */
export function PythonThroughputChart() {
  const colors = useColors();

  const data = [
    { name: 'CmdVel\n(16B)', throughput: 160, size: 16 },
    { name: 'Pose2D\n(24B)', throughput: 150, size: 24 },
    { name: 'IMU\n(304B)', throughput: 100, size: 304 },
    { name: 'Odometry\n(736B)', throughput: 70, size: 736 },
    { name: 'LaserScan\n(1.5KB)', throughput: 45, size: 1480 },
  ];

  return (
    <div
      className="w-full rounded-xl p-6 my-6"
      style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
    >
      <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textBold }}>
        Python Throughput by Message Size
      </h3>
      <p className="text-sm mb-4" style={{ color: colors.text }}>
        Thousands of messages per second. Higher is better.
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis
            dataKey="name"
            stroke={colors.text}
            tick={{ fill: colors.text, fontSize: 11 }}
            interval={0}
          />
          <YAxis
            stroke={colors.text}
            tick={{ fill: colors.text }}
            domain={[0, 200]}
            tickFormatter={(value) => `${value}K`}
            label={{ value: 'Throughput (K msg/s)', angle: -90, position: 'insideLeft', fill: colors.text }}
          />
          <Tooltip
            formatter={(value: any) => [`${value}K msg/s`, 'Throughput']}
            contentStyle={{ backgroundColor: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, borderRadius: '8px' }}
            labelStyle={{ color: colors.text }}
          />
          <Bar dataKey="throughput" fill={colors.horus} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 grid grid-cols-5 gap-2 text-center">
        {data.map((d) => (
          <div key={d.name} className="text-xs" style={{ color: colors.text }}>
            <div className="font-bold" style={{ color: colors.horus }}>{d.throughput}K/s</div>
            <div>{d.size < 1000 ? `${d.size}B` : `${(d.size/1024).toFixed(1)}KB`}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Python stress test results chart
 */
export function PythonStressChart() {
  const colors = useColors();

  const data = [
    { name: 'Single\nThread', throughput: 180, threads: 1 },
    { name: '2\nThreads', throughput: 320, threads: 2 },
    { name: '4\nThreads', throughput: 550, threads: 4 },
    { name: '8\nThreads', throughput: 750, threads: 8 },
    { name: 'Burst\n(10x10K)', throughput: 200, threads: 1 },
    { name: 'Mixed\nTypes', throughput: 140, threads: 1 },
  ];

  return (
    <div
      className="w-full rounded-xl p-6 my-6"
      style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
    >
      <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textBold }}>
        Python Stress Test Results
      </h3>
      <p className="text-sm mb-4" style={{ color: colors.text }}>
        Throughput under various stress conditions (K msg/s)
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis
            dataKey="name"
            stroke={colors.text}
            tick={{ fill: colors.text, fontSize: 10 }}
            interval={0}
          />
          <YAxis
            stroke={colors.text}
            tick={{ fill: colors.text }}
            domain={[0, 800]}
            tickFormatter={(value) => `${value}K`}
            label={{ value: 'Throughput (K msg/s)', angle: -90, position: 'insideLeft', fill: colors.text }}
          />
          <Tooltip
            formatter={(value: any) => [`${value}K msg/s`, 'Throughput']}
            contentStyle={{ backgroundColor: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, borderRadius: '8px' }}
            labelStyle={{ color: colors.text }}
          />
          <Bar dataKey="throughput" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.threads > 1 ? colors.horusLink : colors.horus}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.horus }}></div>
          <span style={{ color: colors.text }}>Single-threaded</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.horusLink }}></div>
          <span style={{ color: colors.text }}>Multi-threaded</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Python vs Rust performance comparison
 */
export function PythonRustComparisonChart() {
  const colors = useColors();

  const data = [
    { name: 'CmdVel', rust: 0.5, python: 8, ratio: 16 },
    { name: 'IMU', rust: 0.94, python: 12, ratio: 12.8 },
    { name: 'Odometry', rust: 1.1, python: 15, ratio: 13.6 },
    { name: 'LaserScan', rust: 2.2, python: 25, ratio: 11.4 },
  ];

  return (
    <div
      className="w-full rounded-xl p-6 my-6"
      style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
    >
      <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textBold }}>
        Python vs Rust HORUS Performance
      </h3>
      <p className="text-sm mb-4" style={{ color: colors.text }}>
        Latency comparison in microseconds. Both use the same shared memory backend.
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis
            dataKey="name"
            stroke={colors.text}
            tick={{ fill: colors.text }}
          />
          <YAxis
            stroke={colors.text}
            tick={{ fill: colors.text }}
            domain={[0, 30]}
            tickFormatter={(value) => `${value}μs`}
            label={{ value: 'Latency (μs)', angle: -90, position: 'insideLeft', fill: colors.text }}
          />
          <Tooltip
            formatter={(value: any, name: any) => [`${value}μs`, name === 'rust' ? 'Rust HORUS' : 'Python HORUS']}
            contentStyle={{ backgroundColor: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, borderRadius: '8px' }}
            labelStyle={{ color: colors.text }}
          />
          <Legend
            formatter={(value: any) => (
              <span style={{ color: colors.text }}>
                {value === 'rust' ? 'Rust HORUS' : 'Python HORUS'}
              </span>
            )}
          />
          <Bar dataKey="rust" fill={colors.horusLink} radius={[4, 4, 0, 0]} name="rust" />
          <Bar dataKey="python" fill={colors.horus} radius={[4, 4, 0, 0]} name="python" />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 text-center text-sm" style={{ color: colors.text }}>
        Python adds ~10-15x overhead over Rust, but still <span style={{ color: colors.horus, fontWeight: 'bold' }}>10-100x faster</span> than alternatives
      </div>
    </div>
  );
}

/**
 * TransformFrame vs TF2 Latency Comparison Chart
 */
export function TransformFrameLatencyChart() {
  const colors = useColors();

  const data = [
    { name: 'Lookup\nby ID', transform_frame: 50, tf2: null, unit: 'ns' },
    { name: 'Lookup\nby Name', transform_frame: 200, tf2: 2000, unit: 'ns' },
    { name: 'Chain\n(depth 3)', transform_frame: 150, tf2: 5000, unit: 'ns' },
    { name: 'Chain\n(depth 10)', transform_frame: 2500, tf2: 15000, unit: 'ns' },
    { name: 'Update', transform_frame: 500, tf2: 1000, unit: 'ns' },
  ];

  return (
    <div
      className="w-full rounded-xl p-6 my-6"
      style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
    >
      <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textBold }}>
        TransformFrame vs ROS2 TF2 Latency
      </h3>
      <p className="text-sm mb-4" style={{ color: colors.text }}>
        Lower is better. Logarithmic scale (nanoseconds)
      </p>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis
            dataKey="name"
            stroke={colors.text}
            tick={{ fill: colors.text, fontSize: 11 }}
            interval={0}
          />
          <YAxis
            stroke={colors.text}
            tick={{ fill: colors.text }}
            scale="log"
            domain={[10, 20000]}
            tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(0)}μs` : `${value}ns`}
            label={{ value: 'Latency (log scale)', angle: -90, position: 'insideLeft', fill: colors.text }}
          />
          <Tooltip content={<CustomTooltip colors={colors} />} />
          <Legend
            formatter={(value: any) => <span style={{ color: colors.text }}>{value}</span>}
          />
          <Bar dataKey="transform_frame" fill={colors.horus} radius={[4, 4, 0, 0]} name="HORUS TransformFrame" />
          <Bar dataKey="tf2" fill={colors.ros2} radius={[4, 4, 0, 0]} name="ROS2 TF2" />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 flex flex-wrap justify-center gap-4 md:gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.horus }}></div>
          <span style={{ color: colors.text }}>HORUS TransformFrame (lock-free)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.ros2 }}></div>
          <span style={{ color: colors.text }}>ROS2 TF2 (mutex-based)</span>
        </div>
      </div>
    </div>
  );
}

/**
 * TransformFrame Speedup vs TF2 Chart
 */
export function TransformFrameSpeedupChart() {
  const colors = useColors();

  const data = [
    { name: 'Lookup by Name', speedup: 10, category: 'Query' },
    { name: 'Chain (depth 3)', speedup: 33, category: 'Query' },
    { name: 'Chain (depth 10)', speedup: 6, category: 'Query' },
    { name: 'Transform Update', speedup: 2, category: 'Write' },
    { name: 'Concurrent Reads', speedup: 100, category: 'Contention' },
  ];

  return (
    <div
      className="w-full rounded-xl p-6 my-6"
      style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
    >
      <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textBold }}>
        TransformFrame Speedup vs TF2
      </h3>
      <p className="text-sm mb-4" style={{ color: colors.text }}>
        How many times faster TransformFrame is compared to TF2
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ top: 20, right: 80, left: 120, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} horizontal={true} vertical={false} />
          <XAxis
            type="number"
            stroke={colors.text}
            tick={{ fill: colors.text }}
            tickFormatter={(value) => `${value}x`}
            domain={[0, 110]}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke={colors.text}
            tick={{ fill: colors.text }}
            width={110}
          />
          <Tooltip
            formatter={(value: any) => [`${value}x faster`, 'Speedup']}
            contentStyle={{ backgroundColor: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, borderRadius: '8px' }}
            labelStyle={{ color: colors.text }}
          />
          <Bar dataKey="speedup" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.speedup > 30 ? colors.horus : entry.speedup > 5 ? colors.horusLink : colors.accent}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 flex flex-wrap justify-center gap-4 md:gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.horus }}></div>
          <span style={{ color: colors.text }}>&gt;30x faster</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.horusLink }}></div>
          <span style={{ color: colors.text }}>5-30x faster</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.accent }}></div>
          <span style={{ color: colors.text }}>&lt;5x faster</span>
        </div>
      </div>
    </div>
  );
}

/**
 * TransformFrame Memory Configuration Chart
 */
export function TransformFrameMemoryChart() {
  const colors = useColors();

  const data = [
    { name: 'Small\n(256 frames)', memory: 550, frames: 256 },
    { name: 'Medium\n(1024 frames)', memory: 2200, frames: 1024 },
    { name: 'Large\n(4096 frames)', memory: 9000, frames: 4096 },
    { name: 'Max\n(65535 frames)', memory: 145000, frames: 65535 },
  ];

  return (
    <div
      className="w-full rounded-xl p-6 my-6"
      style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
    >
      <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textBold }}>
        TransformFrame Memory Usage
      </h3>
      <p className="text-sm mb-4" style={{ color: colors.text }}>
        Pre-allocated memory by configuration preset (KB)
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis
            dataKey="name"
            stroke={colors.text}
            tick={{ fill: colors.text, fontSize: 11 }}
            interval={0}
          />
          <YAxis
            stroke={colors.text}
            tick={{ fill: colors.text }}
            scale="log"
            domain={[100, 200000]}
            tickFormatter={(value) => value >= 1000 ? `${(value/1024).toFixed(0)}MB` : `${value}KB`}
            label={{ value: 'Memory (log scale)', angle: -90, position: 'insideLeft', fill: colors.text }}
          />
          <Tooltip
            formatter={(value: any) => [value >= 1000 ? `${(value/1024).toFixed(1)}MB` : `${value}KB`, 'Memory']}
            contentStyle={{ backgroundColor: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, borderRadius: '8px' }}
            labelStyle={{ color: colors.text }}
          />
          <Bar dataKey="memory" fill={colors.horus} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 grid grid-cols-4 gap-4 text-center">
        {data.map((d) => (
          <div
            key={d.name}
            className="rounded-lg p-3"
            style={{ backgroundColor: colors.cardBg }}
          >
            <div className="text-xl font-bold" style={{ color: colors.horus }}>
              {d.frames.toLocaleString()}
            </div>
            <div className="text-sm" style={{ color: colors.text }}>frames</div>
            <div className="text-xs mt-1" style={{ color: colors.text }}>
              {d.memory >= 1000 ? `${(d.memory/1024).toFixed(1)}MB` : `${d.memory}KB`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * TransformFrame Concurrent Performance Chart
 */
export function TransformFrameConcurrentChart() {
  const colors = useColors();

  const data = [
    { threads: 1, transform_frame: 500, tf2: 2000 },
    { threads: 2, transform_frame: 550, tf2: 3500 },
    { threads: 4, transform_frame: 800, tf2: 8000 },
    { threads: 8, transform_frame: 1100, tf2: 18000 },
    { threads: 16, transform_frame: 1400, tf2: 45000 },
  ];

  return (
    <div
      className="w-full rounded-xl p-6 my-6"
      style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
    >
      <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textBold }}>
        Concurrent Read Performance
      </h3>
      <p className="text-sm mb-4" style={{ color: colors.text }}>
        Latency under contention (ns). TransformFrame uses lock-free reads.
      </p>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis
            dataKey="threads"
            stroke={colors.text}
            tick={{ fill: colors.text }}
            label={{ value: 'Concurrent Readers', position: 'bottom', fill: colors.text, offset: 0 }}
          />
          <YAxis
            stroke={colors.text}
            tick={{ fill: colors.text }}
            scale="log"
            domain={[100, 100000]}
            tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(0)}μs` : `${value}ns`}
            label={{ value: 'Latency (log scale)', angle: -90, position: 'insideLeft', fill: colors.text }}
          />
          <Tooltip
            formatter={(value: any) => [value >= 1000 ? `${(value/1000).toFixed(2)}μs` : `${value}ns`, '']}
            contentStyle={{ backgroundColor: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, borderRadius: '8px' }}
            labelStyle={{ color: colors.text }}
            labelFormatter={(label: any) => `${label} threads`}
          />
          <Legend
            formatter={(value: any) => <span style={{ color: colors.text }}>{value}</span>}
          />
          <Line
            type="monotone"
            dataKey="transform_frame"
            stroke={colors.horus}
            strokeWidth={3}
            dot={{ fill: colors.horus, strokeWidth: 2, r: 5 }}
            name="HORUS TransformFrame"
          />
          <Line
            type="monotone"
            dataKey="tf2"
            stroke={colors.ros2}
            strokeWidth={3}
            dot={{ fill: colors.ros2, strokeWidth: 2, r: 5 }}
            name="ROS2 TF2"
            strokeDasharray="5 5"
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-4 text-center text-sm" style={{ color: colors.text }}>
        TransformFrame maintains <span style={{ color: colors.horus, fontWeight: 'bold' }}>near-constant latency</span> under contention due to lock-free design
      </div>
    </div>
  );
}

/**
 * IPC Backend Latency — All measured paths (p50)
 * Data: all_paths_latency benchmark, 100K iterations, RDTSC timing
 */
export function IPCBackendChart() {
  const colors = useColors();

  const data = [
    { name: 'DirectChannel\n(same thread)', p50: 12, p99: 13, category: 'intra' },
    { name: 'SpmcIntra\n(1:N thread)', p50: 80, p99: 92, category: 'intra' },
    { name: 'SpscIntra\n(1:1 thread)', p50: 91, p99: 107, category: 'intra' },
    { name: 'FanoutIntra\n(N:N thread)', p50: 150, p99: 307, category: 'intra' },
    { name: 'MpscIntra\n(N:1 thread)', p50: 187, p99: 372, category: 'intra' },
    { name: 'FanoutShm\n(xproc N:N)', p50: 91, p99: 230, category: 'shm' },
    { name: 'PodShm\n(broadcast)', p50: 152, p99: 227, category: 'shm' },
    { name: 'MpscShm\n(xproc N:1)', p50: 158, p99: 190, category: 'shm' },
    { name: 'SpscShm\n(xproc 1:1)', p50: 171, p99: 192, category: 'shm' },
  ];

  return (
    <div
      className="w-full rounded-xl p-6 my-6"
      style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
    >
      <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textBold }}>
        IPC Latency — All Backend Paths
      </h3>
      <p className="text-sm mb-4" style={{ color: colors.text }}>
        Measured p50 and p99 latency in nanoseconds. Lower is better.
      </p>
      <ResponsiveContainer width="100%" height={380}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis
            dataKey="name"
            stroke={colors.text}
            tick={{ fill: colors.text, fontSize: 10 }}
            interval={0}
            angle={0}
            textAnchor="middle"
            height={80}
          />
          <YAxis
            stroke={colors.text}
            tick={{ fill: colors.text }}
            domain={[0, 400]}
            tickFormatter={(value) => `${value}ns`}
            label={{ value: 'Latency (ns)', angle: -90, position: 'insideLeft', fill: colors.text }}
          />
          <Tooltip
            formatter={(value: any, name: any) => [`${value}ns`, name]}
            contentStyle={{ backgroundColor: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, borderRadius: '8px' }}
            labelStyle={{ color: colors.text }}
          />
          <Legend
            formatter={(value: any) => <span style={{ color: colors.text }}>{value}</span>}
          />
          <Bar dataKey="p50" fill={colors.horus} radius={[4, 4, 0, 0]} name="p50 (median)" />
          <Bar dataKey="p99" fill={colors.accent} radius={[4, 4, 0, 0]} name="p99" />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 flex flex-wrap justify-center gap-4 md:gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.horus }}></div>
          <span style={{ color: colors.text }}>Intra-process (no kernel)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.accent }}></div>
          <span style={{ color: colors.text }}>Cross-process (shared memory)</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Robotics message type performance
 * Data: robotics_messages_benchmark, 50K iterations, cross-thread
 */
export function MessagePerformanceChart() {
  const colors = useColors();

  const data = [
    { name: 'CmdVel\n(16B)', median: 89, p99: 91, throughput: 11.1 },
    { name: 'Imu\n(304B)', median: 119, p99: 150, throughput: 7.8 },
    { name: 'JointCommand\n(928B)', median: 128, p99: 157, throughput: 8.1 },
    { name: 'LaserScan\n(1.5KB)', median: 151, p99: 184, throughput: 6.3 },
  ];

  return (
    <div
      className="w-full rounded-xl p-6 my-6"
      style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
    >
      <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textBold }}>
        Robotics Message Latency
      </h3>
      <p className="text-sm mb-4" style={{ color: colors.text }}>
        Measured median and p99 latency for standard robotics messages
      </p>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis
            dataKey="name"
            stroke={colors.text}
            tick={{ fill: colors.text, fontSize: 11 }}
            interval={0}
          />
          <YAxis
            stroke={colors.text}
            tick={{ fill: colors.text }}
            domain={[0, 210]}
            tickFormatter={(value) => `${value}ns`}
            label={{ value: 'Latency (ns)', angle: -90, position: 'insideLeft', fill: colors.text }}
          />
          <Tooltip
            formatter={(value: any, name: any) => [`${value}${name === 'throughput' ? 'M msg/s' : 'ns'}`, name]}
            contentStyle={{ backgroundColor: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, borderRadius: '8px' }}
            labelStyle={{ color: colors.text }}
          />
          <Legend
            formatter={(value: any) => <span style={{ color: colors.text }}>{value}</span>}
          />
          <Bar dataKey="median" fill={colors.horus} radius={[4, 4, 0, 0]} name="Median" />
          <Bar dataKey="p99" fill={colors.accent} radius={[4, 4, 0, 0]} name="p99" />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        {data.map((d) => (
          <div
            key={d.name}
            className="rounded-lg p-3"
            style={{ backgroundColor: colors.cardBg }}
          >
            <div className="text-2xl font-bold" style={{ color: colors.horus }}>{d.throughput}M</div>
            <div className="text-sm" style={{ color: colors.text }}>msg/s</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * HORUS SHM vs Raw UDP comparison
 * Data: competitor_comparison benchmark, 5s sustained
 */
export function HorusVsUDPChart() {
  const colors = useColors();

  const data = [
    { name: 'HORUS SHM', size8: 23, size32: 23 },
    { name: 'Raw UDP', size8: 1235, size32: 1122 },
  ];

  return (
    <div
      className="w-full rounded-xl p-6 my-6"
      style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
    >
      <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textBold }}>
        HORUS vs Raw UDP
      </h3>
      <p className="text-sm mb-4" style={{ color: colors.text }}>
        p50 latency in nanoseconds — HORUS eliminates kernel network stack entirely
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis
            dataKey="name"
            stroke={colors.text}
            tick={{ fill: colors.text, fontSize: 12, fontWeight: 'bold' }}
          />
          <YAxis
            stroke={colors.text}
            tick={{ fill: colors.text }}
            domain={[0, 1400]}
            tickFormatter={(value) => `${value}ns`}
            label={{ value: 'Latency (ns)', angle: -90, position: 'insideLeft', fill: colors.text }}
          />
          <Tooltip
            formatter={(value: any, name: any) => [`${value}ns`, name === 'size8' ? '8B payload' : '32B payload']}
            contentStyle={{ backgroundColor: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, borderRadius: '8px' }}
            labelStyle={{ color: colors.text }}
          />
          <Legend
            formatter={(value: any) => <span style={{ color: colors.text }}>{value === 'size8' ? '8B payload' : '32B payload'}</span>}
          />
          <Bar dataKey="size8" fill={colors.horus} radius={[4, 4, 0, 0]} name="size8" />
          <Bar dataKey="size32" fill={colors.accent} radius={[4, 4, 0, 0]} name="size32" />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 text-center text-sm" style={{ color: colors.text }}>
        Speedup: <span style={{ color: colors.horus, fontWeight: 'bold' }}>54x</span> (8B)
        {' '}&bull;{' '}
        <span style={{ color: colors.horus, fontWeight: 'bold' }}>49x</span> (32B) over raw UDP
      </div>
    </div>
  );
}

/**
 * Thread scaling chart — replaces ASCII bar charts
 * Data: scalability_benchmark, sustained throughput
 */
export function ThreadScalingChart() {
  const colors = useColors();

  const producerData = [
    { count: 1, throughput: 3.0 },
    { count: 2, throughput: 8.7 },
    { count: 3, throughput: 11.5 },
    { count: 4, throughput: 11.9 },
    { count: 6, throughput: 13.5 },
    { count: 8, throughput: 11.5 },
  ];

  const consumerData = [
    { count: 1, throughput: 2.8 },
    { count: 2, throughput: 4.8 },
    { count: 4, throughput: 4.8 },
    { count: 8, throughput: 3.7 },
  ];

  return (
    <div
      className="w-full rounded-xl p-6 my-6"
      style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
    >
      <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textBold }}>
        Thread Scaling
      </h3>
      <p className="text-sm mb-4" style={{ color: colors.text }}>
        Throughput (M msg/s) with varying thread counts. Higher is better.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-semibold mb-2 text-center" style={{ color: colors.textBold }}>
            Producer Scaling (1 Consumer)
          </h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={producerData} margin={{ top: 10, right: 20, left: 10, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis
                dataKey="count"
                stroke={colors.text}
                tick={{ fill: colors.text }}
                label={{ value: 'Producers', position: 'bottom', fill: colors.text, offset: 0 }}
              />
              <YAxis
                stroke={colors.text}
                tick={{ fill: colors.text }}
                domain={[0, 16]}
                tickFormatter={(value) => `${value}M`}
              />
              <Tooltip
                formatter={(value: any) => [`${value}M msg/s`, 'Throughput']}
                contentStyle={{ backgroundColor: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, borderRadius: '8px' }}
                labelStyle={{ color: colors.text }}
                labelFormatter={(label: any) => `${label} producer${label > 1 ? 's' : ''}`}
              />
              <Bar dataKey="throughput" radius={[4, 4, 0, 0]}>
                {producerData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.throughput >= 13 ? colors.horus : colors.horusLink}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-center mt-1" style={{ color: colors.text }}>
            Peak at 6 producers (13.5M/s)
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-2 text-center" style={{ color: colors.textBold }}>
            Consumer Scaling (1 Producer)
          </h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={consumerData} margin={{ top: 10, right: 20, left: 10, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis
                dataKey="count"
                stroke={colors.text}
                tick={{ fill: colors.text }}
                label={{ value: 'Consumers', position: 'bottom', fill: colors.text, offset: 0 }}
              />
              <YAxis
                stroke={colors.text}
                tick={{ fill: colors.text }}
                domain={[0, 6]}
                tickFormatter={(value) => `${value}M`}
              />
              <Tooltip
                formatter={(value: any) => [`${value}M msg/s`, 'Throughput']}
                contentStyle={{ backgroundColor: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, borderRadius: '8px' }}
                labelStyle={{ color: colors.text }}
                labelFormatter={(label: any) => `${label} consumer${label > 1 ? 's' : ''}`}
              />
              <Bar dataKey="throughput" fill={colors.accent} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-center mt-1" style={{ color: colors.text }}>
            Plateaus at 2 (broadcast semantics)
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * RT Determinism — percentile distribution
 * Data: determinism_benchmark, 10 runs x 100K iterations, CPU-pinned
 */
export function DeterminismChart() {
  const colors = useColors();

  const data = [
    { name: 'Min', value: 61 },
    { name: 'p50', value: 86 },
    { name: 'p95', value: 102 },
    { name: 'p99', value: 109 },
    { name: 'p99.9', value: 112 },
    { name: 'p99.99', value: 112 },
    { name: 'Max', value: 112 },
  ];

  return (
    <div
      className="w-full rounded-xl p-6 my-6"
      style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
    >
      <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textBold }}>
        Latency Distribution
      </h3>
      <p className="text-sm mb-4" style={{ color: colors.text }}>
        Percentile latencies in nanoseconds — tight clustering indicates deterministic behavior
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <defs>
            <linearGradient id="colorDeterminism" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.horus} stopOpacity={0.4}/>
              <stop offset="95%" stopColor={colors.horus} stopOpacity={0.05}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis
            dataKey="name"
            stroke={colors.text}
            tick={{ fill: colors.text }}
          />
          <YAxis
            stroke={colors.text}
            tick={{ fill: colors.text }}
            domain={[0, 140]}
            tickFormatter={(value) => `${value}ns`}
            label={{ value: 'Latency (ns)', angle: -90, position: 'insideLeft', fill: colors.text }}
          />
          <Tooltip
            formatter={(value: any) => [`${value}ns`, 'Latency']}
            contentStyle={{ backgroundColor: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, borderRadius: '8px' }}
            labelStyle={{ color: colors.text }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={colors.horus}
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorDeterminism)"
            dot={{ fill: colors.horus, strokeWidth: 2, r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="mt-4 grid grid-cols-3 md:grid-cols-4 gap-3 text-center">
        <div className="rounded-lg p-3" style={{ backgroundColor: colors.cardBg }}>
          <div className="text-xl font-bold" style={{ color: colors.horus }}>7.9ns</div>
          <div className="text-xs" style={{ color: colors.text }}>std dev</div>
        </div>
        <div className="rounded-lg p-3" style={{ backgroundColor: colors.cardBg }}>
          <div className="text-xl font-bold" style={{ color: colors.horus }}>0.060</div>
          <div className="text-xs" style={{ color: colors.text }}>CV (run-to-run)</div>
        </div>
        <div className="rounded-lg p-3" style={{ backgroundColor: colors.cardBg }}>
          <div className="text-xl font-bold" style={{ color: colors.horus }}>26ns</div>
          <div className="text-xs" style={{ color: colors.text }}>max - median</div>
        </div>
        <div className="rounded-lg p-3" style={{ backgroundColor: colors.cardBg }}>
          <div className="text-xl font-bold" style={{ color: colors.accent }}>0.02%</div>
          <div className="text-xs" style={{ color: colors.text }}>miss rate @ 1&mu;s</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Python FFI overhead attribution
 * Data: research_bench_python.py, 5s sustained, Python 3.12
 */
export function PythonFFIOverheadChart() {
  const colors = useColors();

  const data = [
    { name: 'CmdVel', rust: 14, python: 1712, overhead: 1698 },
    { name: 'Pose2D', rust: 14, python: 1682, overhead: 1668 },
    { name: 'Imu', rust: 14, python: 1884, overhead: 1870 },
    { name: 'dict (small)', rust: 14, python: 6246, overhead: 6232 },
  ];

  return (
    <div
      className="w-full rounded-xl p-6 my-6"
      style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
    >
      <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textBold }}>
        FFI Overhead: Rust vs Python
      </h3>
      <p className="text-sm mb-4" style={{ color: colors.text }}>
        Latency in nanoseconds — constant ~1.7&mu;s overhead from PyO3 + GIL + allocation
      </p>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis
            dataKey="name"
            stroke={colors.text}
            tick={{ fill: colors.text }}
          />
          <YAxis
            stroke={colors.text}
            tick={{ fill: colors.text }}
            scale="log"
            domain={[5, 10000]}
            tickFormatter={(value) => {
              if (value >= 1000) return `${(value/1000).toFixed(1)}\u03BCs`;
              return `${value}ns`;
            }}
            label={{ value: 'Latency (log scale)', angle: -90, position: 'insideLeft', fill: colors.text }}
          />
          <Tooltip
            formatter={(value: any, name: any) => {
              const label = name === 'rust' ? 'Rust' : 'Python';
              if (value >= 1000) return [`${(value/1000).toFixed(2)}\u03BCs`, label];
              return [`${value}ns`, label];
            }}
            contentStyle={{ backgroundColor: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, borderRadius: '8px' }}
            labelStyle={{ color: colors.text }}
          />
          <Legend
            formatter={(value: any) => <span style={{ color: colors.text }}>{value === 'rust' ? 'Rust (native)' : 'Python (PyO3)'}</span>}
          />
          <Bar dataKey="rust" fill={colors.horusLink} radius={[4, 4, 0, 0]} name="rust" />
          <Bar dataKey="python" fill={colors.horus} radius={[4, 4, 0, 0]} name="python" />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 text-center text-sm" style={{ color: colors.text }}>
        Overhead breakdown: PyO3 crossing ~500ns + GIL acquisition ~500ns + Python object alloc ~700ns
      </div>
    </div>
  );
}

/**
 * Python zero-copy image performance
 * Data: research_bench_python.py, 640x480 images
 */
export function PythonZeroCopyChart() {
  const colors = useColors();

  const data = [
    { name: 'np.from_dlpack\n(zero-copy)', latency: 1.1, throughput: 3.5, color: colors.horus },
    { name: 'Image.to_numpy\n(SHM view)', latency: 3.0, throughput: 1.5, color: colors.horusLink },
    { name: 'np.copy\n(baseline)', latency: 14.0, throughput: 0.334, color: colors.ros2 },
  ];

  return (
    <div
      className="w-full rounded-xl p-6 my-6"
      style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
    >
      <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textBold }}>
        Python Image Zero-Copy
      </h3>
      <p className="text-sm mb-4" style={{ color: colors.text }}>
        640&times;480 RGB image transfer latency (&mu;s). DLPack is 13x faster than copying.
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis
            dataKey="name"
            stroke={colors.text}
            tick={{ fill: colors.text, fontSize: 11 }}
            interval={0}
            height={60}
          />
          <YAxis
            stroke={colors.text}
            tick={{ fill: colors.text }}
            domain={[0, 16]}
            tickFormatter={(value) => `${value}\u03BCs`}
            label={{ value: 'Latency (\u03BCs)', angle: -90, position: 'insideLeft', fill: colors.text }}
          />
          <Tooltip
            formatter={(value: any) => [`${value}\u03BCs`, 'Latency']}
            contentStyle={{ backgroundColor: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, borderRadius: '8px' }}
            labelStyle={{ color: colors.text }}
          />
          <Bar dataKey="latency" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        {data.map((d) => (
          <div
            key={d.name}
            className="rounded-lg p-3"
            style={{ backgroundColor: colors.cardBg }}
          >
            <div className="text-xl font-bold" style={{ color: d.color }}>{d.throughput}M/s</div>
            <div className="text-xs" style={{ color: colors.text }}>throughput</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * HORUS vs iceoryx2 comparison chart
 * Data: iceoryx2_comparison + fanout_shm_bench benchmarks
 */
export function HorusVsIceoryxChart() {
  const colors = useColors();

  const data = [
    { name: 'Same-thread', horus: 11, iceoryx2: 69 },
    { name: 'Cross-thread', horus: 95, iceoryx2: 182 },
    { name: 'Cross-process', horus: 170, iceoryx2: 361 },
    { name: 'Xproc MPMC', horus: 96, iceoryx2: 135 },
  ];

  return (
    <div
      className="w-full rounded-xl p-6 my-6"
      style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
    >
      <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textBold }}>
        HORUS vs iceoryx2
      </h3>
      <p className="text-sm mb-4" style={{ color: colors.text }}>
        p50 latency in nanoseconds — HORUS beats iceoryx2 on every IPC path
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis
            dataKey="name"
            stroke={colors.text}
            tick={{ fill: colors.text, fontSize: 12, fontWeight: 'bold' }}
          />
          <YAxis
            stroke={colors.text}
            tick={{ fill: colors.text }}
            domain={[0, 400]}
            tickFormatter={(value: number) => `${value}ns`}
            label={{ value: 'Latency (ns)', angle: -90, position: 'insideLeft', fill: colors.text }}
          />
          <Tooltip
            formatter={(value: any, name: any) => [`${value ?? 0}ns`, name === 'horus' ? 'HORUS' : 'iceoryx2']}
            contentStyle={{ backgroundColor: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, borderRadius: '8px' }}
            labelStyle={{ color: colors.text }}
          />
          <Legend
            formatter={(value: string) => <span style={{ color: colors.text }}>{value === 'horus' ? 'HORUS' : 'iceoryx2'}</span>}
          />
          <Bar dataKey="horus" fill={colors.horus} radius={[4, 4, 0, 0]} name="horus" />
          <Bar dataKey="iceoryx2" fill={colors.ros2} radius={[4, 4, 0, 0]} name="iceoryx2" />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 text-center text-sm" style={{ color: colors.text }}>
        Speedup:{' '}
        <span style={{ color: colors.horus, fontWeight: 'bold' }}>6.3x</span> same-thread
        {' '}&bull;{' '}
        <span style={{ color: colors.horus, fontWeight: 'bold' }}>2.1x</span> cross-process
        {' '}&bull;{' '}
        <span style={{ color: colors.horus, fontWeight: 'bold' }}>1.4x</span> MPMC
        {' '}&bull;{' '}
        <span style={{ color: colors.horus, fontWeight: 'bold' }}>4.3x</span> throughput
      </div>
    </div>
  );
}

// Export all charts as a single default for easy MDX import
export default {
  LatencyComparisonChart,
  LatencyScalingChart,
  ScalabilityChart,
  SpeedupChart,
  ThroughputChart,
  RealTimeChart,
  PythonComparisonChart,
  PythonThroughputChart,
  PythonStressChart,
  PythonRustComparisonChart,
  TransformFrameLatencyChart,
  TransformFrameSpeedupChart,
  TransformFrameMemoryChart,
  TransformFrameConcurrentChart,
  IPCBackendChart,
  MessagePerformanceChart,
  HorusVsUDPChart,
  HorusVsIceoryxChart,
  ThreadScalingChart,
  DeterminismChart,
  PythonFFIOverheadChart,
  PythonZeroCopyChart,
};
