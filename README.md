# ROV X-19 Surface Software (X19-Surface)

Welcome to the **X19-Surface** repository — the topside control software for Purdue ROV's X-19 vehicle. 

This repository houses the ground control station interface, real-time video feeds, telemetry displays, ZeroMQ (ZMQ) hardware messaging wrappers, Protocol Buffer (Protobuf) schemas, and the Flask web application.

---

## 📁 Repository Layout

```
X19-Surface/
├── launch                    # Executable multi-node orchestrator script (tmux-based)
├── launch.yaml               # Declarative configuration for ZMQ nodes, Flask, & Tailwind
├── proto/                    # Google Protocol Buffer schema definitions (.proto)
│   └── telemetry.proto       # Telemetry & joystick command schemas
├── scripts/                  # System provisioning & compilation scripts
│   ├── setup.sh              # Automated dependency installation script
│   └── compile_protos.sh     # Protobuf schema compiler script
├── src/
│   ├── frontend/             # Flask web application & Tailwind UI
│   │   ├── dev-run           # Single-command frontend dev script
│   │   ├── package.json      # Tailwind CSS build scripts & dependencies
│   │   └── src/
│   │       ├── app.py        # Flask backend & Socket.IO server
│   │       ├── static/       # Static assets (compiled tailwind.css, components.css, JS listeners)
│   │       ├── tailwind.config.js # ROV UI design system tokens
│   │       └── templates/    # Jinja2 HTML templates (innovative_ui.html, all_cameras.html, etc.)
│   └── zmq/                  # ZeroMQ messaging framework
│       ├── protocols/        # Generated Protobuf bindings (C++ & Python)
│       └── python/
│           └── messaging/    # ZMQ Publisher/Subscriber python wrappers & nodes
└── testing/                  # Demo ZMQ publisher & test scripts (hello_pub.py, etc.)
```

---

## ⚙️ Setup & Installation

### 1. System & Python Dependencies
Prerequisites include the Protobuf Compiler (`protoc`), ZeroMQ development headers (`libzmq3-dev`), `tmux`, and Python 3.

Run the automated setup script to provision your system:
```bash
./scripts/setup.sh
```
*(This installs `protobuf-compiler`, `libzmq3-dev`, `tmux`, and builds the Python dependencies defined in `requirements.txt` into your virtual environment).*

### 2. Compile Protobuf Schemas
Compile your `.proto` files in the `proto/` directory to generate C++ and Python bindings:
```bash
./scripts/compile_protos.sh
```
This outputs compiled bindings directly to `src/zmq/protocols/cpp` and `src/zmq/protocols/python`.

---

## 🎛️ Multi-Node Orchestration (`launch.yaml` & `./launch`)

We provide a YAML-driven process orchestrator ([launch.yaml](launch.yaml) + [./launch](launch)) powered by `tmux`. It manages all ZMQ nodes, Flask, and Tailwind CSS in a single terminal session without opening multiple windows.

### 1. Launch in Development Mode (includes live Tailwind watcher)
```bash
./launch --dev
```

### 2. Launch in Field Deployment Mode (100% offline, pre-compiled CSS)
```bash
./launch --field
```

### 3. Stop All Running Nodes
```bash
./launch --stop
```

### Adding New ZMQ Nodes to `launch.yaml`
Simply add your new node to the `nodes` list in [launch.yaml](launch.yaml):

```yaml
nodes:
  - name: "Your ZMQ Node"
    cwd: "."
    cmd: "python3 src/zmq/python/messaging/your_node.py"
    mode: "all"  # Options: all | dev | field
```

#### 📌 Tmux Controls inside `./launch`:
- **Switch between node panes**: Press `Ctrl+B` then **Arrow Keys**.
- **Detach session (keep nodes running in background)**: Press `Ctrl+B` then `D`.
- **Re-attach to session**: Run `./launch` or `tmux a`.

---

## 🛠️ ZeroMQ (ZMQ) Messaging API

To make writing nodes simple and robust, lightweight wrappers wrap ZMQ sockets into easy-to-use classes.

### Python API

#### 1. Publisher (`src.zmq.python.messaging.Publisher`) 
Creates a ZMQ `PUB` socket that serializes and publishes Protobuf messages on a specific topic.

```python
from src.zmq.python.messaging import Publisher
from src.zmq.protocols.python import telemetry_pb2

# Initialize publisher (binds to address by default)
publisher = Publisher(address="tcp://127.0.0.1:5555", topic="telemetry")

# Create and publish a Protobuf message
msg = telemetry_pb2.SensorData(depth=1.24, temperature=21.5)
publisher.publish(msg)

# Clean up
publisher.close()
```

#### 2. Subscriber (`src.zmq.python.messaging.Subscriber`)
Creates a ZMQ `SUB` socket that connects to a publisher, subscribes to a topic, and parses incoming Protobuf payloads.

```python
from src.zmq.python.messaging import Subscriber
from src.zmq.protocols.python import telemetry_pb2

def telemetry_callback(data):
    print(f"Received depth: {data.depth} m, temp: {data.temperature} C")

# Initialize subscriber (connects to address by default)
subscriber = Subscriber(
    address="tcp://127.0.0.1:5555",
    topic="telemetry",
    message_type=telemetry_pb2.SensorData,
    callback=telemetry_callback
)

# Process incoming messages in a loop
subscriber.spin_once(timeout_ms=100)

# Clean up
subscriber.close()
```

#### 3. ZMQ-to-UI SocketIO Bridge Node
A standalone Python subscriber node can connect to ZMQ, receive Protobuf telemetry, and emit JSON events directly to Flask using `socketio.Client()`:

```python
import socketio
import json
from src.zmq.python.messaging import Subscriber
from src.zmq.protocols.python import telemetry_pb2

sio = socketio.Client()
sio.connect("http://127.0.0.1:5013")

def on_telemetry(proto_msg):
    if sio.connected:
        sio.emit("depth", json.dumps({"data": proto_msg.depth}))

subscriber = Subscriber(
    address="tcp://127.0.0.1:5555",
    topic="telemetry",
    message_type=telemetry_pb2.SensorData,
    callback=on_telemetry
)
```

---

## 🎨 Frontend & Tailwind CSS

The frontend software operates **100% offline** without requiring Wi-Fi.

For full frontend documentation, Tailwind component design details, and dev scripts, see [src/frontend/README.md](src/frontend/README.md).
