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
      { title: "Why HORUS?", href: "/learn/why-horus", order: 1 },
      { title: "HORUS vs ROS2", href: "/learn/vs-ros2", order: 1 },
      { title: "Installation", href: "/getting-started/installation", order: 2 },
      { title: "Quick Start (Rust)", href: "/getting-started/quick-start", order: 3 },
      { title: "Quick Start (Python)", href: "/getting-started/quick-start-python", order: 3 },
      { title: "Choosing a Language", href: "/getting-started/choosing-language", order: 4 },
      { title: "Second Application", href: "/getting-started/second-application", order: 5 },
      { title: "Architecture", href: "/concepts/architecture", order: 6 },
      { title: "Common Mistakes", href: "/getting-started/common-mistakes", order: 7 },
      { title: "Troubleshooting", href: "/troubleshooting", order: 8 },
      { title: "Advanced Examples", href: "/rust/examples/advanced-examples", order: 9 },
    ],
  },
  {
    title: "Tutorials",
    links: [
      { title: "Overview", href: "/tutorials", order: 0 },
      { title: "IMU Sensor Node", href: "/tutorials/01-sensor-node", order: 1 },
      { title: "Motor Controller", href: "/tutorials/02-motor-controller", order: 2 },
      { title: "Full Robot Integration", href: "/tutorials/03-full-robot", order: 3 },
      { title: "Real-Time Control", href: "/tutorials/realtime-control", order: 4 },
      { title: "Custom Message Types", href: "/tutorials/04-custom-messages", order: 5 },
      { title: "Hardware Drivers", href: "/tutorials/05-hardware-drivers", order: 6 },
    ],
  },
  {
    title: "Recipes",
    links: [
      { title: "Overview", href: "/recipes", order: 1 },
      { title: "Differential Drive", href: "/recipes/differential-drive", order: 2 },
      { title: "IMU Reader", href: "/recipes/imu-reader", order: 3 },
      { title: "PID Controller", href: "/recipes/pid-controller", order: 4 },
      { title: "LiDAR Obstacle Avoidance", href: "/recipes/lidar-obstacle-avoidance", order: 5 },
      { title: "Servo Controller", href: "/recipes/servo-controller", order: 6 },
      { title: "Multi-Sensor Fusion", href: "/recipes/multi-sensor-fusion", order: 7 },
      { title: "Emergency Stop", href: "/recipes/emergency-stop", order: 8 },
      { title: "Telemetry Logger", href: "/recipes/telemetry-logger", order: 9 },
      { title: "Python CV Node", href: "/recipes/python-cv-node", order: 10 },
      { title: "Transform Frames", href: "/recipes/transform-frames", order: 11 },
      { title: "ROS2 Bridge", href: "/recipes/ros2-bridge", order: 12 },
    ],
  },
  {
    title: "Core Concepts",
    links: [
      { title: "Overview", href: "/concepts", order: 0 },
      { title: "Nodes", href: "/concepts/nodes-beginner", order: 1 },
      { title: "Topics", href: "/concepts/topics-beginner", order: 2 },
      { title: "Scheduler", href: "/concepts/scheduler-beginner", order: 3 },
      {
        title: "Deep Dive",
        href: "/concepts/core-concepts-nodes",
        order: 4,
        children: [
          { title: "Nodes (Full Reference)", href: "/concepts/core-concepts-nodes", order: 1 },
          { title: "Topic (Full Reference)", href: "/concepts/core-concepts-topic", order: 2 },
          { title: "Scheduler (Full Reference)", href: "/concepts/core-concepts-scheduler", order: 3 },
          { title: "Message Performance", href: "/concepts/core-concepts-podtopic", order: 4 },
          { title: "Services (Beta)", href: "/concepts/services", order: 5 },
          { title: "Actions (Beta)", href: "/concepts/actions", order: 6 },
        ]
      },
      { title: "Execution Classes", href: "/concepts/execution-classes", order: 5 },
      { title: "Choosing Configuration", href: "/concepts/choosing-configuration", order: 6 },
      { title: "node! Macro", href: "/concepts/node-macro", order: 7 },
      { title: "Message Types", href: "/concepts/message-types", order: 7 },
      { title: "Transform Frame", href: "/concepts/transform-frame", order: 10 },
      { title: "Communication Overview", href: "/concepts/communication-overview", order: 11 },
      { title: "Real-Time", href: "/concepts/real-time", order: 12 },
      { title: "Multi-Language", href: "/concepts/multi-language", order: 13 },
      { title: "Multi-Process", href: "/concepts/multi-process", order: 14 },
      { title: "horus.toml", href: "/concepts/horus-toml", order: 15 },
    ],
  },
  {
    title: "Rust",
    links: [
      { title: "Overview", href: "/rust", order: 0 },
      { title: "Time API", href: "/rust/time-api", order: 1 },
      {
        title: "API Reference",
        href: "/rust/api",
        order: 2,
        children: [
          { title: "Overview", href: "/rust/api", order: 0 },
          { title: "Scheduler", href: "/rust/api/scheduler", order: 1 },
          { title: "Topic", href: "/rust/api/topic", order: 2 },
          { title: "Services", href: "/rust/api/services", order: 3 },
          { title: "Actions", href: "/rust/api/actions", order: 4 },
          { title: "TransformFrame", href: "/rust/api/transform-frame", order: 5 },
          { title: "Image", href: "/rust/api/image", order: 6 },
          { title: "PointCloud", href: "/rust/api/pointcloud", order: 7 },
          { title: "DepthImage", href: "/rust/api/depth-image", order: 8 },
          { title: "Tensor & Device", href: "/rust/api/tensor", order: 9 },
          { title: "TensorPool", href: "/rust/api/tensor-pool", order: 10 },
          { title: "RuntimeParams", href: "/rust/api/runtime-params", order: 11 },
          { title: "Driver API", href: "/rust/api/drivers", order: 12 },
          { title: "Error Types", href: "/rust/api/error-types", order: 13 },
          { title: "DurationExt", href: "/rust/api/duration-ext", order: 14 },
          { title: "Rate & Stopwatch", href: "/rust/api/rate-stopwatch", order: 15 },
          { title: "Feature Flags", href: "/rust/api/feature-flags", order: 16 },
          { title: "Clock API", href: "/rust/api/clock-api", order: 17 },
          { title: "GenericMessage", href: "/rust/api/generic-message", order: 18 },
          { title: "horus_macros", href: "/rust/api/macros", order: 19 },
          { title: "Tensor Messages", href: "/rust/api/tensor-messages", order: 20 },
          {
            title: "Messages by Domain",
            href: "/rust/api/messages",
            order: 21,
            children: [
              { title: "Overview", href: "/rust/api/messages", order: 0 },
              { title: "Geometry", href: "/rust/api/geometry-messages", order: 1 },
              { title: "Sensor", href: "/rust/api/sensor-messages", order: 2 },
              { title: "Control", href: "/rust/api/control-messages", order: 3 },
              { title: "Navigation", href: "/rust/api/navigation-messages", order: 4 },
              { title: "Perception", href: "/rust/api/perception-messages", order: 5 },
              { title: "Vision", href: "/rust/api/vision-messages", order: 6 },
              { title: "Diagnostics", href: "/rust/api/diagnostics-messages", order: 7 },
              { title: "Force", href: "/rust/api/force-messages", order: 8 },
              { title: "Input", href: "/rust/api/input-messages", order: 9 },
              { title: "Clock", href: "/rust/api/clock-messages", order: 10 },
              { title: "ML & Segmentation", href: "/rust/api/ml-messages", order: 11 },
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
      { title: "Overview", href: "/python-guide", order: 0 },
      { title: "Nodes & Topics", href: "/python-guide/nodes-topics", order: 0 },
      {
        title: "API Reference",
        href: "/python/api",
        order: 1,
        children: [
          { title: "Overview", href: "/python/api", order: 0 },
          { title: "Python Bindings", href: "/python/api/python-bindings", order: 1 },
          { title: "Memory Types", href: "/python/api/memory-types", order: 2 },
          { title: "Perception", href: "/python/api/perception", order: 3 },
          { title: "TransformFrame", href: "/python/api/transform-frame", order: 4 },
          { title: "Async Nodes", href: "/python/api/async-nodes", order: 5 },
          { title: "Custom Messages", href: "/python/api/custom-messages", order: 6 },
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
    title: "Development",
    links: [
      { title: "CLI Reference", href: "/development/cli-reference", order: 1 },
      { title: "Monitor", href: "/development/monitor", order: 2 },
      { title: "Testing", href: "/development/testing", order: 3 },
      { title: "Debugging", href: "/development/debugging", order: 4 },
      { title: "Parameters", href: "/development/parameters", order: 5 },
      { title: "Static Analysis", href: "/development/static-analysis", order: 6 },
      { title: "Error Handling", href: "/development/error-handling", order: 7 },
      { title: "AI Integration", href: "/development/ai-integration", order: 8 },
      { title: "AI-Assisted Dev", href: "/development/ai-assisted-development", order: 9 },
      { title: "Logging", href: "/development/logging", order: 10 },
      { title: "Telemetry Export", href: "/development/telemetry", order: 11 },
    ],
  },
  {
    title: "Advanced Topics",
    links: [
      { title: "Scheduler Configuration", href: "/advanced/scheduler-configuration", order: 1 },
      { title: "Deterministic Mode", href: "/advanced/deterministic-mode", order: 3 },
      { title: "Network Backends", href: "/advanced/network-backends", order: 5 },
      { title: "BlackBox Recorder", href: "/advanced/blackbox", order: 7 },
      { title: "Fault Tolerance", href: "/advanced/circuit-breaker", order: 9 },
      { title: "Safety Monitor", href: "/advanced/safety-monitor", order: 10 },
      { title: "Record & Replay", href: "/advanced/record-replay", order: 12 },
      { title: "RT Setup", href: "/advanced/rt-setup", order: 14 },
      { title: "Deployment", href: "/advanced/deployment", order: 15 },
    ],
  },
  {
    title: "Operations",
    links: [
      { title: "Overview", href: "/operations", order: 0 },
      { title: "Deploy to Robot", href: "/operations/deploy-to-robot", order: 1 },
      { title: "Coming from ROS2", href: "/learn/coming-from-ros2", order: 2 },
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
      { title: "Lockfile & Reproducibility", href: "/package-management/lockfile", order: 3 },
      { title: "Configuration Reference", href: "/package-management/configuration", order: 4 },
    ],
  },
  {
    title: "Standard Library",
    links: [
      { title: "Overview", href: "/stdlib", order: 0 },
      { title: "Imu", href: "/stdlib/messages/imu", order: 1 },
      { title: "CmdVel", href: "/stdlib/messages/cmd-vel", order: 2 },
      { title: "Twist", href: "/stdlib/messages/twist", order: 3 },
      { title: "Odometry", href: "/stdlib/messages/odometry", order: 4 },
      { title: "Pose2D / Pose3D", href: "/stdlib/messages/pose", order: 5 },
      { title: "LaserScan", href: "/stdlib/messages/laser-scan", order: 6 },
      { title: "Image", href: "/stdlib/messages/image", order: 7 },
      { title: "Detection", href: "/stdlib/messages/detection", order: 8 },
      { title: "Segmentation", href: "/stdlib/messages/segmentation", order: 9 },
      { title: "OccupancyGrid", href: "/stdlib/messages/occupancy-grid", order: 10 },
      { title: "BatteryState", href: "/stdlib/messages/battery-state", order: 11 },
      { title: "Navigation", href: "/stdlib/messages/navigation", order: 12 },
      { title: "JointState", href: "/stdlib/messages/joint-state", order: 13 },
      { title: "AudioFrame", href: "/stdlib/messages/audio-frame", order: 14 },
    ],
  },
  {
    title: "Performance",
    links: [
      { title: "Optimization Guide", href: "/performance/performance", order: 1 },
      { title: "Benchmarks", href: "/performance/benchmarks", order: 2 },
    ],
  },
  {
    title: "Reference",
    links: [
      { title: "API Cheatsheet", href: "/reference/api-cheatsheet", order: 1 },
      { title: "AI Context", href: "/reference/ai-context", order: 2 },
      { title: "API Quick Reference", href: "/reference/api-index", order: 2 },
      { title: "Internals", href: "/reference/internals", order: 3 },
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
    "Recipes": true,
    "Core Concepts": true,
    "Rust": true,
    "Python": true,
    "Development": true,
    "Advanced Topics": true,
    "Plugins": true,
    "Package Management": true,
    "Standard Library": true,
    "Performance": true,
    "Reference": true,
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
