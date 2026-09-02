const BLYNK_AUTH_TOKEN = "D6Zu_NsTwvhZ7toNrjtWZbCZeMKnBkTP";
const BLYNK_SERVER = "sgp1.blynk.cloud";

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

async function updateDashboard() {
    const statusBadge = document.getElementById("status-badge");

    // Fetch V0 through V4 individually
    const [temp, hum, gas, feed, water] = await Promise.all([
        fetchPin("v0"),
        fetchPin("v1"),
        fetchPin("v2"),
        fetchPin("v3"),
        fetchPin("v4")
    ]);

    console.log("Fetched Pins:", { temp, hum, gas, feed, water });

    // Check if at least one sensor pin returned data
    const hasData = temp !== null || hum !== null || gas !== null || feed !== null || water !== null;

    if (hasData) {
        statusBadge.textContent = "ONLINE";
        statusBadge.className = "badge online";

        document.getElementById("val-temp").innerText = (temp && !isNaN(temp)) ? parseFloat(temp).toFixed(1) : "--";
        document.getElementById("val-hum").innerText = (hum && !isNaN(hum)) ? parseFloat(hum).toFixed(1) : "--";
        document.getElementById("val-gas").innerText = (gas && !isNaN(gas)) ? parseInt(gas) : "--";
        document.getElementById("val-feed").innerText = (feed && !isNaN(feed)) ? parseInt(feed) : "--";
        document.getElementById("val-water").innerText = (water && !isNaN(water)) ? parseInt(water) : "--";
    } else {
        statusBadge.textContent = "OFFLINE / NO DATA";
        statusBadge.className = "badge offline";
    }
}

updateDashboard();
setInterval(updateDashboard, 3000);