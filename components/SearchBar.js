// components/SearchBar.jsx
import { useState, useRef, useEffect } from "react";

const SearchBar = ({ onSearch }) => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const clickPoint = useRef();
  const searchTimeout = useRef();

  const handleSearch = async (searchTerm) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`);
      const data = await response.json();
      onSearch(data.results, searchTerm);
    } catch (error) {
      console.error("Search failed:", error);
      onSearch([], searchTerm);
    } finally {
      setIsLoading(false);
    }
  };

  const debouncedSearch = (term) => {
    clearTimeout(searchTimeout.current);
    if (term.length === 0) {
      onSearch([], "");
      return;
    }
    searchTimeout.current = setTimeout(() => handleSearch(term), 300);
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };

  const showSearchIcon = !query && clickPoint.current?.style.display !== "none";

  return (
    <div className="w-full px-4 py-6 flex justify-center">
      <div className="relative w-full max-w-3xl">
        {showSearchIcon && (
          <div className="absolute top-3 left-3 items-center" ref={clickPoint}>
            <svg
              className="w-5 h-5 text-gray-500"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              ></path>
            </svg>
          </div>
        )}

        <input
          type="text"
          value={query}
          onChange={handleChange}
          className="block p-2 pl-10 pr-10 w-full text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:pl-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          placeholder="Search for sessions..."
          onFocus={() => (clickPoint.current.style.display = "none")}
          onBlur={() => !query && (clickPoint.current.style.display = "block")}
          aria-label="Search videos"
        />

        {isLoading && (
          <div className="absolute right-3 top-3">
            <svg
              className="animate-spin h-5 w-5 text-gray-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
