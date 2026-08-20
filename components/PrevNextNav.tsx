"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiArrowLeft, FiArrowRight } from "react-icons/fi";
import { localeFromPathname, localizedHref, stripLocale } from "@/lib/i18n";

interface DocLink {
  title: string;
  href: string;
}

// Flattened list of all doc pages in order - must match DocsSidebar.tsx
const allPages: DocLink[] = [
  // Getting Started
  { title: "What is HORUS?", href: "/concepts/what-is-horus" },
  { title: "Goals & Vision", href: "/concepts/goals" },
  { title: "Installation", href: "/getting-started/installation" },
  { title: "Quick Start", href: "/getting-started/quick-start" },
  { title: "Choosing a Language", href: "/getting-started/choosing-language" },
  { title: "Second Application", href: "/getting-started/second-application" },
  { title: "Architecture", href: "/concepts/architecture" },
  { title: "Common Mistakes", href: "/getting-started/common-mistakes" },
  { title: "Troubleshooting", href: "/troubleshooting" },
  { title: "Advanced Examples", href: "/rust/examples/advanced-examples" },

  // Core Concepts
  { title: "Overview", href: "/concepts" },
  { title: "Nodes", href: "/concepts/core-concepts-nodes" },
  { title: "Communication Patterns", href: "/concepts/communication-overview" },
  { title: "Topic (Pub/Sub)", href: "/concepts/core-concepts-topic" },
  { title: "POD Types", href: "/concepts/core-concepts-podtopic" },
  { title: "Services (Beta)", href: "/concepts/services" },
  { title: "Actions (Beta)", href: "/concepts/actions" },
  { title: "Scheduler", href: "/concepts/core-concepts-scheduler" },
  { title: "node! Macro", href: "/concepts/node-macro" },
  { title: "Message Types", href: "/concepts/message-types" },
  { title: "Real-Time Nodes", href: "/concepts/realtime-nodes" },
  { title: "Transform Frame", href: "/concepts/transform-frame" },
  { title: "Multi-Language", href: "/concepts/multi-language" },

  // Rust
  { title: "Rust Overview", href: "/rust" },
  { title: "API Reference", href: "/rust/api" },
  { title: "horus_core", href: "/rust/api/core" },
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

  { title: "Rust Guide", href: "/rust-guide" },
  { title: "Topics & Communication", href: "/rust-guide/topics" },
  { title: "Clock & Time API", href: "/rust/api/clock-api" },
  { title: "Python Guide", href: "/python-guide" },
  { title: "Nodes & Topics", href: "/python-guide/nodes-topics" },
  { title: "Production Deployment", href: "/advanced/deployment" },
  { title: "Recipe: ROS 2 Bridge", href: "/recipes/ros2-bridge" },

  // C++
  { title: "C++ API Reference", href: "/cpp/api" },
  { title: "Node API", href: "/cpp/api/node" },
  { title: "Scheduler API", href: "/cpp/api/scheduler" },
  { title: "Publisher & Subscriber API", href: "/cpp/api/topic" },
  { title: "Services & Actions API", href: "/cpp/api/services" },
  { title: "TransformFrame API", href: "/cpp/api/transform" },
  { title: "Runtime Parameters API", href: "/cpp/api/params" },
  { title: "TensorPool, Image & PointCloud API", href: "/cpp/api/pool" },
  { title: "Logging & BlackBox API", href: "/cpp/api/logging" },
  { title: "Duration & Frequency API", href: "/cpp/api/duration" },
  { title: "Control Messages", href: "/cpp/api/control-messages" },
  { title: "Detection & Vision Messages", href: "/cpp/api/detection-messages" },
  { title: "Diagnostics Messages", href: "/cpp/api/diagnostics-messages" },
  { title: "Force & Tactile Messages", href: "/cpp/api/force-messages" },
  { title: "Geometry Messages", href: "/cpp/api/geometry-messages" },
  { title: "Navigation Messages", href: "/cpp/api/navigation-messages" },
  { title: "Sensor Messages", href: "/cpp/api/sensor-messages" },
  { title: "Tracking & Perception Messages", href: "/cpp/api/tracking-messages" },
  { title: "C++ Basic Examples", href: "/cpp/examples/basic" },
  { title: "C++ Advanced Examples", href: "/cpp/examples/advanced" },
  { title: "C++ Error Handling", href: "/cpp/error-handling" },
  { title: "C++ Hardware Integration", href: "/cpp/hardware" },
  { title: "C++ Real-Time Guide", href: "/cpp/realtime" },
  { title: "C++ Performance Guide", href: "/cpp/performance" },
  { title: "C++ Testing Guide", href: "/cpp/testing" },

  // C++ Tutorials
  { title: "1. Sensor Node", href: "/tutorials/01-sensor-node-cpp" },
  { title: "2. Motor Controller", href: "/tutorials/02-motor-controller-cpp" },
  { title: "3. Full Robot", href: "/tutorials/03-full-robot-cpp" },
  { title: "4. Custom Messages", href: "/tutorials/04-custom-messages-cpp" },
  { title: "5. Hardware & Real-Time", href: "/tutorials/05-hardware-rt-cpp" },
  { title: "6. Services & Actions", href: "/tutorials/06-services-actions-cpp" },
  { title: "7. Parameters Deep Dive", href: "/tutorials/07-params-deep-dive-cpp" },
  { title: "8. Multi-Process", href: "/tutorials/08-multi-process-cpp" },
  { title: "9. Record & Replay", href: "/tutorials/09-record-replay-cpp" },
  { title: "10. Write a Driver", href: "/tutorials/10-write-a-driver-cpp" },
  { title: "Real-Time Control", href: "/tutorials/realtime-control-cpp" },
  { title: "Migrating from ROS 2", href: "/tutorials/migrating-from-ros2-cpp" },

  // Development
  { title: "CLI Reference", href: "/development/cli-reference" },
  { title: "Environment Variables", href: "/development/environment-variables" },
  { title: "Monitor", href: "/development/monitor" },
  { title: "Testing", href: "/development/testing" },
  { title: "Parameters", href: "/development/parameters" },
  { title: "Static Analysis", href: "/development/static-analysis" },
  { title: "Error Handling", href: "/development/error-handling" },
  { title: "AI Integration", href: "/development/ai-integration" },

  // Advanced Topics
  { title: "Scheduler Configuration", href: "/advanced/scheduler-configuration" },
  { title: "Execution Modes", href: "/advanced/execution-modes" },
  { title: "Deterministic Execution", href: "/advanced/deterministic-execution" },
  { title: "Network Backends", href: "/advanced/network-backends" },
  { title: "Scheduling Intelligence", href: "/advanced/scheduling-intelligence" },
  { title: "BlackBox Recorder", href: "/advanced/blackbox" },
  { title: "Circuit Breaker", href: "/advanced/circuit-breaker" },
  { title: "Safety Monitor", href: "/advanced/safety-monitor" },
  { title: "Record & Replay", href: "/advanced/record-replay" },
  { title: "Real-Time Configuration", href: "/advanced/rt-config" },

  // Plugins
  { title: "Plugins Overview", href: "/plugins" },
  { title: "Creating CLI Plugins", href: "/plugins/creating-plugins" },
  { title: "Managing Plugins", href: "/plugins/managing-plugins" },

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
  const locale = localeFromPathname(pathname);
  const unlocalizedPathname = stripLocale(pathname);

  const currentIndex = allPages.findIndex(page => page.href === unlocalizedPathname);
  const prevPage = currentIndex > 0 ? allPages[currentIndex - 1] : null;
  const nextPage = currentIndex < allPages.length - 1 ? allPages[currentIndex + 1] : null;

  if (!prevPage && !nextPage) {
    return null;
  }

  return (
    <nav className="mt-12 pt-6 border-t border-[var(--border)] flex justify-between items-center gap-4">
      {prevPage ? (
        <Link
          href={localizedHref(prevPage.href, locale)}
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
          href={localizedHref(nextPage.href, locale)}
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
