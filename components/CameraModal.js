"use client";
import { useRef, useState, useEffect } from "react";

export default function CameraModal({ onCapture, onClose, title = "Mark Attendance" }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState("");
  const [captured, setCaptured] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [gettingLocation, setGettingLocation] = useState(true);

  useEffect(() => {
    startCamera();
    getLocation();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraReady(true);
      }
    } catch (err) {
      setError("Camera access denied. Please allow camera permission and try again.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
  };

  const getLocation = () => {
    setGettingLocation(true);
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      setGettingLocation(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setGettingLocation(false);
      },
      () => {
        setLocationError("Unable to retrieve your location. Please enable location services.");
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const capturePhoto = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCaptured(dataUrl);
    stopCamera();
  };

  const retake = () => {
    setCaptured(null);
    startCamera();
  };

  const handleSubmit = () => {
    if (!captured) return;
    onCapture({
      photo: captured,
      latitude: location?.lat ?? 0,
      longitude: location?.lon ?? 0,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg overflow-hidden shadow-2xl max-h-[95dvh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b shrink-0">
          <h2 className="text-base sm:text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto">
          {/* Camera / Captured */}
          <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-[4/3]">
            {!captured ? (
              <>
                <video ref={videoRef} autoPlay playsInline muted
                  className="w-full h-full object-cover" />
                {!cameraReady && !error && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
                  </div>
                )}
              </>
            ) : (
              <img src={captured} alt="Captured" className="w-full h-full object-cover" />
            )}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <p className="text-red-400 text-center text-sm">{error}</p>
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />

          {/* Location status */}
          <div className="flex items-center gap-2 text-sm">
            {gettingLocation ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                <span className="text-gray-500">Fetching location...</span>
              </>
            ) : location ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-green-700">
                  Location: {location.lat.toFixed(5)}, {location.lon.toFixed(5)}
                </span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span className="text-red-600">{locationError}</span>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {!captured ? (
              <button
                onClick={capturePhoto}
                disabled={!cameraReady || !!error}
                className="btn-primary flex-1 py-3 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Capture Photo
              </button>
            ) : (
              <>
                <button onClick={retake} className="btn-secondary flex-1 py-3">
                  Retake
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={false}
                  className="btn-primary flex-1 py-3"
                >
                  Submit Attendance
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
