# Cross-Reference Map

This document maps relationships between documentation pages. When rewriting a page, look it up here to populate the `## See Also` section.

**Rules:**
- Every See Also section should have 3-5 links
- Links should be bidirectional: if A references B, B should reference A
- Prefer linking across doc types (concept→API, tutorial→concept) over within the same type

---

## 1. Beginner → Deep Dive → API Reference

| Beginner | Deep Dive | Rust API | Python API | Python Concept |
|----------|-----------|----------|------------|----------------|
| /concepts/nodes-beginner | /concepts/core-concepts-nodes | /rust/api/scheduler | /python/api/python-bindings | /python/node-lifecycle |
| /concepts/topics-beginner | /concepts/core-concepts-topic | /rust/api/topic | /python/api/python-bindings | /python/topics-guide |
| /concepts/scheduler-beginner | /concepts/core-concepts-scheduler | /rust/api/scheduler | /python/api/python-bindings | /python/scheduler-guide |

---

## 2. Concept → Related Concepts

| Concept | Related Concepts |
|---------|-----------------|
| /concepts/execution-classes | /concepts/real-time, /concepts/core-concepts-scheduler, /advanced/scheduler-configuration |
| /concepts/services | /concepts/actions, /concepts/communication-overview, /concepts/core-concepts-topic |
| /concepts/actions | /concepts/services, /concepts/communication-overview |
| /concepts/transform-frame | /rust/api/transform-frame, /recipes/transform-frames, /python/api/transform-frame |
| /concepts/message-types | /stdlib, /rust/api/messages, /python/library/python-message-library |
| /concepts/communication-overview | /concepts/services, /concepts/actions, /concepts/core-concepts-topic, /concepts/multi-process |
| /concepts/real-time | /concepts/execution-classes, /advanced/rt-setup, /advanced/scheduler-configuration |
| /concepts/multi-process | /concepts/communication-overview, /advanced/network-backends |
| /concepts/multi-language | /getting-started/choosing-language, /python, /rust |
| /concepts/node-macro | /concepts/core-concepts-nodes, /rust/api/macros |
| /concepts/horus-toml | /development/cli-reference, /package-management/package-management |
| /concepts/choosing-configuration | /concepts/execution-classes, /concepts/core-concepts-scheduler |
| /concepts/architecture | /concepts/core-concepts-nodes, /concepts/core-concepts-topic, /concepts/core-concepts-scheduler |

---

## 3. Tutorial → Concepts + APIs Used

| Tutorial | Concepts | APIs |
|----------|----------|------|
| /tutorials/01-sensor-node | nodes-beginner, topics-beginner | Topic, Imu |
| /tutorials/02-motor-controller | nodes-beginner, topics-beginner | Topic, CmdVel, Odometry |
| /tutorials/03-full-robot | architecture, communication-overview | Scheduler, Topic, multiple messages |
| /tutorials/realtime-control | real-time, execution-classes | Scheduler (.budget, .deadline, .on_miss) |
| /tutorials/04-custom-messages | message-types | GenericMessage, message! macro |
| /tutorials/05-hardware-drivers | — | Drivers API |

Python tutorial variants link to their Rust equivalent and /python/api/python-bindings.

---

## 4. Recipe → Concepts + APIs

| Recipe | Concepts | APIs |
|--------|----------|------|
| /recipes/differential-drive | — | CmdVel, Odometry, Topic |
| /recipes/imu-reader | — | Imu, Topic |
| /recipes/pid-controller | — | Topic, CmdVel |
| /recipes/lidar-obstacle-avoidance | — | LaserScan, CmdVel, Topic |
| /recipes/servo-controller | — | Topic, MotorCommand |
| /recipes/multi-sensor-fusion | — | Imu, Odometry, Topic |
| /recipes/emergency-stop | /advanced/safety-monitor | Scheduler (Miss::SafeMode), CmdVel |
| /recipes/telemetry-logger | /concepts/execution-classes | Scheduler (.async_io()), Topic |
| /recipes/python-cv-node | /concepts/multi-language | Python Node, Image, Topic |
| /recipes/transform-frames | /concepts/transform-frame | TransformFrame API |

---

## 5. Rust API ↔ Python Equivalent

| Rust | Python |
|------|--------|
| /rust/api/topic | /python/api/python-bindings |
| /rust/api/scheduler | /python/api/python-bindings |
| /rust/api/services | (not yet available in Python) |
| /rust/api/actions | (not yet available in Python) |
| /rust/api/transform-frame | /python/api/transform-frame |
| /rust/api/image | /python/api/image |
| /rust/api/pointcloud | /python/api/pointcloud |
| /rust/api/depth-image | /python/api/depth-image |
| /rust/api/tensor | /python/api/tensor |
| /rust/api/node | /python/api/python-bindings |
| — | /python/api/async-nodes |
| — | /python/api/custom-messages |
| — | /python/api/perception |
| /rust/api/geometry-messages | /python/messages/geometry |
| /rust/api/sensor-messages | /python/messages/sensor |
| /rust/api/control-messages | /python/messages/control |
| /rust/api/navigation-messages | /python/messages/navigation |
| /rust/api/diagnostics-messages | /python/messages/diagnostics |
| /rust/api/force-messages | /python/messages/force |
| /rust/api/perception-messages | /python/messages/perception |
| /rust/api/vision-messages | /python/messages/vision |
| /rust/api/input-messages | /python/messages/input |
| /rust/api/ml-messages | /python/library/ml-utilities |

---

## 6. Stdlib Message → Rust API + Python

| Stdlib | Rust API | Python |
|--------|----------|--------|
| /stdlib/messages/imu | /rust/api/sensor-messages | /python/messages/sensor |
| /stdlib/messages/cmd-vel | /rust/api/control-messages | /python/messages/control |
| /stdlib/messages/twist | /rust/api/geometry-messages | /python/messages/geometry |
| /stdlib/messages/odometry | /rust/api/sensor-messages | /python/messages/sensor |
| /stdlib/messages/pose | /rust/api/geometry-messages | /python/messages/geometry |
| /stdlib/messages/laser-scan | /rust/api/sensor-messages | /python/messages/sensor |
| /stdlib/messages/image | /rust/api/image | /python/api/memory-types |
| /stdlib/messages/detection | /rust/api/perception-messages | /python/messages/perception |
| /stdlib/messages/segmentation | /rust/api/perception-messages | /python/messages/perception |
| /stdlib/messages/occupancy-grid | /rust/api/navigation-messages | /python/messages/navigation |
| /stdlib/messages/battery-state | /rust/api/sensor-messages | /python/messages/sensor |
| /stdlib/messages/navigation | /rust/api/navigation-messages | /python/messages/navigation |
| /stdlib/messages/joint-state | /rust/api/sensor-messages | /python/messages/sensor |
| /stdlib/messages/audio-frame | /rust/api/sensor-messages | /python/messages/input |

---

## 7. Advanced → Prerequisites

| Advanced Topic | Required Concepts |
|---------------|-------------------|
| /advanced/scheduler-configuration | core-concepts-scheduler, execution-classes |
| /advanced/deterministic-mode | core-concepts-scheduler |
| /advanced/network-backends | multi-process, communication-overview |
| /advanced/blackbox | core-concepts-scheduler |
| /advanced/circuit-breaker | core-concepts-nodes |
| /advanced/safety-monitor | core-concepts-nodes (is_safe_state, enter_safe_state), execution-classes |
| /advanced/record-replay | core-concepts-scheduler, core-concepts-topic |
| /advanced/rt-setup | real-time, execution-classes |

---

## 8. Python Concept Pages → Concept Equivalents

Python-specific concept pages cover the same topics as the shared concept pages but focus exclusively on the Python API, patterns, and limitations.

| Python Page | Concept Equivalent | Rust API |
|-------------|-------------------|----------|
| /python/node-lifecycle | /concepts/core-concepts-nodes | /rust/api/node |
| /python/topics-guide | /concepts/core-concepts-topic | /rust/api/topic |
| /python/scheduler-guide | /concepts/core-concepts-scheduler | /rust/api/scheduler |
| /python/execution-classes | /concepts/execution-classes | /rust/api/scheduler |
| /python/real-time | /concepts/real-time | /advanced/rt-setup |
| /python/shared-memory | /concepts/shared-memory | /rust/api/topic |
| /python/multi-process | /concepts/multi-process | /advanced/network-backends |
| /python/transform-frame | /concepts/transform-frame | /rust/api/transform-frame |
| /python/builder-composition | /concepts/builder-composition | /rust/api/scheduler |
| /python/message-design | /concepts/message-types | /rust/api/messages |
| /python/ring-buffer | /concepts/core-concepts-topic | /rust/api/topic |
| /python/safety-policies | /advanced/safety-monitor | /rust/api/scheduler |
| /python/error-handling | /development/error-handling | /rust/api/error-types |
| /python/debugging | /development/debugging | — |
| /python/testing | /development/testing | — |
| /python/performance | /performance | — |
| /python/advanced-patterns | /advanced | — |
| /python/production | /operations/deploy-to-robot | — |

---

## 9. Getting Started — Language Variants

| Rust (default) | Python Variant |
|----------------|----------------|
| /getting-started/quick-start | /getting-started/quick-start-python |
| /getting-started/second-application | /getting-started/second-application-python |
| /getting-started/common-mistakes | /getting-started/common-mistakes-python |
| /getting-started/troubleshooting | /getting-started/troubleshooting-python |

Python pages under /python/ MUST link to the `-python` variant. Rust pages under /rust/ MUST link to the default (non-suffixed) variant.

---

## 10. LanguageTabs-Converted Pages

These pages use the `<LanguageTabs>` component to show both Rust and Python code inline. They do NOT need separate Python variant pages — the Python content is already embedded.

**Concepts (21 pages):** architecture, builder-composition, choosing-configuration, communication-overview, core-concepts-podtopic, core-concepts-scheduler, core-concepts-topic, execution-classes, message-types, multi-language, multi-process, node-macro, nodes-beginner, real-time, scheduler-beginner, services, shared-memory, topics-beginner, transform-frame, what-is-horus, actions

**Development (9 pages):** ai-integration, cli-reference, debugging, error-handling, logging, parameters, telemetry, testing, workspaces

**Recipes (9 pages):** differential-drive, emergency-stop, imu-reader, lidar-obstacle-avoidance, multi-sensor-fusion, pid-controller, servo-controller, telemetry-logger, transform-frames

**Advanced (7 pages):** blackbox, circuit-breaker, deterministic-mode, network-backends, record-replay, safety-monitor, scheduler-configuration

**Other (8 pages):** learn/coming-from-ros2, learn/vs-ros2, learn/why-horus, operations/deploy-to-robot, operations/index, reference/ai-context, reference/api-index, reference/internals
