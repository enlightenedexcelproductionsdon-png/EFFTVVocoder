import React, { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  const [isActive, setIsActive] = useState(false);
  const [params, setParams] = useState({
    fftSize: 2048,
    overlap: 0.5,
    numBands: 16,
    qFactor: 1.0,
    carrierFreq: 440,
    modGain: 1.0,
    carrierGain: 1.0,
    wetDry: 0.5,
    attack: 0.01,
    release: 0.1,
    pitchShift: 1.0,
    formantShift: 1.0,
    noiseLevel: 0.0,
    distortion: 0.0,
    reverb: 0.0,
    delay: 0.0,
    chorus: 0.0,
    flanger: 0.0,
    phaser: 0.0
  });

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const carrierOscRef = useRef(null);

  const startVocoder = async () => {
    if (isActive) return;

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    audioContextRef.current = audioCtx;

    // Get microphone input
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioCtx.createMediaStreamSource(stream);

    // Create analyser for visualization
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = params.fftSize;
    analyserRef.current = analyser;

    // Create carrier oscillator
    const carrierOsc = audioCtx.createOscillator();
    carrierOsc.frequency.setValueAtTime(params.carrierFreq, audioCtx.currentTime);
    carrierOscRef.current = carrierOsc;

    // Simple vocoder using gain modulation
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(params.modGain, audioCtx.currentTime);

    // Connect: source -> analyser -> gain -> destination
    source.connect(analyser);
    analyser.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    // Carrier to gain modulation (simplified)
    carrierOsc.connect(gainNode.gain);

    carrierOsc.start();
    setIsActive(true);

    // Start visualization
    draw();
  };

  const stopVocoder = () => {
    if (!isActive) return;

    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setIsActive(false);
  };

  const draw = () => {
    if (!analyserRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const drawFrame = () => {
      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#0f0';
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }

      if (isActive) {
        requestAnimationFrame(drawFrame);
      }
    };

    drawFrame();
  };

  const handleParamChange = (param, value) => {
    setParams(prev => ({ ...prev, [param]: parseFloat(value) }));

    // Update live parameters
    if (param === 'carrierFreq' && carrierOscRef.current) {
      carrierOscRef.current.frequency.setValueAtTime(value, audioContextRef.current.currentTime);
    }
    if (param === 'fftSize' && analyserRef.current) {
      analyserRef.current.fftSize = value;
    }
  };

  return (
    <div className="vocoder-container">
      <h1>EFFTV Vocoder</h1>
      <button onClick={isActive ? stopVocoder : startVocoder}>
        {isActive ? 'Stop Vocoder' : 'Start Vocoder'}
      </button>
      <div className="controls">
        {Object.entries(params).map(([key, value]) => (
          <div key={key} className="control">
            <label>{key}: {value}</label>
            <input
              type="range"
              min={key === 'fftSize' ? 256 : key === 'numBands' ? 8 : 0}
              max={key === 'fftSize' ? 4096 : key === 'numBands' ? 32 : key === 'pitchShift' || key === 'formantShift' ? 2 : 1}
              step={key === 'fftSize' || key === 'numBands' ? 1 : 0.01}
              value={value}
              onChange={(e) => handleParamChange(key, e.target.value)}
            />
          </div>
        ))}
      </div>
      <div className="video-container">
        <video ref={videoRef} controls width="640" height="360">
          <source src="sample-video.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
      <canvas ref={canvasRef} width="640" height="200"></canvas>
    </div>
  );
}

export default App;