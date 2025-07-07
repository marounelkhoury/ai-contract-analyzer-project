// client/src/App.tsx

import React, { useState, useEffect, useRef } from 'react';
import FileUpload from './components/FileUpload';
import PdfViewer from './components/PdfViewer';
import CommentSection from './components/CommentSection';
import AuthPage from './components/AuthPage';
import axios from 'axios';
import './index.css';
import { io, Socket } from 'socket.io-client';
import { auth } from './firebase-client';
import type { FirebaseUser } from './firebase-client';
import { onAuthStateChanged, signOut } from 'firebase/auth';

// Define the Comment interface consistently for App.tsx as well
interface Comment {
  id: string; // Document ID from Firestore
  contractId: string;
  userId: string;
  userName: string;
  text: string;
  highlightedText?: string;
  selectionRange?: string; // This will be a JSON string
  timestamp: any; // Use `any` or Firebase Timestamp type from Firestore
}

interface UploadedFileDetails {
  _id: string;
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
  extractedText: string;
  uploadDate: string;
}

const App: React.FC = () => {
  const [pdfToViewUrl, setPdfToViewUrl] = useState<string | null>(null);
  const [currentUploadedFileDetails, setCurrentUploadedFileDetails] = useState<UploadedFileDetails | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [aiMessage, setAiMessage] = useState<string>('');
  const [socket, setSocket] = useState<Socket | null>(null);

  const [savedContracts, setSavedContracts] = useState<UploadedFileDetails[]>([]);
  const [loadingContracts, setLoadingContracts] = useState<boolean>(true);
  const [contractsError, setContractsError] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);

  const [highlightedText, setHighlightedText] = useState<string>('');
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const textDisplayRef = useRef<HTMLDivElement>(null);

  // NEW: State to hold comments for highlighting
  const [commentsForHighlights, setCommentsForHighlights] = useState<Comment[]>([]);


  // --- Socket.IO Client Connection ---
  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    newSocket.on('connect', () => { console.log('🎉 Socket.IO connected:', newSocket.id); });
    newSocket.on('disconnect', () => { console.log('🔌 Socket.IO disconnected'); });
    newSocket.on('connect_error', (error) => { console.error('❌ Socket.IO connection error:', error); });
    setSocket(newSocket);
    return () => { if (newSocket) { newSocket.disconnect(); } };
  }, []);

  // --- Firebase Auth State Listener ---
  useEffect(() => {
    if (!auth) { setAuthReady(true); return; }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);
      console.log('Firebase Auth State Changed. Current User:', user ? user.uid : 'None');
    });
    return () => unsubscribe();
  }, []);

  // --- Fetch Saved Contracts on Component Mount or when returning to upload screen ---
  useEffect(() => {
    const fetchSavedContracts = async () => {
      if (!authReady || !currentUser) {
        setLoadingContracts(false);
        setSavedContracts([]);
        setContractsError('Please login to view your saved contracts.');
        return;
      }
      if (pdfToViewUrl) {
        setLoadingContracts(false);
        return;
      }
      setLoadingContracts(true);
      setContractsError(null);
      try {
        const idToken = await currentUser.getIdToken();
        const response = await axios.get<{ success: boolean; contracts?: UploadedFileDetails[]; message?: string }>(
          'http://localhost:5000/api/contracts',
          { headers: { Authorization: `Bearer ${idToken}` } }
        );
        if (response.data.success && response.data.contracts) {
          setSavedContracts(response.data.contracts);
        } else {
          setContractsError(response.data.message || 'Failed to fetch saved contracts.');
        }
      } catch (error: any) {
        console.error('Error fetching saved contracts:', error);
        setContractsError('Could not load saved contracts. Ensure backend is running and you are logged in.');
      } finally {
        setLoadingContracts(false);
      }
    };
    if (authReady) {
        fetchSavedContracts();
    }
  }, [pdfToViewUrl, authReady, currentUser]);

  // --- Handle successful upload from FileUpload component ---
  const handleUploadSuccess = async (fileUrl: string, uploadedFileDetails: UploadedFileDetails) => {
    setPdfToViewUrl(fileUrl);
    setCurrentUploadedFileDetails(uploadedFileDetails);
    setExtractedText(uploadedFileDetails.extractedText);
    setAiAnalysisResult('');
    setAiMessage('');
    setCustomPrompt('');
    setHighlightedText('');
    setSelectionRange(null);
    setCommentsForHighlights([]); // Clear comments for highlights on new upload
    console.log("PDF URL received by App:", fileUrl);
    console.log("Uploaded File Details received by App:", uploadedFileDetails);
    console.log("Extracted Text received by App (first 200 chars):", uploadedFileDetails.extractedText.substring(0, 200));
    setAuthReady(false); // This will trigger a re-fetch of saved contracts
  };

  // --- Handle loading a previously saved contract ---
  const handleLoadContract = async (contractId: string) => {
    if (!currentUser) { setContractsError('Please login to load contracts.'); return; }
    setLoadingContracts(true);
    setContractsError(null);
    setPdfToViewUrl(null);
    setCurrentUploadedFileDetails(null);
    setExtractedText('');
    setAiAnalysisResult('');
    setAiMessage('');
    setCustomPrompt('');
    setHighlightedText('');
    setSelectionRange(null);
    setCommentsForHighlights([]); // Clear comments for highlights on new load

    try {
      const idToken = await currentUser.getIdToken();
      const response = await axios.get<{ success: boolean; contract?: UploadedFileDetails; message?: string }>(
        `http://localhost:5000/api/contracts/${contractId}`,
        { headers: { Authorization: `Bearer ${idToken}` } }
      );
      if (response.data.success && response.data.contract) {
        const contractData = response.data.contract;
        const pdfUrl = `http://localhost:5000/uploads/${contractData.filename}`;
        
        setPdfToViewUrl(pdfUrl);
        setCurrentUploadedFileDetails(contractData);
        setExtractedText(contractData.extractedText);
        setAiMessage('Contract loaded successfully!');
      } else {
        setContractsError(response.data.message || 'Failed to load contract details.');
      }
    } catch (error: any) {
      console.error('Error loading contract by ID:', error);
      if (axios.isAxiosError(error) && error.response) {
          if (error.response.status === 400 && error.response.data.message === 'Invalid contract ID format.') {
              setContractsError('Error: Invalid contract ID. The selected contract might be corrupted.');
          } else if (error.response.status === 401 || error.response.status === 403) {
              setContractsError('Authentication required to load this contract. Please log in.');
          } else {
              setContractsError(error.response.data.message || 'Error loading contract. Please try again.');
          }
      } else {
          setContractsError('Error loading contract. Please try again.');
      }
    } finally {
      setLoadingContracts(false);
    }
  };

  const handleBackToUpload = () => {
    setPdfToViewUrl(null);
    setCurrentUploadedFileDetails(null);
    setExtractedText('');
    setAiAnalysisResult('');
    setAiMessage('');
    setCustomPrompt('');
    setHighlightedText('');
    setSelectionRange(null);
    setCommentsForHighlights([]); // Clear comments for highlights
  };

  const handleLogout = async () => {
    if (auth) {
        await signOut(auth);
        console.log('User logged out.');
        setPdfToViewUrl(null);
        setCurrentUploadedFileDetails(null);
        setExtractedText('');
        setAiAnalysisResult('');
        setAiMessage('');
        setCustomPrompt('');
        setSavedContracts([]);
        setContractsError(null);
        setLoadingContracts(false);
        setHighlightedText('');
        setSelectionRange(null);
        setCommentsForHighlights([]); // Clear comments for highlights on logout
    }
  };

  const analyzeTextWithAI = async (type: 'summary' | 'clauses' | 'custom') => {
    if (!extractedText || !currentUser) { setAiMessage('Please login to perform AI analysis.'); return; }
    if (type === 'custom' && !customPrompt.trim()) { setAiMessage('Please enter a custom prompt for analysis.'); return; }

    setAiLoading(true);
    setAiAnalysisResult('');
    setAiMessage('Analyzing with AI...');

    try {
      const idToken = await currentUser.getIdToken();
      const payload: { text: string; type: string; prompt?: string } = { text: extractedText, type: type, };
      if (type === 'custom') { payload.prompt = customPrompt; }

      const response = await axios.post<{ success: boolean; analysisResult?: string; message?: string }>(
        'http://localhost:5000/api/ai/analyze', payload, { headers: { Authorization: `Bearer ${idToken}` } }
      );

      if (response.data.success && response.data.analysisResult) {
        setAiAnalysisResult(response.data.analysisResult);
        setAiMessage('AI analysis complete!');
      } else {
        setAiMessage(`AI analysis failed: ${response.data.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          if (error.response.status === 401 || error.response.status === 403) {
            setAiMessage('Authentication required for AI analysis. Please log in.');
          } else {
            setAiMessage(`Server error during AI analysis: ${error.response.data.message || error.response.statusText}`);
            console.error('AI analysis server error:', error.response.data);
          }
        } else if (error.request) {
          setAiMessage('Network error during AI analysis: No response from server.');
          console.error('AI analysis network error:', error.request);
        } else {
          setAiMessage(`Error setting up AI analysis request: ${error.message}`);
          console.error('AI analysis request setup error:', error.message);
        }
      } else {
        setAiMessage('An unexpected error occurred during AI analysis.');
        console.error('Unexpected AI analysis error:', error);
      }
    } finally {
      setAiLoading(false);
    }
  };

  // --- Text Selection Handlers ---
  const handleTextSelection = () => {
    if (!textDisplayRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setHighlightedText('');
      setSelectionRange(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const container = textDisplayRef.current;

    if (container.contains(range.commonAncestorContainer)) {
        const selectedText = selection.toString();
        if (selectedText.length > 0) {
            const preSelectionRange = range.cloneRange();
            preSelectionRange.selectNodeContents(container);
            preSelectionRange.setEnd(range.startContainer, range.startOffset);
            const start = preSelectionRange.toString().length;
            const end = start + selectedText.length;

            setHighlightedText(selectedText);
            setSelectionRange({ start, end });
            console.log('Selected Text:', selectedText);
            console.log('Selection Range:', { start, end });
        } else {
            setHighlightedText('');
            setSelectionRange(null);
        }
    } else {
        setHighlightedText('');
        setSelectionRange(null);
    }
  };

  const handleMouseDownOnText = () => {
    setHighlightedText('');
    setSelectionRange(null);
  };

  // NEW: Function to render the extracted text with highlights
  const renderHighlightedText = () => {
    if (!extractedText) {
      return <p className="placeholder-text">No text extracted.</p>;
    }

    // Filter comments that have valid highlight data and parse selectionRange
    const validHighlights = commentsForHighlights
      .filter(comment => comment.highlightedText && comment.selectionRange)
      .map(comment => {
        try {
          const range = JSON.parse(comment.selectionRange as string); // Parse the JSON string
          // Ensure range has start and end properties as numbers
          if (typeof range.start === 'number' && typeof range.end === 'number') {
            return {
              text: comment.highlightedText,
              start: range.start,
              end: range.end,
              commentId: comment.id // Associate highlight with comment ID
            };
          }
          return null;
        } catch (e) {
          console.error('Error parsing selectionRange for comment:', comment.id, e);
          return null;
        }
      })
      .filter(Boolean) as { text: string; start: number; end: number; commentId: string; }[]; // Remove nulls

    if (validHighlights.length === 0) {
      return <>{extractedText}</>; // Return as fragment to avoid extra div if no highlights
    }

    // Sort highlights by their start position to process them in order
    // This also helps with potential overlapping highlights by processing earlier ones first.
    validHighlights.sort((a, b) => a.start - b.start);

    const elements: React.ReactNode[] = [];
    let currentIndex = 0;

    validHighlights.forEach((highlight, index) => {
      // Add the text before the current highlight
      if (highlight.start > currentIndex) {
        elements.push(
          <React.Fragment key={`text-before-${index}`}>
            {extractedText.substring(currentIndex, highlight.start)}
          </React.Fragment>
        );
      }

      // Add the highlighted text
      // Ensure the end index does not exceed the length of extractedText
      const highlightEnd = Math.min(highlight.end, extractedText.length);
      if (highlight.start < highlightEnd) { // Only add if valid range
        elements.push(
          <span
            key={`highlight-${index}-${highlight.commentId}`}
            className="text-highlight"
            data-comment-id={highlight.commentId} // Useful for potential future interaction
            title={`Comment: ${highlight.text}`} // Tooltip for highlight
          >
            {extractedText.substring(highlight.start, highlightEnd)}
          </span>
        );
      }

      // Update currentIndex to the end of the current highlight
      currentIndex = Math.max(currentIndex, highlightEnd);
    });

    // Add any remaining text after the last highlight
    if (currentIndex < extractedText.length) {
      elements.push(
        <React.Fragment key={`text-after-last-highlight`}>
          {extractedText.substring(currentIndex)}
        </React.Fragment>
      );
    }

    return <>{elements}</>; // Return as fragment
  };


  // Main render logic
  if (!authReady) {
    return (
      <div className="App-container loading-screen">
        <p>Loading application...</p>
        <div className="spinner"></div>
      </div>
    );
  }

  // Show AuthPage if no current user
  if (!currentUser) {
    return (
      <div className="App-container">
        <header className="app-header">
          <h1 className="app-title">AI Contract Analyzer</h1>
        </header>
        <main className="main-content">
          <AuthPage onAuthSuccess={setCurrentUser} />
        </main>
        <footer className="app-footer">
          &copy; {new Date().getFullYear()} AI Contract Analyzer. All rights reserved.
        </footer>
      </div>
    );
  }

  // Show main app if user is logged in
  return (
    <div className="App-container">
      {/* Header */}
      <header className="app-header">
        <h1 className="app-title">AI Contract Analyzer</h1>
        <div className="header-actions">
          {currentUser && (
            <span className="user-display">Logged in as: {currentUser.email || currentUser.uid}</span>
          )}
          {pdfToViewUrl && (
            <button
              onClick={handleBackToUpload}
              className="back-button"
            >
              ← Upload New Contract
            </button>
          )}
          {currentUser && (
            <button
              onClick={handleLogout}
              className="logout-button"
            >
              Logout
            </button>
          )}
        </div>
      </header>

      <main className="main-content">
        {pdfToViewUrl ? (
          <div className="content-layout">
            {/* Left Pane: PDF Viewer */}
            <div className="pane pdf-viewer-pane">
              <PdfViewer pdfUrl={pdfToViewUrl} />
            </div>

            {/* Right Pane: Extracted Text & AI Analysis */}
            <div className="pane ai-analysis-pane">
              <h2 className="section-title">Extracted Text & AI Analysis</h2>
              
              {/* Extracted Text Section */}
              <div className="extracted-text-section">
                <h3 className="sub-section-title">Original Extracted Text:</h3>
                {/* Render the text with highlights */}
                <div
                    ref={textDisplayRef}
                    className="text-display custom-scroll"
                    onMouseUp={handleTextSelection}
                    onMouseDown={handleMouseDownOnText}
                >
                    {renderHighlightedText()} {/* CALL THE NEW FUNCTION HERE */}
                </div>
              </div>

              {/* AI Analysis Controls */}
              <div className="ai-controls-section">
                <h3 className="sub-section-title">AI Analysis Options:</h3>
                <div className="button-group-row">
                  <button
                    onClick={() => analyzeTextWithAI('summary')}
                    disabled={aiLoading || !extractedText}
                    className="action-button summary-button"
                  >
                    {aiLoading ? 'Summarizing...' : 'Summarize Contract'}
                  </button>
                  <button
                    onClick={() => analyzeTextWithAI('clauses')}
                    disabled={aiLoading || !extractedText}
                    className="action-button clauses-button"
                  >
                    {aiLoading ? 'Extracting...' : 'Extract Key Clauses'}
                  </button>
                </div>
                
                <div className="custom-prompt-area">
                  <label htmlFor="customPrompt" className="input-label">
                    Custom AI Prompt:
                  </label>
                  <textarea
                    id="customPrompt"
                    rows={3}
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="E.g., 'What are the termination conditions?'"
                    className="custom-textarea-input"
                    disabled={aiLoading}
                  ></textarea>
                  <button
                    onClick={() => analyzeTextWithAI('custom')}
                    disabled={aiLoading || !extractedText || !customPrompt.trim()}
                    className="action-button custom-analysis-button"
                  >
                    {aiLoading ? 'Analyzing...' : 'Run Custom Analysis'}
                  </button>
                </div>
              </div>

              {/* AI Analysis Result Display */}
              <div className="ai-result-section">
                <h3 className="sub-section-title">AI Analysis Result:</h3>
                {aiMessage && (
                  <p className={`ai-status-message ${aiMessage.includes('success') || aiMessage.includes('complete') ? 'success' : 'error'}`}>
                    {aiMessage}
                  </p>
                )}
                {aiLoading ? (
                  <div className="loading-indicator">
                    <div className="spinner"></div>
                    <p className="loading-text">Thinking...</p>
                  </div>
                ) : aiAnalysisResult ? (
                  <div className="text-display custom-scroll">
                    {aiAnalysisResult}
                  </div>
                ) : (
                  <p className="placeholder-text">No AI analysis performed yet.</p>
                )}
              </div>

              {/* Comment Section */}
              <div className="comment-section-wrapper">
                {currentUploadedFileDetails && socket && currentUser && (
                  <CommentSection
                    contractId={currentUploadedFileDetails._id}
                    socket={socket}
                    currentUserId={currentUser.uid}
                    currentUserName={currentUser.email || currentUser.uid} // Use email or uid if displayName is null
                    highlightedText={highlightedText}
                    selectionRange={selectionRange}
                    clearSelection={() => { setHighlightedText(''); setSelectionRange(null); }}
                    onCommentsUpdate={setCommentsForHighlights} // NEW: Pass the setter for commentsForHighlights
                  />
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="initial-view-layout">
            <div className="pane upload-pane">
              <FileUpload onUploadSuccess={handleUploadSuccess} />
            </div>
            
            <div className="pane saved-contracts-pane">
              <h2 className="section-title">Your Saved Contracts</h2>
              {loadingContracts ? (
                <p className="placeholder-text">Loading contracts...</p>
              ) : contractsError ? (
                <p className="error-text message-display">{contractsError}</p>
              ) : savedContracts.length === 0 ? (
                <p className="placeholder-text">No contracts saved yet. Upload one!</p>
              ) : (
                <ul className="contract-list custom-scroll">
                  {savedContracts.map((contract) => (
                    <li key={contract._id} className="contract-list-item">
                      <button onClick={() => handleLoadContract(contract._id)} className="load-contract-button">
                        <span className="contract-name">{contract.originalname}</span>
                        <span className="upload-date">({new Date(contract.uploadDate).toLocaleDateString()})</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        &copy; {new Date().getFullYear()} AI Contract Analyzer. All rights reserved.
      </footer>
    </div>
  );
};

export default App;
