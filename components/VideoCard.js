// components/VideoCard.jsx
const VideoCard = ({ title, relevant, upvotes, link, category }) => (
  <div className="relative group border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
    <div className="relative aspect-video bg-gray-100 dark:bg-gray-800">
      <video 
        className="w-full h-full object-cover"
        controls
        preload="metadata"
      >
        <source src={link} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
    <div className="p-4 space-y-3 bg-white dark:bg-gray-800">
      <div className="flex justify-between items-start">
        <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
          {title}
        </h3>
        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full dark:bg-blue-900 dark:text-blue-200">
          {category}
        </span>
      </div>
      <div 
        className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3"
        dangerouslySetInnerHTML={{ __html: relevant }}
      />
      <div className="flex items-center text-purple-600 dark:text-purple-400 font-medium">
        <svg 
          className="w-5 h-5 mr-1" 
          fill="currentColor" 
          viewBox="0 0 24 24"
        >
          <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
        </svg>
        {upvotes.toLocaleString()}
      </div>
    </div>
  </div>
);

const VideoGrid = ({ videos }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {videos.map((video, index) => (
        <VideoCard
          key={index}
          link={video.link}
          title={video.title}
          relevant={video.relevant}
          upvotes={video.upvotes}
          category={video.category}
        />
      ))}
    </div>
  );
};

export default VideoGrid;
