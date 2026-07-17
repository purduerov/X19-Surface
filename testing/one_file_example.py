from src.zmq.python.messaging import Publisher, Subscriber
from src.zmq.protocols.python import telemetry_pb2
import time

def test_pub_sub():
    # Define a simple callback function for the subscriber
    def callback(message):
        print(f"Received message: {message.msg}")

    print("Initializing Publisher and Subscriber...")
    # Create a publisher (binds to the address by default)
    publisher = Publisher(address='tcp://127.0.0.1:5555', topic='test')
    
    # Create a subscriber (connects to the address by default)
    subscriber = Subscriber(
        address='tcp://127.0.0.1:5555',
        topic='test',
        message_type=telemetry_pb2.test,
        callback=callback
    )   
    
    # Give some time for the ZMQ TCP connection handshake to establish (slow joiner workaround)
    print("Waiting for ZMQ sockets to connect...")
    time.sleep(0.5)
    
    print("Publishing message...")
    publisher.publish(telemetry_pb2.test(msg="Hello, World!"))
    
    print("Spinning subscriber to check for incoming messages...")
    subscriber.spin_once(timeout_ms=1000)

    # Clean up sockets gracefully
    publisher.close()
    subscriber.close()
    print("Done.")

if __name__ == "__main__":
    test_pub_sub()