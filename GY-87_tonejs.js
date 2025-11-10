let port;
let reader;
let keepReading = false;

// Global variables for sensor data
window.accelX = 0;
window.accelY = 0;
window.accelZ = 0;
window.accelMag = 0;
window.gyroX = 0;
window.gyroY = 0;
window.gyroZ = 0;
window.gyroMag = 0;

// Tone.js audio components
let synth;
let filter;
let lfo;
let reverb;
let audioStarted = false;
let currentNote = 'C4';

// Initialize Tone.js audio
async function initAudio() {
    // Create reverb
    reverb = new Tone.Reverb({
        decay: 2.5
    }).toDestination();

    // Create filter
    filter = new Tone.Filter({
        frequency: 1000,
        type: 'lowpass',
        rolloff: -12
    }).connect(reverb);

    // Create synth
    synth = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: {
            attack: 0.005,
            decay: 0.1,
            sustain: 0.3,
            release: 0.5,
        }
    }).connect(filter);

    // Create LFO for modulation
    lfo = new Tone.LFO({
        frequency: 2,
        min: 0.5,
        max: 1.5
    });

    // LFO modulates synth gain
    lfo.connect(synth.volume);
    lfo.start();

    synth.volume.value = -20;
    
    console.log('✅ Audio components initialized');
}

async function startAudio() {
    if (!audioStarted) {
        try {
            console.log('Starting audio...');
            await Tone.start();
            console.log('Tone.js started, initializing audio components...');
            await initAudio();
            audioStarted = true;
            console.log('🎵 Tone.js audio started successfully');
            
            // Start sensor-to-audio mapping
            startSensorMapping();
        } catch (error) {
            console.error('❌ Audio start error:', error);
            alert('Audio error: ' + error.message);
        }
    }
}

function stopAudio() {
    if (audioStarted) {
        try {
            synth.triggerRelease();
            audioStarted = false;
            console.log('⏹️ Tone.js audio stopped');
        } catch (error) {
            console.error('Stop error:', error);
        }
    }
}

// Update audio parameters from sensor data
function startSensorMapping() {
    // Start with a continuous tone
    synth.triggerAttack('C4');
    
    const updateInterval = setInterval(() => {
        if (!audioStarted) {
            clearInterval(updateInterval);
            synth.triggerRelease();
            return;
        }

        // Map accelerometer X to pitch (tilt left/right)
        const semitones = (window.accelX * 24); // ±24 semitones (2 octaves)
        const note = Tone.Frequency('C4').transpose(semitones);
        
        // Update synth frequency by setting the oscillator frequency
        if (synth.oscillator) {
            synth.oscillator.frequency.value = note;
        }

        // Map acceleration magnitude to filter cutoff
        if (filter && filter.frequency) {
            const filterFreq = 500 + (window.accelMag * 1500);
            filter.frequency.value = Math.max(100, Math.min(4000, filterFreq));
        }

        // Map gyro Z (spin) to LFO frequency
        if (lfo && lfo.frequency) {
            const lfoFreq = Math.abs(window.gyroZ) * 0.3 + 0.5;
            lfo.frequency.value = Math.max(0.1, Math.min(10, lfoFreq));
        }

        // Map accelerometer Y to volume/gain
        if (synth && synth.volume) {
            const gainVal = -20 + (window.accelY * 15);
            synth.volume.value = Math.max(-60, Math.min(0, gainVal));
        }

        // Map gyro magnitude to reverb decay
        if (reverb) {
            const reverbDecay = 1 + (window.gyroMag * 0.01);
            reverb.decay = Math.max(0.5, Math.min(5, reverbDecay));
        }

    }, 50); // Update 20 times per second
}

// Serial port functions
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

// UI control functions
function updateSynthVolume(value) {
    if (synth) {
        synth.volume.value = parseInt(value);
        document.getElementById('synthVolumeVal').textContent = value + ' dB';
    }
}

function updateFilterCutoff(value) {
    if (filter) {
        filter.frequency.value = parseInt(value);
        document.getElementById('filterCutoffVal').textContent = value + ' Hz';
    }
}

function updateLfoSpeed(value) {
    if (lfo) {
        lfo.frequency.value = parseFloat(value);
        document.getElementById('lfoSpeedVal').textContent = value + ' Hz';
    }
}

function updateReverbMix(value) {
    if (reverb) {
        reverb.wet.value = parseFloat(value);
        document.getElementById('reverbMixVal').textContent = parseFloat(value).toFixed(1);
    }
}
