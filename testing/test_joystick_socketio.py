import sys
import unittest
from pathlib import Path

from flask import Flask
from flask_socketio import SocketIO


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "src" / "frontend" / "src"))

from app import (  # noqa: E402
    Frontend,
    JOYSTICK_FIELDS,
    normalize_joystick_command,
)


class JoystickCommandTest(unittest.TestCase):
    def setUp(self):
        self.frontend = Frontend.__new__(Frontend)
        self.frontend.app = Flask(__name__)
        self.frontend.app.config["SECRET_KEY"] = "test"
        self.frontend.socketio = SocketIO(self.frontend.app)
        self.frontend.setup_socketio_events()
        self.browser = self.frontend.socketio.test_client(self.frontend.app)
        self.paige_client = self.frontend.socketio.test_client(self.frontend.app)

    def tearDown(self):
        if self.browser.is_connected():
            self.browser.disconnect()
        if self.paige_client.is_connected():
            self.paige_client.disconnect()

    def test_relay_sends_all_six_values_to_other_clients(self):
        payload = {
            "forward": 0.25,
            "strafe": -0.5,
            "vertical": 0.75,
            "pitch": -1.0,
            "roll": 0.1,
            "yaw": 1.0,
        }

        ack = self.browser.emit("joystick_command", payload, callback=True)

        self.assertEqual(ack, {"success": True})
        received = [
            event
            for event in self.paige_client.get_received()
            if event["name"] == "joystick_command"
        ]
        self.assertEqual(len(received), 1)
        command = received[0]["args"][0]
        for field in JOYSTICK_FIELDS:
            self.assertEqual(command[field], payload[field])
        self.assertIsInstance(command["timestamp_us"], int)
        self.assertFalse(
            [
                event
                for event in self.browser.get_received()
                if event["name"] == "joystick_command"
            ]
        )

    def test_invalid_payload_is_rejected(self):
        ack = self.browser.emit(
            "joystick_command", {"forward": 0.5}, callback=True
        )

        self.assertEqual(
            ack, {"success": False, "error": "invalid joystick command"}
        )
        self.assertFalse(self.paige_client.get_received())

    def test_values_are_clamped_and_non_finite_values_rejected(self):
        payload = {field: 0.0 for field in JOYSTICK_FIELDS}
        payload["forward"] = 4.0
        payload["yaw"] = -3.0
        command = normalize_joystick_command(payload)

        self.assertEqual(command["forward"], 1.0)
        self.assertEqual(command["yaw"], -1.0)

        payload["roll"] = float("nan")
        self.assertIsNone(normalize_joystick_command(payload))

    def test_active_controller_disconnect_relays_stop_command(self):
        payload = {field: 0.5 for field in JOYSTICK_FIELDS}
        self.browser.emit("joystick_command", payload)
        self.paige_client.get_received()

        self.browser.disconnect()

        received = [
            event
            for event in self.paige_client.get_received()
            if event["name"] == "joystick_command"
        ]
        self.assertEqual(len(received), 1)
        stop_command = received[0]["args"][0]
        for field in JOYSTICK_FIELDS:
            self.assertEqual(stop_command[field], 0.0)
        self.assertIsInstance(stop_command["timestamp_us"], int)


if __name__ == "__main__":
    unittest.main()
