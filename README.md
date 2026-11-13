# Chronos — Time Travel Debugger

**A C++ debugging environment designed to make program execution traceable through historical state inspection.**

Chronos is a Time-Travel Debugging (TTD) project that aims to improve conventional debugging by allowing developers to examine previously recorded execution states rather than relying exclusively on forward execution.

Instead of repeatedly running a program to identify where an unexpected value originated, Chronos records runtime information and provides a timeline through which developers can navigate execution history.

---

## 1. The Problem

Traditional debugging tools primarily follow a forward-execution model. Developers use breakpoints, step through instructions, and inspect variables at specific points.

However, when a logical error occurs, identifying the exact operation responsible can require repeatedly executing the program and manually tracing previous changes.

Chronos explores a more systematic approach by maintaining execution snapshots and making historical program states accessible for inspection.

## 2. Key Features

- **Execution Recording:** Capture relevant runtime information at different execution points.
- **Time-Travel Navigation:** Navigate backward and forward through recorded execution states.
- **Variable Inspection:** Examine variable values at selected execution points.
- **Variable State Comparison:** Compare historical values to understand how variables change.
- **Call Stack Inspection:** Examine function calls and their execution hierarchy.
- **Pointer and Memory Inspection:** Explore pointer values and memory-related information.
- **Integrated Code Editor:** Provide an environment for writing, compiling, and debugging C++ programs.
- **Bug Analysis:** Present relevant runtime errors and execution information to assist investigation.

*Note: Features are being developed incrementally. Their availability depends on the current implementation.*

## 3. System Architecture

Chronos follows a modular architecture consisting of four major layers:

| Layer | Responsibility |
|---|---|
| Presentation Layer | Code editor, execution controls, timeline, variable inspector and call stack |
| Application Core | Debugging controller, session management and historical state management |
| Debugging Engine | GCC compilation, GDB interface and execution recording |
| Data Layer | Execution history and stored snapshots |

### Execution Workflow

1. Developer writes or loads a C++ source file.
2. The source file is compiled using GCC.
3. GDB initiates and controls program execution.
4. Runtime information is collected during execution.
5. The execution recorder creates snapshots.
6. Snapshots are stored in execution history.
7. The developer selects an execution point through the timeline.
8. Chronos retrieves and displays the corresponding historical state.

## 4. Technology Stack

| Technology | Purpose |
|---|---|
| C++ | Core application logic and debugging infrastructure |
| GDB | Program execution and runtime inspection |
| GCC / MinGW | C++ compilation |
| CMake | Build configuration |
| HTML | Frontend structure |
| CSS | Interface styling |
| JavaScript | Frontend interaction and visualization |
| cpp-httplib | HTTP communication between frontend and backend |
| Git and GitHub | Version control and collaboration |

## 5. Object-Oriented Design

Chronos applies object-oriented programming principles to separate the responsibilities of its major components.

The architecture is designed around modular components for:

- Debugger backend integration
- Execution recording
- Snapshot management
- Timeline navigation
- Runtime state inspection
- Debugging session management

This separation improves maintainability and allows individual components to be developed and extended independently.

## 6. Project Structure

```text
Chronos/
│
├── chronos/
│   ├── frontend/
│   │   ├── index.html
│   │   ├── style.css
│   │   └── app.js
│   │
│   ├── src/
│   │   ├── main.cpp
│   │   ├── GdbBackend.h
│   │   ├── GdbBackend.cpp
│   │   ├── DebuggerBackend.h
│   │   ├── Recorder.h
│   │   ├── Snapshot.h
│   │   ├── Timeline.h
│   │   ├── JsonExporter.h
│   │   └── Investigator.h
│   │
│   ├── third_party/
│   │   └── httplib.h
│   │
│   └── CMakeLists.txt
│
└── README.md
```

## 7. Getting Started

### Prerequisites

Ensure the following tools are available in your development environment:

- C++17-compatible compiler (GCC or MinGW)
- GNU Debugger (GDB)
- CMake
- Git

### Clone the Repository

```bash
git clone https://github.com/195acx/chronos.git
cd chronos/chronos
```

### Build the Project

```bash
cmake -S . -B build
cmake --build build -j4
```

### Run Chronos

```bash
./build/chronos
```

The application serves its frontend through the backend HTTP server. Open the configured local server address in your browser.

**Note:** The build and execution commands may require platform-specific adjustments depending on the operating system and compiler configuration.

## 8. Current Development Focus

Chronos is being developed incrementally, with emphasis on:

- Reliable integration between the frontend and debugging backend.
- Accurate collection of runtime information.
- Consistent execution snapshot generation.
- Historical state navigation.
- Clear presentation of variable changes and debugging information.
- Improving the usability of the integrated debugging interface.

## 9. Future Scope

Potential extensions include:

- Deterministic execution replay.
- Differential snapshot storage.
- Advanced pointer and memory visualisation.
- Conditional checkpoints.
- Multithreaded debugging.
- Automated analysis of unusual variable-state transitions.
- Support for additional programming languages.

## 10. Project Information

| Attribute | Details |
|---|---|
| Project | Chronos — Time Travel Debugger |
| Language | C++ |
| Domain | Software Development / Debugging Tools |
| Core Concept | Time-Travel Debugging |
| Repository | [195acx/chronos](https://github.com/195acx/chronos) |

---

**Chronos — Understand not only where your program fails, but how it got there.**
