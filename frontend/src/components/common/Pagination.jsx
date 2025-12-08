/**
 * Pagination Component
 * Displays result count and navigation buttons
 *
 * @param {number} currentPage - Current page number
 * @param {number} totalPages - Total number of pages
 * @param {number} itemsPerPage - Items per page
 * @param {number} totalItems - Total number of items
 * @param {number} currentItemsCount - Number of items on current page
 * @param {function} onPageChange - Page change handler
 */
const Pagination = ({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  currentItemsCount,
  onPageChange,
}) => {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = (currentPage - 1) * itemsPerPage + currentItemsCount;

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
      {/* Left: Results count */}
      <div className="text-sm text-gray-600">
        Showing {startItem} to {endItem} of {totalItems} results
      </div>

      {/* Right: Navigation buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-4 py-2 border border-gray-300 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
        >
          Prev
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0}
          className="px-4 py-2 border border-gray-300 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Pagination;
