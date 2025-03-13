"use client"; // Required for using React hooks in Next.js

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ClerkProvider,
  RedirectToSignIn,
  SignedIn,
  SignedOut,
  SignInButton,
} from "@clerk/nextjs";
import Landing from "../components/Landing";

export default function Home() {
  const [activeNav, setActiveNav] = useState("home");

  return (
    <>
      <SignedOut>
        <div className="flex flex-col min-h-screen bg-black text-white">
          {/* Navbar */}
          <nav className="fixed top-0 left-0 right-0 z-50 bg-black backdrop-blur-md border-b border-gray-800 shadow-lg">
            <div className="container mx-auto flex items-center justify-between py-4 px-6">
              <Link href="/" className="flex items-center gap-2">
                <span className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold rounded-lg p-1.5 text-xl">
                  GT
                </span>
                <span className="font-semibold text-xl text-white">
                  HiveMind
                </span>
              </Link>
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
                    activeNav === "features"
                      ? "text-blue-500 font-semibold"
                      : ""
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
                    activeNav === "leaderboard"
                      ? "text-blue-500 font-semibold"
                      : ""
                  }`}
                  onClick={() => setActiveNav("leaderboard")}
                >
                  Leaderboard
                </a>
              </div>
              <div className="flex items-center gap-4">
                <SignInButton />
              </div>
            </div>
          </nav>

          {/* Hero Section */}
          <HeroSection />

          {/* Features Section */}
          <FeaturesSection />

          {/* Video Section */}
          <VideoSection />

          {/* Leaderboard Section */}
          <LeaderboardSection />

          {/* Footer */}
          <Footer />
        </div>
      </SignedOut>
      <SignedIn>
        <Landing />
      </SignedIn>
    </>
  );
}

// Hero Section Component
function HeroSection() {
  return (
    <section
      id="home"
      className="flex-1 mt-24 flex flex-col justify-center items-center text-center py-20 relative overflow-hidden"
    >
      {/* Background Gradient */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-900/20 to-blue-800/20 opacity-30"></div>

      {/* Hero Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="max-w-2xl mx-auto px-4"
      >
        <h1 className="text-5xl font-bold mb-4 text-white">
          Transform Zoom Sessions Into <br />
          <span className="bg-gradient-to-br from-blue-500 to-blue-600 bg-clip-text text-transparent">
            Intelligent Knowledge Hubs
          </span>
        </h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-gray-400 text-lg mb-8"
        >
          Leverage real-time transcription, semantic search, and AI assistance to make academic collaboration more effective and accessible.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <motion.a
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            href="#features"
            className="px-6 py-3 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg"
          >
            Explore Features
          </motion.a>

          {/* Replace the <a> tag with <SignInButton> */}
          <SignInButton>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-3 rounded-lg flex items-center gap-2 bg-gray-800 text-white hover:bg-gray-700 transition-all shadow-lg"
            >
              Get Started <span className="ml-2">→</span>
            </motion.button>
          </SignInButton>
        </motion.div>
      </motion.div>

      {/* Glassmorphism Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.8 }}
        className="mt-12 backdrop-blur-md bg-black border border-gray-800 rounded-lg p-6 max-w-md mx-auto shadow-lg"
      >
        <h3 className="text-xl font-semibold mb-2 text-white">
          What Our Users Say
        </h3>
        <p className="text-gray-400">
          "HiveMind has revolutionized how we collaborate. It's like having a personal AI tutor in every session!"
        </p>
      </motion.div>
    </section>
  );
}

// Features Section Component
function FeaturesSection() {
  const features = [
    {
      icon: "🔍",
      title: "Semantic Search",
      description: "Find relevant discussions using advanced semantic search.",
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
  ];

  return (
    <section id="features" className="py-16 bg-black">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 text-white">
            Powerful Features
          </h2>
          <p className="text-gray-400 text-lg">
            Our platform combines cutting-edge AI technology with intuitive collaboration tools.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              className="bg-gray-800 p-6 rounded-xl shadow-xl hover:shadow-2xl transition-shadow transform hover:-translate-y-2"
            >
              <div className="flex items-center justify-center w-12 h-12 bg-blue-500/10 rounded-lg mb-4 mx-auto">
                <span className="text-2xl text-blue-500">
                  {feature.icon}
                </span>
              </div>
              <h3 className="text-2xl font-semibold mb-2 text-white">
                {feature.title}
              </h3>
              <p className="text-gray-400 text-center">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Video Section Component
function VideoSection() {
  return (
    <section id="videos" className="py-16 bg-black">
      <div className="container mx-auto px-4">
        {/* Video content goes here */}
      </div>
    </section>
  );
}

// Leaderboard Section Component
function LeaderboardSection() {
  const users = [
    {
      name: "Alice Johnson",
      points: 1200,
      avatar: "https://i.pravatar.cc/150?img=1",
    },
    {
      name: "Bob Smith",
      points: 950,
      avatar: "https://i.pravatar.cc/150?img=2",
    },
    {
      name: "Charlie Brown",
      points: 800,
      avatar: "https://i.pravatar.cc/150?img=3",
    },
    {
      name: "Diana Evans",
      points: 750,
      avatar: "https://i.pravatar.cc/150?img=4",
    },
    {
      name: "Ethan Lee",
      points: 700,
      avatar: "https://i.pravatar.cc/150?img=5",
    },
    {
      name: "Fiona Clark",
      points: 650,
      avatar: "https://i.pravatar.cc/150?img=6",
    },
  ];

  return (
    <section id="leaderboard" className="py-16 bg-black">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 text-white">
            Top Contributors
          </h2>
          <p className="text-gray-400 text-lg">
            Meet the most active tutors and contributors on HiveMind.
          </p>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="bg-gray-800 rounded-xl shadow-xl p-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {users.map((user, index) => {
              const isTop3 = index < 3;
              const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "";
              const rankColor = index === 0 ? "text-yellow-500" : index === 1 ? "text-silver" : index === 2 ? "text-orange-500" : "text-gray-400";

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.2 }}
                  className={`flex items-center gap-4 p-4 rounded-xl ${isTop3 ? "bg-gradient-to-r from-blue-500/20 to-blue-600/20" : "bg-gray-700"} hover:bg-gray-600 transition-colors transform hover:scale-105`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`${rankColor} text-2xl font-bold`}>{index + 1}</span>
                    {isTop3 && (
                      <span className="text-3xl">
                        {medal}
                      </span>
                    )}
                  </div>
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-12 h-12 rounded-full border-2 border-white"
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {user.name}
                    </h3>
                    <p className="text-gray-400">{user.points} points</p>
                  </div>
                  <span className="text-blue-500 ml-auto">🏆</span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// Footer Component
function Footer() {
  return (
    <footer className="border-t border-gray-800 py-12 bg-black">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold rounded-lg p-1.5 text-xl">
                Z
              </span>
              <span className="font-semibold text-xl text-white">
                HiveMind
              </span>
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
          &copy; {new Date().getFullYear()} HiveMind. All rights reserved.
        </div>
      </div>
    </footer>
  );
}