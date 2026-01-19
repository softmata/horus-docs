"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiChevronDown, FiChevronRight, FiX } from "react-icons/fi";
import { useState, useEffect } from "react";

interface DocLink {
  title: string;
  href: string;
  order?: number;
  children?: DocLink[];
}

interface SidebarSection {
  title: string;
  links: DocLink[];
}

const sections: SidebarSection[] = [
  {
    title: "Getting Started",
    links: [
      { title: "What is HORUS?", href: "/concepts/what-is-horus", order: 0 },
      { title: "Goals & Vision", href: "/concepts/goals", order: 1 },
      { title: "Complete Beginner's Guide", href: "/getting-started/complete-beginners-guide", order: 2 },
      { title: "Installation", href: "/getting-started/installation", order: 3 },
      { title: "Quick Start", href: "/getting-started/quick-start", order: 4 },
      { title: "Choosing a Language", href: "/getting-started/choosing-language", order: 5 },
      { title: "Second Application", href: "/getting-started/second-application", order: 6 },
      { title: "Architecture", href: "/concepts/architecture", order: 7 },
      { title: "Common Mistakes", href: "/getting-started/common-mistakes", order: 8 },
      { title: "Troubleshooting", href: "/troubleshooting", order: 9 },
      { title: "Runtime Errors", href: "/troubleshooting-runtime", order: 10 },
      { title: "Advanced Examples", href: "/advanced-examples", order: 11 },
    ],
  },
  {
    title: "Core Concepts",
    links: [
      { title: "Overview", href: "/concepts", order: 0 },
      { title: "Core Architecture", href: "/concepts/core", order: 1 },
      { title: "Nodes", href: "/concepts/core-concepts-nodes", order: 2 },
      {
        title: "Communication Patterns",
        href: "/concepts/communication-overview",
        order: 3,
        children: [
          { title: "Topic (Pub/Sub)", href: "/concepts/core-concepts-topic", order: 1 },
          { title: "PodTopic (Ultra-Fast)", href: "/concepts/core-concepts-podtopic", order: 2 },
        ]
      },
      {
        title: "Communication Transport",
        href: "/concepts/communication-transport",
        order: 4,
        children: [
          { title: "Local (Shared Memory)", href: "/concepts/core-concepts-shared-memory", order: 1 },
          { title: "Network", href: "/concepts/network-communication", order: 2 },
          { title: "Configuration", href: "/concepts/communication-configuration", order: 3 },
        ]
      },
      { title: "Scheduler", href: "/concepts/core-concepts-scheduler", order: 5 },
      { title: "node! Macro", href: "/concepts/node-macro", order: 6 },
      { title: "message! Macro", href: "/concepts/message-macro", order: 7 },
      { title: "Message Types", href: "/concepts/message-types", order: 8 },
      { title: "Real-Time Nodes", href: "/concepts/realtime-nodes", order: 9 },
      { title: "Hybrid Nodes", href: "/concepts/hybrid-nodes", order: 10 },
      { title: "HFrame Transforms", href: "/concepts/hframe", order: 11 },
      { title: "Robot Architectures", href: "/concepts/robot-architectures", order: 12 },
      { title: "Multi-Language", href: "/concepts/multi-language", order: 13 },
      {
        title: "Orchestration",
        href: "/concepts/orchestration",
        order: 14,
        children: [
          { title: "Overview", href: "/concepts/orchestration", order: 0 },
          { title: "State Machines", href: "/concepts/state-machines", order: 1 },
          { title: "Mission Planner", href: "/concepts/mission-planner", order: 2 },
        ]
      },
    ],
  },
  {
    title: "Rust",
    links: [
      { title: "Overview", href: "/rust", order: 0 },
      {
        title: "API Reference",
        href: "/rust/api",
        order: 1,
        children: [
          { title: "Overview", href: "/rust/api", order: 0 },
          { title: "horus_core", href: "/rust/api/core", order: 1 },
          { title: "horus_macros", href: "/rust/api/macros", order: 2 },
          { title: "TensorPool", href: "/rust/api/tensor-pool", order: 3 },
          { title: "Tensor Messages", href: "/rust/api/tensor-messages", order: 4 },
          { title: "Hardware Discovery", href: "/rust/api/hardware", order: 5 },
          {
            title: "Messages",
            href: "/rust/api/messages",
            order: 6,
            children: [
              { title: "Overview", href: "/rust/api/messages", order: 0 },
              { title: "Control", href: "/rust/api/control-messages", order: 1 },
              { title: "Coordination", href: "/rust/api/coordination-messages", order: 2 },
              { title: "Diagnostics", href: "/rust/api/diagnostics-messages", order: 3 },
              { title: "Force", href: "/rust/api/force-messages", order: 4 },
              { title: "Geometry", href: "/rust/api/geometry-messages", order: 5 },
              { title: "I/O", href: "/rust/api/io-messages", order: 6 },
              { title: "ML", href: "/rust/api/ml-messages", order: 7 },
              { title: "Navigation", href: "/rust/api/navigation-messages", order: 8 },
              { title: "Perception", href: "/rust/api/perception-messages", order: 9 },
              { title: "Sensor", href: "/rust/api/sensor-messages", order: 10 },
              { title: "Timing", href: "/rust/api/timing-messages", order: 11 },
              { title: "Vision", href: "/rust/api/vision-messages", order: 12 },
            ]
          },
        ]
      },
      {
        title: "Examples",
        href: "/rust/examples",
        order: 2,
        children: [
          { title: "Basic Examples", href: "/rust/examples/basic-examples", order: 1 },
          { title: "Advanced Examples", href: "/rust/examples/advanced-examples", order: 2 },
        ]
      },
    ],
  },
  {
    title: "Python",
    links: [
      { title: "Overview", href: "/python", order: 0 },
      {
        title: "API Reference",
        href: "/python/api",
        order: 1,
        children: [
          { title: "Overview", href: "/python/api", order: 0 },
          { title: "Python Bindings", href: "/python/api/python-bindings", order: 1 },
          { title: "Async Nodes", href: "/python/api/async-nodes", order: 2 },
          { title: "Custom Messages", href: "/python/api/custom-messages", order: 3 },
        ]
      },
      {
        title: "Library",
        href: "/python/library",
        order: 2,
        children: [
          { title: "Overview", href: "/python/library", order: 0 },
          { title: "Message Library", href: "/python/library/python-message-library", order: 1 },
          { title: "Hardware Nodes", href: "/python/library/python-hardware-nodes", order: 2 },
          { title: "ML Utilities", href: "/python/library/ml-utilities", order: 3 },
        ]
      },
      { title: "Examples", href: "/python/examples", order: 3 },
    ],
  },
  {
    title: "Development",
    links: [
      { title: "CLI Reference", href: "/development/cli-reference", order: 1 },
      { title: "Monitor", href: "/development/monitor", order: 2 },
      { title: "Monitor Security", href: "/development/monitor-security", order: 3 },
      { title: "Testing", href: "/development/testing", order: 5 },
      { title: "Parameters", href: "/development/parameters", order: 6 },
      { title: "Static Analysis", href: "/development/static-analysis", order: 7 },
      { title: "Library Reference", href: "/development/library-reference", order: 8 },
      { title: "Error Handling", href: "/development/error-handling", order: 9 },
      { title: "AI Integration", href: "/development/ai-integration", order: 10 },
      { title: "ROS2 Bridge", href: "/development/ros2-bridge", order: 11 },
      { title: "Hardware Discovery", href: "/development/hardware-discovery", order: 12 },
    ],
  },
  {
    title: "Advanced Topics",
    links: [
      { title: "Scheduler Configuration", href: "/advanced/scheduler-configuration", order: 1 },
      { title: "Execution Modes", href: "/advanced/execution-modes", order: 2 },
      { title: "Deterministic Execution", href: "/advanced/deterministic-execution", order: 3 },
      { title: "GPU Tensor Sharing", href: "/advanced/gpu-tensor-sharing", order: 4 },
      { title: "Network Backends", href: "/advanced/network-backends", order: 5 },
      { title: "Scheduling Intelligence", href: "/advanced/scheduling-intelligence", order: 6 },
      { title: "JIT Compilation", href: "/advanced/jit-compilation", order: 7 },
      { title: "BlackBox Recorder", href: "/advanced/blackbox", order: 8 },
      { title: "Circuit Breaker", href: "/advanced/circuit-breaker", order: 9 },
      { title: "Safety Monitor", href: "/advanced/safety-monitor", order: 10 },
      { title: "Checkpoint System", href: "/advanced/checkpoint", order: 11 },
      { title: "Model Registry", href: "/advanced/model-registry", order: 12 },
      { title: "Record & Replay", href: "/advanced/record-replay", order: 13 },
      { title: "Redundancy", href: "/advanced/redundancy", order: 14 },
      { title: "Telemetry", href: "/advanced/telemetry", order: 15 },
      { title: "Real-Time Configuration", href: "/advanced/rt-config", order: 16 },
    ],
  },
  {
    title: "Package Management",
    links: [
      { title: "Overview", href: "/package-management/package-management", order: 1 },
      { title: "Using Prebuilt Nodes", href: "/package-management/using-prebuilt-nodes", order: 2 },
      { title: "Environment Management", href: "/package-management/environment-management", order: 3 },
      { title: "Configuration Reference", href: "/package-management/configuration", order: 4 },
    ],
  },
  {
    title: "Performance",
    links: [
      { title: "Optimization Guide", href: "/performance/performance", order: 1 },
      { title: "Benchmarks", href: "/performance/benchmarks", order: 2 },
    ],
  },
];

interface DocsSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function DocsSidebar({ isOpen = true, onClose }: DocsSidebarProps) {
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    "Getting Started": true,
    "Core Concepts": true,
    "Rust": true,
    "Python": true,
    "Development": true,
    "Advanced Topics": true,
    "Package Management": true,
    "Performance": true,
  });

  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const toggleItem = (href: string) => {
    setExpandedItems((prev) => ({ ...prev, [href]: !prev[href] }));
  };

  const handleLinkClick = () => {
    if (onClose) {
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen && onClose) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const renderLink = (link: DocLink, depth: number = 0) => {
    const isActive = pathname === link.href;
    const hasChildren = link.children && link.children.length > 0;
    const isExpanded = expandedItems[link.href];

    return (
      <li key={link.href}>
        <div className="flex items-center">
          {hasChildren && (
            <button
              onClick={() => toggleItem(link.href)}
              className="p-1 hover:bg-[var(--surface)] rounded transition-colors touch-manipulation"
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? (
                <FiChevronDown className="w-3 h-3 text-[var(--text-secondary)]" />
              ) : (
                <FiChevronRight className="w-3 h-3 text-[var(--text-secondary)]" />
              )}
            </button>
          )}
          <Link
            href={link.href}
            onClick={handleLinkClick}
            className={`flex-1 block px-3 py-2 rounded text-sm transition-colors touch-manipulation ${
              hasChildren ? "" : depth > 0 ? "ml-4" : ""
            } ${
              isActive
                ? "bg-[var(--surface)] text-[var(--text)] font-medium border-l-2 border-[var(--accent)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)]"
            }`}
          >
            {link.title}
          </Link>
        </div>

        {hasChildren && isExpanded && (
          <ul className="space-y-1 ml-6 mt-1">
            {link.children!
              .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
              .map((child) => renderLink(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  const sidebarContent = (
    <div className="p-6 space-y-6 pb-12">
      {sections.map((section) => {
        const isExpanded = expandedSections[section.title];

        return (
          <div key={section.title}>
            <button
              onClick={() => toggleSection(section.title)}
              className="flex items-center gap-2 w-full text-left font-semibold text-[var(--text)] hover:text-[var(--text-muted)] transition-colors mb-2 touch-manipulation"
            >
              {isExpanded ? (
                <FiChevronDown className="w-4 h-4" />
              ) : (
                <FiChevronRight className="w-4 h-4" />
              )}
              {section.title}
            </button>

            {isExpanded && (
              <ul className="space-y-1 ml-6">
                {section.links
                  .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
                  .map((link) => renderLink(link, 0))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );

  if (!onClose) {
    return (
      <aside className="hidden lg:block w-64 border-r border-[var(--border)] bg-[var(--surface)] h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
        {sidebarContent}
      </aside>
    );
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-[var(--bg)] border-r border-[var(--border)] z-50 lg:hidden transform transition-transform duration-300 ease-in-out overflow-y-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="sticky top-0 bg-[var(--bg)] border-b border-[var(--border)] p-4 flex items-center justify-between">
          <span className="font-semibold text-[var(--text)]">Documentation</span>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--surface)] transition-colors touch-manipulation"
            aria-label="Close menu"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>
        {sidebarContent}
      </aside>
    </>
  );
}
