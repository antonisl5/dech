import threading
import time
import json
import ssl
import socket
import paho.mqtt.client as mqtt
from flask import Flask, request, jsonify
from flask_cors import CORS

# --- ΡΥΘΜΙΣΕΙΣ ---
BROADCAST_IP = "255.255.255.255"
UDP_PORT = 4210
PRINTERS = [
    {"id": 0, "name": "P2S", "ip": "10.10.10.83",  "access": "8edac804", "sn": "22E8BA570700114"},
    {"id": 1, "name": "A1",  "ip": "10.10.10.111", "access": "34524742", "sn": "03919C461204615"},
    {"id": 2, "name": "P1S", "ip": "10.10.10.98",  "access": "27222195", "sn": "01P00A381400546"}
]

# Αρχική κατάσταση
live_data = [{"id": p["id"], "percent": 0, "minutes": 0, "status": "OFF"} for p in PRINTERS]
last_internal_state = {0: "RESET", 1: "RESET", 2: "RESET"}
mqtt_clients = {}

app = Flask(__name__)
CORS(app) # Enable CORS for frontend requests

# --- UDP SENDER ---
def send_udp(message_bytes):
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        sock.sendto(message_bytes, (BROADCAST_IP, UDP_PORT))
    except Exception as e:
        print(f"UDP Error: {e}")

# --- UDP BROADCASTER LOOP ---
def udp_broadcaster():
    print(f"📡 UDP Broadcast started on port {UDP_PORT}...")
    while True:
        try:
            msg = json.dumps(live_data).encode('utf-8')
            send_udp(msg)
            time.sleep(2)
        except: time.sleep(5)

# --- MQTT LOGIC ---
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"✅ Connected to {userdata['name']}")
        client.subscribe(f"device/{userdata['sn']}/report")

def on_message(client, userdata, msg):
    p_id = userdata['id']
    p_name = userdata['name']
    try:
        payload = msg.payload.decode("utf-8")
        data = json.loads(payload)

        if "print" in data:
            p = data["print"]

            if "mc_percent" in p: live_data[p_id]["percent"] = p["mc_percent"]
            if "mc_remaining_time" in p: live_data[p_id]["minutes"] = p["mc_remaining_time"]
            if "gcode_state" in p: live_data[p_id]["status"] = p["gcode_state"]

            current_status = live_data[p_id]["status"]
            current_percent = live_data[p_id]["percent"]

            is_finished = (current_status == "FINISH" or current_percent == 100)

            if is_finished and last_internal_state[p_id] != "DONE":
                print(f"🎉 BINGO! {p_name} Finished! Sending ALERT to ESP...")
                send_udp(b"ALERT")
                last_internal_state[p_id] = "DONE"

            elif not is_finished:
                last_internal_state[p_id] = "RESET"
    except Exception as e: pass

def start_mqtt(p):
    c = mqtt.Client(userdata=p)
    c.username_pw_set("bblp", p['access'])
    c.tls_set(cert_reqs=ssl.CERT_NONE, tls_version=ssl.PROTOCOL_TLSv1_2)
    c.tls_insecure_set(True)
    c.on_connect = on_connect
    c.on_message = on_message
    try:
        c.connect(p['ip'], 8883, 60)
        c.loop_start()
        mqtt_clients[p['id']] = c
    except Exception as e:
        print(f"❌ Connection failed for {p['name']}: {e}")

# --- FLASK CONTROL ---
@app.route('/action', methods=['GET'])
def control_printer():
    try:
        p_id = int(request.args.get('id'))
        cmd = request.args.get('cmd')
        if p_id in mqtt_clients:
            client = mqtt_clients[p_id]
            sn = PRINTERS[p_id]['sn']
            topic = f"device/{sn}/request"

            command_json = ""
            if cmd == "pause": command_json = '{"print": {"sequence_id": "0", "command": "pause"}}'
            elif cmd == "resume": command_json = '{"print": {"sequence_id": "0", "command": "resume"}}'
            elif cmd == "stop": command_json = '{"print": {"sequence_id": "0", "command": "stop"}}'

            if command_json:
                client.publish(topic, command_json)
                return "Sent", 200
            else: return "Unknown Command", 400
        else: return "Printer Not Connected", 404
    except Exception as e: return str(e), 500

# --- NEW FLASK STATUS ENDPOINT ---
@app.route('/status', methods=['GET'])
def get_status():
    return jsonify(live_data), 200

if __name__ == '__main__':
    t = threading.Thread(target=udp_broadcaster)
    t.daemon = True
    t.start()
    for p in PRINTERS:
        start_mqtt(p)

    print("🚀 Bridge Server Running on Port 5000")
    app.run(host='0.0.0.0', port=5000, debug=False)
