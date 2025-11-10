let ws = null;

// Global variables for Strudel to access
window.accelX = 0;
window.accelY = 0;
window.accelZ = 0;
window.accelMag = 0;

function connect() {
    const ip = document.getElementById('ipInput').value;
    const wsUrl = `ws://${ip}:81`;

    document.getElementById('status').textContent = 'Connecting...';
    document.getElementById('status').className = 'status disconnected';
    document.getElementById('connectBtn').disabled = true;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        document.getElementById('status').textContent = `Connected to ${ip}`;
        document.getElementById('status').className = 'status connected';
        document.getElementById('connectBtn').disabled = false;
        document.getElementById('connectBtn').textContent = 'Disconnect';
        document.getElementById('connectBtn').onclick = disconnect;
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);

            // Update global variables
            window.accelX = data.x || 0;
            window.accelY = data.y || 0;
            window.accelZ = data.z || 0;
            window.accelMag = data.mag || 0;

            // Update display
            document.getElementById('xValue').textContent = data.x.toFixed(2);
            document.getElementById('yValue').textContent = data.y.toFixed(2);
            document.getElementById('zValue').textContent = data.z.toFixed(2);
            document.getElementById('magValue').textContent = data.mag.toFixed(2);

        } catch (e) {
            console.error('Parse error:', e);
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        document.getElementById('status').textContent = 'Connection error';
        document.getElementById('status').className = 'status disconnected';
    };

    ws.onclose = () => {
        document.getElementById('status').textContent = 'Disconnected';
        document.getElementById('status').className = 'status disconnected';
        document.getElementById('connectBtn').disabled = false;
        document.getElementById('connectBtn').textContent = 'Connect';
        document.getElementById('connectBtn').onclick = connect;
    };
}

function disconnect() {
    if (ws) {
        ws.close();
    }
}