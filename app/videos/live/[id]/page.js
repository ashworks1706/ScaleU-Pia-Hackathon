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
const [finalVideoURL, setFinalVideoURL] = useState("")
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

  // Better canvas recording setup
  const setupCanvasRecording = useCallback(() => {
    if (!drawRef?.current || !whiteboardReady) {
      console.log("Whiteboard not ready yet, delaying canvas recording setup");
      return { canvasRecorder: null, audioRecorder: null };
    }
    
    try {
      console.log("Setting up canvas recording...");
      const canvas = drawRef.current.getCanvas();
      if (!canvas) {
        console.error("Canvas element not found");
        return { canvasRecorder: null, audioRecorder: null };
      }
      
      // Ensure we get a stable frame rate
      let canvasStream;
      try {
        // Try with captureStream first (modern browsers)
        canvasStream = canvas.captureStream(30);
        console.log("Canvas stream created with captureStream");
        
        if (!canvasStream || canvasStream.getVideoTracks().length === 0) {
          throw new Error("Canvas stream has no video tracks");
        }
      } catch (err) {
        console.error("Standard canvas capture failed:", err);
        // Fallback for Safari
        try {
          canvasStream = canvas.captureStream();
          console.log("Canvas stream created with fallback method");
        } catch (fallbackErr) {
          console.error("Fallback canvas capture also failed:", fallbackErr);
          return { canvasRecorder: null, audioRecorder: null };
        }
      }
      
      // Create a combined stream if we have audio
      let combinedStream = canvasStream;
      if (audioStreamRef.current) {
        const audioTracks = audioStreamRef.current.getAudioTracks();
        if (audioTracks.length > 0) {
          console.log("Adding audio track to canvas recording");
          audioTracks.forEach(track => combinedStream.addTrack(track));
        }
      }
      
      // More reliable recorder initialization
      const canvasRecorder = new MediaRecorder(combinedStream, {
        mimeType: "video/webm;codecs=vp8",
        videoBitsPerSecond: 2500000,
      });
      
      const canvasChunks = [];
      canvasRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          canvasChunks.push(e.data);
          console.log("Canvas chunk added, size:", e.data.size);
        }
      };
      
      canvasRecorder.onstop = async () => {
        console.log("Canvas recorder stopped, chunks:", canvasChunks.length);
        if (canvasChunks.length > 0) {
          const canvasBlob = new Blob(canvasChunks, { type: "video/webm" });
          console.log("Canvas recording completed, size:", canvasBlob.size);
          await uploadRecording(canvasBlob, "canvas");
        } else {
          console.error("No canvas chunks recorded");
        }
      };
      
      canvasRecorder.onerror = (event) => {
        console.error("Canvas recording error:", event);
        setRecordingStatus("failed");
      };
      
      canvasRecorder.start(1000);
      console.log("Canvas recording started successfully");
      return { canvasRecorder, audioRecorder: null };
    } catch (error) {
      console.error("Setup canvas recording error:", error);
      return { canvasRecorder: null, audioRecorder: null };
    }
  }, [whiteboardReady]);

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

  // Updated uploadRecording function with additional error details
  const uploadRecording = async (blob, type) => {
    try {
      const formData = new FormData();
      formData.append(type, blob, `${id}_${type}.webm`);
      // For canvas recordings, send to the dedicated backend endpoint
      if (type === "canvas") {
        console.log("Posting recordings data, size:", blob.size);
        const response = await fetch(`/python/recordings/${id}`, {
          method: "POST",
          body: formData,
        });
        console.log("Recordings data response status:", response.status);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Server responded with status ${response.status}: ${errorText}`
          );
        }
        
        // Update finalVideoURL after successful upload
        const data = await response.json();
        if (data.video_url) {
          setFinalVideoURL(data.video_url);
          console.log("Set final video URL:", data.video_url);
        }
      }
    } catch (error) {
      console.error(`Upload error (${type}):`, error);
      setRecordingStatus("failed");
    }
  };

  // Improved transcript handling with more frequent updates
  const updateTranscript = async (chunk) => {
    try {
      console.log("Sending audio chunk for transcription, size:", chunk.size);
      const formData = new FormData();
      formData.append('audio', chunk, `${id}_transcript_${Date.now()}.webm`);
      
      const response = await fetch(`/python/update-transcript/${id}`, {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Transcript update failed: ${response.status} - ${errorText}`);
      }
      
      console.log("Transcription chunk processed successfully");
    } catch (error) {
      console.error("Transcript error:", error);
    }
  };

  // Updated audio recording setup with consistent transcript updates
  useEffect(() => {
    if (!audioStreamRef.current || !id) return;
    
    try {
      // Create a separate recorder specifically for transcript updates
      const transcriptRecorder = new MediaRecorder(audioStreamRef.current, {
        mimeType: 'audio/webm',
        audioBitsPerSecond: 16000 // Lower bitrate for transcription
      });
      
      let transcriptChunks = [];
      let lastTranscriptSend = Date.now();
      
      transcriptRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          transcriptChunks.push(e.data);
          
          // Send transcription data every 15 seconds
          const now = Date.now();
          if (now - lastTranscriptSend > 15000 && transcriptChunks.length > 0) {
            const transcriptBlob = new Blob(transcriptChunks, { type: 'audio/webm' });
            updateTranscript(transcriptBlob);
            transcriptChunks = []; // Clear after sending
            lastTranscriptSend = now;
          }
        }
      };
      
      transcriptRecorder.start(5000); // Collect data every 5 seconds
      
      return () => {
        if (transcriptRecorder.state !== 'inactive') {
          transcriptRecorder.stop();
        }
      };
    } catch (err) {
      console.error("Failed to initialize transcript recorder:", err);
    }
  }, [audioStreamRef.current, id]);

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
        
        // Improved audio capture with error handling
        try {
          console.log("Requesting audio stream...");
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            echoCancellation: true,
            noiseSuppression: true,
          });
          
          console.log("Audio stream obtained:", stream.getAudioTracks().length > 0 ? "Yes" : "No");
          audioStreamRef.current = stream;
          
          if (audioRef.current) {
            audioRef.current.srcObject = stream;
            audioRef.current.onloadedmetadata = () => {
              console.log("Audio element ready, attempting to play");
              audioRef.current.play().catch(e => console.warn("Auto-play prevented:", e));
            };
          }
          
          setMediaState(prev => ({...prev, hasAudio: true}));
        } catch (audioErr) {
          console.error("Audio permission error:", audioErr);
          setConnectionError(`Audio permission denied: ${audioErr.message}`);
          setMediaState(prev => ({...prev, hasAudio: false}));
        }
        
        mediaRecorder.current = new MediaRecorder(stream);
        const audioChunks = [];
        mediaRecorder.current.ondataavailable = (e) => {
          audioChunks.push(e.data);
        };
        mediaRecorder.current.onstop = async () => {
          try {
            setRecordingStatus("processing");
            const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
            await uploadRecording(audioBlob, "audio");
            setRecordingStatus("completed");
          } catch (error) {
            setRecordingStatus("failed");
          }
        };
        mediaRecorder.current.start();
        const heartbeatInterval = setInterval(() => {
          if (wsConnected) {
            send({ type: "heartbeat", payload: {} });
          }
        }, 30000);
        return () => {
          clearInterval(heartbeatInterval);
          if (mediaRecorder.current?.state === "recording") {
            mediaRecorder.current.stop();
          }
          if (stream) {
            stream.getTracks().forEach((track) => track.stop());
          }
        };
      } catch (error) {
        console.error("Initialization failed:", error);
        setConnectionError(`Initialization error: ${error.message}`);
      }
    };
    if (id) initializeSession();
  }, [id, userId, wsConnected, send]);

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
                {/* <div className="flex w-full text-sm text-center "> */}
                <Whiteboard
                  ref={drawRef}
                  initialData={whiteboardData}
                  onChange={debouncedWhiteboardChange}
                  onReady={() => {
                    console.log("Whiteboard is ready");
                    setWhiteboardReady(true);
                  }}
                />

                {/* </div> */}
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
    </div>
  );
}
