import VideoCard from './VideoCard';
import { FiFilm } from 'react-icons/fi';

function VideoGrid({ videos, onPlay, onVideoUpdate }) {
  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <FiFilm className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-lg font-medium">No videos yet</p>
        <p className="text-sm mt-1">Upload your first video to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {videos.map((video) => (
        <VideoCard
          key={video.id}
          video={video}
          onPlay={onPlay}
          onVideoUpdate={onVideoUpdate}
        />
      ))}
    </div>
  );
}

export default VideoGrid;
