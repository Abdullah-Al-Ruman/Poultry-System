const BLYNK_AUTH_TOKEN = "D6Zu_NsTwvhZ7toNrjtWZbCZeMKnBkTP";
const BLYNK_SERVER = "sgp1.blynk.cloud";

// Utility function to check real-time hardware status
async function checkDeviceStatus() {
    try {
        const url = `https://${BLYNK_SERVER}/external/api/isHardwareConnected?token=${BLYNK_AUTH_TOKEN}`;
        const response = await fetch(url);
        const isConnected = await response.text();
        return isConnected.trim() === "true";
    } catch (err) {
        console.error("Error checking hardware status:", err);
        return false;
    }
}

// Utility function to fetch individual virtual pin values
async function fetchPin(pin) {
    try {
        const url = `https://${BLYNK_SERVER}/external/api/get?token=${BLYNK_AUTH_TOKEN}&${pin}`;
        const response = await fetch(url);
        if (!response.ok) return null;
        const text = await response.text();
        return text.trim();
    } catch (err) {
        console.error(`Error fetching ${pin}:`, err);
        return null;
    }
}

// Function to dynamically update card color classes based on thresholds
function setCardStatus(valueId, numValue, safeLimit, warningLimit, isInverse = false) {
    const element = document.getElementById(valueId);
    if (!element) return;

    const card = element.closest('.card');
    if (!card) return;

    // Reset current color classes
    card.classList.remove("status-safe", "status-warning", "status-danger");

    if (numValue === null || isNaN(numValue)) return;

    if (!isInverse) {
        // Standard Metric (Higher value = Higher Danger)
        if (numValue <= safeLimit) {
            card.classList.add("status-safe");      // Green
        } else if (numValue <= warningLimit) {
            card.classList.add("status-warning");   // Orange
        } else {
            card.classList.add("status-danger");    // Red
        }
    } else {
        // Distance Metric (Higher Distance = Empty Container = High Danger)
        if (numValue <= safeLimit) {
            card.classList.add("status-safe");      // Full / Normal (Green)
        } else if (numValue <= warningLimit) {
            card.classList.add("status-warning");   // Getting Low (Orange)
        } else {
            card.classList.add("status-danger");    // Empty / Critically Low (Red)
        }
    }
}

async function updateDashboard() {
    const statusBadge = document.getElementById("status-badge");
    const isOnline = await checkDeviceStatus();

    if (isOnline) {
        statusBadge.textContent = "ONLINE";
        statusBadge.className = "badge online";

        // Fetch V0 through V4 in parallel
        const [temp, hum, gas, feed, water] = await Promise.all([
            fetchPin("v0"),
            fetchPin("v1"),
            fetchPin("v2"),
            fetchPin("v3"),
            fetchPin("v4")
        ]);

        // Process Temperature
        const tempVal = (temp && !isNaN(temp)) ? parseFloat(temp) : null;
        document.getElementById("val-temp").innerText = tempVal !== null ? tempVal.toFixed(1) : "--";
        setCardStatus("val-temp", tempVal, 28, 32); // Safe <= 28°C | Warning <= 32°C | Danger > 32°C

        // Process Humidity
        const humVal = (hum && !isNaN(hum)) ? parseFloat(hum) : null;
        document.getElementById("val-hum").innerText = humVal !== null ? humVal.toFixed(1) : "--";
        setCardStatus("val-hum", humVal, 65, 75); // Safe <= 65% | Warning <= 75% | Danger > 75%

        // Process Gas Level (Convert raw ADC to PPM if raw value received)
        let gasVal = null;
        if (gas && !isNaN(gas)) {
            const rawGas = parseInt(gas);
            gasVal = rawGas > 1000 ? Math.round((rawGas / 4095) * 1000) : rawGas;
            document.getElementById("val-gas").innerText = gasVal;
        } else {
            document.getElementById("val-gas").innerText = "--";
        }
        setCardStatus("val-gas", gasVal, 400, 600); // Safe <= 400 PPM | Warning <= 600 PPM | Danger > 600 PPM

        // Process Feed Distance
        const feedVal = (feed && !isNaN(feed)) ? parseInt(feed) : null;
        document.getElementById("val-feed").innerText = feedVal !== null ? feedVal : "--";
        setCardStatus("val-feed", feedVal, 15, 35, true); // Full <= 15cm | Low <= 35cm | Empty > 35cm

        // Process Water Distance
        const waterVal = (water && !isNaN(water)) ? parseInt(water) : null;
        document.getElementById("val-water").innerText = waterVal !== null ? waterVal : "--";
        setCardStatus("val-water", waterVal, 10, 25, true); // Full <= 10cm | Low <= 25cm | Empty > 25cm

    } else {
        // Device is OFFLINE
        statusBadge.textContent = "OFFLINE";
        statusBadge.className = "badge offline";

        // Reset display values and colors
        const ids = ["val-temp", "val-hum", "val-gas", "val-feed", "val-water"];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.innerText = "--";
                const card = el.closest('.card');
                if (card) card.classList.remove("status-safe", "status-warning", "status-danger");
            }
        });
    }
}

// Initial Run and 3-second Polling Loop
updateDashboard();
setInterval(updateDashboard, 3000);