let port;
let reader;
let keepReading = false;

// Global variables for Strudel
window.accelX = 0;
window.accelY = 0;
window.accelZ = 0;
window.accelMag = 0;
window.gyroX = 0;
window.gyroY = 0;
window.gyroZ = 0;
window.gyroMag = 0;

async function connectSerial() {
    if (!("serial" in navigator)) {
        alert("WebSerial not supported! Please use Chrome or Edge browser.");
        return;
    }

    try {
        // Request port
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 115200 });

        document.getElementById('status').textContent = 'Connected!';
        document.getElementById('status').className = 'status connected';
        document.getElementById('connectBtn').textContent = 'Disconnect';
        document.getElementById('connectBtn').onclick = disconnectSerial;

        // Start reading
        keepReading = true;
        readSerialData();

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('status').textContent = 'Connection failed: ' + error.message;
    }
}

async function disconnectSerial() {
    keepReading = false;
    if (reader) {
        await reader.cancel();
    }
    if (port) {
        await port.close();
    }

    document.getElementById('status').textContent = 'Disconnected';
    document.getElementById('status').className = 'status disconnected';
    document.getElementById('connectBtn').textContent = 'Connect to Arduino';
    document.getElementById('connectBtn').onclick = connectSerial;
}

async function readSerialData() {
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
    reader = textDecoder.readable.getReader();

    let buffer = '';

    try {
        while (keepReading) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += value;

            // Process complete lines
            let lines = buffer.split('\n');
            buffer = lines.pop(); // Keep incomplete line in buffer

            for (let line of lines) {
                line = line.trim();
                if (line.startsWith('{')) {
                    try {
                        const data = JSON.parse(line);

                        // Update globals
                        window.accelX = data.ax || 0;
                        window.accelY = data.ay || 0;
                        window.accelZ = data.az || 0;
                        window.accelMag = data.am || 0;
                        window.gyroX = data.gx || 0;
                        window.gyroY = data.gy || 0;
                        window.gyroZ = data.gz || 0;

                        // Calculate gyro magnitude
                        window.gyroMag = Math.sqrt(
                            window.gyroX * window.gyroX +
                            window.gyroY * window.gyroY +
                            window.gyroZ * window.gyroZ
                        );

                        // Update display
                        document.getElementById('accelX').textContent = data.ax.toFixed(2);
                        document.getElementById('accelY').textContent = data.ay.toFixed(2);
                        document.getElementById('accelZ').textContent = data.az.toFixed(2);
                        document.getElementById('accelMag').textContent = data.am.toFixed(2);
                        document.getElementById('gyroX').textContent = data.gx.toFixed(1);
                        document.getElementById('gyroY').textContent = data.gy.toFixed(1);
                        document.getElementById('gyroZ').textContent = data.gz.toFixed(1);
                        document.getElementById('gyroMag').textContent = window.gyroMag.toFixed(1);

                    } catch (e) {
                        // Ignore parse errors
                    }
                }
            }
        }
    } catch (error) {
        console.error('Read error:', error);
    } finally {
        reader.releaseLock();
    }
}