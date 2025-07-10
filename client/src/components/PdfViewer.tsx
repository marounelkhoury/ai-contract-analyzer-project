// client/src/components/PdfViewer.tsx

import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;

interface PdfViewerProps {
  pdfUrl: string;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ pdfUrl }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
    setLoading(false);
    setError(null);
  }

  function onDocumentLoadError(error: any) {
    console.error('Failed to load PDF document:', error);
    setError('Failed to load PDF. Please ensure the URL is correct and the file is valid. Details: ' + error.message);
    setLoading(false);
  }

  const goToPrevPage = () => {
    setPageNumber((prevPageNumber) => Math.max(prevPageNumber - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber((prevPageNumber) => (numPages ? Math.min(prevPageNumber + 1, numPages) : prevPageNumber));
  };

  if (!pdfUrl) {
    return (
      <div className="pdf-message">
        No PDF selected for viewing.
      </div>
    );
  }

  return (
    <div className="pdf-viewer-container-wrapper">
      <h2 className="section-title">Contract Preview</h2>

      <div className="pdf-controls">
        {loading && <p className="loading-text">Loading PDF...</p>}
        {error && <p className="error-text">{error}</p>}
        {numPages && !loading && !error && (
          <>
            <button
              onClick={goToPrevPage}
              disabled={pageNumber <= 1}
              className="nav-button"
            >
              Previous
            </button>
            <p className="page-info">
              Page {pageNumber} of {numPages}
            </p>
            <button
              onClick={goToNextPage}
              disabled={pageNumber >= numPages}
              className="nav-button"
            >
              Next
            </button>
          </>
        )}
      </div>

      <div className="pdf-document-wrapper">
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
        >
          <Page
            pageNumber={pageNumber}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            scale={1.2}
          />
        </Document>
      </div>
    </div>
  );
};

export default PdfViewer;
