import React, { useState, useRef, useEffect } from 'react';

const CategoryDropdown = ({ 
  categories, 
  selectedCategory, 
  onSelectCategory, 
  onDeleteCategory,
  onAddCategory,
  disabled = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAddInput, setShowAddInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null); // ID of category being confirmed for deletion
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowAddInput(false);
        setDeleteConfirm(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedCategoryName = categories.find(cat => cat.id === selectedCategory)?.name || 'Select Category';

  const handleSelectCategory = (categoryId) => {
    onSelectCategory(categoryId);
    setIsOpen(false);
    setDeleteConfirm(null);
  };

  const handleDeleteClick = (e, categoryId) => {
    e.stopPropagation(); // Prevent selecting the category
    setDeleteConfirm(categoryId);
  };

  const confirmDelete = async (categoryId) => {
    await onDeleteCategory(categoryId);
    setDeleteConfirm(null);
    // Keep dropdown open to show updated list
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    await onAddCategory(newCategoryName.trim());
    setNewCategoryName('');
    setShowAddInput(false);
    // Keep dropdown open to show new category
  };

  const handleAddInputKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAddCategory();
    } else if (e.key === 'Escape') {
      setNewCategoryName('');
      setShowAddInput(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full text-left border border-gray-300 rounded-l px-3 py-2 bg-white flex justify-between items-center ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:bg-gray-50'
        }`}
      >
        <span className={disabled ? 'text-gray-400' : 'text-gray-900'}>
          {disabled ? 'Loading...' : selectedCategoryName}
        </span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {/* Empty option */}
          <div
            onClick={() => handleSelectCategory('')}
            className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-gray-500"
          >
            No category
          </div>

          {/* Category options */}
          {categories.map(category => (
            <div key={category.id} className="relative">
              {deleteConfirm === category.id ? (
                /* Delete confirmation */
                <div className="px-3 py-2 bg-red-50 border-b border-red-200">
                  <div className="text-sm text-red-700 mb-2">
                    Delete "{category.name}"?
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => confirmDelete(category.id)}
                      className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                    <button
                      onClick={cancelDelete}
                      className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Normal category option */
                <div 
                  className={`px-3 py-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center group ${
                    selectedCategory === category.id ? 'bg-blue-50 text-blue-700' : ''
                  }`}
                >
                  <span 
                    onClick={() => handleSelectCategory(category.id)}
                    className="flex-1"
                  >
                    {category.name}
                  </span>
                  <button
                    onClick={(e) => handleDeleteClick(e, category.id)}
                    className="opacity-0 group-hover:opacity-100 ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded transition-all"
                    title={`Delete ${category.name}`}
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Add new category section */}
          <div className="border-t border-gray-200 bg-gray-50">
            {showAddInput ? (
              <div className="p-3">
                <input
                  type="text"
                  placeholder="Category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={handleAddInputKeyPress}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm mb-2"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddCategory}
                    className="px-2 py-1 bg-[#00AFB9] text-white text-xs rounded hover:bg-[#0081A7]"
                    disabled={!newCategoryName.trim()}
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddInput(false);
                      setNewCategoryName('');
                    }}
                    className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddInput(true)}
                className="w-full px-3 py-2 text-left text-[#00AFB9] hover:bg-gray-100 flex items-center"
              >
                <span className="mr-2">+</span>
                Add new category
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryDropdown;