"use client";
import { useState } from "react";

export default function SidebarChat() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeChannel, setActiveChannel] = useState("Homework");
  const [messages, setMessages] = useState({
    Homework: [
      { id: 1, user: "Alice", text: "Hey everyone! 👋" },
      { id: 2, user: "Bob", text: "Hi Alice! How's it going?" },
    ],
    Projects: [{ id: 1, user: "Charlie", text: "Can someone help with calculus?" }],
    Exams: [{ id: 1, user: "Dave", text: "Let's discuss the homework." }],
  });
  const [newMessage, setNewMessage] = useState("");

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const updatedMessages = { ...messages };
      updatedMessages[activeChannel].push({
        id: messages[activeChannel].length + 1,
        user: "You",
        text: newMessage,
      });
      setMessages(updatedMessages);
      setNewMessage("");
    }
  };

  return (
    <div
      className={`h-screen bg-gray-900/50 backdrop-blur-md border-r border-gray-800 transition-all duration-300 ${
        isExpanded ? "w-64" : "w-16"
      }`}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 text-gray-400 hover:text-white transition-colors flex items-center justify-center"
      >
        {isExpanded ? (
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        ) : (
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        )}
      </button>

      {/* Sidebar Content */}
      {isExpanded && (
        <div className="flex flex-col h-full">
          {/* Channels Section */}
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-bold text-white mb-4">Channels</h2>
            <ul className="space-y-2">
              {["Homework", "Projects", "Exams"].map((channel) => (
                <li key={channel}>
                  <button
                    onClick={() => setActiveChannel(channel)}
                    className={`w-full p-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors flex items-center gap-2 ${
                      activeChannel === channel ? "bg-blue-600 text-white" : ""
                    }`}
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                      />
                    </svg>
                    <span>{channel}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Messages Section */}
          <div className="flex-1 p-4 overflow-y-auto">
            <h3 className="text-lg font-bold text-white">#{activeChannel}</h3>
            <div className="mt-4 space-y-4">
              {messages[activeChannel].map((message) => (
                <div key={message.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    {message.user[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{message.user}</p>
                    <p className="text-sm text-gray-300">{message.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Message Input Section */}
          <div className="p-4 border-t border-gray-700">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Type a message..."
                className="w-full p-2 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              />
              <button
                onClick={handleSendMessage}
                className="p-2 bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none"
              >
                <span className="text-white">Send</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}