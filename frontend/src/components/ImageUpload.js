import React, { useState, useCallback, useRef } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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

        // Simulate server upload with the base64 data
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
    // Only remove drag over if we're leaving the entire drop zone
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
            className="file-input hidden"
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
                  <span className="text-xs">{fileName} ({progress}%)</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="image-preview-grid">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            Uploaded Images ({images.length}/{maxImages})
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {images.map((image, index) => (
              <div key={index} className="image-preview relative">
                <img 
                  src={image} 
                  alt={`Upload ${index + 1}`} 
                  className="w-full h-24 object-cover rounded-lg"
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIxIDlWN0MxOSA1IDE3IDUgMTcgNUg3QzUgNSAzIDUgMyA3VjE3QzMgMTkgNSAxOSA1IDE5SDE3QzE5IDE5IDIxIDE5IDIxIDE3VjlaSDE5VjE3SDE3VjE5SDE5VjE3SDIxWiIgZmlsbD0iI0VGNEVGRiIvPgo8L3N2Zz4K';
                  }}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(index);
                  }}
                  className="remove-image-btn absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
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
            {images.length}/{maxImages} images • {5 - images.length} remaining
          </span>
          {images.length < maxImages && (
            <button
              type="button"
              onClick={triggerFileSelect}
              className="btn btn-outline btn-sm"
              disabled={uploading}
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

  return (
    <div className="image-upload-container">
      {/* Upload Area */}
      <div
        className={`image-upload-area ${dragOver ? 'drag-over' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="upload-content">
          <div className="upload-icon">📷</div>
          <h3>Add Images to Your Request</h3>
          <p>Drag and drop images here, or click to select files</p>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="file-input"
            disabled={uploading || images.length >= maxImages}
          />
        </div>
        
        {uploading && (
          <div className="upload-overlay">
            <div className="spinner"></div>
            <p>Uploading images...</p>
          </div>
        )}
      </div>

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="image-preview-grid">
          {images.map((image, index) => (
            <div key={index} className="image-preview">
              <img src={image} alt={`Upload ${index + 1}`} />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="remove-image-btn"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="upload-info">
        <p className="text-sm text-gray-600">
          {images.length}/{maxImages} images uploaded
        </p>
        <p className="text-xs text-gray-500">
          Supported formats: JPG, PNG, GIF. Max file size: 5MB per image.
        </p>
      </div>
    </div>
  );
};

export default ImageUpload;