"use client"; // Required for using React hooks in Next.js

import { useState } from "react";

export default function Home() {
  const [activeNav, setActiveNav] = useState("home");

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-800 shadow-lg">
        <div className="container mx-auto flex items-center justify-between py-4 px-6">
          <a href="/" className="flex items-center gap-2">
            <span className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold rounded-lg p-1.5 text-xl">Z</span>
            <span className="font-semibold text-xl text-white">ZoomSenseAI</span>
          </a>
          <div className="flex items-center gap-6">
            <a
              href="#home"
              className={`text-gray-400 hover:text-blue-500 transition-colors ${
                activeNav === "home" ? "text-blue-500 font-semibold" : ""
              }`}
              onClick={() => setActiveNav("home")}
            >
              Home
            </a>
            <a
              href="#features"
              className={`text-gray-400 hover:text-blue-500 transition-colors ${
                activeNav === "features" ? "text-blue-500 font-semibold" : ""
              }`}
              onClick={() => setActiveNav("features")}
            >
              Features
            </a>
            <a
              href="#videos"
              className={`text-gray-400 hover:text-blue-500 transition-colors ${
                activeNav === "videos" ? "text-blue-500 font-semibold" : ""
              }`}
              onClick={() => setActiveNav("videos")}
            >
              Videos
            </a>
            <a
              href="#leaderboard"
              className={`text-gray-400 hover:text-blue-500 transition-colors ${
                activeNav === "leaderboard" ? "text-blue-500 font-semibold" : ""
              }`}
              onClick={() => setActiveNav("leaderboard")}
            >
              Leaderboard
            </a>
          </div>
          <div className="flex items-center gap-4">
            <a href="/login" className="text-sm font-medium text-gray-400 hover:text-blue-500">
              Sign In
            </a>
            <a
              href="/register"
              className="btn-primary px-4 py-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105"
            >
              Get Started
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="flex-1 flex flex-col justify-center items-center text-center py-20 relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-900/20 to-blue-800/20 opacity-30"></div>
        <div className="max-w-2xl mx-auto px-4">
          <h1 className="text-5xl font-bold mb-4 text-white">
            Transform Zoom Sessions Into <br />
            <span className="bg-gradient-to-br from-blue-500 to-blue-600 bg-clip-text text-transparent">
              Intelligent Knowledge Hubs
            </span>
          </h1>
          <p className="text-gray-400 text-lg mb-8">
            Leverage real-time transcription, semantic search, and AI assistance to make academic collaboration more effective and accessible.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#features"
              className="btn-primary px-6 py-3 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105"
            >
              Explore Features
            </a>
            <a
              href="/register"
              className="btn-secondary px-6 py-3 rounded-lg flex items-center gap-2 bg-gray-800 text-white hover:bg-gray-700 transition-all transform hover:scale-105"
            >
              Get Started <span className="ml-2">→</span>
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 text-white">Powerful Features</h2>
            <p className="text-gray-400 text-lg">
              Our platform combines cutting-edge AI technology with intuitive collaboration tools.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: "🔍",
                title: "Semantic Search",
                description: "Find relevant discussions using advanced semantic search.",
              },
              {
                icon: "🎥",
                title: "Real-Time Zoom Integration",
                description: "Join live discussions directly from search results.",
              },
              {
                icon: "🧠",
                title: "AI Assistance",
                description: "Get real-time explanations and clarifications.",
              },
              {
                icon: "💬",
                title: "Collaborative Learning",
                description: "Work together to solve problems effectively.",
              },
              {
                icon: "👥",
                title: "Community Moderation",
                description: "Earn recognition by helping peers.",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow transform hover:-translate-y-2"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-blue-500/10 rounded-lg mb-4 mx-auto">
                  <span className="text-2xl text-blue-500">{feature.icon}</span>
                </div>
                <h3 className="text-2xl font-semibold mb-2 text-white">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section id="videos" className="py-16 bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 text-white">See It in Action</h2>
            <p className="text-gray-400 text-lg">
              Watch how ZoomSenseAI transforms your learning experience.
            </p>
          </div>
          <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden shadow-lg">
            <iframe
              className="w-full h-full"
              src="https://www.youtube.com/embed/dQw4w9WgXcQ" // Replace with your video URL
              title="YouTube video player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      </section>

      {/* Leaderboard Section */}
      <section id="leaderboard" className="py-16 bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 text-white">Top Contributors</h2>
            <p className="text-gray-400 text-lg">
              Meet the most active tutors and contributors on ZoomSenseAI.
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { name: "Alice Johnson", points: 1200, avatar: "https://i.pravatar.cc/150?img=1" },
                { name: "Bob Smith", points: 950, avatar: "https://i.pravatar.cc/150?img=2" },
                { name: "Charlie Brown", points: 800, avatar: "https://i.pravatar.cc/150?img=3" },
                { name: "Diana Evans", points: 750, avatar: "https://i.pravatar.cc/150?img=4" },
                { name: "Ethan Lee", points: 700, avatar: "https://i.pravatar.cc/150?img=5" },
                { name: "Fiona Clark", points: 650, avatar: "https://i.pravatar.cc/150?img=6" },
              ].map((user, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors transform hover:scale-105"
                >
                  <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">{user.name}</h3>
                    <p className="text-gray-400">{user.points} points</p>
                  </div>
                  <span className="text-blue-500 ml-auto">🏆</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12 bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold rounded-lg p-1.5 text-xl">Z</span>
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
  );
}