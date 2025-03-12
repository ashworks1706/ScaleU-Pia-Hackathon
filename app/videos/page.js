'use client'
import { useState } from "react";
import SearchBar from "../../components/SearchBar";
import VideoGrid from "../../components/VideoCard";
import NavbarSection from "../../components/Navbar";

export default function Home() {
  const [videos, setVideos] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const handleSearch = (results, term, category) => {
    setSearchTerm(term);
    setSelectedCategory(category);
    setVideos(results.map(video => ({
      link: video.link,
      title: video.title,
      upvotes: video.upvotes,
      relevant: video.relevant,
      category: video.category
    })));
  };

  return (
    <>
      <NavbarSection/>
      <div className="min-h-screen bg-white bg-gradient-to-b from-gray-900 to-gray-800 transition-colors">
        <main className="container mx-auto py-8 px-4">
          <h1 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">
            Video Library {selectedCategory !== "All" && `- ${selectedCategory}`}
          </h1>
          <SearchBar onSearch={handleSearch} />
          <VideoGrid videos={videos} />
        </main>
      </div>
    </>
  );
}