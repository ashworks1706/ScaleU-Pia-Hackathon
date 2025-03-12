"use client"; // Required for using React hooks in Next.js

import React, { useState } from "react";
import NavbarSection from "./Navbar"; // Importing the NavbarSection component
import { UserButton } from "@clerk/nextjs";
import Footer from "./Footer"; // Importing the SidebarChat component
import SidebarChat from "./SideBar"; // Importing the SidebarChat component
import { useRouter } from "next/navigation";

export default function Landing() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChannel, setActiveChannel] = useState("General");
  const app = useRouter();
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
  const handleMainSearch = (e) => {
    e.preventDefault();
    const searchQuery = e.target.search.value;
    if (searchQuery) {
      app.push(`/videos?q=${encodeURIComponent(searchQuery)}`);
    }
  };
  // Sample data for sessions
  const sessions = [
    {
      id: 1,
      title: "Calculus",
      category: "Mathematics",
      participants: 12,
      duration: "45 mins",
      isLive: true,
      link:"",
    },
    {
      id: 2,
      title: "Wave Motion",
      category: "Physics",
      participants: 8,
      duration: "1 hour",
      isLive: false,
      link:"",
    },
    {
      id: 3,
      title: "Programming",
      category: "Computer Science",
      participants: 15,
      duration: "1.5 hours",
      isLive: true,link:"",
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
    <div className="flex flex-row justify-between w-full min-h-screen  bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Sidebar */}
      <SidebarChat />
      {/* Main Content */}
      <div className="flex-1 w-full min-h-screen justify-between flex flex-col">
        <NavbarSection />
        {/* Navbar */}

 
        {/* Search Bar Section with CTA */}
        <section className="py-12 ">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4 text-white">
            Find the Perfect Session
          </h2>
          <form onSubmit={handleMainSearch}>
            <div className="max-w-2xl mx-auto">
              <input
                type="text"
                name="search"
                placeholder="Search sessions..."
                className="w-full p-2 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button type="submit" className="hidden">Search</button>
            </div>
          </form>
        </div>
      </section>


        {/* Video Library Section */}
        <section className="py-16 ">
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
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
     <Footer/>
      </div>
    </div>
  );
}