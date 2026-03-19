"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiArrowLeft, FiArrowRight } from "react-icons/fi";

interface DocLink {
  title: string;
  href: string;
}

// Flattened list of all doc pages in order - must match DocsSidebar.tsx
const allPages: DocLink[] = [
  // Getting Started
  { title: "What is HORUS?", href: "/concepts/what-is-horus" },
  { title: "Installation", href: "/getting-started/installation" },
  { title: "Quick Start", href: "/getting-started/quick-start" },
  { title: "Choosing a Language", href: "/getting-started/choosing-language" },
  { title: "Second Application", href: "/getting-started/second-application" },
  { title: "Architecture", href: "/concepts/architecture" },
  { title: "Common Mistakes", href: "/getting-started/common-mistakes" },
  { title: "Troubleshooting", href: "/troubleshooting" },
  { title: "Advanced Examples", href: "/rust/examples/advanced-examples" },

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
  { title: "ROS2 Bridge", href: "/recipes/ros2-bridge" },

  // Core Concepts
  { title: "Overview", href: "/concepts" },
  { title: "Nodes", href: "/concepts/core-concepts-nodes" },
  { title: "Communication Patterns", href: "/concepts/communication-overview" },
  { title: "Topic (Pub/Sub)", href: "/concepts/core-concepts-topic" },
  { title: "PodTopic (Ultra-Fast)", href: "/concepts/core-concepts-podtopic" },
  { title: "Services (Beta)", href: "/concepts/services" },
  { title: "Actions (Beta)", href: "/concepts/actions" },
  { title: "Scheduler", href: "/concepts/core-concepts-scheduler" },
  { title: "node! Macro", href: "/concepts/node-macro" },
  { title: "Message Types", href: "/concepts/message-types" },
  { title: "Transform Frame", href: "/concepts/transform-frame" },
  { title: "Multi-Language", href: "/concepts/multi-language" },

  // Rust
  { title: "Rust Overview", href: "/rust" },
  { title: "API Reference", href: "/rust/api" },
  { title: "horus_macros", href: "/rust/api/macros" },
  { title: "TensorPool", href: "/rust/api/tensor-pool" },
  { title: "Tensor Messages", href: "/rust/api/tensor-messages" },
  { title: "Messages Overview", href: "/rust/api/messages" },
  { title: "Control Messages", href: "/rust/api/control-messages" },
  { title: "Diagnostics Messages", href: "/rust/api/diagnostics-messages" },
  { title: "Force Messages", href: "/rust/api/force-messages" },
  { title: "Geometry Messages", href: "/rust/api/geometry-messages" },
  { title: "ML Messages", href: "/rust/api/ml-messages" },
  { title: "Navigation Messages", href: "/rust/api/navigation-messages" },
  { title: "Perception Messages", href: "/rust/api/perception-messages" },
  { title: "Sensor Messages", href: "/rust/api/sensor-messages" },
  { title: "Vision Messages", href: "/rust/api/vision-messages" },
  { title: "Rust Examples", href: "/rust/examples" },
  { title: "Basic Examples", href: "/rust/examples/basic-examples" },

  // Python
  { title: "Python Overview", href: "/python" },
  { title: "Python API", href: "/python/api" },
  { title: "Python Bindings", href: "/python/api/python-bindings" },
  { title: "Async Nodes", href: "/python/api/async-nodes" },
  { title: "Custom Messages", href: "/python/api/custom-messages" },
  { title: "Message Library", href: "/python/library/python-message-library" },
  { title: "ML Utilities", href: "/python/library/ml-utilities" },
  { title: "Python Examples", href: "/python/examples" },

  // Development
  { title: "CLI Reference", href: "/development/cli-reference" },
  { title: "Monitor", href: "/development/monitor" },
  { title: "Testing", href: "/development/testing" },
  { title: "Parameters", href: "/development/parameters" },
  { title: "Static Analysis", href: "/development/static-analysis" },
  { title: "Error Handling", href: "/development/error-handling" },
  { title: "AI Integration", href: "/development/ai-integration" },
  { title: "Telemetry Export", href: "/development/telemetry" },
  { title: "Native Tool Integration", href: "/development/native-tools" },
  { title: "Multi-Crate Workspaces", href: "/development/workspaces" },

  // Advanced Topics
  { title: "Scheduler Configuration", href: "/advanced/scheduler-configuration" },
  { title: "Network Backends", href: "/advanced/network-backends" },
  { title: "BlackBox Recorder", href: "/advanced/blackbox" },
  { title: "Fault Tolerance", href: "/advanced/circuit-breaker" },
  { title: "Safety Monitor", href: "/advanced/safety-monitor" },
  { title: "Record & Replay", href: "/advanced/record-replay" },
  { title: "Discovery (mDNS)", href: "/advanced/discovery" },

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

  // Performance
  { title: "Optimization Guide", href: "/performance/performance" },
  { title: "Benchmarks", href: "/performance/benchmarks" },

  // Reference
  { title: "API Cheatsheet", href: "/reference/api-cheatsheet" },
  { title: "AI Context", href: "/reference/ai-context" },
  { title: "Internals", href: "/reference/internals" },
];

export function PrevNextNav() {
  const pathname = usePathname();

  const currentIndex = allPages.findIndex(page => page.href === pathname);
  const prevPage = currentIndex > 0 ? allPages[currentIndex - 1] : null;
  const nextPage = currentIndex < allPages.length - 1 ? allPages[currentIndex + 1] : null;

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
