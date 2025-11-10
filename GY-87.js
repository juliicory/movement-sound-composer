let port;
let reader;
let keepReading = false;

// Global sensor values
window.accelX = 0;
window.accelY = 0;
window.accelZ = 0;
window.accelMag = 0;
window.gyroX = 0;
window.gyroY = 0;
window.gyroZ = 0;
window.gyroMag = 0;

// Audio context
let audioCtx;
let oscillator;
let gainNode;
let isPlaying = false;

async function connectSerial() {
    if (!("serial" in navigator)) {
        alert("WebSerial not supported! Use Chrome or Edge.");
        return;
    }

    try {
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 115200 });

        document.getElementById('status').textContent = 'Connected!';
        document.getElementById('status').className = 'status connected';
        document.getElementById('connectBtn').textContent = 'Disconnect';
        document.getElementById('connectBtn').onclick = disconnectSerial;

        keepReading = true;
        readSerialData();

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('status').textContent = 'Failed';
    }
}

async function disconnectSerial() {
    keepReading = false;
    if (reader) await reader.cancel();
    if (port) await port.close();

    document.getElementById('status').textContent = 'Disconnected';
    document.getElementById('status').className = 'status disconnected';
    document.getElementById('connectBtn').textContent = 'Connect Arduino';
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
            let lines = buffer.split('\n');
            buffer = lines.pop();

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
                        window.gyroMag = Math.sqrt(
                            window.gyroX ** 2 +
                            window.gyroY ** 2 +
                            window.gyroZ ** 2
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

                        // Update audio if playing
                        if (isPlaying && oscillator) {
                            updateAudio();
                        }

                    } catch (e) {
                        console.error('Parse error:', e);
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

function playSound() {
    if (isPlaying) return;

    // Create audio context
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    // Create oscillator
    oscillator = audioCtx.createOscillator();
    gainNode = audioCtx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = 440;
    gainNode.gain.value = 0.3;

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    isPlaying = true;

    document.getElementById('output').textContent =
        'Playing! Tilt sensor to change pitch.\nX axis controls frequency.';
}

function stopSound() {
    if (!isPlaying) return;

    oscillator.stop();
    isPlaying = false;

    document.getElementById('output').textContent = 'Sound stopped.';
}

function updateAudio() {
    if (!oscillator) return;

    // Map accelX (-1 to 1) to frequency (200 to 800 Hz)
    const freq = 440 + (window.accelX * 200);
    oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);

    // Map accelY to volume
    const vol = Math.abs(window.accelY) * 0.5;
    gainNode.gain.setValueAtTime(vol, audioCtx.currentTime);

    // Show values
    document.getElementById('output').textContent =
        `Frequency: ${freq.toFixed(1)} Hz (X: ${window.accelX.toFixed(2)})\n` +
        `Volume: ${vol.toFixed(2)} (Y: ${window.accelY.toFixed(2)})\n` +
        `Gyro Z (spin): ${window.gyroZ.toFixed(1)}°/s`;
}