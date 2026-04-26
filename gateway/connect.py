import time
import board
import adafruit_dht
import digitalio
import paho.mqtt.client as mqtt
import json

# --- Configuration ThingsBoard ---
THINGSBOARD_HOST = "thingsboard.icam.technology" 
ACCESS_TOKEN = "65t7m17joxtk6f5qt638" 

# --- Configuration Capteurs ---
# Température & Humidité (GPIO 4)
dht_device = adafruit_dht.DHT22(board.D4)

# Capteur PIR (GPIO 27 - Pin physique 13)
pir = digitalio.DigitalInOut(board.D27)
pir.direction = digitalio.Direction.INPUT

# --- Connexion MQTT ---
client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1) 
client.username_pw_set(ACCESS_TOKEN)

try:
    client.connect(THINGSBOARD_HOST, 1883, 60)
    client.loop_start()
    print("🚀 Passerelle active : Monitoring Confort + Occupation")

    while True:
        try:
            # 1. Lecture DHT22
            t = dht_device.temperature
            h = dht_device.humidity
            
            # 2. Lecture PIR (Mouvement)
            # pir.value renvoie True (mouvement) ou False (rien)
            is_occupied = pir.value 
            
            payload = {
                "occupied": is_occupied
            }
            
            if t is not None and h is not None:
                payload["temperature"] = round(t, 1)
                payload["humidity"] = round(h, 1)
            
            # 3. Envoi à ThingsBoard
            client.publish("v1/devices/me/telemetry", json.dumps(payload))
            
            # Affichage console pour débug
            status = "🔴 OCCUPÉ" if is_occupied else "🟢 LIBRE"
            print(f"✅ {status} | Temp: {t if t else '--'}°C | Hum: {h if h else '--'}%")
            
        except RuntimeError as e:
            # On ignore les erreurs de lecture DHT22
            pass

        # On descend à 2 secondes pour ne pas rater un passage furtif
        time.sleep(2) 

except KeyboardInterrupt:
    print("\n🛑 Arrêt par l'utilisateur...")

finally:
    print("🧹 Nettoyage des capteurs...")
    client.loop_stop()
    client.disconnect()
    dht_device.exit()
    print("✨ Système arrêté proprement.")