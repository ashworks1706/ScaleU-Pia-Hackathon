// pages/session/[id].jsx
'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NavbarSection from '../../components/Navbar';

export default function Page() {
  const router = useRouter();
  const { id, join } = router.query;
  const [transcript, setTranscript] = useState("");
  const [participants, setParticipants] = useState(0);
  const [handsRaised, setHandsRaised] = useState(0);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  // Simulate transcript updates
  useEffect(() => {
    if (!id) return;
    
    const interval = setInterval(() => {
      const newText = `${transcript} This is some additional transcript text. `;
      setTranscript(newText);
      
      // Update backend every minute
      fetch("/api/update-transcript", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          session_id: id,
          transcript: newText
        })
      }).catch(err => console.error("Failed to update transcript:", err));
      
    }, 60000); // Every minute
    
    return () => clearInterval(interval);
  }, [id, transcript]);

  // AI assistant for managing session
  useEffect(() => {
    if (!id) return;
    
    // Add AI message after 2 minutes
    const timer = setTimeout(() => {
      const aiMessage = {
        id: messages.length + 1,
        user: "AI Assistant",
        text: "Is everyone ready to end this session? Please raise your hand if you're done.",
        isAI: true
      };
      
      setMessages(prev => [...prev, aiMessage]);
    }, 120000);
    
    return () => clearTimeout(timer);
  }, [id, messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    const userMessage = {
      id: messages.length + 1,
      user: "You",
      text: newMessage,
      isAI: false
    };
    
    setMessages(prev => [...prev, userMessage]);
    setNewMessage("");
    
    // Check if user is raising hand
    if (newMessage.toLowerCase().includes("raise hand") || 
        newMessage.toLowerCase().includes("✋") ||
        newMessage.toLowerCase().includes("done")) {
      setHandsRaised(prev => prev + 1);
    }
  };

  // End session when more than half raise hands
  useEffect(() => {
    if (handsRaised > participants / 2 && participants > 0) {
      // Complete the session
      fetch("/api/complete-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          session_id: id,
          participant_count: participants,
          final_transcript: transcript,
          recording_link: `https://zoom.us/rec/${id}`
        })
      })
      .then(() => {
        alert("Session completed! Recording will be available soon.");
        router.push("/videos");
      })
      .catch(err => {
        console.error("Failed to complete session:", err);
      });
    }
  }, [handsRaised, participants, id, transcript, router]);

  // Simulate participants joining
  useEffect(() => {
    let count = 1;
    const interval = setInterval(() => {
      if (count < 5) {
        count++;
        setParticipants(count);
      } else {
        clearInterval(interval);
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <NavbarSection />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Zoom meeting area */}
        <div className="flex-grow p-4 bg-gray-900">
          <iframe 
            src={join}
            width="100%" 
            height="100%" 
            allow="camera; microphone; fullscreen; speaker; display-capture" 
            style={{border: 0}}
          />
        </div>
        
        {/* Chat sidebar */}
        <div className="w-80 bg-gray-800 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white">Chat</h3>
            <div className="text-sm text-gray-400">
              Participants: {participants} • Hands Raised: {handsRaised}
            </div>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`p-3 rounded-lg ${
                  message.isAI ? "bg-blue-900 text-white" : "bg-gray-700 text-white"
                }`}
              >
                <p className="font-semibold">{message.user}</p>
                <p>{message.text}</p>
              </div>
            ))}
          </div>
          
          <div className="p-4 border-t border-gray-700">
            <div className="flex">
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 p-2 bg-gray-700 text-white rounded-lg focus:outline-none"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <button 
                className="ml-2 p-2 bg-blue-600 text-white rounded-lg"
                onClick={handleSendMessage}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
