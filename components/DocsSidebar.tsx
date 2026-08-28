"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiChevronDown, FiChevronRight, FiX } from "react-icons/fi";
import { useState, useEffect } from "react";
import { localeFromPathname, localizedHref, stripLocale } from "@/lib/i18n";

export interface DocLink {
  title: string;
  href: string;
  order?: number;
  children?: DocLink[];
}

export interface SidebarSection {
  title: string;
  links: DocLink[];
}

/// The one navigation order.
///
/// Exported because `PrevNextNav` used to hold a hand-copied flat version of
/// this list, with a comment saying it "must match DocsSidebar.tsx". It did not
/// — the two held the same set of pages but diverged in position by up to 61
/// places, so Next/Prev walked the Rust section straight past the Rust Guide
/// into Examples and only reached the guide after all of Python. A copy that
/// must be kept in sync by hand is a copy that will not be.
export const sections: SidebarSection[] = [
  {
    title: "Getting Started",
    links: [
      { title: "What is HORUS?", href: "/concepts/what-is-horus", order: 0 },
      { title: "Goals & Vision", href: "/concepts/goals", order: 1 },
      { title: "Installation", href: "/getting-started/installation", order: 2 },
      { title: "Quick Start", href: "/getting-started/quick-start", order: 3 },
      { title: "Choosing a Language", href: "/getting-started/choosing-language", order: 4 },
      { title: "Second Application", href: "/getting-started/second-application", order: 5 },
      { title: "Coming from ROS 2", href: "/learn/coming-from-ros2", order: 6 },
      { title: "Architecture", href: "/concepts/architecture", order: 7 },
      { title: "Common Mistakes", href: "/getting-started/common-mistakes", order: 8 },
      { title: "Troubleshooting", href: "/troubleshooting", order: 9 },
      { title: "Example Projects", href: "/examples", order: 10 },
      { title: "Advanced Examples", href: "/rust/examples/advanced-examples", order: 11 },
    ],
  },
  {
    title: "Learn",
    links: [{ title: "Overview", href: "/learn", order: 0 }],
  },
  {
    title: "Core Concepts",
    links: [
      { title: "Overview", href: "/concepts", order: 0 },
      { title: "Nodes", href: "/concepts/core-concepts-nodes", order: 2 },
      {
        title: "Communication Patterns",
        href: "/concepts/communication-overview",
        order: 3,
        children: [
          { title: "Topic (Pub/Sub)", href: "/concepts/core-concepts-topic", order: 1 },
          { title: "POD Types", href: "/concepts/core-concepts-podtopic", order: 2 },
          { title: "Services (Beta)", href: "/concepts/services", order: 3 },
          { title: "Actions (Beta)", href: "/concepts/actions", order: 4 },
        ]
      },
      { title: "Scheduler", href: "/concepts/core-concepts-scheduler", order: 5 },
      { title: "node! Macro", href: "/concepts/node-macro", order: 6 },
      { title: "Message Types", href: "/concepts/message-types", order: 7 },
      { title: "Execution Classes", href: "/concepts/execution-classes", order: 8 },
      { title: "Real-Time Nodes", href: "/concepts/realtime-nodes", order: 9 },
      { title: "Transform Frame", href: "/concepts/transform-frame", order: 10 },
      { title: "Multi-Language", href: "/concepts/multi-language", order: 13 },
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
          {
            title: "Messages",
            href: "/rust/api/messages",
            order: 6,
            children: [
              { title: "Overview", href: "/rust/api/messages", order: 0 },
              { title: "Control", href: "/rust/api/control-messages", order: 1 },
              { title: "Diagnostics", href: "/rust/api/diagnostics-messages", order: 2 },
              { title: "Force", href: "/rust/api/force-messages", order: 4 },
              { title: "Geometry", href: "/rust/api/geometry-messages", order: 5 },

              { title: "ML", href: "/rust/api/ml-messages", order: 7 },
              { title: "Navigation", href: "/rust/api/navigation-messages", order: 8 },
              { title: "Perception", href: "/rust/api/perception-messages", order: 9 },
              { title: "Sensor", href: "/rust/api/sensor-messages", order: 10 },
              { title: "Vision", href: "/rust/api/vision-messages", order: 10 },
            ]
          },
        ]
      },
      {
        title: "Guide",
        href: "/rust-guide",
        order: 2,
        children: [
          { title: "Overview", href: "/rust-guide", order: 0 },
          { title: "Topics & Communication", href: "/rust-guide/topics", order: 1 },
        ]
      },
      { title: "Clock & Time API", href: "/rust/api/clock-api", order: 3 },
      {
        title: "Examples",
        href: "/rust/examples",
        order: 4,
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
        title: "Guide",
        href: "/python-guide",
        order: 3,
        children: [
          { title: "Overview", href: "/python-guide", order: 0 },
          { title: "Nodes & Topics", href: "/python-guide/nodes-topics", order: 1 },
        ]
      },
      {
        title: "Library",
        href: "/python/library/python-message-library",
        order: 2,
        children: [
          { title: "Message Library", href: "/python/library/python-message-library", order: 1 },
          { title: "ML Utilities", href: "/python/library/ml-utilities", order: 2 },
        ]
      },
      { title: "Examples", href: "/python/examples", order: 3 },
    ],
  },
  {
    title: "C++",
    links: [
      { title: "Overview", href: "/cpp", order: -1 },
      { title: "API Reference", href: "/cpp/api", order: 0,
        children: [
          { title: "Overview", href: "/cpp/api", order: 0 },
          { title: "Node", href: "/cpp/api/node", order: 1 },
          { title: "Scheduler", href: "/cpp/api/scheduler", order: 2 },
          { title: "Publisher & Subscriber", href: "/cpp/api/topic", order: 3 },
          { title: "Services & Actions", href: "/cpp/api/services", order: 4 },
          { title: "TransformFrame", href: "/cpp/api/transform", order: 5 },
          { title: "Runtime Parameters", href: "/cpp/api/params", order: 6 },
          { title: "TensorPool, Image & PointCloud", href: "/cpp/api/pool", order: 7 },
          { title: "Logging & BlackBox", href: "/cpp/api/logging", order: 8 },
          { title: "Duration & Frequency", href: "/cpp/api/duration", order: 9 },
          {
            title: "Messages",
            href: "/cpp/api/sensor-messages",
            order: 10,
            children: [
              { title: "Control", href: "/cpp/api/control-messages", order: 1 },
              { title: "Detection & Vision", href: "/cpp/api/detection-messages", order: 2 },
              { title: "Diagnostics", href: "/cpp/api/diagnostics-messages", order: 3 },
              { title: "Force & Tactile", href: "/cpp/api/force-messages", order: 4 },
              { title: "Geometry", href: "/cpp/api/geometry-messages", order: 5 },
              { title: "Navigation", href: "/cpp/api/navigation-messages", order: 6 },
              { title: "Sensor", href: "/cpp/api/sensor-messages", order: 7 },
              { title: "Tracking & Perception", href: "/cpp/api/tracking-messages", order: 8 },
            ]
          },
        ]
      },
      { title: "Examples", href: "/cpp/examples/basic", order: 1,
        children: [
          { title: "Basic Examples", href: "/cpp/examples/basic", order: 0 },
          { title: "Advanced Examples", href: "/cpp/examples/advanced", order: 1 },
        ]
      },
      { title: "Error Handling", href: "/cpp/error-handling", order: 2 },
      { title: "Hardware Integration", href: "/cpp/hardware", order: 3 },
      { title: "Real-Time Guide", href: "/cpp/realtime", order: 4 },
      { title: "Performance Guide", href: "/cpp/performance", order: 5 },
      { title: "Testing Guide", href: "/cpp/testing", order: 6 },
    ],
  },
  {
    title: "Rust Tutorials",
    links: [
      { title: "All Tutorials", href: "/tutorials", order: -1 },
      { title: "1. Sensor Node", href: "/tutorials/01-sensor-node-rust", order: 0 },
      { title: "2. Motor Controller", href: "/tutorials/02-motor-controller-rust", order: 1 },
      { title: "3. Full Robot", href: "/tutorials/03-full-robot-rust", order: 2 },
      { title: "4. Custom Messages", href: "/tutorials/04-custom-messages-rust", order: 3 },
      { title: "5. Hardware & Real-Time", href: "/tutorials/05-hardware-rt-rust", order: 4 },
      { title: "6. Services & Actions", href: "/tutorials/06-services-actions-rust", order: 5 },
      { title: "7. Parameters Deep Dive", href: "/tutorials/07-params-deep-dive-rust", order: 6 },
      { title: "8. Multi-Process", href: "/tutorials/08-multi-process-rust", order: 7 },
      { title: "9. Record & Replay", href: "/tutorials/09-record-replay-rust", order: 8 },
      { title: "10. Write a Driver", href: "/tutorials/10-write-a-driver-rust", order: 9 },
      { title: "Real-Time Control", href: "/tutorials/realtime-control-rust", order: 10 },
      { title: "Migrating from ROS 2", href: "/tutorials/migrating-from-ros2-rust", order: 11 },
    ],
  },
  {
    title: "Python Tutorials",
    links: [
      { title: "1. Sensor Node", href: "/tutorials/01-sensor-node-python", order: 0 },
      { title: "2. Motor Controller", href: "/tutorials/02-motor-controller-python", order: 1 },
      { title: "3. Full Robot", href: "/tutorials/03-full-robot-python", order: 2 },
      { title: "4. Custom Messages", href: "/tutorials/04-custom-messages-python", order: 3 },
      { title: "5. Hardware & Real-Time", href: "/tutorials/05-hardware-rt-python", order: 4 },
      { title: "6. Services & Actions", href: "/tutorials/06-services-actions-python", order: 5 },
      { title: "7. Parameters Deep Dive", href: "/tutorials/07-params-deep-dive-python", order: 6 },
      { title: "8. Multi-Process", href: "/tutorials/08-multi-process-python", order: 7 },
      { title: "9. Record & Replay", href: "/tutorials/09-record-replay-python", order: 8 },
      { title: "10. Write a Driver", href: "/tutorials/10-write-a-driver-python", order: 9 },
      { title: "Real-Time Control", href: "/tutorials/realtime-control-python", order: 10 },
      { title: "Migrating from ROS 2", href: "/tutorials/migrating-from-ros2-python", order: 11 },
    ],
  },
  {
    title: "C++ Tutorials",
    links: [
      { title: "1. Sensor Node", href: "/tutorials/01-sensor-node-cpp", order: 0 },
      { title: "2. Motor Controller", href: "/tutorials/02-motor-controller-cpp", order: 1 },
      { title: "3. Full Robot", href: "/tutorials/03-full-robot-cpp", order: 2 },
      { title: "4. Custom Messages", href: "/tutorials/04-custom-messages-cpp", order: 3 },
      { title: "5. Hardware & Real-Time", href: "/tutorials/05-hardware-rt-cpp", order: 4 },
      { title: "6. Services & Actions", href: "/tutorials/06-services-actions-cpp", order: 5 },
      { title: "7. Parameters Deep Dive", href: "/tutorials/07-params-deep-dive-cpp", order: 6 },
      { title: "8. Multi-Process", href: "/tutorials/08-multi-process-cpp", order: 7 },
      { title: "9. Record & Replay", href: "/tutorials/09-record-replay-cpp", order: 8 },
      { title: "10. Write a Driver", href: "/tutorials/10-write-a-driver-cpp", order: 9 },
      { title: "Real-Time Control", href: "/tutorials/realtime-control-cpp", order: 10 },
      { title: "Migrating from ROS 2", href: "/tutorials/migrating-from-ros2-cpp", order: 11 },
    ],
  },
  {
    title: "Development",
    links: [
      { title: "Overview", href: "/development", order: 0 },
      { title: "CLI Reference", href: "/development/cli-reference", order: 1 },
      { title: "Custom Messages", href: "/development/custom-messages", order: 15 },
      { title: "Environment Variables", href: "/development/environment-variables", order: 16 },
      { title: "Monitor", href: "/development/monitor", order: 2 },
      { title: "Testing", href: "/development/testing", order: 3 },
      { title: "Parameters", href: "/development/parameters", order: 4 },
      { title: "Static Analysis", href: "/development/static-analysis", order: 5 },
      { title: "Error Handling", href: "/development/error-handling", order: 6 },
      { title: "AI Integration", href: "/development/ai-integration", order: 7 },
    ],
  },
  {
    title: "Advanced Topics",
    links: [
      { title: "Overview", href: "/advanced", order: 0 },
      { title: "Scheduler Configuration", href: "/advanced/scheduler-configuration", order: 1 },
      { title: "Execution Modes", href: "/advanced/execution-modes", order: 2 },
      { title: "Deterministic Execution", href: "/advanced/deterministic-execution", order: 3 },
      { title: "Network Backends", href: "/advanced/network-backends", order: 5 },
      { title: "Scheduling Intelligence", href: "/advanced/scheduling-intelligence", order: 6 },
      { title: "BlackBox Recorder", href: "/advanced/blackbox", order: 7 },
      { title: "Production Deployment", href: "/advanced/deployment", order: 8 },
      { title: "Recipes", href: "/recipes", order: 11 },
      { title: "Recipe: ROS 2 Bridge", href: "/recipes/ros2-bridge", order: 12 },
      { title: "Circuit Breaker", href: "/advanced/circuit-breaker", order: 9 },
      { title: "Safety Monitor", href: "/advanced/safety-monitor", order: 10 },
      { title: "Record & Replay", href: "/advanced/record-replay", order: 12 },
      { title: "Real-Time Configuration", href: "/advanced/rt-config", order: 13 },
    ],
  },
  {
    title: "Plugins",
    links: [
      { title: "Overview", href: "/plugins", order: 0 },
      { title: "Creating CLI Plugins", href: "/plugins/creating-plugins", order: 1 },
      { title: "Managing Plugins", href: "/plugins/managing-plugins", order: 2 },
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
      { title: "Overview", href: "/performance", order: 0 },
      { title: "Optimization Guide", href: "/performance/performance", order: 1 },
      { title: "Benchmarks", href: "/performance/benchmarks", order: 2 },
    ],
  },
  {
    title: "Standard Library",
    links: [{ title: "Overview", href: "/stdlib", order: 0 }],
  },
  {
    title: "Operations",
    links: [{ title: "Overview", href: "/operations", order: 0 }],
  },
  {
    title: "API Reference",
    links: [{ title: "Overview", href: "/reference", order: 0 }],
  },
];

interface DocsSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function DocsSidebar({ isOpen = true, onClose }: DocsSidebarProps) {
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  const unlocalizedPathname = stripLocale(pathname);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    "Getting Started": true,
    "Core Concepts": true,
    "Rust": true,
    "Python": true,
    "Development": true,
    "Advanced Topics": true,
    "Plugins": true,
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
    const isActive = unlocalizedPathname === link.href;
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
            href={localizedHref(link.href, locale)}
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
