import zmq

class Subscriber:
    """
    ZeroMQ SUB socket wrapper for Python nodes.
    Subscribes to a topic, deserializes incoming messages using a Protobuf message type,
    and passes them to a callback.
    """
    def __init__(self, address: str, topic: str, message_type, callback, bind: bool = False):
        """
        Initialize the subscriber.
        
        :param address: ZMQ address to connect or bind to (e.g., 'tcp://127.0.0.1:5555')
        :param topic: The topic string to subscribe to
        :param message_type: The generated Protobuf class type (e.g., SensorData) to deserialize into
        :param callback: Callable that accepts a single argument (the deserialized message)
        :param bind: True to bind to the address, False to connect (default for subscribers)
        """
        if not address:
            address = 'tcp://*:5555'  # Default address if none provided
        if not topic:
            value_error = "Topic must be a non-empty string."
            raise ValueError(value_error)
    
        self.context = zmq.Context.instance()
        self.socket = self.context.socket(zmq.SUB)
        
        if bind:
            self.socket.bind(address)
        else:
            self.socket.connect(address)
            
        self.socket.setsockopt_string(zmq.SUBSCRIBE, topic)
        self.topic = topic
        self.message_type = message_type
        self.callback = callback

    def spin_once(self, timeout_ms: int = 10) -> bool:
        """
        Polls the socket for a message. If a message is available, receives,
        deserializes, and invokes the callback.
        
        :param timeout_ms: Timeout in milliseconds to wait for a message
        :return: True if a message was processed, False otherwise
        """
        if self.socket.poll(timeout_ms, zmq.POLLIN):
            try:
                topic_bytes, payload = self.socket.recv_multipart()
                message = self.message_type()
                message.ParseFromString(payload)
                self.callback(message)
                return True
            except Exception as e:
                print(f"Error parsing message on topic '{self.topic}': {e}")
        return False

    def close(self) -> None:
        """
        Closes the ZMQ socket.
        """
        self.socket.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
