// client/src/components/CommentSection.tsx

import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

// CORRECTED IMPORTS: Only import the necessary functions and types from firebase/firestore directly,
// and import the initialized 'db' instance from your central firebase-client.ts.
// NO LOCAL FIREBASE INITIALIZATION HERE.
import { db } from '../firebase-client'; // Import the initialized db instance
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'; // Import Firestore functions
import type { Timestamp } from 'firebase/firestore'; // Import Timestamp type


// Define the shape of a Comment object (client-side)
interface Comment {
  id: string; // Document ID from Firestore
  contractId: string;
  userId: string;
  userName: string;
  text: string;
  highlightedText?: string; // Add highlightedText
  selectionRange?: string; // This will be a JSON string from Firestore
  timestamp: Timestamp; // Use Firestore's Timestamp type
}

interface CommentSectionProps {
  contractId: string;
  socket: Socket | null;
  currentUserId: string;
  currentUserName: string;
  highlightedText: string;
  selectionRange: { start: number; end: number } | null;
  clearSelection: () => void;
  onCommentsUpdate: (comments: Comment[]) => void; // Callback to pass comments back
}

// REMOVED: All local Firebase configuration and initialization (firebaseConfig, appInstance, authInstance, dbInstance, initializeApp, getApps, getApp, getAuth, getFirestore calls)
// These are now handled exclusively by client/src/firebase-client.ts

const CommentSection: React.FC<CommentSectionProps> = ({
  contractId,
  socket,
  currentUserId,
  currentUserName,
  highlightedText,
  selectionRange,
  clearSelection,
  onCommentsUpdate
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [loadingComments, setLoadingComments] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 'db' is now directly the imported instance from firebase-client.ts
  // No need for 'const db = dbInstance;' as it's already imported as 'db'

  // Firestore onSnapshot listener for real-time comments
  useEffect(() => {
    // Check if db is valid and contractId is provided
    if (!db || !contractId) {
      setComments([]);
      setLoadingComments(false);
      setError('Cannot load comments: Firestore database is not ready or no contract selected.');
      return;
    }

    setLoadingComments(true);
    setError(null);

    const commentsQuery = query(
      collection(db, 'comments'),
      where('contractId', '==', contractId),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const fetchedComments: Comment[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        fetchedComments.push({
          id: doc.id,
          contractId: data.contractId,
          userId: data.userId,
          userName: data.userName,
          text: data.text,
          highlightedText: data.highlightedText,
          selectionRange: data.selectionRange,
          timestamp: data.timestamp
        });
      });
      setComments(fetchedComments);
      onCommentsUpdate(fetchedComments);
      setLoadingComments(false);
      console.log(`Comments updated for contract ${contractId}:`, fetchedComments.length);
    }, (err) => {
      console.error('❌ Firestore onSnapshot Error:', err);
      console.error('Error Name:', err.name);
      console.error('Error Message:', err.message);
      setError('Failed to load real-time comments from Firestore. See console for details.');
      setLoadingComments(false);
    });

    return () => unsubscribe();
  }, [contractId, db, onCommentsUpdate]);

  const handleAddComment = () => {
    if (newCommentText.trim() === '' || !socket || !contractId || !currentUserId) {
      setError('Comment cannot be empty or connection not ready. Please login to comment.');
      return;
    }

    const commentData = {
      contractId: contractId,
      userId: currentUserId,
      userName: currentUserName,
      text: newCommentText.trim(),
      highlightedText: highlightedText || '',
      selectionRange: selectionRange ? JSON.stringify(selectionRange) : '',
    };

    socket.emit('newComment', commentData);
    setNewCommentText('');
    setError(null);
    clearSelection();
  };

  const formatDate = (timestamp: Timestamp) => {
    if (!timestamp || typeof timestamp.toDate !== 'function') return 'N/A';
    const date = timestamp.toDate();
    return date.toLocaleString();
  };

  return (
    <div className="comment-section-container">
      <h3 className="sub-section-title">Comments</h3>

      {highlightedText && (
        <div className="highlight-preview-box">
          <p className="highlight-preview-text">
            Commenting on: "<em>{highlightedText}</em>"
          </p>
          <button onClick={clearSelection} className="clear-highlight-button">
            Clear Highlight
          </button>
        </div>
      )}

      {error && <p className="error-text message-display">{error}</p>}

      <div className="comments-list custom-scroll">
        {loadingComments ? (
          <p className="placeholder-text">Loading comments...</p>
        ) : comments.length === 0 ? (
          <p className="placeholder-text">No comments yet. Be the first to add one!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="comment-item">
              <div className="comment-header">
                <span className="comment-user-name">{comment.userName || 'Anonymous'}</span>
                <span className="comment-timestamp">{formatDate(comment.timestamp)}</span>
              </div>
              <p className="comment-text">{comment.text}</p>
              {comment.highlightedText && (
                <div className="comment-highlight-info">
                  <strong>Highlighted Text:</strong> "{comment.highlightedText}"
                  {comment.selectionRange && (
                    <span> (Range: {comment.selectionRange})</span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="add-comment-area">
        <textarea
          value={newCommentText}
          onChange={(e) => setNewCommentText(e.target.value)}
          placeholder="Add a new comment..."
          className="comment-textarea-input"
          rows={3}
          disabled={!socket || !contractId || !currentUserId}
        ></textarea>
        <button
          onClick={handleAddComment}
          className="action-button add-comment-button"
          disabled={!socket || !contractId || !currentUserId || newCommentText.trim() === ''}
        >
          Add Comment
        </button>
      </div>
    </div>
  );
};

export default CommentSection;
