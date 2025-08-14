import React, { useState, useCallback, useRef } from 'react';

const ImageUpload = ({ images, setImages, maxImages = 5 }) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const fileInputRef = useRef(null);

  const handleFileUpload = useCallback(async (files) => {
    const fileArray = Array.from(files);
    
    if (images.length + fileArray.length > maxImages) {
      alert(`You can only upload up to ${maxImages} images`);
      return;
    }

    setUploading(true);
    const newImages = [];
    const failedUploads = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      
      if (!file.type.startsWith('image/')) {
        failedUploads.push(`${file.name} (not an image)`);
        continue;
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        failedUploads.push(`${file.name} (too large, max 5MB)`);
        continue;
      }

      try {
        // Update progress
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

        // Convert to base64 directly (faster than server upload)
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.onprogress = (e) => {
            if (e.lengthComputable) {
              const progress = Math.round((e.loaded / e.total) * 100);
              setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
            }
          };
          reader.readAsDataURL(file);
        });

        // Processing complete
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        newImages.push(base64);
        
      } catch (error) {
        console.error('Error processing image:', error);
        failedUploads.push(`${file.name} (processing error)`);
      }
    }

    if (failedUploads.length > 0) {
      alert(`Failed to upload: ${failedUploads.join(', ')}`);
    }

    setImages([...images, ...newImages]);
    setUploading(false);
    setUploadProgress({});
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [images, setImages, maxImages]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    handleFileUpload(files);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOver(false);
    }
  }, []);

  const handleFileSelect = useCallback((e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  }, [handleFileUpload]);

  const removeImage = useCallback((index) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
  }, [images, setImages]);

  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="image-upload-container">
      {/* Upload Area */}
      <div
        className={`image-upload-area ${dragOver ? 'drag-over' : ''} ${uploading ? 'uploading' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={triggerFileSelect}
      >
        <div className="upload-content">
          <div className="upload-icon">📷</div>
          <h3 className="text-lg font-semibold mb-2">Add Images</h3>
          <p className="text-sm text-gray-600 mb-2">
            Drag & drop images here, or click to select
          </p>
          <p className="text-xs text-gray-500">
            JPG, PNG, GIF • Max 5MB each • Up to {maxImages} images
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/gif"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            disabled={uploading || images.length >= maxImages}
          />
        </div>
        
        {uploading && (
          <div className="upload-overlay">
            <div className="spinner"></div>
            <div className="upload-progress">
              <p className="text-sm font-semibold">Processing images...</p>
              {Object.entries(uploadProgress).map(([fileName, progress]) => (
                <div key={fileName} className="progress-item">
                  <div className="progress-bar-container">
                    <div 
                      className="progress-bar"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <span className="text-xs">{fileName.substring(0, 20)}... ({progress}%)</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="image-preview-grid mt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            Uploaded Images ({images.length}/{maxImages})
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {images.map((image, index) => (
              <div key={index} className="image-preview relative">
                <img 
                  src={image} 
                  alt={`Upload ${index + 1}`} 
                  className="w-full h-24 object-cover rounded-lg border"
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIGZpbGw9Im5vbmUiPjxyZWN0IHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgZmlsbD0iI0Y3RjhGQSIvPjx0ZXh0IHg9IjUiIHk9IjE1IiBmb250LXNpemU9IjEwIiBmaWxsPSIjNkI3MjgwIj5JbWFnZTwvdGV4dD48L3N2Zz4=';
                  }}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(index);
                  }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
                  title="Remove image"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Status */}
      <div className="upload-info mt-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">
            {images.length}/{maxImages} images • {maxImages - images.length} remaining
          </span>
          {images.length < maxImages && !uploading && (
            <button
              type="button"
              onClick={triggerFileSelect}
              className="btn btn-outline btn-sm"
            >
              + Add More
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageUpload;