// components/VideoGrid.jsx
import { useRef, useEffect, useState } from "react";

// Single video component with highlighted text
const VideoCard = ({ videoSrc, title, highlightedWord }) => {
  const titleWithHighlight = title.includes(highlightedWord) 
    ? title.split(highlightedWord).map((part, i, parts) => 
        i < parts.length - 1 ? 
          <>{part}<span className="bg-purple-200 text-purple-900">{highlightedWord}</span></> : 
          part
      )
    : title;
    
  return (
    <div className="flex flex-col rounded-xl overflow-hidden shadow-md border border-gray-200">
      <div className="relative w-full aspect-video bg-gray-100">
        <video className="w-full h-full object-cover">
          <source src={videoSrc} type="video/mp4" />
        </video>
      </div>
      <div className="p-4">
        <h3 className="font-medium selection:bg-purple-200 selection:text-purple-900">
          {titleWithHighlight}
        </h3>
      </div>
    </div>
  );
};

const VideoGrid = ({ videos, highlightTerm }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-4">
      {videos.map((video, index) => (
        <VideoCard 
          key={index}
          videoSrc={video.src}
          title={video.title}
          highlightedWord={highlightTerm}
        />
      ))}
    </div>
  );
};

export default VideoGrid;
