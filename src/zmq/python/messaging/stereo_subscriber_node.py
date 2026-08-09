#!/usr/bin/env python3
"""
Stereo depth subscriber for X19-Surface.

Subscribes to the 'stereo' ZMQ topic published by X19-Core's stereo_depth_node
(OAK-D W Pro depth analysis) and forwards the summarized result to the Flask UI
over SocketIO so it can be shown on the dashboard. Mirrors depth_subscriber_node.py.
"""
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


def on_stereo_received(proto_msg):
    """ZMQ callback: deserialize StereoDepth and emit to Flask via SocketIO."""
    payload = json.dumps({
        "center_m": round(float(getattr(proto_msg, "center_distance_m", 0.0)), 3),
        "min_m": round(float(getattr(proto_msg, "min_distance_m", 0.0)), 3),
        "max_m": round(float(getattr(proto_msg, "max_distance_m", 0.0)), 3),
        "coverage": round(float(getattr(proto_msg, "coverage", 0.0)), 3),
        "width": int(getattr(proto_msg, "width", 0)),
        "height": int(getattr(proto_msg, "height", 0)),
    })
    if sio.connected:
        sio.emit("stereo", payload)
        print(
            f" [Stereo Sub] center={proto_msg.center_distance_m:.2f}m "
            f"min={proto_msg.min_distance_m:.2f}m",
            flush=True,
        )
    else:
        print(" [Stereo Sub] SocketIO client not connected, skipping emit", flush=True)


def connect_socketio(socketio_url, max_retries=10, retry_delay=1.0):
    for i in range(max_retries):
        try:
            sio.connect(socketio_url)
            print(f" [Stereo Sub] Connected to SocketIO Server at {socketio_url}", flush=True)
            return True
        except Exception:
            print(f" [Stereo Sub] Waiting for Flask SocketIO server (Attempt {i+1}/{max_retries})...", flush=True)
            time.sleep(retry_delay)
    print(f" [Stereo Sub] Could not connect to SocketIO server at {socketio_url}", flush=True)
    return False


def main():
    port = os.getenv("FLASK_PORT", "5013")
    connect_socketio(f"http://127.0.0.1:{port}")

    # Core publishes stereo results on port 5557 (see stereo_depth_node.py).
    core_address = os.getenv("CORE_STEREO_ADDRESS", "tcp://127.0.0.1:5557")
    print(f"[Stereo Sub] Connecting to Core stereo publisher at {core_address} topic 'stereo'...", flush=True)
    subscriber = Subscriber(
        address=core_address,
        topic="stereo",
        message_type=telemetry_pb2.StereoDepth,
        callback=on_stereo_received,
    )

    print(" [Stereo Sub] Node active. Polling ZMQ messages...", flush=True)
    try:
        while True:
            subscriber.spin_once(timeout_ms=100)
            time.sleep(0.01)
    except KeyboardInterrupt:
        print("\n [Stereo Sub] Shutting down...", flush=True)
    finally:
        subscriber.close()
        if sio.connected:
            sio.disconnect()


if __name__ == "__main__":
    main()
