import os
import sys
import time

# Ensure project root is in sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.zmq.python.messaging import Publisher
from src.zmq.protocols.python import telemetry_pb2

# Initialize publisher (binds to address by default)
publisher = Publisher(address="tcp://127.0.0.1:5555", topic="telemetry")

print("📡 ZMQ Publisher running on tcp://127.0.0.1:5555 topic 'telemetry'...")

depth = 1.0
try:
    while True:
        depth += 0.05
        if depth > 10.0:
            depth = 1.0
        
        msg = telemetry_pb2.SensorData(depth=depth, temperature=21.5)
        publisher.publish(msg)
        print(f"Published ZMQ telemetry packet: depth={depth:.2f}m, temp=21.5C", flush=True)
        time.sleep(0.5)
except KeyboardInterrupt:
    print("\nStopping ZMQ publisher...")
finally:
    publisher.close()