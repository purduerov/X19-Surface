from src.zmq.python.messaging import Subscriber
from src.zmq.protocols.python import telemetry_pb2

def telemetry_callback(data):
    print(f"Received depth: {data.depth}")

# Initialize subscriber (connects to address by default)
subscriber = Subscriber(
    address="tcp://127.0.0.1:5555",
    topic="telemetry",
    message_type=telemetry_pb2.SensorData,
    callback=telemetry_callback
)

# Process a single incoming message (timeout in milliseconds)
subscriber.spin_once(timeout_ms=100)

# Clean up
subscriber.close()