"use client"; // Required for using React hooks in Next.js

import React, { useState } from "react";
import NavbarSection from "./Navbar"; // Importing the NavbarSection component
import { UserButton } from "@clerk/nextjs";
import Footer from "./Footer"; // Importing the Footer component
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
    <div className="flex flex-row justify-between w-full min-h-screen bg-black text-white">
      {/* Sidebar */}
      <SidebarChat />

      {/* Main Content */}
      <div className="flex-1 w-full min-h-screen gap-12 flex flex-col">
        {/* Navbar */}
        <NavbarSection />

        {/* Search Bar Section with CTA */}
        <section className="pl-12">
          <div className="container px-4">
            <h2 className="text-5xl font-bold mb-12 text-white">
              Find the Perfect Session
            </h2>
            <form onSubmit={handleMainSearch} className="max-w-2xl">
              <div className="relative">
                <input
                  type="text"
                  name="search"
                  placeholder="Search sessions..."
                  className="w-full p-3 pl-10 rounded-lg bg-black border border-neutral-700 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <svg
                  className="absolute left-3 top-3 h-5 w-5 text-neutral-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <button type="submit" className="hidden">
                Search
              </button>
            </form>
          </div>
        </section>

        {/* Video Library Section */}
        <section className="pl-12">
          <div className="container px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredSessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-md shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2 relative overflow-hidden"
                >
                  {/* Live Badge */}
                  {session.isLive && (
                    <div className="absolute top-4 right-4 border border-red-400 text-red-400 text-xs font-semibold px-2.5 py-1 rounded-full">
                      LIVE
                    </div>
                  )}

                  {/* Top Half: Gradient Background */}
                  <div className="h-28 p-6 rounded-t-md border border-neutral-700" style={{ background: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url("/${session.category.toLowerCase()}.jpg") top` }}>

                  </div>

                  {/* Bottom Half: Session Details */}
                  <div className="p-6 border border-neutral-700 rounded-b-md flex flex-col gap-3">
                  <h3 className="text-2xl font-bold text-white">{session.title}</h3>
                  <span className="text-md font-medium text-blue-200">{session.category}</span>
                    <div className="flex gap-4 text-neutral-300">
                      <div className="flex gap-2">
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
                            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                          />
                        </svg>
                        <span>{session.participants}</span>
                      </div>
                      <div className="flex gap-2">
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
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
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
        <Footer />
      </div>
    </div>
  );
}