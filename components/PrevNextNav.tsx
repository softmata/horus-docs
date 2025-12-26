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
  { title: "Goals & Vision", href: "/concepts/goals" },
  { title: "Complete Beginner's Guide", href: "/getting-started/complete-beginners-guide" },
  { title: "Installation", href: "/getting-started/installation" },
  { title: "Quick Start", href: "/getting-started/quick-start" },
  { title: "Choosing a Language", href: "/getting-started/choosing-language" },
  { title: "Second Application", href: "/getting-started/second-application" },
  { title: "Architecture", href: "/concepts/architecture" },
  { title: "Common Mistakes", href: "/getting-started/common-mistakes" },
  { title: "Troubleshooting", href: "/troubleshooting" },
  { title: "Runtime Errors", href: "/troubleshooting-runtime" },

  // Core Concepts
  { title: "Concepts Overview", href: "/concepts" },
  { title: "Nodes", href: "/concepts/core-concepts-nodes" },
  { title: "Communication Patterns", href: "/concepts/communication-overview" },
  { title: "Hub (MPMC)", href: "/concepts/core-concepts-hub" },
  { title: "Link (SPSC)", href: "/concepts/core-concepts-link" },
  { title: "Communication Transport", href: "/concepts/communication-transport" },
  { title: "Local (Shared Memory)", href: "/concepts/core-concepts-shared-memory" },
  { title: "Network Communication", href: "/concepts/network-communication" },
  { title: "Communication Configuration", href: "/concepts/communication-configuration" },
  { title: "Scheduler", href: "/concepts/core-concepts-scheduler" },
  { title: "node! Macro", href: "/concepts/node-macro" },
  { title: "message! Macro", href: "/concepts/message-macro" },
  { title: "Message Types", href: "/concepts/message-types" },
  { title: "Real-Time Nodes", href: "/concepts/realtime-nodes" },
  { title: "Hybrid Nodes", href: "/concepts/hybrid-nodes" },
  { title: "HFrame Transforms", href: "/concepts/hframe" },
  { title: "Robot Architectures", href: "/concepts/robot-architectures" },
  { title: "Multi-Language", href: "/concepts/multi-language" },

  // Rust
  { title: "Rust Overview", href: "/rust" },
  { title: "API Reference", href: "/rust/api" },
  { title: "horus_core", href: "/rust/api/core" },
  { title: "horus_macros", href: "/rust/api/macros" },
  { title: "TensorPool", href: "/rust/api/tensor-pool" },
  { title: "Messages Overview", href: "/rust/api/messages" },
  { title: "Control Messages", href: "/rust/api/control-messages" },
  { title: "Coordination Messages", href: "/rust/api/coordination-messages" },
  { title: "Diagnostics Messages", href: "/rust/api/diagnostics-messages" },
  { title: "Force Messages", href: "/rust/api/force-messages" },
  { title: "I/O Messages", href: "/rust/api/io-messages" },
  { title: "ML Messages", href: "/rust/api/ml-messages" },
  { title: "Navigation Messages", href: "/rust/api/navigation-messages" },
  { title: "Perception Messages", href: "/rust/api/perception-messages" },
  { title: "Vision Messages", href: "/rust/api/vision-messages" },
  { title: "Built-in Nodes", href: "/rust/library/built-in-nodes" },
  { title: "I2C Bus", href: "/rust/library/built-in-nodes/i2c-bus" },
  { title: "SPI Bus", href: "/rust/library/built-in-nodes/spi-bus" },
  { title: "CAN Bus", href: "/rust/library/built-in-nodes/can-bus" },
  { title: "Serial", href: "/rust/library/built-in-nodes/serial" },
  { title: "DC Motor", href: "/rust/library/built-in-nodes/dc-motor" },
  { title: "Servo Controller", href: "/rust/library/built-in-nodes/servo-controller" },
  { title: "Camera", href: "/rust/library/built-in-nodes/camera" },
  { title: "IMU", href: "/rust/library/built-in-nodes/imu" },
  { title: "GPS", href: "/rust/library/built-in-nodes/gps" },
  { title: "LiDAR", href: "/rust/library/built-in-nodes/lidar" },
  { title: "Algorithms", href: "/rust/library/algorithms" },
  { title: "PID Controller", href: "/rust/library/algorithms/pid" },
  { title: "Kalman Filter", href: "/rust/library/algorithms/kalman-filter" },
  { title: "Extended Kalman Filter", href: "/rust/library/algorithms/ekf" },
  { title: "A* Pathfinding", href: "/rust/library/algorithms/astar" },
  { title: "RRT Pathfinding", href: "/rust/library/algorithms/rrt" },
  { title: "Pure Pursuit", href: "/rust/library/algorithms/pure-pursuit" },
  { title: "Differential Drive", href: "/rust/library/algorithms/differential-drive" },
  { title: "Occupancy Grid", href: "/rust/library/algorithms/occupancy-grid" },
  { title: "Sensor Fusion", href: "/rust/library/algorithms/sensor-fusion" },
  { title: "Rust Examples", href: "/rust/examples" },
  { title: "Basic Examples", href: "/rust/examples/basic-examples" },
  { title: "Advanced Examples", href: "/rust/examples/advanced-examples" },

  // Python
  { title: "Python Overview", href: "/python" },
  { title: "Python Bindings", href: "/python/api/python-bindings" },
  { title: "Async Nodes", href: "/python/api/async-nodes" },
  { title: "Message Library", href: "/python/library/python-message-library" },
  { title: "Hardware Nodes", href: "/python/library/python-hardware-nodes" },
  { title: "ML Utilities", href: "/python/library/ml-utilities" },
  { title: "Python Examples", href: "/python/examples" },

  // Simulators
  { title: "Simulators Overview", href: "/simulators" },
  { title: "Sim2D Overview", href: "/simulators/sim2d" },
  { title: "Sim2D Getting Started", href: "/simulators/sim2d/getting-started" },
  { title: "Sim2D Sensors", href: "/simulators/sim2d/sensors" },
  { title: "Sim2D Articulated Robots", href: "/simulators/sim2d/articulated" },
  { title: "Sim2D Configuration", href: "/simulators/sim2d/configuration" },
  { title: "Sim2D Python API", href: "/simulators/sim2d/python-api" },
  { title: "Sim3D Overview", href: "/simulators/sim3d" },
  { title: "Sim3D Installation", href: "/simulators/sim3d/getting-started/installation" },
  { title: "Sim3D Quick Start", href: "/simulators/sim3d/getting-started/quick-start" },
  { title: "Sim3D Robot Models", href: "/simulators/sim3d/getting-started/robots" },
  { title: "Sim3D Sensors", href: "/simulators/sim3d/sensors/overview" },
  { title: "Sim3D Physics", href: "/simulators/sim3d/physics/overview" },
  { title: "Sim3D Reinforcement Learning", href: "/simulators/sim3d/rl/overview" },

  // Development
  { title: "CLI Reference", href: "/development/cli-reference" },
  { title: "Monitor", href: "/development/monitor" },
  { title: "Monitor Security", href: "/development/monitor-security" },
  { title: "Simulation", href: "/development/simulation" },
  { title: "Testing", href: "/development/testing" },
  { title: "Parameters", href: "/development/parameters" },
  { title: "Static Analysis", href: "/development/static-analysis" },
  { title: "Library Reference", href: "/development/library-reference" },
  { title: "Error Handling", href: "/development/error-handling" },
  { title: "AI Integration", href: "/development/ai-integration" },

  // Advanced Topics
  { title: "Scheduler Configuration", href: "/advanced/scheduler-configuration" },
  { title: "Execution Modes", href: "/advanced/execution-modes" },
  { title: "Deterministic Execution", href: "/advanced/deterministic-execution" },
  { title: "GPU Tensor Sharing", href: "/advanced/gpu-tensor-sharing" },
  { title: "Network Backends", href: "/advanced/network-backends" },
  { title: "Scheduling Intelligence", href: "/advanced/scheduling-intelligence" },
  { title: "JIT Compilation", href: "/advanced/jit-compilation" },
  { title: "BlackBox Recorder", href: "/advanced/blackbox" },
  { title: "Circuit Breaker", href: "/advanced/circuit-breaker" },
  { title: "Safety Monitor", href: "/advanced/safety-monitor" },
  { title: "Checkpoint System", href: "/advanced/checkpoint" },
  { title: "Model Registry", href: "/advanced/model-registry" },

  // Package Management
  { title: "Package Management", href: "/package-management/package-management" },
  { title: "Using Prebuilt Nodes", href: "/package-management/using-prebuilt-nodes" },
  { title: "Environment Management", href: "/package-management/environment-management" },
  { title: "Configuration Reference", href: "/package-management/configuration" },

  // Performance
  { title: "Optimization Guide", href: "/performance/performance" },
  { title: "Benchmarks", href: "/performance/benchmarks" },
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
