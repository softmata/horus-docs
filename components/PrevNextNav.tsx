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
  { title: "PodTopic (Ultra-Fast)", href: "/concepts/core-concepts-podtopic" },
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

  // Development
  { title: "CLI Reference", href: "/development/cli-reference" },
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
