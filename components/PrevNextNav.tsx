"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiArrowLeft, FiArrowRight } from "react-icons/fi";
import { useEffect, useState } from "react";
import { pageLanguage, type Language } from "@/lib/language-pairs";

const LANG_STORAGE_KEY = 'horus-docs-language';
const LANG_SYNC_EVENT = 'horus-language-change';

interface DocLink {
  title: string;
  href: string;
}

// Flattened list of all doc pages in order - must match DocsSidebar.tsx
const allPages: DocLink[] = [
  // Getting Started
  { title: "What is HORUS?", href: "/concepts/what-is-horus" },
  { title: "Why HORUS?", href: "/learn/why-horus" },
  { title: "HORUS vs ROS2", href: "/learn/vs-ros2" },
  { title: "Installation", href: "/getting-started/installation" },
  { title: "Quick Start (Rust)", href: "/getting-started/quick-start" },
  { title: "Quick Start (Python)", href: "/getting-started/quick-start-python" },
  { title: "Choosing a Language", href: "/getting-started/choosing-language" },
  { title: "Second Application", href: "/getting-started/second-application" },
  { title: "Architecture", href: "/concepts/architecture" },
  { title: "Common Mistakes", href: "/getting-started/common-mistakes" },
  { title: "Troubleshooting", href: "/troubleshooting" },

  // Tutorials
  { title: "Tutorials", href: "/tutorials" },
  { title: "IMU Sensor Node", href: "/tutorials/01-sensor-node" },
  { title: "IMU Sensor Node (Python)", href: "/tutorials/01-sensor-node-python" },
  { title: "Motor Controller", href: "/tutorials/02-motor-controller" },
  { title: "Motor Controller (Python)", href: "/tutorials/02-motor-controller-python" },
  { title: "Full Robot Integration", href: "/tutorials/03-full-robot" },
  { title: "Full Robot Integration (Python)", href: "/tutorials/03-full-robot-python" },
  { title: "Real-Time Control", href: "/tutorials/realtime-control" },
  { title: "Custom Message Types", href: "/tutorials/04-custom-messages" },
  { title: "Custom Messages (Python)", href: "/tutorials/04-custom-messages-python" },
  { title: "Hardware Drivers", href: "/tutorials/05-hardware-drivers" },
  { title: "Hardware & RT (Python)", href: "/tutorials/05-hardware-and-rt-python" },

  // Recipes
  { title: "Recipes", href: "/recipes" },
  { title: "Differential Drive", href: "/recipes/differential-drive" },
  { title: "IMU Reader", href: "/recipes/imu-reader" },
  { title: "PID Controller", href: "/recipes/pid-controller" },
  { title: "LiDAR Obstacle Avoidance", href: "/recipes/lidar-obstacle-avoidance" },
  { title: "Servo Controller", href: "/recipes/servo-controller" },
  { title: "Multi-Sensor Fusion", href: "/recipes/multi-sensor-fusion" },
  { title: "Emergency Stop", href: "/recipes/emergency-stop" },
  { title: "Telemetry Logger", href: "/recipes/telemetry-logger" },
  { title: "Python CV Node", href: "/recipes/python-cv-node" },
  { title: "Transform Frames", href: "/recipes/transform-frames" },

  // Core Concepts
  { title: "Core Concepts", href: "/concepts" },
  { title: "Nodes (Beginner)", href: "/concepts/nodes-beginner" },
  { title: "Topics (Beginner)", href: "/concepts/topics-beginner" },
  { title: "Scheduler (Beginner)", href: "/concepts/scheduler-beginner" },
  { title: "Nodes (Full Reference)", href: "/concepts/core-concepts-nodes" },
  { title: "Topic (Full Reference)", href: "/concepts/core-concepts-topic" },
  { title: "Scheduler (Full Reference)", href: "/concepts/core-concepts-scheduler" },
  { title: "Message Performance", href: "/concepts/core-concepts-podtopic" },
  { title: "Services (Beta)", href: "/concepts/services" },
  { title: "Actions (Beta)", href: "/concepts/actions" },
  { title: "Execution Classes", href: "/concepts/execution-classes" },
  { title: "Choosing Configuration", href: "/concepts/choosing-configuration" },
  { title: "node! Macro", href: "/concepts/node-macro" },
  { title: "Message Types", href: "/concepts/message-types" },
  { title: "Transform Frame", href: "/concepts/transform-frame" },
  { title: "Communication Overview", href: "/concepts/communication-overview" },
  { title: "Real-Time", href: "/concepts/real-time" },
  { title: "Multi-Language", href: "/concepts/multi-language" },
  { title: "Multi-Process", href: "/concepts/multi-process" },
  { title: "horus.toml", href: "/concepts/horus-toml" },

  // Rust
  { title: "Rust Overview", href: "/rust" },
  { title: "Time API", href: "/rust/time-api" },
  { title: "API Reference", href: "/rust/api" },
  { title: "Scheduler", href: "/rust/api/scheduler" },
  { title: "Topic", href: "/rust/api/topic" },
  { title: "Services", href: "/rust/api/services" },
  { title: "Actions", href: "/rust/api/actions" },
  { title: "TransformFrame", href: "/rust/api/transform-frame" },
  { title: "Image", href: "/rust/api/image" },
  { title: "PointCloud", href: "/rust/api/pointcloud" },
  { title: "DepthImage", href: "/rust/api/depth-image" },
  { title: "Tensor & Device", href: "/rust/api/tensor" },
  { title: "RuntimeParams", href: "/rust/api/runtime-params" },
  { title: "Driver API", href: "/rust/api/drivers" },
  { title: "Error Types", href: "/rust/api/error-types" },
  { title: "DurationExt", href: "/rust/api/duration-ext" },
  { title: "Rate & Stopwatch", href: "/rust/api/rate-stopwatch" },
  { title: "Feature Flags", href: "/rust/api/feature-flags" },
  { title: "GenericMessage", href: "/rust/api/generic-message" },
  { title: "horus_macros", href: "/rust/api/macros" },
  { title: "Tensor Messages", href: "/rust/api/tensor-messages" },
  { title: "Messages Overview", href: "/rust/api/messages" },
  { title: "Geometry Messages", href: "/rust/api/geometry-messages" },
  { title: "Sensor Messages", href: "/rust/api/sensor-messages" },
  { title: "Control Messages", href: "/rust/api/control-messages" },
  { title: "Navigation Messages", href: "/rust/api/navigation-messages" },
  { title: "Perception Messages", href: "/rust/api/perception-messages" },
  { title: "Vision Messages", href: "/rust/api/vision-messages" },
  { title: "Diagnostics Messages", href: "/rust/api/diagnostics-messages" },
  { title: "Force Messages", href: "/rust/api/force-messages" },
  { title: "Input Messages", href: "/rust/api/input-messages" },
  { title: "Clock Messages", href: "/rust/api/clock-messages" },
  { title: "ML Messages", href: "/rust/api/ml-messages" },
  { title: "Rust Examples", href: "/rust/examples" },
  { title: "Basic Examples", href: "/rust/examples/basic-examples" },
  { title: "Advanced Examples", href: "/rust/examples/advanced-examples" },

  // Python
  { title: "Python Overview", href: "/python" },
  { title: "Python API", href: "/python/api" },
  { title: "Python Bindings", href: "/python/api/python-bindings" },
  { title: "Image (Python)", href: "/python/api/image" },
  { title: "PointCloud (Python)", href: "/python/api/pointcloud" },
  { title: "DepthImage (Python)", href: "/python/api/depth-image" },
  { title: "Perception", href: "/python/api/perception" },
  { title: "TransformFrame (Python)", href: "/python/api/transform-frame" },
  { title: "Async Nodes", href: "/python/api/async-nodes" },
  { title: "Custom Messages", href: "/python/api/custom-messages" },
  { title: "Message Library", href: "/python/library/python-message-library" },
  { title: "Geometry (Python)", href: "/python/messages/geometry" },
  { title: "Sensor (Python)", href: "/python/messages/sensor" },
  { title: "Control (Python)", href: "/python/messages/control" },
  { title: "Navigation (Python)", href: "/python/messages/navigation" },
  { title: "Diagnostics (Python)", href: "/python/messages/diagnostics" },
  { title: "Force & Haptics (Python)", href: "/python/messages/force" },
  { title: "Perception (Python)", href: "/python/messages/perception" },
  { title: "Vision (Python)", href: "/python/messages/vision" },
  { title: "Input & Audio (Python)", href: "/python/messages/input" },
  { title: "ML Utilities", href: "/python/library/ml-utilities" },
  { title: "Python Examples", href: "/python/examples" },

  // Development
  { title: "Development", href: "/development" },
  { title: "CLI Reference", href: "/development/cli-reference" },
  { title: "Monitor", href: "/development/monitor" },
  { title: "Testing", href: "/development/testing" },
  { title: "Debugging", href: "/development/debugging" },
  { title: "Parameters", href: "/development/parameters" },
  { title: "Static Analysis", href: "/development/static-analysis" },
  { title: "Error Handling", href: "/development/error-handling" },
  { title: "AI Integration", href: "/development/ai-integration" },
  { title: "AI-Assisted Dev", href: "/development/ai-assisted-development" },
  { title: "Logging", href: "/development/logging" },
  { title: "Telemetry Export", href: "/development/telemetry" },
  { title: "Native Tool Integration", href: "/development/native-tools" },
  { title: "Multi-Crate Workspaces", href: "/development/workspaces" },

  // Advanced Topics
  { title: "Advanced Topics", href: "/advanced" },
  { title: "Scheduler Configuration", href: "/advanced/scheduler-configuration" },
  { title: "Deterministic Mode", href: "/advanced/deterministic-mode" },
  { title: "Network Backends", href: "/advanced/network-backends" },
  { title: "BlackBox Recorder", href: "/advanced/blackbox" },
  { title: "Fault Tolerance", href: "/advanced/circuit-breaker" },
  { title: "Safety Monitor", href: "/advanced/safety-monitor" },
  { title: "Record & Replay", href: "/advanced/record-replay" },
  { title: "RT Setup", href: "/advanced/rt-setup" },

  // Operations
  { title: "Operations", href: "/operations" },
  { title: "Deploy to Robot", href: "/operations/deploy-to-robot" },
  { title: "Coming from ROS2", href: "/learn/coming-from-ros2" },

  // Plugins
  { title: "Plugins Overview", href: "/plugins" },
  { title: "Creating CLI Plugins", href: "/plugins/creating-plugins" },
  { title: "Managing Plugins", href: "/plugins/managing-plugins" },

  // Package Management
  { title: "Package Management", href: "/package-management/package-management" },
  { title: "Using Prebuilt Nodes", href: "/package-management/using-prebuilt-nodes" },
  { title: "Lockfile & Reproducibility", href: "/package-management/lockfile" },
  { title: "Configuration Reference", href: "/package-management/configuration" },

  // Standard Library
  { title: "Standard Library", href: "/stdlib" },
  { title: "Imu", href: "/stdlib/messages/imu" },
  { title: "CmdVel", href: "/stdlib/messages/cmd-vel" },
  { title: "Twist", href: "/stdlib/messages/twist" },
  { title: "Odometry", href: "/stdlib/messages/odometry" },
  { title: "Pose2D / Pose3D", href: "/stdlib/messages/pose" },
  { title: "LaserScan", href: "/stdlib/messages/laser-scan" },
  { title: "Image", href: "/stdlib/messages/image" },
  { title: "Detection", href: "/stdlib/messages/detection" },
  { title: "Segmentation", href: "/stdlib/messages/segmentation" },
  { title: "OccupancyGrid", href: "/stdlib/messages/occupancy-grid" },
  { title: "BatteryState", href: "/stdlib/messages/battery-state" },
  { title: "Navigation", href: "/stdlib/messages/navigation" },
  { title: "JointState", href: "/stdlib/messages/joint-state" },
  { title: "AudioFrame", href: "/stdlib/messages/audio-frame" },

  // Performance
  { title: "Performance", href: "/performance" },
  { title: "Optimization Guide", href: "/performance/performance" },
  { title: "Benchmarks", href: "/performance/benchmarks" },

  // Reference
  { title: "API Cheatsheet", href: "/reference/api-cheatsheet" },
  { title: "API Quick Reference", href: "/reference/api-index" },
  { title: "AI Context", href: "/reference/ai-context" },
  { title: "Internals", href: "/reference/internals" },
];

export function PrevNextNav() {
  const pathname = usePathname();

  // Track the selected language so prev/next skips pages in the other languages.
  const [language, setLanguage] = useState<Language | null>(null);

  useEffect(() => {
    const stored = typeof window !== 'undefined'
      ? (localStorage.getItem(LANG_STORAGE_KEY) as Language | null)
      : null;
    if (stored === 'Rust' || stored === 'Python' || stored === 'C++') {
      setLanguage(stored);
    } else {
      setLanguage('Rust');
    }
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === 'Rust' || detail === 'Python' || detail === 'C++') {
        setLanguage(detail);
      }
    };
    window.addEventListener(LANG_SYNC_EVENT, handler);
    return () => window.removeEventListener(LANG_SYNC_EVENT, handler);
  }, []);

  // Keep only pages that match the selected language, plus language-agnostic
  // pages. This ensures "Next" from a Rust page goes to the next Rust page
  // (or a shared concept page) and skips /python/* and /cpp/* entries.
  const visiblePages = allPages.filter((p) => {
    const pLang = pageLanguage(p.href);
    return !pLang || !language || pLang === language;
  });

  const currentIndex = visiblePages.findIndex((page) => page.href === pathname);
  const prevPage = currentIndex > 0 ? visiblePages[currentIndex - 1] : null;
  const nextPage = currentIndex !== -1 && currentIndex < visiblePages.length - 1
    ? visiblePages[currentIndex + 1]
    : null;

  if (!prevPage && !nextPage) {
    return null;
  }

  return (
    <nav className="mt-12 pt-6 border-t border-[var(--border)] flex justify-between items-center gap-4">
      {prevPage ? (
        <Link
          href={prevPage.href}
          className="flex items-center gap-2 px-4 py-3 text-sm text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)] border border-[var(--border)] transition-colors group"
        >
          <FiArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <div className="text-left">
            <div className="text-xs text-[var(--text-muted)]">Previous</div>
            <div className="font-medium">{prevPage.title}</div>
          </div>
        </Link>
      ) : (
        <div />
      )}

      {nextPage ? (
        <Link
          href={nextPage.href}
          className="flex items-center gap-2 px-4 py-3 text-sm text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)] border border-[var(--border)] transition-colors group"
        >
          <div className="text-right">
            <div className="text-xs text-[var(--text-muted)]">Next</div>
            <div className="font-medium">{nextPage.title}</div>
          </div>
          <FiArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      ) : (
        <div />
      )}
    </nav>
  );
}
