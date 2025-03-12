"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import NavbarSection from "../../../components/Navbar";

// Helper function to check if the URL is a YouTube link and extract the video ID.
function isYouTubeUrl(url) {
  const regExp = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:embed\/|watch\?v=|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

export default function VideoView() {
  const { id } = useParams();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    async function fetchVideo() {
      try {
        const res = await fetch(`/python/video/${id}`);
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(errText || "Failed to fetch video data");
            }
            const data = await res.json();
            console.log(data)
        setVideo(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchVideo();
  }, [id]);

  if (loading) return <div className="p-4">Loading video data...</div>;
  if (error) return <div className="p-4">Error: {error}</div>;

  // If a link exists, check if it is a YouTube link.

  const youtubeId = video.link ? isYouTubeUrl(video.link) : video.link;
  console.log(youtubeId)

  return (
    <div className="min-h-screen bg-black text-white">
      <NavbarSection />
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-4">{video.title}</h1>
        {video.status === "completed" && video.link ? (
          youtubeId ? (
            <div className="embed-responsive embed-responsive-16by9">
              <iframe
                className="w-full h-64 rounded-md"
                src={youtubeId}
                width={560}
                height={315}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="YouTube Video Player"
              ></iframe>
            </div>
          ) : (
            <video controls className="w-full rounded-md">
              <source src={video.link} type="video/webm" />
              Your browser does not support the video tag.
            </video>
          )
        ) : (
          <p>This recording is not available yet.</p>
        )}
        {video.transcript && (
          <div className="mt-6 p-4 bg-gray-700 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Transcript</h2>
            <p className="text-sm">{video.transcript}</p>
          </div>
        )}
      </div>
    </div>
  );
}
