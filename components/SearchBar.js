import { useState, useRef, useEffect } from "react";

const SearchBar = ({ onSearch }) => {
  const [query, setQuery] = useState("");
  const clickPoint = useRef();
  const searchTimeout = useRef();

  const handleSearch = async (term) => {
    clearTimeout(searchTimeout.current);

    if (term.length === 0) {
      onSearch([], "");
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(term)}`
        );
        const data = await response.json();
        onSearch(data.results, term);
      } catch (error) {
        console.error("Search failed:", error);
      }
    }, 300);
  };

  const handleFocus = () => {
    clickPoint.current.style.display = "none";
  };

  const handleBlur = () => {
    clickPoint.current.style.display = "block";
  };

  return (
    <div className="w-full px-4 py-6 flex justify-center">
      <div className="relative w-full max-w-3xl">
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
        <input
          type="text"
          className="block p-2 pl-10 w-full text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:pl-3 focus:outline-none focus:ring-2 focus:ring-purple-600"
          placeholder="Search..."
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={(e) => {
            setQuery(e.target.value);
            handleSearch(e.target.value);
          }}
          value={query}
        />
      </div>
    </div>
  );
};

export default SearchBar;
