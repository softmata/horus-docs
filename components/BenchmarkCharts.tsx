'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
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
 * Median latency of HORUS against the middleware reference figures.
 *
 * This charted a "ROS2 DDS" series of 75, 115, 225 and 750 us. The only ROS 2
 * latency the HORUS repository holds is REP 2014's ~5,000 ns — fifteen to a
 * hundred and fifty times lower than what these bars drew — and the HORUS
 * series led with 0.087 us, the phantom "87ns" that appears in no benchmark
 * either. Both sides of the comparison were invented.
 *
 * It now renders the table /performance/benchmarks publishes, unchanged: HORUS
 * medians measured by `all_paths_latency` on an i7-10750H, and the DDS and
 * iceoryx rows as the published reference values `dds_comparison_benchmark`
 * uses when the `dds` feature is off. Those four are literature, not
 * measurements of this machine, which is what the caption says.
 */
export function LatencyComparisonChart() {
  const colors = useColors();

  const data = [
    { name: 'HORUS\n(same proc)', median: 0.063, p99: 0.093, measured: true, unit: 'μs' },
    { name: 'iceoryx\n(C++)', median: 0.08, p99: 0.2, measured: false, unit: 'μs' },
    { name: 'HORUS\n(cross proc)', median: 0.151, p99: 0.181, measured: true, unit: 'μs' },
    { name: 'Cyclone\nDDS', median: 1.5, p99: 5, measured: false, unit: 'μs' },
    { name: 'Fast\nDDS', median: 2, p99: 8, measured: false, unit: 'μs' },
    { name: 'ROS 2\ndefault', median: 5, p99: 20, measured: false, unit: 'μs' },
  ];

  return (
    <div
      className="w-full rounded-xl p-6 my-6"
      style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
    >
      <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textBold }}>
        Median latency: HORUS and the reference figures
      </h3>
      <p className="text-sm mb-1" style={{ color: colors.text }}>
        Lower is better. Logarithmic scale, one-way latency in μs
      </p>
      <p className="text-xs mb-4" style={{ color: colors.text, opacity: 0.75 }}>
        The two HORUS bars are measured (i7-10750H, <code>all_paths_latency</code>). iceoryx,
        CycloneDDS, FastDDS and ROS 2 are <strong>published reference values</strong>, at
        64-byte messages, same-process — not measured on this machine.
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
          <Bar dataKey="median" name="median" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`median-${index}`}
                fill={entry.measured ? colors.horusLink : colors.ros2}
              />
            ))}
          </Bar>
          <Bar dataKey="p99" name="p99" radius={[4, 4, 0, 0]} fillOpacity={0.4}>
            {data.map((entry, index) => (
              <Cell
                key={`p99-${index}`}
                fill={entry.measured ? colors.horusLink : colors.ros2}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 flex flex-wrap justify-center gap-4 md:gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.horusLink }}></div>
          <span style={{ color: colors.text }}>HORUS (measured here)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.ros2 }}></div>
          <span style={{ color: colors.text }}>published reference (not measured)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-current opacity-40" style={{ color: colors.text }}></div>
          <span style={{ color: colors.text }}>paler bar = p99</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Median send latency against message size.
 *
 * Seven of these points were invented. The published benchmark measures four
 * message types — CmdVel 16 B, Imu 304 B, JointCommand 928 B, LaserScan
 * 1480 B — and no others; the 104 B, 736 B, 12 KB and 120 KB rows had no source,
 * the "HORUS Hub" series has no published per-size figures at all, and the ROS 2
 * line ran from 75 us to 750 us against a repository whose only ROS 2 number is
 * ~5 us.
 *
 * What is left is the four measured points, plus that ~5 us reference drawn flat
 * — it is a single published figure, not a curve, and drawing it flat is the
 * honest shape for it.
 */
export function LatencyScalingChart() {
  const colors = useColors();

  const data = [
    { size: 16, sizeLabel: '16B\nCmdVel', horus: 75, reference: 5000 },
    { size: 304, sizeLabel: '304B\nImu', horus: 121, reference: 5000 },
    { size: 928, sizeLabel: '928B\nJointCmd', horus: 135, reference: 5000 },
    { size: 1480, sizeLabel: '1.5KB\nLaserScan', horus: 210, reference: 5000 },
  ];

  return (
    <div
      className="w-full rounded-xl p-6 my-6"
      style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
    >
      <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textBold }}>
        Latency vs Message Size
      </h3>
      <p className="text-sm mb-1" style={{ color: colors.text }}>
        Send-side medians in nanoseconds. 92x more bytes costs under 3x latency.
      </p>
      <p className="text-xs mb-4" style={{ color: colors.text, opacity: 0.75 }}>
        HORUS: <code>robotics_messages_benchmark</code>, i7-10750H, 50,000 iterations per type. The
        ROS 2 line is the flat ~5&nbsp;&micro;s REP&nbsp;2014 reference, <strong>not
        measured here</strong> and end-to-end rather than send-side.
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
            domain={[50, 10000]}
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
            dataKey="horus"
            stroke={colors.horusLink}
            strokeWidth={3}
            dot={{ fill: colors.horusLink, strokeWidth: 2, r: 5 }}
            name="HORUS Topic (measured)"
          />
          <Line
            type="monotone"
            dataKey="reference"
            stroke={colors.ros2}
            strokeWidth={3}
            dot={false}
            name="ROS 2 reference (REP 2014, not measured)"
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
 * HORUS latency against the ROS 2 reference figure, per message type.
 *
 * The bars used to read 575x, 940x, 750x, 167x and 8x, under the heading "HORUS
 * Speedup vs ROS2". None of those five numbers exists anywhere in the HORUS
 * repository: no benchmark produces them, no report contains them, and the only
 * ROS 2 latency the project holds at all is REP 2014's ~5,000 ns quoted by
 * `dds_comparison_benchmark`, which tags it `Provenance::Literature` precisely
 * because it is not a measurement of this machine. A chart of unsourced
 * competitor ratios is the first thing a skeptical evaluator goes looking for,
 * and it discredits the measured work sitting next to it.
 *
 * These bars are the ratios /performance/benchmarks derives in its own
 * "Latency by Message Size" table: `robotics_messages_benchmark` send-side
 * medians on an i7-10750H, divided by that same ~5 us reference. That division
 * is not like-for-like — send-side against end-to-end — so the chart says so
 * rather than leaving the reader to find out. The cross-process bar is the one
 * one-way-to-one-way comparison available (151 ns), and it is the number to
 * quote when only one will do.
 */
export function SpeedupChart() {
  const colors = useColors();

  const data = [
    { name: 'CmdVel 16B', speedup: 67, category: 'Control' },
    { name: 'Imu 304B', speedup: 41, category: 'Sensor' },
    { name: 'JointCmd 928B', speedup: 37, category: 'Control' },
    { name: 'LaserScan 1.5KB', speedup: 24, category: 'Perception' },
    { name: 'Cross-process', speedup: 33, category: 'One-way' },
  ];

  return (
    <div
      className="w-full rounded-xl p-6 my-6"
      style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
    >
      <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textBold }}>
        HORUS vs the ROS 2 reference latency
      </h3>
      <p className="text-sm mb-1" style={{ color: colors.text }}>
        HORUS medians divided by ROS 2&apos;s ~5&nbsp;&micro;s REP&nbsp;2014 reference figure
      </p>
      <p className="text-xs mb-4" style={{ color: colors.text, opacity: 0.75 }}>
        ROS 2 is <strong>not measured here</strong> — ~5&nbsp;&micro;s is a published
        end-to-end reference. The first four bars divide a send-side HORUS median by it, so
        they are indicative rather than like-for-like. &ldquo;Cross-process&rdquo; is
        one-way on both sides (151&nbsp;ns) and is the comparable one.
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ top: 20, right: 80, left: 110, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} horizontal={true} vertical={false} />
          <XAxis
            type="number"
            stroke={colors.text}
            tick={{ fill: colors.text }}
            tickFormatter={(value) => `${value}x`}
            domain={[0, 80]}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke={colors.text}
            tick={{ fill: colors.text }}
            width={110}
          />
          <Tooltip
            formatter={(value: any) => [`${value}x the reference`, 'Ratio']}
            contentStyle={{ backgroundColor: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, borderRadius: '8px' }}
            labelStyle={{ color: colors.text }}
          />
          <Bar dataKey="speedup" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.category === 'One-way' ? colors.horus : colors.horusLink}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 flex flex-wrap justify-center gap-4 md:gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.horus }}></div>
          <span style={{ color: colors.text }}>one-way vs one-way</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.horusLink }}></div>
          <span style={{ color: colors.text }}>send-side vs end-to-end (indicative)</span>
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

  // The "ros2" series here was 0.02M / 0.01M / 0.002M msg/s. The HORUS
  // repository publishes no ROS 2 throughput figure of any kind — not a
  // measurement, not a citation — so those three bars asserted a 600x
  // throughput advantage out of nothing, and the "HORUS Hub" series had no
  // published per-size numbers either. Both are gone. What remains is the four
  // throughputs /performance/benchmarks measures, at the sizes it measures them.
  const data = [
    { name: 'CmdVel\n(16B)', horus: 12.14 },
    { name: 'Imu\n(304B)', horus: 7.46 },
    { name: 'JointCmd\n(928B)', horus: 6.89 },
    { name: 'LaserScan\n(1.5KB)', horus: 4.42 },
  ];

  return (
    <div
      className="w-full rounded-xl p-6 my-6"
      style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
    >
      <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textBold }}>
        HORUS Throughput by Message Size
      </h3>
      <p className="text-sm mb-1" style={{ color: colors.text }}>
        Messages per second (millions). Higher is better.
      </p>
      <p className="text-xs mb-4" style={{ color: colors.text, opacity: 0.75 }}>
        <code>robotics_messages_benchmark</code> on an i7-10750H. No competitor series: the repository
        publishes no throughput reference for ROS 2 or DDS to compare against.
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
            domain={[0, 14]}
            tickFormatter={(value) => `${value}M`}
            label={{ value: 'Messages/sec (millions)', angle: -90, position: 'insideLeft', fill: colors.text }}
          />
          <Tooltip
            formatter={(value: any) => [`${value}M msg/s`, '']}
            contentStyle={{ backgroundColor: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, borderRadius: '8px' }}
            labelStyle={{ color: colors.text }}
          />
          <Legend
            formatter={(value: any) => <span style={{ color: colors.text }}>{value}</span>}
          />
          <Bar dataKey="horus" fill={colors.horusLink} radius={[4, 4, 0, 0]} name="HORUS Topic (measured)" />
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

/*
 * ── The four Python charts below have no published source ──────────────────
 *
 * /performance/benchmarks says it outright: "Every number on this page comes
 * from the Rust-side benchmarks; the repository publishes no reference latency
 * or throughput figures for the Python bindings, so this section quotes none."
 * These four components quote plenty — HORUS Python at 8 us, ZeroMQ at 75 us,
 * Redis at 350 us, rclpy at 300 us, 160M msg/s, 750M msg/s under 8 threads —
 * and none of it is traceable to a benchmark, a report or a source file.
 *
 * They are not rendered on any page today; the risk is someone dropping one
 * into an MDX file believing it is measured. Each therefore carries a caption
 * saying it is not, and the caption names the scripts that would produce real
 * numbers: `horus_py/benchmarks/bench_python.py` and
 * `research_bench_python.py --duration 30`. Replace the data with a run's
 * output, or delete the component — the caption is a marker, not a fix.
 */

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
      <p className="text-xs mb-4" style={{ color: colors.text, opacity: 0.75 }}>
        <strong>Not measured.</strong> The repository publishes no Python benchmark
        figures; these values have no source. Run
        <code>python3 horus_py/benchmarks/bench_python.py</code> for numbers from your own machine.
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
      <p className="text-xs mb-4" style={{ color: colors.text, opacity: 0.75 }}>
        <strong>Not measured.</strong> The repository publishes no Python benchmark
        figures; these values have no source. Run
        <code>python3 horus_py/benchmarks/bench_python.py</code> for numbers from your own machine.
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
      <p className="text-xs mb-4" style={{ color: colors.text, opacity: 0.75 }}>
        <strong>Not measured.</strong> The repository publishes no Python benchmark
        figures; these values have no source. Run
        <code>python3 horus_py/benchmarks/bench_python.py</code> for numbers from your own machine.
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
      <p className="text-xs mb-4" style={{ color: colors.text, opacity: 0.75 }}>
        <strong>Not measured.</strong> The repository publishes no Python benchmark
        figures; these values have no source. Run
        <code>python3 horus_py/benchmarks/bench_python.py</code> for numbers from your own machine.
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

  // Matches the table on /concepts/transform-frame row for row. It did not:
  // depth-10 was drawn at 2,500 ns against a measured ~380 ns, an "Update" row
  // appeared that the benchmark suite does not report at all, and TF2 bars were
  // drawn for depth-10 where that page says in as many words that no TF2
  // comparison was run. `null` is how a row with no comparison is expressed —
  // recharts draws no bar for it — rather than by inventing one.
  const data = [
    { name: 'Lookup\nby ID', transform_frame: 50, tf2: null, unit: 'ns' },
    { name: 'Lookup\nby Name', transform_frame: 200, tf2: 2000, unit: 'ns' },
    { name: 'Chain\n(depth 3)', transform_frame: 150, tf2: 5000, unit: 'ns' },
    { name: 'Chain\n(depth 10)', transform_frame: 380, tf2: null, unit: 'ns' },
    { name: 'Concurrent\n(4 threads)', transform_frame: 115, tf2: null, unit: 'ns' },
  ];

  return (
    <div
      className="w-full rounded-xl p-6 my-6"
      style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
    >
      <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textBold }}>
        HORUS Transform Frame vs ROS2 TF2 Latency
      </h3>
      <p className="text-sm mb-1" style={{ color: colors.text }}>
        Lower is better. Logarithmic scale (nanoseconds)
      </p>
      <p className="text-xs mb-4" style={{ color: colors.text, opacity: 0.75 }}>
        Measured on an i7-10750H with <code>transform_frame_benchmark</code>. Three rows have no TF2
        bar because no TF2 comparison was run for them — not because TF2 scored zero.
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
          <Bar dataKey="transform_frame" fill={colors.horus} radius={[4, 4, 0, 0]} name="HORUS Transform Frame" />
          <Bar dataKey="tf2" fill={colors.ros2} radius={[4, 4, 0, 0]} name="ROS2 TF2" />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 flex flex-wrap justify-center gap-4 md:gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.horus }}></div>
          <span style={{ color: colors.text }}>HORUS Transform Frame (lock-free)</span>
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

  // Only the two operations for which a TF2 comparison was actually run.
  //
  // The other three bars — depth-10 at 6x, update at 2x, concurrent reads at
  // 100x — are the rows /concepts/transform-frame says outright carry no
  // speedup figure because no TF2 comparison exists for them. A 100x bar with
  // no measurement behind it is the single most damaging thing on a performance
  // page, because it is also the most memorable.
  const data = [
    { name: 'Lookup by Name', speedup: 10, category: 'Query' },
    { name: 'Chain (depth 3)', speedup: 33, category: 'Query' },
  ];

  return (
    <div
      className="w-full rounded-xl p-6 my-6"
      style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
    >
      <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textBold }}>
        HORUS Transform Frame Speedup vs TF2
      </h3>
      <p className="text-sm mb-1" style={{ color: colors.text }}>
        How many times faster HORUS Transform Frame is compared to TF2
      </p>
      <p className="text-xs mb-4" style={{ color: colors.text, opacity: 0.75 }}>
        These are the only two operations with a TF2 comparison. Depth-10 chains, updates
        and concurrent reads are measured for HORUS but were never run against TF2, so no
        ratio for them is published — see{' '}
        <Link href="/concepts/transform-frame#performance">Transform Frame</Link>.
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ top: 20, right: 80, left: 120, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} horizontal={true} vertical={false} />
          <XAxis
            type="number"
            stroke={colors.text}
            tick={{ fill: colors.text }}
            tickFormatter={(value) => `${value}x`}
            domain={[0, 40]}
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
                fill={entry.speedup > 30 ? colors.horus : colors.horusLink}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
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
        Transform Frame Memory Usage
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
        Latency under contention (ns). HORUS Transform Frame uses lock-free reads.
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
            name="HORUS Transform Frame"
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
        HORUS Transform Frame maintains <span style={{ color: colors.horus, fontWeight: 'bold' }}>near-constant latency</span> under contention due to lock-free design
      </div>
    </div>
  );
}

// Export all charts as a single default for easy MDX import
const benchmarkCharts = {
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
};

export default benchmarkCharts;
