#!/usr/bin/env python3
import os
import sys
import time
import json
import socketio

# Ensure root workspace is in python path for module imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../..")))

from src.zmq.python.messaging import Subscriber
from src.zmq.protocols.python import telemetry_pb2

# Create SocketIO Client instance
sio = socketio.Client()

def on_telemetry_received(proto_msg):
    """
    ZMQ Callback: Deserializes Protobuf telemetry packet and emits to Flask via SocketIO client
    """
    depth_val = float(getattr(proto_msg, "depth", 0.0))
    temp_val = float(getattr(proto_msg, "temperature", 0.0))
    
    depth_payload = json.dumps({"data": depth_val})
    temp_payload = json.dumps({"data": temp_val})
    
    if sio.connected:
        sio.emit("depth", depth_payload)
        sio.emit("hat_temp", temp_payload)
        print(f"📡 [ZMQ Sub Node] Emitted depth={depth_val:.2f}m, temp={temp_val:.1f}C", flush=True)
    else:
        print("⚠️ [ZMQ Sub Node] SocketIO client not connected, skipping emit", flush=True)

def connect_socketio(socketio_url, max_retries=10, retry_delay=1.0):
    for i in range(max_retries):
        try:
            sio.connect(socketio_url)
            print(f"✅ [ZMQ Sub Node] Connected to SocketIO Server at {socketio_url}", flush=True)
            return True
        except Exception as e:
            print(f"⏳ [ZMQ Sub Node] Waiting for Flask SocketIO server (Attempt {i+1}/{max_retries})...", flush=True)
            time.sleep(retry_delay)
    print(f"❌ [ZMQ Sub Node] Could not connect to SocketIO server at {socketio_url}", flush=True)
    return False

def main():
    port = os.getenv("FLASK_PORT", "5013")
    socketio_url = f"http://127.0.0.1:{port}"
    
    connect_socketio(socketio_url)

    # Initialize ZMQ Subscriber
    print("🔌 [ZMQ Sub Node] Connecting to ZMQ Publisher on tcp://127.0.0.1:5555 topic 'telemetry'...", flush=True)
    subscriber = Subscriber(
        address="tcp://127.0.0.1:5555",
        topic="telemetry",
        message_type=telemetry_pb2.SensorData,
        callback=on_telemetry_received
    )

    print("🚀 [ZMQ Sub Node] Node active. Polling ZMQ messages...", flush=True)
    try:
        while True:
            subscriber.spin_once(timeout_ms=100)
            time.sleep(0.01)
    except KeyboardInterrupt:
        print("\n🛑 [ZMQ Sub Node] Shutting down...", flush=True)
    finally:
        subscriber.close()
        if sio.connected:
            sio.disconnect()

if __name__ == "__main__":
    main()
