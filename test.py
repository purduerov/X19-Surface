import subprocess
import re

def get_local_ip():
    output = subprocess.check_output(
        ["ip", "-4", "addr", "show", "enx00e04c688f71"],
        text=True
    )

    match = re.search(r"inet (\d+\.\d+\.\d+\.\d+)", output)

    if match:
        return match.group(1)

    raise RuntimeError("IPv4 address not found on enx00e04c688f71")

print(get_local_ip())
