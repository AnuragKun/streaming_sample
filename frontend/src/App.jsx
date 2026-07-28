import { useState, useEffect, useCallback } from 'react';
import { getVideos } from './services/api';
import UploadForm from './components/UploadForm';
import VideoGrid from './components/VideoGrid';
import VideoPlayer from './components/VideoPlayer';

function App() {
  // State: list of all videos from the backend
  const [videos, setVideos] = useState([]);

  // State: which video is currently being played (null = none)
  const [selectedVideo, setSelectedVideo] = useState(null);

  // State: loading indicator for initial fetch
  const [loading, setLoading] = useState(true);

  // Fetch all videos from the API
  const fetchVideos = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getVideos();
      if (Array.isArray(data)) {
        setVideos(data);
      } else {
        console.error('API did not return an array. Make sure the Render API Rewrite rule is configured correctly. Received:', data);
        setVideos([]); // Fallback to empty array
      }
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch videos on initial mount
  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // Polling for processing videos
  useEffect(() => {
    const hasProcessingVideos = Array.isArray(videos) && videos.some(
      (v) => v.status === 'pending' || v.status === 'processing'
    );
    
    if (hasProcessingVideos) {
      const interval = setInterval(() => {
        fetchVideos();
      }, 3000); // Check every 3 seconds
      return () => clearInterval(interval);
    }
  }, [videos, fetchVideos]);

  // Called by UploadForm after a successful upload
  const handleUploadComplete = useCallback(() => {
    fetchVideos(); // Re-fetch the video list to show the new one
  }, [fetchVideos]);

  // Called by VideoCard when the user clicks "Play"
  const handlePlay = useCallback((video) => {
    setSelectedVideo(video);
  }, []);

  // Called by VideoPlayer when the user closes the player
  const handleClosePlayer = useCallback(() => {
    setSelectedVideo(null);
  }, []);

  // Called by VideoCard after rename or delete — refreshes the list
  const handleVideoUpdate = useCallback(() => {
    fetchVideos();
  }, [fetchVideos]);

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="border-b border-surface-border bg-surface-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Video Stream <span className="text-accent">DML</span>
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Multi-bitrate HLS Streaming Platform
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
              System Online
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Upload Section */}
        <UploadForm onUploadComplete={handleUploadComplete} />

        {/* Video Grid */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-white mb-4">
            Video Library
            <span className="ml-2 text-sm font-normal text-gray-400">
              ({videos.length} {videos.length === 1 ? 'video' : 'videos'})
            </span>
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <VideoGrid
              videos={videos}
              onPlay={handlePlay}
              onVideoUpdate={handleVideoUpdate}
            />
          )}
        </section>
      </main>

      {/* Video Player Modal */}
      {selectedVideo && (
        <VideoPlayer
          video={selectedVideo}
          onClose={handleClosePlayer}
        />
      )}
    </div>
  );
}

export default App;
