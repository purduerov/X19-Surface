import zmq

class Publisher:
    """
    ZeroMQ PUB socket wrapper for Python nodes.
    Serializes Protobuf messages and publishes them to a specific topic.
    """
    def __init__(self, address: str, topic: str, bind: bool = True):
        """
        Initialize the publisher.
        
        :param address: ZMQ connection address (e.g., 'tcp://*:5555' or 'tcp://127.0.0.1:5555')
        :param topic: The topic to publish under (used for sub filtering)
        :param bind: True to bind to the address (default for host/pub), False to connect
        """
        if not address:
            address = 'tcp://*:5555'  # Default address if none provided
        if not topic:
            value_error = "Topic must be a non-empty string."
            raise ValueError(value_error)

        self.context = zmq.Context.instance()
        self.socket = self.context.socket(zmq.PUB)
        
        if bind:
            self.socket.bind(address)
        else:
            self.socket.connect(address)
            
        self.topic = topic
        self.address = address

    def publish(self, proto_message) -> None:
        """
        Serializes and publishes a protobuf message.
        
        :param proto_message: A compiled Protobuf message object
        """
        payload = proto_message.SerializeToString()
        # ZMQ PUB/SUB uses multipart: [topic_bytes, payload_bytes]
        self.socket.send_multipart([self.topic.encode('utf-8'), payload])

    def close(self) -> None:
        """
        Closes the ZMQ socket.
        """
        self.socket.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
