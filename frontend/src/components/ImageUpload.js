import React, { useState } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ImageUpload = ({ images, setImages, maxImages = 5 }) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileUpload = async (files) => {
    if (images.length + files.length > maxImages) {
      alert(`You can only upload up to ${maxImages} images`);
      return;
    }

    setUploading(true);
    const newImages = [];

    for (let file of files) {
      if (file.type.startsWith('image/')) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          
          const response = await axios.post(`${API}/upload-image`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          
          newImages.push(response.data.image);
        } catch (error) {
          console.error('Error uploading image:', error);
          alert(`Failed to upload ${file.name}`);
        }
      }
    }

    setImages([...images, ...newImages]);
    setUploading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    handleFileUpload(files);
  };

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
  };

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