import { useState } from 'react';
import { renameVideo, deleteVideo } from '../services/api';
import { FiPlay, FiEdit2, FiTrash2, FiCheck, FiX, FiClock, FiLoader, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

// Map video status to badge styles
const STATUS_CONFIG = {
  pending: { icon: FiClock, label: 'Pending', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  processing: { icon: FiLoader, label: 'Processing', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20', animate: true },
  ready: { icon: FiCheckCircle, label: 'Ready', color: 'text-green-400 bg-green-400/10 border-green-400/20' },
  failed: { icon: FiAlertCircle, label: 'Failed', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
};

function VideoCard({ video, onPlay, onVideoUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [newTitle, setNewTitle] = useState(video.title);
  const [deleting, setDeleting] = useState(false);

  const statusConfig = STATUS_CONFIG[video.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  const handleRename = async () => {
    if (!newTitle.trim() || newTitle === video.title) {
      setIsEditing(false);
      setNewTitle(video.title);
      return;
    }
    try {
      await renameVideo(video.id, newTitle);
      setIsEditing(false);
      onVideoUpdate();    // Refresh the list
    } catch (error) {
      console.error('Rename failed:', error);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${video.title}"? This cannot be undone.`)) return;
    try {
      setDeleting(true);
      await deleteVideo(video.id);
      onVideoUpdate();    // Refresh the list
    } catch (error) {
      console.error('Delete failed:', error);
      setDeleting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleRename();
    if (e.key === 'Escape') {
      setIsEditing(false);
      setNewTitle(video.title);
    }
  };

  return (
    <div className={`group bg-surface-card border border-surface-border rounded-xl overflow-hidden
                     transition-all duration-300 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5
                     ${deleting ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Thumbnail / Play Area */}
      <div
        className="relative aspect-video bg-surface flex items-center justify-center cursor-pointer"
        onClick={() => video.status === 'ready' && onPlay(video)}
      >
        {video.status === 'ready' ? (
          <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center
                          group-hover:bg-accent/30 transition-all duration-300 group-hover:scale-110">
            <FiPlay className="w-6 h-6 text-accent ml-1" />
          </div>
        ) : (
          <StatusIcon className={`w-8 h-8 ${statusConfig.color.split(' ')[0]}
                                 ${statusConfig.animate ? 'animate-spin' : ''}`} />
        )}

        {/* Status Badge */}
        <span className={`absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5
                         rounded-full text-xs font-medium border ${statusConfig.color}`}>
          {statusConfig.label}
        </span>
      </div>

      {/* Info Section */}
      <div className="p-4">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="flex-1 px-2 py-1 rounded bg-surface border border-surface-border text-white
                         text-sm focus:outline-none focus:border-accent"
            />
            <button onClick={handleRename} className="text-green-400 hover:text-green-300">
              <FiCheck className="w-4 h-4" />
            </button>
            <button onClick={() => { setIsEditing(false); setNewTitle(video.title); }}
                    className="text-gray-400 hover:text-gray-300">
              <FiX className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-white truncate flex-1 mr-2">
              {video.title}
            </h3>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setIsEditing(true)}
                      className="p-1.5 rounded-md hover:bg-surface-hover text-gray-400 hover:text-white transition-colors"
                      title="Rename">
                <FiEdit2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleDelete}
                      className="p-1.5 rounded-md hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
                      title="Delete">
                <FiTrash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <p className="text-xs text-gray-500 mt-1">
          {new Date(video.created_at).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}

export default VideoCard;
