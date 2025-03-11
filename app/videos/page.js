// pages/videos/index.jsx
'use client'
import { useState } from "react";
import SearchBar from "../../components/SearchBar";
import VideoGrid from "../../components/VideoCard";
import NavbarSection from "../../components/Navbar";

export default function Home() {
  const [videos, setVideos] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = (results, term) => {
    setSearchTerm(term);
    setVideos(results.map(video => ({
      link: video.link,
      title: video.title,
      upvotes: video.upvotes,
      relevant: video.relevant
    })));
  };

  return (
    <>
      <NavbarSection/>
      <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors">
        <main className="container mx-auto py-8 px-4">
          <h1 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">
            Video Library
          </h1>
          <SearchBar onSearch={handleSearch} />
          <VideoGrid videos={videos} />
        </main>
      </div>
    </>
  );
}
