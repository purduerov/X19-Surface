#!/usr/bin/env python3

import os
import sys
import time
import socket
import subprocess
import threading
import signal

# Ensure project root is in sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../..")))

from src.zmq.python.messaging import Publisher
from src.zmq.protocols.python import telemetry_pb2


class Go2rtcNode:
    """
    ZeroMQ Go2RTC Video Server Node.
    Launches and monitors the go2rtc webRTC/RTSP streaming server subprocess
    and publishes the surface computer's local IP address via ZeroMQ PUB socket.
    """
    def __init__(self, publisher_address: str = "tcp://*:5556", topic: str = "surface_ip"):
        self.shutting_down = False
        self.publisher_address = publisher_address
        self.topic = topic

        # Create ZMQ Publisher for surface IP address
        print(f"📡 [ZMQ Go2RTC Node] Binding publisher to {self.publisher_address} on topic '{self.topic}'...", flush=True)
        self.publisher = Publisher(address=self.publisher_address, topic=self.topic)

        self.ip_pub_count = 0
        self.ip_pub_count_max = 1000

        # Start the go2rtc server process
        self.process = None
        self.start_go2rtc_server()

    def get_local_ip(self) -> str:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                s.connect(("8.8.8.8", 80))  # Google's public DNS server
                local_ip = s.getsockname()[0]
            return local_ip
        except Exception as e:
            return f"Error getting local IP: {e}"

    def publish_ip_address(self):
        ip = self.get_local_ip()
        print(f"📡 [ZMQ Go2RTC Node] Publishing Surface IP: {ip}", flush=True)
        msg = telemetry_pb2.test(msg=ip)
        self.publisher.publish(msg)
        self.ip_pub_count += 1

    def start_go2rtc_server(self):
        videos_dir = os.path.dirname(os.path.abspath(__file__))
        go2rtc_bin = os.path.join(videos_dir, "go2rtc")
        go2rtc_cfg = os.path.join(videos_dir, "go2rtc.yaml")

        if not os.path.exists(go2rtc_bin):
            print(f"❌ [ZMQ Go2RTC Node] Error: go2rtc executable not found at '{go2rtc_bin}'.", flush=True)
            print("   Please run 'scripts/setup.sh' or 'scripts/install_go2rtc.sh' first.", flush=True)
            return

        def monitor_server():
            print(f"🚀 [ZMQ Go2RTC Node] Starting go2rtc server process: {go2rtc_bin} -c {go2rtc_cfg}", flush=True)
            try:
                self.process = subprocess.Popen(
                    [go2rtc_bin, "-c", go2rtc_cfg],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                )

                while not self.shutting_down:
                    line = self.process.stdout.readline()
                    if line:
                        print(f"🎥 [go2rtc] {line.strip()}", flush=True)
                    if self.process.poll() is not None:
                        print("⚠️ [ZMQ Go2RTC Node] go2rtc server process terminated.", flush=True)
                        break
            except Exception as e:
                print(f"❌ [ZMQ Go2RTC Node] Failed to run go2rtc process: {e}", flush=True)

        server_thread = threading.Thread(target=monitor_server, daemon=True)
        server_thread.start()

    def cleanup(self):
        """Clean shutdown logic"""
        if self.shutting_down:
            return
        self.shutting_down = True

        print("\n🛑 [ZMQ Go2RTC Node] Cleaning up resources...", flush=True)
        if self.process and self.process.poll() is None:
            print("🛑 [ZMQ Go2RTC Node] Terminating go2rtc process...", flush=True)
            self.process.terminate()
            try:
                self.process.wait(timeout=3)
            except subprocess.TimeoutExpired:
                self.process.kill()

        if hasattr(self, "publisher") and self.publisher:
            self.publisher.close()
        print("✅ [ZMQ Go2RTC Node] Shutdown complete.", flush=True)


def main():
    node = Go2rtcNode()

    def signal_handler(sig, frame):
        node.cleanup()
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    print("🚀 [ZMQ Go2RTC Node] Node active. Publishing IP address periodically...", flush=True)
    try:
        while not node.shutting_down:
            if node.ip_pub_count < node.ip_pub_count_max:
                node.publish_ip_address()
            time.sleep(1.0)
    except KeyboardInterrupt:
        pass
    finally:
        node.cleanup()


if __name__ == "__main__":
    main()

