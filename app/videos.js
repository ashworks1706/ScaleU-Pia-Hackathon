// pages/index.js or pages/videos.js
import { useState } from "react";
import SearchBar from "../components/SearchBar";
import VideoGrid from "../components/VideoGrid";

export default function Videos() {
  // Sample video data - in a real app, this would come from an API
  const [videos, setVideos] = useState([
    {
      src: "/videos/sample1.mp4",
      title: "How to build a Next.js application with Tailwind CSS"
    },
    {
      src: "/videos/sample2.mp4",
      title: "Creating responsive layouts with Tailwind CSS Grid"
    },
    {
      src: "/videos/sample3.mp4",
      title: "Learning React Hooks for state management"
    },
    {
      src: "/videos/sample4.mp4",
      title: "Building modern UI with HeroUI components"
    }
  ]);
  
  const [searchTerm, setSearchTerm] = useState("Tailwind");
  
  // In a real app, this would filter videos based on search
  const handleSearch = (term) => {
    setSearchTerm(term);
    // Filter videos based on search term
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto py-8">
        <h1 className="text-3xl font-bold text-center mb-8">Video Library</h1>
        <SearchBar onSearch={handleSearch} />
        <VideoGrid videos={videos} highlightTerm={searchTerm} />
      </main>
    </div>
  );
}
