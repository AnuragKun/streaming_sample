import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { FiX, FiSettings } from 'react-icons/fi';

function VideoPlayer({ video, onClose }) {
  const videoRef = useRef(null);           // Reference to the <video> DOM element
  const hlsRef = useRef(null);             // Reference to the HLS.js instance
  const [qualities, setQualities] = useState([]);     // Available quality levels
  const [currentQuality, setCurrentQuality] = useState(-1);  // -1 = auto
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !video.hls_url) return;

    if (Hls.isSupported()) {
      // Most browsers: use HLS.js
      const hls = new Hls({
        startLevel: -1,          // Start with auto quality selection
        capLevelToPlayerSize: true, // Don't load 1080p if the player is tiny
      });

      hls.loadSource(video.hls_url);
      hls.attachMedia(videoElement);

      // When the manifest (master.m3u8) is parsed, we know all quality levels
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // hls.levels = [{height: 240, bitrate: 400000}, {height: 720, ...}, ...]
        setQualities(hls.levels.map((level, index) => ({
          index,
          label: `${level.height}p`,
          height: level.height,
          bitrate: level.bitrate,
        })));
        videoElement.play().catch(() => {}); // Autoplay (catch if browser blocks it)
      });

      // Handle HLS errors with automatic recovery for network/media errors
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });

      hlsRef.current = hls;

      // Cleanup: destroy HLS.js when the component unmounts (player closes)
      return () => {
        hls.destroy();
      };
    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari: native HLS support — just set the src directly
      videoElement.src = video.hls_url;
      videoElement.addEventListener('loadedmetadata', () => {
        videoElement.play().catch(() => {});
      });
    }
  }, [video.hls_url]);

  // Handle quality change from the selector
  const handleQualityChange = (levelIndex) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;  // -1 = auto, 0 = lowest, etc.
      setCurrentQuality(levelIndex);
    }
    setShowSettings(false);
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      {/* Backdrop — click to close */}
      <div className="absolute inset-0" onClick={onClose}></div>

      {/* Player Container */}
      <div className="relative w-full max-w-5xl mx-4 z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-medium truncate mr-4">{video.title}</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Video Element */}
        <div className="relative rounded-xl overflow-hidden bg-black shadow-2xl">
          <video
            ref={videoRef}
            controls
            className="w-full aspect-video"
            playsInline
          />

          {/* Quality Selector */}
          <div className="absolute bottom-16 right-4">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg bg-black/60 hover:bg-black/80 text-white transition-colors"
              title="Quality settings"
            >
              <FiSettings className="w-4 h-4" />
            </button>

            {showSettings && qualities.length > 0 && (
              <div className="absolute bottom-full right-0 mb-2 py-2 bg-surface-card border border-surface-border
                              rounded-lg shadow-xl min-w-[140px]">
                {/* Auto option */}
                <button
                  onClick={() => handleQualityChange(-1)}
                  className={`w-full px-4 py-1.5 text-left text-sm transition-colors
                             ${currentQuality === -1 ? 'text-accent bg-accent/10' : 'text-gray-300 hover:bg-surface-hover'}`}
                >
                  Auto
                </button>
                {/* Individual quality levels */}
                {qualities.map((q) => (
                  <button
                    key={q.index}
                    onClick={() => handleQualityChange(q.index)}
                    className={`w-full px-4 py-1.5 text-left text-sm transition-colors
                               ${currentQuality === q.index ? 'text-accent bg-accent/10' : 'text-gray-300 hover:bg-surface-hover'}`}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default VideoPlayer;
