"use client"; // Required for using React hooks in Next.js

import React, { useState } from "react";
import NavbarSection from "./Navbar"; // Importing the NavbarSection component
import { UserButton } from "@clerk/nextjs";

export default function Landing() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [activeChannel, setActiveChannel] = useState("General");
  const [messages, setMessages] = useState({
    General: [
      { id: 1, user: "Alice", text: "Hey everyone! 👋" },
      { id: 2, user: "Bob", text: "Hi Alice! How's it going?" },
    ],
    Math: [
      { id: 1, user: "Charlie", text: "Can someone help with calculus?" },
    ],
    Physics: [
      { id: 1, user: "Dave", text: "Let's discuss the homework." },
    ],
    Programming: [
      { id: 1, user: "Eve", text: "Anyone working on the project?" },
    ],
  });
  const [newMessage, setNewMessage] = useState("");

  // Sample data for sessions
  const sessions = [
    {
      id: 1,
      title: "Calculus",
      category: "Mathematics",
      participants: 12,
      duration: "45 mins",
      professor: "Dr. Smith",
      isLive: true,
    },
    {
      id: 2,
      title: "Physics",
      category: "Science",
      participants: 8,
      duration: "1 hour",
      professor: "Dr. Johnson",
      isLive: false,
    },
    {
      id: 3,
      title: "Programming",
      category: "Computer Science",
      participants: 15,
      duration: "1.5 hours",
      professor: "Dr. Brown",
      isLive: true,
    },
  ];

  // Filter sessions based on search query
  const filteredSessions = sessions.filter((session) =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle sending a new message
  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const updatedMessages = { ...messages };
      updatedMessages[activeChannel].push({
        id: messages[activeChannel].length + 1,
        user: "You", // Replace with actual user name
        text: newMessage,
      });
      setMessages(updatedMessages);
      setNewMessage("");
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Sidebar */}
      <div
        className={`h-full bg-gray-800 transition-all duration-300 ease-in-out ${
          isSidebarExpanded ? "w-64" : "w-16"
        }`}
      >
        {/* Arrow Button to Toggle Sidebar */}
        <button
          onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
          className="w-full p-4 text-white hover:text-blue-500 focus:outline-none flex items-center justify-center"
        >
          {isSidebarExpanded ? (
            <span className="text-2xl">←</span>
          ) : (
            <span className="text-2xl">→</span>
          )}
        </button>

        {/* Sidebar Content */}
        {isSidebarExpanded && (
          <div className="flex flex-col h-full">
            {/* Channels List */}
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-white">Channels</h2>
              <ul className="mt-2 space-y-1">
                {["General", "Math", "Physics", "Programming"].map((channel) => (
                  <li key={channel}>
                    <button
                      onClick={() => setActiveChannel(channel)}
                      className={`w-full text-left p-2 rounded-lg ${
                        activeChannel === channel
                          ? "bg-blue-600 text-white"
                          : "text-gray-400 hover:bg-gray-700"
                      }`}
                    >
                      # {channel}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Messages Area */}
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

            {/* Message Input */}
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Navbar */}
        <NavbarSection />

 
        {/* Search Bar Section with CTA */}
        <section className="py-12 bg-gray-900">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4 text-white">
              Find the Perfect Session
            </h2>
            <p className="text-gray-400 text-lg mb-8">
              Search for live or recorded sessions tailored to your needs.
            </p>
            <div className="max-w-2xl mx-auto">
              <input
                type="text"
                placeholder="Search sessions..."
                className="w-full p-2 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Video Library Section */}
        <section className="py-16 bg-gray-900">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredSessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow transform hover:-translate-y-2 relative"
                >
                  {/* Live Badge */}
                  {session.isLive && (
                    <div className="absolute top-4 right-4 bg-red-600 text-white text-xs font-medium px-2.5 py-1 rounded-full">
                      LIVE
                    </div>
                  )}

                  {/* Top Half: Opaque Blue Background */}
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-t-lg">
                    <h3 className="text-2xl font-bold text-white">{session.title}</h3>
                    <span className="text-sm text-blue-200">{session.category}</span>
                  </div>

                  {/* Bottom Half: Session Details */}
                  <div className="p-6">
                    <div className="flex items-center gap-4 text-gray-400">
                      <div className="flex items-center gap-2">
                        <span>👤</span>
                        <span>{session.participants}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>⏰</span>
                        <span>{session.duration}</span>
                      </div>
                    </div>
                    <p className="text-gray-400 mt-4">Professor: {session.professor}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-800 py-12 bg-gray-900">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold rounded-lg p-1.5 text-xl">
                    Z
                  </span>
                  <span className="font-semibold text-xl text-white">ZoomSenseAI</span>
                </div>
                <p className="text-gray-400 text-sm">
                  AI-powered collaborative Zoom sessions enhanced by real-time semantic search and multimodal learning.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-4 text-white">Product</h3>
                <ul className="space-y-2">
                  <li>
                    <a href="#features" className="text-gray-400 hover:text-blue-500">
                      Features
                    </a>
                  </li>
                  <li>
                    <a href="#videos" className="text-gray-400 hover:text-blue-500">
                      Videos
                    </a>
                  </li>
                  <li>
                    <a href="#leaderboard" className="text-gray-400 hover:text-blue-500">
                      Leaderboard
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4 text-white">Company</h3>
                <ul className="space-y-2">
                  <li>
                    <a href="#about" className="text-gray-400 hover:text-blue-500">
                      About
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-gray-400 hover:text-blue-500">
                      Careers
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-gray-400 hover:text-blue-500">
                      Privacy
                    </a>
                  </li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
              &copy; {new Date().getFullYear()} ZoomSenseAI. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}