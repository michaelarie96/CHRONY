import React, { useState, useRef, useEffect } from "react";
import moment from "moment";

const TitleAutocomplete = ({
  value,
  onChange,
  onSelect,
  timeEntries,
  categories,
  placeholder = "What are you working on?",
  className = "",
  disabled = false,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !inputRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get category name by ID
  const getCategoryName = (categoryId) => {
    if (!categoryId) return "No category";
    const category = categories.find((cat) => cat.id === categoryId);
    return category ? category.name : categoryId;
  };

  // Filter and prepare suggestions
  const getSuggestions = (input) => {
    if (!input.trim() || input.length < 2) {
      return [];
    }

    const searchTerm = input.toLowerCase().trim();
    const sevenDaysAgo = moment().subtract(7, "days");

    // Filter entries from last 7 days that match search term
    const matchingEntries = timeEntries.filter((entry) => {
      // Only entries from last 7 days
      if (!moment(entry.start).isAfter(sevenDaysAgo)) {
        return false;
      }

      // Only entries with titles
      if (!entry.title || !entry.title.trim()) {
        return false;
      }

      // Word-based partial matching (case-insensitive)
      const title = entry.title.toLowerCase();
      const words = searchTerm.split(/\s+/);

      // All search words must be found in the title
      return words.every((word) =>
        title.split(/\s+/).some((titleWord) => titleWord.includes(word))
      );
    });

    // Create unique combinations of title+category
    const uniqueCombinations = new Map();

    matchingEntries.forEach((entry) => {
      const key = `${entry.title}|${entry.category || ""}`;

      // Keep the most recent occurrence of each combination
      if (
        !uniqueCombinations.has(key) ||
        moment(entry.start).isAfter(moment(uniqueCombinations.get(key).start))
      ) {
        uniqueCombinations.set(key, entry);
      }
    });

    // Convert to array and sort by recency
    const suggestions = Array.from(uniqueCombinations.values())
      .sort((a, b) => moment(b.start).diff(moment(a.start)))
      .map((entry) => ({
        title: entry.title,
        category: entry.category,
        categoryName: getCategoryName(entry.category),
        displayText: `${entry.title} (${getCategoryName(entry.category)})`,
      }));

    return suggestions;
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Only show dropdown when user is typing (not on programmatic changes)
    if (newValue.length >= 2) {
      const newSuggestions = getSuggestions(newValue);
      setSuggestions(newSuggestions);
      setShowDropdown(newSuggestions.length > 0);
    } else {
      setSuggestions([]);
      setShowDropdown(false);
    }
  };

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion) => {
    // Fill the input with the selected title
    onChange(suggestion.title);

    // Notify parent component about the selection (includes category)
    if (onSelect) {
      onSelect({
        title: suggestion.title,
        category: suggestion.category,
      });
    }

    // Close dropdown and focus back on input
    setShowDropdown(false);
    setSuggestions([]);

    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Handle keyboard navigation (optional enhancement)
  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      setShowDropdown(false);
      setSuggestions([]);
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={`${className} ${
          disabled ? "bg-gray-100 cursor-not-allowed" : ""
        }`}
      />

      {/* Dropdown suggestions */}
      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.title}-${suggestion.category}-${index}`}
              onClick={() => handleSuggestionClick(suggestion)}
              className="px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
            >
              <div className="font-medium text-gray-800">
                {suggestion.title}
              </div>
              <div className="text-sm text-gray-500">
                {suggestion.categoryName}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TitleAutocomplete;
