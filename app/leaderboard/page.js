"use client"; // Required for using React hooks in Next.js

import React, { useEffect, useState } from "react";
import NavbarSection from "../../components/Navbar";

export default function LeaderboardPage() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Temporary data to use if no data is fetched
  const temporaryData = [
    { name: "Alice", points: 1200 },
    { name: "Bob", points: 950 },
    { name: "Charlie", points: 800 },
    { name: "Dave", points: 750 },
    { name: "Eve", points: 600 },
  ];

  // Fetch leaderboard data
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch("/api/leaderboard");
        if (!response.ok) {
          throw new Error("Failed to fetch leaderboard data");
        }
        const data = await response.json();
        // If no data is returned, use temporary data
        const sortedMembers = (data.length > 0 ? data : temporaryData).sort(
          (a, b) => b.points - a.points
        );
        setMembers(sortedMembers);
      } catch (error) {
        // If there's an error, use temporary data
        setError(error.message);
        const sortedMembers = temporaryData.sort((a, b) => b.points - a.points);
        setMembers(sortedMembers);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  // Filter members based on search query
  const filteredMembers = members.filter((member) =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-bounce w-12 h-12 mb-4">
            <svg
              className="w-full h-full text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              ></path>
            </svg>
          </div>
          <p className="text-lg">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Navbar */}
      <NavbarSection />

      {/* Leaderboard Content */}
      <div className="p-8">
        <h1 className="text-4xl font-bold text-center mb-8">Leaderboard</h1>
        <div className="max-w-4xl mx-auto">
          {/* Search Bar */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search members..."
              className="w-full p-3 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {filteredMembers.length === 0 ? (
            <div className="text-center text-gray-400">
              No matching members found.
            </div>
          ) : (
            <>
              <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="py-3 px-4 text-left">Rank</th>
                      <th className="py-3 px-4 text-left">Name</th>
                      <th className="py-3 px-4 text-right">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((member, index) => (
                      <tr
                        key={member.name}
                        className={`${
                          index === 0
                            ? "bg-gradient-to-r from-yellow-600 to-yellow-700 animate-float"
                            : index === 1
                            ? "bg-gradient-to-r from-gray-600 to-gray-700 animate-float"
                            : index === 2
                            ? "bg-gradient-to-r from-yellow-800 to-yellow-900 animate-float"
                            : index % 2 === 0
                            ? "bg-gray-800"
                            : "bg-gray-750"
                        } hover:bg-gray-700 transition-all duration-300`}
                      >
                        <td className="py-3 px-4">
                          {index === 0 ? (
                            <span className="text-2xl">🥇</span>
                          ) : index === 1 ? (
                            <span className="text-2xl">🥈</span>
                          ) : index === 2 ? (
                            <span className="text-2xl">🥉</span>
                          ) : (
                            index + 1
                          )}
                        </td>
                        <td className="py-3 px-4">{member.name}</td>
                        <td className="py-3 px-4 text-right">{member.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {error && (
                <div className="mt-4 text-center text-yellow-500">
                  Warning: {error}. Displaying temporary data.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}