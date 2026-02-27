import React from "react";
import { BuildingOfficeIcon } from "@heroicons/react/24/outline";

/**
 * SummaryCards Component
 * Displays 4 clickable stat cards for Overview tab
 */
const SummaryCards = ({
  eligibleCount = 0,
  lastRefurbishedCount = 0,
  allCentersCount = 0,
  selectedCard = "eligible",
  onCardClick,
}) => {
  const cards = [
    {
      id: "eligible",
      icon: BuildingOfficeIcon,
      title: "Eligible Centers",
      count: eligibleCount,
    },
    {
      id: "lastRefurbished",
      icon: BuildingOfficeIcon,
      title: "Last refurbished",
      count: lastRefurbishedCount,
    },
    {
      id: "allCenters",
      icon: BuildingOfficeIcon,
      title: "All Centers",
      count: allCentersCount,
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = selectedCard === card.id;

        return (
          <div
            key={card.id}
            onClick={() => onCardClick(card.id)}
            className={`
              cursor-pointer rounded-lg border-2 p-6 transition-all duration-200
              ${
                isSelected
                  ? "border-green-600 bg-green-50 shadow-md"
                  : "border-gray-200 bg-white hover:border-green-300 hover:shadow-sm"
              }
            `}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className={`text-sm font-medium ${
                    isSelected ? "text-green-800" : "text-gray-600"
                  }`}
                >
                  {card.title}
                </p>
                <p
                  className={`text-3xl font-bold mt-2 ${
                    isSelected ? "text-green-900" : "text-gray-900"
                  }`}
                >
                  {card.count}
                </p>
              </div>
              <div
                className={`
                  w-12 h-12 rounded-full flex items-center justify-center
                  ${isSelected ? "bg-green-100" : "bg-gray-100"}
                `}
              >
                <Icon
                  className={`w-6 h-6 ${
                    isSelected ? "text-green-600" : "text-gray-600"
                  }`}
                />
              </div>
            </div>
          </div>
        );
      })}

      {/* Year Filter Placeholder (4th column) */}
      <div className="flex items-end justify-between">
        <div className="text-sm text-gray-600">Filters:</div>
        {/* Year selector will be passed as children or handled in parent */}
      </div>
    </div>
  );
};

export default SummaryCards;
