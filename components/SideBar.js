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
    <div className={` bg-gray-800 transition-all duration-300 ease-in-out ${isExpanded ? "w-64" : "w-16"}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 text-white hover:text-blue-500 focus:outline-none flex items-center justify-center"
      >
        {isExpanded ? <span className="text-2xl">←</span> : <span className="text-2xl">→</span>}
      </button>

      {isExpanded && (
        <div className="flex flex-col h-11/12">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">Channels</h2>
            <ul className="mt-2 space-y-1">
              {["Homework", "Projects", "Exams"].map((channel) => (
                <li key={channel}>
                  <button
                    onClick={() => setActiveChannel(channel)}
                    className={`w-full text-left p-2 rounded-lg ${
                      activeChannel === channel ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    # {channel}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            <h3 className="text-lg font-semibold text-white">#{activeChannel}</h3>
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
