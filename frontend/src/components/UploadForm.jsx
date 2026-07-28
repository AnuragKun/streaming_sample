import { useState, useRef } from 'react';
import { uploadVideo } from '../services/api';
import { FiUploadCloud } from 'react-icons/fi';

function UploadForm({ onUploadComplete }) {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();    // Don't reload the page
    setError('');          // Clear any previous errors

    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }
    if (!file) {
      setError('Please select a video file');
      return;
    }

    try {
      setUploading(true);
      await uploadVideo(title, file);
      // Reset the form
      setTitle('');
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';  // Reset the file input DOM element
      }
      onUploadComplete();   // Tell App.jsx to refresh the video list
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-surface-card border border-surface-border rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <FiUploadCloud className="text-accent" />
        Upload Video
      </h2>

      {error && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        {/* Title Input */}
        <input
          type="text"
          placeholder="Video title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={uploading}
          className="flex-1 px-4 py-2.5 rounded-lg bg-surface border border-surface-border text-white
                     placeholder-gray-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent
                     transition-colors disabled:opacity-50"
        />

        {/* File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
          onChange={(e) => setFile(e.target.files[0])}
          disabled={uploading}
          className="flex-1 px-4 py-2.5 rounded-lg bg-surface border border-surface-border text-gray-400
                     file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-accent/10
                     file:text-accent file:text-sm file:font-medium file:cursor-pointer
                     disabled:opacity-50"
        />

        {/* Submit Button */}
        <button
          type="submit"
          disabled={uploading}
          className="px-6 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white font-medium
                     transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center gap-2 whitespace-nowrap"
        >
          {uploading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Processing...
            </>
          ) : (
            <>
              <FiUploadCloud />
              Upload
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export default UploadForm;
