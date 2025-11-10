import serial
import json
from pythonosc import udp_client

# Change COM port and baud to match your Arduino
ser = serial.Serial('COM5', 115200)

# OSC client to Sonic Pi
client = udp_client.SimpleUDPClient("127.0.0.1", 4559)  # Sonic Pi default port

while True:
    line = ser.readline().decode().strip()
    try:
        data = json.loads(line)
        # send values via OSC
        client.send_message("/accel", data["am"])
        client.send_message("/gyroZ", data["gz"])
    except:
        pass
