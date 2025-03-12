/* eslint-disable react-hooks/exhaustive-deps */
// pages/videos/live/[id].jsx
"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import NavbarSection from "../../../../components/Navbar";
import dynamic from "next/dynamic";
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
// import { Excalidraw as Whiteboard }  from "@excalidraw/excalidraw";

const Whiteboard = dynamic(
  async () =>
    (await import("../../../../components/excalidrawWrapper")).default,
  {
    ssr: false,
  }
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
  const excalidrawRef = useRef(null);

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
  const ws = useRef(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const mediaRecorder = useRef(null);
  const [isHost, setIsHost] = useState(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const pendingChanges = useRef([]);
  // LiveSession.jsx (Frontend) - Critical Modifications
const setupCanvasRecording = () => {
    if (!excalidrawRef.current) {
        console.error("Excalidraw ref not available");
        return;
      }
    
      const canvas = excalidrawRef.current.getCanvas();
      if (!canvas) {
        console.error("Canvas element not found");
        return;
      }
    
      // Add timestamp synchronization
      let lastFrameTime = Date.now();
      const syncTimestamps = () => {
        const now = Date.now();
        const timeDiff = now - lastFrameTime;
        lastFrameTime = now;
        return timeDiff;
      };
    
      const canvasStream = canvas.captureStream(30);
      const canvasRecorder = new MediaRecorder(canvasStream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 2500000
      });
    
      // Add frame metadata
      const canvasChunks = [];
      canvasRecorder.ondataavailable = (e) => {
        const syncData = new DataView(new ArrayBuffer(4));
        syncData.setUint32(0, syncTimestamps());
        const syncChunk = new Blob([syncData], {type: 'application/octet-stream'});
        
        canvasChunks.push(e.data);
        canvasChunks.push(syncChunk);
      };
    
    canvasRecorder.onstop = async () => {
      const canvasBlob = new Blob(canvasChunks, { type: 'video/webm' });
      await uploadRecording(canvasBlob, 'canvas');
    };
  
    // Audio recorder setup (modified)
    const audioRecorder = new MediaRecorder(audioStream);
    const audioChunks = [];
    audioRecorder.ondataavailable = (e) => {
      audioChunks.push(e.data);
      // Send audio chunk every 60s for transcription
      if (Date.now() - lastTranscriptUpdate > 60000) {
        const chunk = new Blob([e.data], {type: 'audio/webm'});
        updateTranscript(chunk);
        lastTranscriptUpdate = Date.now();
      }
    };
  
    // Start both recorders
    canvasRecorder.start(1000); // 1s chunks for smoother recording
    audioRecorder.start(1000);
    
    return { canvasRecorder, audioRecorder };
  };
  
  // Add to media initialization
  useEffect(() => {
    const initMedia = async () => {
      const { canvasRecorder, audioRecorder } = setupCanvasRecording();
      
      combinedRecorderRef.current = {
        canvas: canvasRecorder,
        audio: audioRecorder
      };
    };
    initMedia();
  }, []);
  
  // Modified upload function
  const uploadRecording = async (blob, type) => {
    const formData = new FormData();
    formData.append(type, blob, `${id}_${type}.webm`);
    
    if (type === 'canvas') {
      // Only upload canvas immediately
      await fetch(`/python/recordings/${id}`, {
        method: 'POST',
        body: formData
      });
    }
  };
  
  // Transcript updates
  const updateTranscript = async (chunk) => {
    try {
      const response = await fetch(`/python/update-transcript/${id}`, {
        method: 'PATCH',
        body: chunk
      });
      if (!response.ok) throw new Error('Transcript update failed');
    } catch (error) {
      console.error('Transcript error:', error);
    }
  };
  
  // WebSocket initialization and management
  const initializeWebSocket = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;
    const socket = new WebSocket(
      `wss://s14271.nyc1.piesocket.com/v3/1?api_key=uOkCOHkUVs4zhG89vWqp2CnM9i7dKdrbtG1Z3Z3Lqw&notify_self=1`
    );

    socket.onopen = () => {
      console.log(`Connected to session channel: ${id}`);
      console.log("WebSocket connected");
      setWsConnected(true);
      setConnectionError(null);
      reconnectAttempts.current = 0;

      // Send queued messages
      while (pendingChanges.current.length > 0) {
        const message = pendingChanges.current.shift();
        socket.send(JSON.stringify(message));
      }

      // Join message
      socket.send(
        JSON.stringify({
          type: "join",
          userId: userId || `user_${Math.random().toString(36).substr(2, 9)}`,
        })
      );
    };

    // In initializeWebSocket
    socket.onclose = (event) => {
      console.log(`WebSocket closed: ${event.code}`);
      setWsConnected(false);

      // Don't reconnect on normal closure (1000) or if component is unmounting
      if (
        event.code !== 1000 &&
        reconnectAttempts.current < maxReconnectAttempts
      ) {
        const delay = Math.min(
          5000,
          1000 * Math.pow(1.5, reconnectAttempts.current)
        );
        console.log(`Reconnecting in ${delay}ms...`);
        setTimeout(initializeWebSocket, delay);
        reconnectAttempts.current++;
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      setConnectionError(
        `Connection error: ${error.message || "Unknown error"}`
      );
    };
    socket.onmessage = (event) => {
      try {
        const wrapper = JSON.parse(event.data);
        if (wrapper.type === "message") {
          const data = wrapper.data;
          // Add recording state synchronization
          if (data.type === "recording_state") {
            setMediaState((prev) => ({
              ...prev,
              lastSaved: data.timestamp,
            }));
          }
        }
      } catch (error) {
        console.error("Message processing error:", error);
      }
    };

    socket.onmessage = (event) => {
      try {
        const wrapper = JSON.parse(event.data);

        // Handle PieSocket's message envelope
        if (wrapper.type === "message") {
          const data = wrapper.data;
          switch (data.type) {
            case "chat":
              setMessages((prev) => [
                ...prev,
                {
                  user: data.payload.user,
                  text: data.payload.text,
                  timestamp: data.payload.timestamp,
                },
              ]);

              break;
            case "whiteboard":
              setWhiteboardData(data.payload);
              break;
            case "participants":
              setParticipants(data.users);
              break;
            case "poll":
              setPoll(data.payload.question);
              break;
            case "vote":
              setVotes((prev) => ({
                ...prev,
                [data.payload.userId]: data.payload.vote,
              }));
              break;

            case "close":
              handleSessionClose();
              break;
            case "recording":
              setMediaState((prev) => ({
                ...prev,
                isRecording: data.is_recording,
                lastSaved: data.timestamp,
              }));
              break;
          }
        }
        // Handle system messages like ping
        else if (wrapper.type === "ping") {
          socket.send(JSON.stringify({ type: "pong" }));
        }
      } catch (error) {
        console.error("Message processing error:", error);
      }
    };

    ws.current = socket;
  }, [userId]);



  // Session initialization
  useEffect(() => {
    const initializeSession = async () => {
      try {
        const sessionRes = await fetch(`/python/sessions/${id}`);
        const sessionData = await sessionRes.json();
        setIsHost(userId === sessionData.host_id);

        if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.close();
        }

        initializeWebSocket();

        // Media handling
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        if (audioRef.current) {
          audioRef.current.srcObject = stream;
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
            await uploadRecording(audioBlob);
            setRecordingStatus("completed");
          } catch (error) {
            setRecordingStatus("failed");
          }
        };

        mediaRecorder.current.start();

        // Heartbeat
        const heartbeat = setInterval(() => {
          if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: "heartbeat" }));
          }
        }, 30000);

        return () => {
          clearInterval(heartbeat);
          if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.close();
          }
          if (mediaRecorder.current?.state === "recording") {
            mediaRecorder.current.stop();
          }
        };
      } catch (error) {
        console.error("Initialization failed:", error);
        setConnectionError(`Initialization error: ${error.message}`);
      }
    };

    if (id) initializeSession();
  }, [id, userId, initializeWebSocket, uploadRecording]);

  // Whiteboard handler with debounce and queue
  const handleWhiteboardChange = useDebounce((elements, appState, files) => {
    const change = {
      type: "whiteboard",
      payload: { elements, appState, files },
    };

    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(change));
    } else if (ws.current?.readyState === WebSocket.CONNECTING) {
      pendingChanges.current.push(change);
    } else {
      console.error("WebSocket not connected");
      setConnectionError("Changes not saved - reconnecting...");
      pendingChanges.current.push(change);
      initializeWebSocket();
    }
  }, 500);

  const sendMessage = () => {
    if (!inputMessage.trim()) return;

    const message = {
      type: "chat",
      text: inputMessage,
      timestamp: Date.now(),
    };

    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
      setInputMessage("");
    } else {
      setConnectionError("Cannot send message: WebSocket disconnected");
    }
  };

  const startPoll = () => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(
        JSON.stringify({
          type: "poll",
          payload: {
            // Add proper payload
            question: "Is your doubt resolved?",
            timestamp: Date.now(),
          },
        })
      );
    }
  };

  const submitVote = (vote) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(
        JSON.stringify({
          type: "vote",
          vote: vote,
        })
      );
    } else {
      setConnectionError("Cannot submit vote: WebSocket is disconnected");
    }
  };

  const handleSessionClose = async () => {
    try {
      if (combinedRecorderRef.current?.state === "recording") {
        combinedRecorderRef.current.stop();
      }

      // Get final transcript from backend
      const sessionRes = await fetch(`/python/sessions/${id}`);
      const { transcript } = await sessionRes.json();

      // Process chunks for search
      await fetch("/python/process-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: id,
          transcript: transcript,
        }),
      });

      router.push("/");
    } catch (error) {
      console.error("Session closure failed:", error);
    }
  };

  // Update the vote handling logic
  useEffect(() => {
    if (poll && Object.keys(votes).length > 0) {
      const yesVotes = Object.values(votes).filter((v) => v).length;
      const totalVotes = Object.keys(votes).length;

      if (yesVotes > totalVotes / 2) {
        handleSessionClose();

        // Notify all participants
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          ws.current.send(
            JSON.stringify({
              type: "close",
              session_id: id,
            })
          );
        }
      }
    }
  }, [votes, poll, id]);



  
  // Rest of the component remains similar with these UI additions:
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
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
  ref={excalidrawRef}
  initialData={whiteboardData}
  onChange={handleWhiteboardChange}
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
                            mediaState.lastSaved?.toLocaleTimeString() ||
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
