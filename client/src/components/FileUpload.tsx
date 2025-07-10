// client/src/components/FileUpload.tsx

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

interface UploadedFileDetails { // CHANGED from UploadedFile
  _id: string;
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
  extractedText: string;
  uploadDate: string;
}

interface FileUploadProps {

  onUploadSuccess: (fileUrl: string, uploadedFileDetails: UploadedFileDetails) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setMessage('');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'application/pdf': ['.pdf']
    },
    noClick: true,
  });

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select a file first.');
      return;
    }

    setUploading(true);
    setMessage('Uploading...');

    const formData = new FormData();
    formData.append('contract', file);

    try {
      const response = await axios.post<{
        success: boolean;
        message?: string; // Still allow message for errors
        file?: UploadedFileDetails; // Now uses the correct UploadedFileDetails
      }>(
        'http://localhost:5000/api/files/upload',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success && response.data.file) { // Ensure response.data.file exists
        setMessage('File uploaded successfully! Ready for analysis.');
        // This variable's type now correctly points to the renamed interface
        const uploadedFileDetails: UploadedFileDetails = response.data.file; 
        
        const pdfUrl = `http://localhost:5000/uploads/${uploadedFileDetails.filename}`;

        // Call the callback with the PDF URL and the comprehensive details object
        onUploadSuccess(pdfUrl, uploadedFileDetails);
        setFile(null);
      } else {
        setMessage(`Upload failed: ${response.data.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          setMessage(`Server error: ${error.response.data.message || error.response.statusText}`);
          console.error('Upload server error:', error.response.data);
        } else if (error.request) {
          setMessage('Network error: No response from server.');
          console.error('Upload network error:', error.request);
        } else {
          setMessage(`Error: ${error.message}`);
          console.error('Upload request setup error:', error.message);
        }
      } else {
        setMessage('An unexpected error occurred during upload.');
        console.error('Unexpected upload error:', error);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-container">
      <div className="upload-card">
        <h2 className="section-title">Upload Your Contract (PDF)</h2>

        <div
          {...getRootProps()}
          className={`dropzone-area ${isDragActive ? 'active' : ''}`}
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p className="dropzone-text">Drop the file here ...</p>
          ) : (
            <p className="dropzone-text">
              Drag 'n' drop a PDF file here, or click the button below to select one
            </p>
          )}
        </div>

        {file && (
          <p className="selected-file-info">
            Selected file: <span className="file-name">{file.name}</span> ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}

        <div className="button-group">
          <button
            onClick={open}
            className="main-button select-file-button"
            disabled={uploading}
          >
            {file ? 'Change Selected File' : 'Select File'}
          </button>

          <button
            onClick={handleUpload}
            className={`main-button upload-button ${!file || uploading ? 'disabled' : ''}`}
            disabled={!file || uploading}
          >
            {uploading ? 'Uploading...' : 'Upload Contract'}
          </button>
        </div>

        {message && (
          <p className={`message-display ${message.includes('success') ? 'success' : 'error'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
