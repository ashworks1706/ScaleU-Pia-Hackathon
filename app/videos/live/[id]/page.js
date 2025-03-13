/* eslint-disable react-hooks/exhaustive-deps */
// pages/videos/live/[id].jsx
"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import NavbarSection from "../../../../components/Navbar";
import dynamic from "next/dynamic";
import PieSocket from "piesocket-js";
import {
  Button,
  Input,
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  Chip,
  Avatar,
  Divider,
  Badge,
  Tooltip,
} from "@heroui/react";
import Peer from 'simple-peer';

const Whiteboard = dynamic(
  async () => (await import("../../../../components/canvasWrapper")).default,
  { ssr: false }
);

// Debounce hook for whiteboard changes
function useDebounce(callback, delay) {
  const timeoutRef = useRef(null);
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  return (...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  };
}

export default function LiveSession() {
  const combinedRecorderRef = useRef(null);
  const drawRef = useRef(null);

  const [recordingStatus, setRecordingStatus] = useState("recording");
  const { userId } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [mediaState, setMediaState] = useState({
    hasAudio: false,
    isRecording: false,
    lastSaved: null,
  });
  const id = params?.id;
  const audioRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [whiteboardData, setWhiteboardData] = useState(null);
  const [poll, setPoll] = useState(null);
  const [votes, setVotes] = useState({});
  const [whiteboardReady, setWhiteboardReady] = useState(false);
  const audioStreamRef = useRef(null);
  const [connectionError, setConnectionError] = useState(null);
  const mediaRecorder = useRef(null);
  const [isHost, setIsHost] = useState(false);
  const pendingChanges = useRef([]);
  let lastTranscriptUpdate = 0;

  // Use PieSocket JS – hold both the channel and the PieSocket instance
  const channelRef = useRef(null);
  const pieSocketRef = useRef(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [finalVideoURL, setFinalVideoURL] = useState("");
  const [peers, setPeers] = useState({});
  const userAudioRef = useRef(null);
  const peerConnections = useRef({});
  const audioContextRef = useRef(null);

  // Improved WebSocket reconnection logic
  useEffect(() => {
    if (!id) return;
    
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const reconnectDelay = 3000;
    
    const initializeWebSocket = () => {
      console.log(`Initializing PieSocket connection for session: ${id} (attempt ${reconnectAttempts + 1})`);
      setConnectionError(reconnectAttempts > 0 ? `Reconnecting (attempt ${reconnectAttempts + 1})...` : null);
      
      const pieSocket = new PieSocket({
        clusterId: "s14271.nyc1",
        apiKey: "uOkCOHkUVs4zhG89vWqp2CnM9i7dKdrbtG1Z3Lqw",
        notifySelf: true,
      });
      
      pieSocketRef.current = pieSocket;
      
      const connectionTimeout = setTimeout(() => {
        if (!wsConnected) {
          setConnectionError("Connection timed out. Retrying...");
          reconnect();
        }
      }, 10000);
      
      pieSocket
        .subscribe(`session-${id}`)
        .then((channel) => {
          clearTimeout(connectionTimeout);
          channelRef.current = channel;
          setWsConnected(true);
          setConnectionError(null);
          reconnectAttempts = 0; // Reset attempt counter on success
          console.log("Successfully connected to PieSocket channel");
          
          // Send join event when connected
          channel.publish("join", { 
            userId, 
            name: "User " + userId.substring(0, 5) // Add user name for better identification
          });
          
          // Process pending changes
          if (pendingChanges.current.length > 0) {
            console.log(`Processing ${pendingChanges.current.length} pending messages`);
            
            // Process in batches to avoid overwhelming the connection
            const processNextBatch = () => {
              const batch = pendingChanges.current.splice(0, 5);
              if (batch.length === 0) return;
              
              batch.forEach(message => {
                channel.publish(message.type, message.payload);
              });
              
              if (pendingChanges.current.length > 0) {
                setTimeout(processNextBatch, 500);
              }
            };
            
            processNextBatch();
          }
          
          // Set up event listeners
          channel.listen("chat", (data) => {
            console.log("Received chat message:", data);
            setMessages((prev) => [...prev, data]);
          });
          
          channel.listen("whiteboard", (data) => {
            console.log("Received whiteboard update, elements:", data.elements?.length || 0);
            setWhiteboardData(data);
          });
          
          channel.listen("participants", (data) => {
            console.log("Participant list updated:", data.users);
            setParticipants(data.users);
          });
          
          channel.listen("poll", (data) => {
            setPoll(data.question);
          });
          channel.listen("vote", (data) => {
            setVotes((prev) => ({ ...prev, [data.userId]: data.vote }));
          });
          channel.listen("close", () => {
            handleSessionClose();
          });
          channel.listen("recording", (data) => {
            setMediaState((prev) => ({
              ...prev,
              isRecording: data.is_recording,
              lastSaved: data.timestamp,
            }));
          });
          channel.listen("ping", () => {
            // Respond with pong if necessary
            channel.publish("pong", {});
          });
        })
        .catch((err) => {
          console.error("PieSocket connection error:", err);
          setConnectionError("Connection error: " + err.message);
          setWsConnected(false);
          reconnect();
        });
    };
    
    const reconnect = () => {
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        setTimeout(() => {
          if (pieSocketRef.current) {
            try {
              pieSocketRef.current.unsubscribe(`session-${id}`);
            } catch (e) {
              console.warn("Error during unsubscribe:", e);
            }
          }
          initializeWebSocket();
        }, reconnectDelay);
      } else {
        setConnectionError("Could not reconnect after multiple attempts. Please refresh the page.");
      }
    };
    
    initializeWebSocket();
    
    // Connection health check
    const healthCheckInterval = setInterval(() => {
      if (channelRef.current && wsConnected) {
        channelRef.current.publish("ping", { timestamp: Date.now() })
          .catch(err => {
            console.error("Health check failed:", err);
            setWsConnected(false);
            reconnect();
          });
      }
    }, 30000);
    
    return () => {
      clearInterval(healthCheckInterval);
      if (pieSocketRef.current) {
        try {
          pieSocketRef.current.unsubscribe(`session-${id}`);
        } catch (e) {
          console.warn("Error during cleanup unsubscribe:", e);
        }
      }
    };
  }, [id, userId]);

  // Send function using PieSocket channel publish
  const send = useCallback((message) => {
    if (!channelRef.current) {
      pendingChanges.current.push(message);
      return false;
    }
    channelRef.current.publish(message.type, message.payload);
    return true;
  }, []);

  // Process any pending messages when connected
  useEffect(() => {
    if (wsConnected && pendingChanges.current.length > 0 && channelRef.current) {
      while (pendingChanges.current.length > 0) {
        const message = pendingChanges.current.shift();
        channelRef.current.publish(message.type, message.payload);
      }
    }
  }, [wsConnected]);

  // Complete rewrite of the setupCanvasRecording function
  const setupCanvasRecording = useCallback(() => {
    if (!drawRef?.current || !whiteboardReady) {
      console.log("Canvas not ready for recording");
      return { canvasRecorder: null };
    }
    
    try {
      console.log("Setting up canvas recording with multiple fallbacks");
      
      // Get the canvas element
      const canvas = drawRef.current.getCanvas();
      if (!canvas) {
        throw new Error("Canvas element not found");
      }
      
      // Try multiple methods to capture canvas stream
      let canvasStream;
      try {
        console.log("Trying standard canvas.captureStream(30)");
        canvasStream = canvas.captureStream(30);
      } catch (err1) {
        console.warn("Standard captureStream failed:", err1);
        
        try {
          console.log("Trying captureStream without framerate");
          canvasStream = canvas.captureStream();
        } catch (err2) {
          console.warn("Fallback captureStream failed:", err2);
          
          try {
            console.log("Trying webkitCaptureStream for Safari");
            // @ts-ignore - For Safari
            canvasStream = canvas.webkitCaptureStream(30);
          } catch (err3) {
            console.error("All canvas capture methods failed:", err3);
            throw new Error("Canvas capture not supported in this browser");
          }
        }
      }
      
      // Verify video tracks
      if (!canvasStream.getVideoTracks().length) {
        throw new Error("No video tracks in canvas stream");
      }
      
      console.log("Canvas stream acquired with video tracks:", 
                 canvasStream.getVideoTracks().map(t => `${t.label}(${t.readyState})`).join(', '));
      
      // Create a completely new MediaStream to ensure compatibility
      const combinedStream = new MediaStream();
      
      // Add the video track from canvas
      canvasStream.getVideoTracks().forEach(track => {
        console.log("Adding canvas video track to recording");
        combinedStream.addTrack(track);
      });
      
      // Add audio track if available
      if (audioStreamRef.current) {
        const audioTracks = audioStreamRef.current.getAudioTracks();
        if (audioTracks.length > 0) {
          console.log("Adding audio track to canvas recording:", 
                     audioTracks[0].label, "enabled:", audioTracks[0].enabled);
          combinedStream.addTrack(audioTracks[0].clone());
        } else {
          console.warn("No audio tracks available to add to recording");
        }
      }
      
      // Find supported video recording format with fallbacks
      let selectedFormat;
      let recorder;
      
      // Try different format combinations until one works
      for (const format of [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=h264,opus',
        'video/webm',
        'video/mp4'
      ]) {
        try {
          if (MediaRecorder.isTypeSupported(format)) {
            console.log(`Format supported: ${format}`);
            selectedFormat = format;
            
            // Try to create recorder with this format
            recorder = new MediaRecorder(combinedStream, {
              mimeType: format,
              videoBitsPerSecond: 2500000,
              audioBitsPerSecond: 128000
            });
            
            break;
          }
        } catch (e) {
          console.warn(`Format ${format} not supported:`, e);
        }
      }
      
      // If no format worked, try without specifying mimeType
      if (!recorder) {
        console.warn("No supported formats found, trying without mimeType");
        recorder = new MediaRecorder(combinedStream);
      }
      
      if (!recorder) {
        throw new Error("Failed to create MediaRecorder with any format");
      }
      
      console.log(`Recording with: ${selectedFormat || 'default browser format'}`);
      
      // Collect chunks with reliable error handling
      const videoChunks = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          videoChunks.push(e.data);
          console.log(`Video chunk collected: ${e.data.size} bytes, total: ${videoChunks.length} chunks`);
        }
      };
      
      // Handle recording completion
      recorder.onstop = async () => {
        console.log(`Recording stopped with ${videoChunks.length} chunks`);
        
        if (videoChunks.length === 0) {
          console.error("No video chunks collected");
          setRecordingStatus("failed");
          return;
        }
        
        try {
          setRecordingStatus("processing");
          
          const videoBlob = new Blob(videoChunks, { 
            type: selectedFormat || 'video/webm' 
          });
          
          console.log(`Final recording size: ${(videoBlob.size / 1024 / 1024).toFixed(2)} MB`);
          
          // Upload the video with triple retry mechanism
          let success = false;
          for (let attempt = 0; attempt < 3 && !success; attempt++) {
            try {
              if (attempt > 0) {
                console.log(`Retry attempt ${attempt + 1} for video upload`);
              }
              
              await uploadRecording(videoBlob, "canvas");
              success = true;
            } catch (uploadErr) {
              console.error(`Upload attempt ${attempt + 1} failed:`, uploadErr);
              
              if (attempt < 2) {
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, 3000));
              }
            }
          }
          
          if (success) {
            setRecordingStatus("completed");
          } else {
            setRecordingStatus("failed");
          }
        } catch (err) {
          console.error("Processing recording failed:", err);
          setRecordingStatus("failed");
        }
      };
      
      // Handle recording errors
      recorder.onerror = (event) => {
        console.error("Recording error:", event);
        setRecordingStatus("failed");
      };
      
      // Start recording with small chunks for reliability
      recorder.start(1000);
      console.log("Combined video+audio recording started");
      
      return { canvasRecorder: recorder };
    } catch (error) {
      console.error("Failed to setup canvas recording:", error);
      setRecordingStatus("failed");
      return { canvasRecorder: null };
    }
  }, [whiteboardReady, audioStreamRef.current]);

  // Initialize media recording when whiteboard is ready
  useEffect(() => {
    if (!whiteboardReady) return;
    
    const initMedia = async () => {
      try {
        setRecordingStatus("initializing");
        const { canvasRecorder, audioRecorder } = setupCanvasRecording();
        
        if (canvasRecorder) {
          combinedRecorderRef.current = {
            canvas: canvasRecorder,
            audio: audioRecorder,
          };
          console.log("Recording successfully initialized");
          setRecordingStatus("recording");
          
          // Notify other participants that recording has started
          if (isHost && wsConnected) {
            const now = new Date();
            send({
              type: "recording",
              payload: { is_recording: true, timestamp: now.toISOString() },
            });
          }
        } else {
          setRecordingStatus("failed");
          console.error("Failed to initialize recorders");
        }
      } catch (error) {
        console.error("Media initialization error:", error);
        setRecordingStatus("failed");
      }
    };
    
    initMedia();
  }, [whiteboardReady, setupCanvasRecording, isHost, wsConnected, send]);

  // Robust upload function with retry logic and progress tracking
  const uploadRecording = async (blob, type) => {
    if (!blob || blob.size === 0) {
      console.error(`Empty ${type} blob, cannot upload`);
      return;
    }
    
    console.log(`Starting upload of ${type} recording: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
    
    // For large files, chunk the upload
    const MAX_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
    
    if (blob.size > MAX_CHUNK_SIZE && type === "canvas") {
      return uploadLargeRecording(blob, type);
    }
    
    try {
      // Create form data with detailed metadata
      const formData = new FormData();
      formData.append('type', type);
      formData.append('session_id', id);
      formData.append('content_type', blob.type);
      formData.append('timestamp', Date.now().toString());
      formData.append(type, blob, `${id}_${type}_${Date.now()}.webm`);
      
      // Track upload progress
      const xhr = new XMLHttpRequest();
      
      const uploadPromise = new Promise((resolve, reject) => {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            console.log(`Upload progress: ${progress}%`);
          }
        };
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (e) {
              reject(new Error(`Invalid JSON response: ${xhr.responseText}`));
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
          }
        };
        
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.ontimeout = () => reject(new Error('Upload timed out'));
      });
      
      // Set timeout
      xhr.timeout = 120000; // 2 minutes
      
      // Open and send the request
      xhr.open('POST', `/python/recordings/${id}`, true);
      xhr.send(formData);
      
      // Wait for completion
      const data = await uploadPromise;
      console.log(`${type} upload successful:`, data);
      
      // Update final video URL if available
      if (data.video_url) {
        setFinalVideoURL(data.video_url);
        console.log("Updated final video URL:", data.video_url);
      }
      
      return data;
    } catch (error) {
      console.error(`${type} upload error:`, error);
      throw error; // Rethrow to allow retry logic
    }
  };

  // Function to handle large recording uploads by chunking
  const uploadLargeRecording = async (blob, type) => {
    console.log("Using chunked upload for large recording");
    
    const MAX_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
    const totalChunks = Math.ceil(blob.size / MAX_CHUNK_SIZE);
    
    try {
      let uploadId = null;
      
      // Upload each chunk
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * MAX_CHUNK_SIZE;
        const end = Math.min(start + MAX_CHUNK_SIZE, blob.size);
        
        // Extract the chunk
        const chunk = blob.slice(start, end);
        
        // Create form data for this chunk
        const formData = new FormData();
        formData.append('type', type);
        formData.append('session_id', id);
        formData.append('chunk_index', chunkIndex.toString());
        formData.append('total_chunks', totalChunks.toString());
        formData.append('content_type', blob.type);
        
        if (uploadId) {
          formData.append('upload_id', uploadId);
        }
        
        formData.append('chunk', chunk, `${id}_${type}_chunk${chunkIndex}.webm`);
        
        // Upload the chunk
        const response = await fetch(`/python/recordings/${id}/chunk`, {
          method: "POST",
          body: formData,
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Chunk ${chunkIndex} upload failed: ${errorText}`);
        }
        
        const data = await response.json();
        
        // Store the upload ID from the first chunk
        if (chunkIndex === 0) {
          uploadId = data.upload_id;
        }
        
        console.log(`Chunk ${chunkIndex + 1}/${totalChunks} uploaded (${Math.round((chunkIndex + 1) * 100 / totalChunks)}%)`);
        
        // Get the final URL from the last chunk response
        if (chunkIndex === totalChunks - 1 && data.video_url) {
          setFinalVideoURL(data.video_url);
          console.log("Updated final video URL from chunked upload:", data.video_url);
          return data;
        }
      }
      
      // If we didn't get a URL from the chunks, try to finalize the upload
      const finalizeResponse = await fetch(`/python/recordings/${id}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          upload_id: uploadId,
          session_id: id,
          content_type: blob.type,
        }),
      });
      
      if (!finalizeResponse.ok) {
        throw new Error("Failed to finalize chunked upload");
      }
      
      const finalData = await finalizeResponse.json();
      
      if (finalData.video_url) {
        setFinalVideoURL(finalData.video_url);
      }
      
      return finalData;
    } catch (error) {
      console.error("Chunked upload failed:", error);
      throw error;
    }
  };

  // Complete rewrite of audio initialization
  const initializeAudio = async () => {
    try {
      console.log("Setting up audio with robust fallbacks...");
      
      // Try to create audio context first (needed for processing)
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AudioContext();
        console.log("Audio context created:", audioContextRef.current.state);
        
        // Automatically resume audio context on user interaction
        if (audioContextRef.current.state === 'suspended') {
          const resumeAudio = async () => {
            await audioContextRef.current.resume();
            document.removeEventListener('click', resumeAudio);
            document.removeEventListener('touchstart', resumeAudio);
          };
          document.addEventListener('click', resumeAudio);
          document.addEventListener('touchstart', resumeAudio);
        }
      } catch (audioCtxError) {
        console.warn("Could not create AudioContext:", audioCtxError);
      }
      
      // First try with ideal constraints
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 2,
          sampleRate: 48000,
        }
      };
      
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log("Got high-quality audio stream");
      } catch (err) {
        console.warn("Failed with ideal constraints:", err);
        
        // Try with basic constraints
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          console.log("Got basic audio stream");
        } catch (basicErr) {
          console.error("Failed to get any audio:", basicErr);
          throw new Error("Could not access microphone - " + basicErr.message);
        }
      }
      
      // Validate audio tracks exist
      if (!stream.getAudioTracks().length) {
        throw new Error("No audio tracks in stream");
      }
      
      console.log("Audio tracks:", stream.getAudioTracks().map(t => t.label).join(', '));
      
      // Store the stream for later use
      audioStreamRef.current = stream;
      
      // Set up audio playback
      if (audioRef.current) {
        audioRef.current.srcObject = stream;
        audioRef.current.muted = false;
        audioRef.current.volume = 1.0;
        
        // Force audio to play
        const playPromise = audioRef.current.play();
        if (playPromise) {
          playPromise.catch(e => {
            console.warn("Auto-play prevented:", e);
            // Add UI to tell user to click to enable audio
            const enableAudio = () => {
              audioRef.current.play();
              document.removeEventListener('click', enableAudio);
            };
            document.addEventListener('click', enableAudio);
          });
        }
      }
      
      // Now create a duplicate stream for user's own audio
      if (userAudioRef.current) {
        userAudioRef.current.srcObject = stream.clone();
        userAudioRef.current.muted = true; // Mute own audio to prevent feedback
      }
      
      setMediaState(prev => ({...prev, hasAudio: true}));
      
      // Initialize peer connections for audio transmission
      initializePeerConnections(stream);
      
      // Set up audio recording for saving and transcription
      setupAudioRecording(stream);
      
      return stream;
    } catch (err) {
      console.error("Audio initialization failed:", err);
      setConnectionError("Microphone Error: " + err.message);
      setMediaState(prev => ({...prev, hasAudio: false}));
      return null;
    }
  };

  // Add this function to handle peer connections for audio transmission
  const initializePeerConnections = (stream) => {
    if (!wsConnected || !stream) return;
    
    // Function to create a new peer connection
    const createPeer = (targetUserId, initiator = false) => {
      console.log(`Creating peer connection with ${targetUserId} (initiator: ${initiator})`);
      
      const peer = new Peer({
        initiator,
        trickle: false,
        stream: stream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });
      
      // Handle receiving signal data
      peer.on('signal', data => {
        console.log("Got signal to send to peer:", targetUserId);
        
        // Send the signal via websocket
        if (channelRef.current) {
          channelRef.current.publish('signal', {
            from: userId,
            to: targetUserId,
            signal: data
          });
        }
      });
      
      // Handle receiving a stream
      peer.on('stream', remoteStream => {
        console.log(`Received stream from ${targetUserId}`);
        
        // Create an audio element for this peer
        const audioEl = document.createElement('audio');
        audioEl.srcObject = remoteStream;
        audioEl.autoplay = true;
        audioEl.id = `audio-${targetUserId}`;
        
        // Add to the document
        document.body.appendChild(audioEl);
      });
      
      // Handle errors
      peer.on('error', err => {
        console.error(`Peer error with ${targetUserId}:`, err);
        
        // Try to recreate the connection
        setTimeout(() => {
          if (peerConnections.current[targetUserId]) {
            peerConnections.current[targetUserId].destroy();
            delete peerConnections.current[targetUserId];
            createPeer(targetUserId, initiator);
          }
        }, 2000);
      });
      
      return peer;
    };
    
    // Add signal event listener to channel
    channelRef.current.listen('signal', data => {
      if (data.to === userId) {
        const { from, signal } = data;
        
        // If we don't have a peer for this user yet, create one
        if (!peerConnections.current[from]) {
          peerConnections.current[from] = createPeer(from, false);
        }
        
        // Signal the peer with the received data
        try {
          peerConnections.current[from].signal(signal);
        } catch (err) {
          console.error("Error signaling peer:", err);
        }
      }
    });
    
    // When a new user joins, create a peer connection with them
    channelRef.current.listen('join', data => {
      if (data.userId !== userId) {
        console.log(`New user joined: ${data.userId}`);
        
        // Create a new peer as the initiator
        peerConnections.current[data.userId] = createPeer(data.userId, true);
      }
    });
    
    // Clean up peer connections when users leave
    channelRef.current.listen('leave', data => {
      if (peerConnections.current[data.userId]) {
        console.log(`User left: ${data.userId}`);
        peerConnections.current[data.userId].destroy();
        delete peerConnections.current[data.userId];
        
        // Remove their audio element
        const audioEl = document.getElementById(`audio-${data.userId}`);
        if (audioEl) audioEl.remove();
      }
    });
  };

  // Function to set up audio recording with proper error handling
  const setupAudioRecording = (stream) => {
    if (!stream) return;
    
    try {
      // Find supported MIME types
      const supportedAudioTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/mpeg'
      ].filter(type => {
        try {
          return MediaRecorder.isTypeSupported(type);
        } catch (e) {
          return false;
        }
      });
      
      if (supportedAudioTypes.length === 0) {
        throw new Error("Browser doesn't support any required audio recording formats");
      }
      
      const selectedMimeType = supportedAudioTypes[0];
      console.log("Using audio recording format:", selectedMimeType);
      
      // Create a recorder with reliable settings
      const recorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
        audioBitsPerSecond: 128000,
      });
      
      const audioChunks = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunks.push(e.data);
          
          // Also send for transcription periodically
          if (audioChunks.length % 5 === 0) {
            const transcriptBlob = new Blob([...audioChunks], { type: selectedMimeType });
            sendForTranscription(transcriptBlob);
          }
        }
      };
      
      recorder.onstop = async () => {
        if (audioChunks.length === 0) {
          console.warn("No audio data captured");
          return;
        }
        
        try {
          const audioBlob = new Blob(audioChunks, { type: selectedMimeType });
          console.log(`Complete audio recording: ${audioBlob.size} bytes`);
          
          // Upload the audio recording
          await uploadRecording(audioBlob, "audio");
        } catch (err) {
          console.error("Error processing audio recording:", err);
        }
      };
      
      // Start recording with small chunks for better handling
      recorder.start(2000);
      console.log("Audio recording started successfully");
      
      // Store the recorder
      mediaRecorder.current = recorder;
    } catch (err) {
      console.error("Failed to set up audio recording:", err);
      setConnectionError("Recording setup failed: " + err.message);
    }
  };

  // Function to send audio data for transcription
  const sendForTranscription = async (blob) => {
    if (!blob || blob.size < 1000) {
      return; // Don't send tiny chunks
    }
    
    try {
      console.log(`Sending ${blob.size} bytes for transcription`);
      
      const formData = new FormData();
      formData.append('audio', blob, `transcript_${id}_${Date.now()}.webm`);
      formData.append('session_id', id);
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      
      const response = await fetch(`/python/update-transcript/${id}`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      
      console.log("Transcription request successful");
    } catch (err) {
      if (err.name === 'AbortError') {
        console.warn("Transcription request timed out");
      } else {
        console.error("Transcription error:", err);
      }
    }
  };

  // Initialize session including media and heartbeat setup
  useEffect(() => {
    const initializeSession = async () => {
      try {
        const sessionRes = await fetch(`/python/sessions/${id}`);
        if (!sessionRes.ok) {
          throw new Error("Failed to fetch session data");
        }
        const sessionData = await sessionRes.json();
        setIsHost(userId === sessionData.host_id);
        
        // Initialize audio with our improved function
        await initializeAudio();
        
        // Setup heartbeat
        const heartbeatInterval = setInterval(() => {
          if (wsConnected && channelRef.current) {
            channelRef.current.publish("heartbeat", { userId, timestamp: Date.now() });
          }
        }, 30000);
        
        // Send leave message on unmount
        return () => {
          clearInterval(heartbeatInterval);
          
          if (wsConnected && channelRef.current) {
            channelRef.current.publish("leave", { userId });
          }
          
          // Stop all media
          if (mediaRecorder.current?.state === "recording") {
            try {
              mediaRecorder.current.stop();
            } catch (e) {
              console.warn("Error stopping media recorder:", e);
            }
          }
          
          if (combinedRecorderRef.current?.canvas?.state === "recording") {
            try {
              combinedRecorderRef.current.canvas.stop();
            } catch (e) {
              console.warn("Error stopping canvas recorder:", e);
            }
          }
          
          // Stop all audio tracks
          if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach(track => {
              try {
                track.stop();
              } catch (e) {
                console.warn("Error stopping audio track:", e);
              }
            });
          }
          
          // Close any peer connections
          Object.values(peerConnections.current).forEach(peer => {
            try {
              peer.destroy();
            } catch (e) {
              console.warn("Error closing peer connection:", e);
            }
          });
        };
      } catch (error) {
        console.error("Session initialization failed:", error);
        setConnectionError(`Initialization error: ${error.message}`);
      }
    };
    
    if (id) initializeSession();
  }, [id, userId]);

  // Improved whiteboard state handling
  useEffect(() => {
    if (whiteboardData && drawRef.current) {
      console.log("Applying whiteboard data from remote source");
      try {
        drawRef.current.setSceneElements(whiteboardData.elements || []);
        if (whiteboardData.appState) {
          drawRef.current.updateScene({
            appState: whiteboardData.appState,
            commitToHistory: false,
          });
        }
      } catch (err) {
        console.error("Error applying whiteboard update:", err);
      }
    }
  }, [whiteboardData]);

  // More reliable whiteboard change handler
  const handleWhiteboardChange = useCallback((elements, appState, files) => {
    if (!elements) {
      console.warn("Received empty whiteboard elements");
      return;
    }
    
    console.log("Whiteboard changed locally, elements count:", elements.length);
    const change = {
      type: "whiteboard",
      payload: { elements, appState, files, timestamp: Date.now() },
    };
    
    if (wsConnected && channelRef.current) {
      console.log("Broadcasting whiteboard update to other participants");
      channelRef.current.publish("whiteboard", change.payload);
    } else {
      console.warn("WebSocket not connected, queuing whiteboard changes");
      pendingChanges.current.push(change);
    }
  }, [wsConnected]);

  // Less aggressive debounce for faster updates
  const debouncedWhiteboardChange = useDebounce(handleWhiteboardChange, 200);

  // Send chat message using PieSocket publish
  const sendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    // Create user message
    const userMessage = {
      type: "chat",
      payload: {
        user: userId,
        text: inputMessage,
        timestamp: Date.now(),
      },
    };
    
    // Send user message
    if (wsConnected) {
      send(userMessage);
      
      // Check if message contains standalone @AI
      const aiMatch = inputMessage.match(/(\s|^)@AI(\s|$)/);
      if (aiMatch) {
        try {
          // Extract the query (everything after the @AI token)
          const startIndex = aiMatch.index + aiMatch[0].length;
          const query = inputMessage.substring(startIndex).trim();
          
          // Send request to AI API
          const response = await fetch(`https://crawl-canvas.vercel.app/resources?query=${encodeURIComponent(query)}`);
          
          if (!response.ok) {
            throw new Error("AI response failed");
          }
          
          const aiData = await response.json();
          
          // Create AI response message
          const aiMessage = {
            type: "chat",
            payload: {
              user: "AI Assistant",
              text: aiData.response || "Sorry, I couldn't find an answer to your question.",
              timestamp: Date.now(),
            },
          };
          
          // Send AI response to channel
          send(aiMessage);
        } catch (error) {
          console.error("AI response error:", error);
          
          // Send error message to chat
          const errorMessage = {
            type: "chat",
            payload: {
              user: "AI Assistant",
              text: "Sorry, I encountered an error while processing your request.",
              timestamp: Date.now(),
            },
          };
          
          send(errorMessage);
        }
      }
      
      setInputMessage("");
    } else {
      setConnectionError("Cannot send message: WebSocket disconnected");
      pendingChanges.current.push(userMessage);
    }
  };

  // Start a poll by publishing the poll message
  const startPoll = () => {
    if (wsConnected) {
      send({
        type: "poll",
        payload: {
          question: "Is your doubt resolved?",
          timestamp: Date.now(),
        },
      });
    } else {
      setConnectionError("Cannot start poll: WebSocket disconnected");
    }
  };

  // Submit a vote using PieSocket publish
  const submitVote = (vote) => {
    if (wsConnected) {
      send({
        type: "vote",
        payload: {
          userId: userId,
          vote: vote,
        },
      });
    } else {
      setConnectionError("Cannot submit vote: WebSocket disconnected");
    }
  };

  // Handle session close by stopping recorders and processing transcript
  const handleSessionClose = async () => {
    try {
      if (combinedRecorderRef.current?.canvas?.state === "recording") {
        combinedRecorderRef.current.canvas.stop();
      }
      if (combinedRecorderRef.current?.audio?.state === "recording") {
        combinedRecorderRef.current.audio.stop();
      }
      if (mediaRecorder.current?.state === "recording") {
        mediaRecorder.current.stop();
      }
      await fetch("/python/complete-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: id,
          video_url: finalVideoURL,
        }),
      });
      router.push("/");
    } catch (error) {
      console.error("Session closure failed:", error);
    }
  };

  // Automatically handle voting results when a poll is active
  useEffect(() => {
    if (poll && Object.keys(votes).length > 0) {
      const yesVotes = Object.values(votes).filter((v) => v).length;
      const totalVotes = Object.keys(votes).length;
      if (yesVotes > totalVotes / 2) {
        if (wsConnected) {
          send({
            type: "close",
            payload: { session_id: id },
          });
        }
        handleSessionClose();
      }
    }
  }, [votes, poll, id]);
  // Rest of the component remains similar with these UI additions:
  return (
    <div className="min-h-screen bg-black">
      <NavbarSection />

      {/* Status bar with improved styling */}
      <div className="py-2 px-4 bg-gray-800/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-700">
        <div className="container mx-auto flex items-center justify-between">
          <Badge
            content={participants.length}
            color="primary"
            size="sm"
            placement="bottom-right"
          >
            <Chip
              variant="shadow"
              color={wsConnected ? "success" : "danger"}
              startContent={
                <div
                  className={`w-2 h-2 rounded-full ${
                    wsConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
                  }`}
                />
              }
            >
              {wsConnected ? "Connected" : connectionError || "Connecting..."}
            </Chip>
          </Badge>

          <Chip variant="flat" color="warning" size="sm">
            Recording Status: {recordingStatus}
          </Chip>
        </div>
      </div>

      <div className="container mx-auto py-6 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Whiteboard section */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <Card className="w-full h-[600px] bg-gray-800/50 border border-gray-700 overflow-hidden shadow-xl">
              <CardBody className="p-0 items-center justify-center w-full flex relative">
                {!wsConnected && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                    <div className="text-white text-center p-4">
                      <div className="animate-spin mb-4 mx-auto w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                      <p className="text-lg font-medium">
                        {connectionError || "Reconnecting to whiteboard..."}
                      </p>
                    </div>
                  </div>
                )}
                <Whiteboard
                  ref={drawRef}
                  initialData={whiteboardData}
                  onChange={debouncedWhiteboardChange}
                  onReady={() => {
                    console.log("Whiteboard is ready");
                    setWhiteboardReady(true);
                  }}
                />
              </CardBody>
            </Card>

            <Card className="w-full bg-gray-800/50 border border-gray-700 shadow-lg">
              <CardBody className="p-2">
                <audio ref={audioRef} controls className="w-full h-10" />
              </CardBody>
            </Card>
          </div>

          {/* Sidebar with improved styling */}
          <Card className="h-[800px] bg-gray-800/50 border border-gray-700 shadow-xl">
            <CardHeader className="flex justify-between border-b border-gray-700 pb-2">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Live Session
                </h3>
                {isHost && (
                  <div className="text-xs text-gray-400">
                    <Badge
                      color={
                        recordingStatus === "recording" ? "success" : "warning"
                      }
                      variant="flat"
                      size="sm"
                    >
                      {recordingStatus}
                    </Badge>
                    <Chip variant="flat" color="warning" size="sm">
                      {mediaState.isRecording
                        ? `Recording - Last saved: ${
                            mediaState.lastSaved ? 
                            (typeof mediaState.lastSaved.toLocaleTimeString === 'function' ? 
                              mediaState.lastSaved.toLocaleTimeString() : 
                              "Invalid date") : 
                            "Never"
                          }`
                        : "Paused"}
                    </Chip>
                  </div>
                )}
              </div>

              <Tooltip content={wsConnected ? "Connected" : "Disconnected"}>
                <div
                  className={`w-3 h-3 rounded-full ${
                    wsConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
                  }`}
                ></div>
              </Tooltip>
            </CardHeader>

            <Divider />

            {/* Participants section */}
            <CardBody className="flex flex-col gap-4 p-4 h-full">
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">
                  Participants ({participants.length})
                </h4>
                <div className="space-y-2 max-h-[120px] overflow-y-auto py-1">
                  {participants.map((user) => (
                    <div key={user.id} className="flex items-center gap-2">
                      <Avatar size="sm" name={user.name} color="primary" />
                      <span className="text-sm text-gray-300">{user.name}</span>
                      {votes[user.id] && (
                        <Badge color="success" variant="flat">
                          Voted
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Divider />

              {/* Chat section */}
              <div className="flex-1 overflow-y-auto space-y-3 mb-2">
                <h4 className="text-sm font-medium text-gray-400 sticky top-0 bg-gray-800/90 py-1">
                  Messages
                </h4>
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm py-4">
                    No messages yet
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <Card
                      key={i}
                      className={`p-2 w-5/6 ${
                        msg.user === userId
                          ? "ml-auto bg-blue-800/30"
                          : "bg-gray-700/50"
                      } border border-gray-700`}
                    >
                      <CardBody className="py-1 px-2">
                        <p className="text-xs text-blue-400 font-medium">
                          {msg.user}
                        </p>
                        <p className="text-sm text-white">{msg.text}</p>
                      </CardBody>
                    </Card>
                  ))
                )}
              </div>

              {/* Poll section */}
              {poll && (
                <Card className="bg-gray-700/60 border border-gray-600 mb-2">
                  <CardBody className="p-3">
                    <h4 className="text-white font-medium mb-3">{poll}</h4>
                    <div className="flex gap-2">
                      <Button
                        onPress={() => submitVote(true)}
                        color="success"
                        variant="flat"
                        size="sm"
                        className="flex-1"
                      >
                        Yes
                      </Button>
                      <Button
                        onPress={() => submitVote(false)}
                        color="danger"
                        variant="flat"
                        size="sm"
                        className="flex-1"
                      >
                        No
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              )}
            </CardBody>

            {/* Message input footer */}
            <CardFooter className="border-t border-gray-700 pt-3 pb-4 px-4">
              <div className="w-full space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Type your message..."
                    className="flex-1"
                    size="sm"
                    variant="bordered"
                    endContent={
                      <Button
                        onPress={sendMessage}
                        isIconOnly
                        color="primary"
                        size="sm"
                        className="rounded-full"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-4 h-4"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                          />
                        </svg>
                      </Button>
                    }
                  />
                </div>

                {isHost && (
                  <Button
                    onPress={startPoll}
                    color="secondary"
                    variant="shadow"
                    className="w-full"
                    size="sm"
                  >
                    Start Vote
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Add this after your audio element in the JSX */}
      <div className="hidden">
        {/* User's own audio */}
        <audio ref={userAudioRef} muted={true} />
        
        {/* Container for peer audio elements */}
        <div id="remote-audio-container"></div>
      </div>
    </div>
  );
}
