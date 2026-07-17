from src.zmq.python.messaging import Publisher
from src.zmq.protocols.python import telemetry_pb2

# Initialize publisher (binds to address by default)
publisher = Publisher(address="tcp://127.0.0.1:5555", topic="telemetry")

# Create and publish a Protobuf message
while True:
    msg = telemetry_pb2.SensorData(depth=1.24)
    publisher.publish(msg)

# Clean up
publisher.close()