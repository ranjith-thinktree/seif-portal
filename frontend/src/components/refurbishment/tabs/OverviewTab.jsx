import React from "react";
import { BuildingOfficeIcon } from "@heroicons/react/24/outline";
import RefurbishmentCard from "../RefurbishmentCard";
import EligibleCentersCard from "../cards/EligibleCentersCard";
import LastRefurbishedCard from "../cards/LastRefurbishedCard";
import AllCentersCard from "../cards/AllCentersCard";

/**
 * OverviewTab Component
 * Uses Card components with EnhancedDataTable and integrated AdvancedSearchBar
 */
const OverviewTab = ({
  // Card selection
  selectedCard = "eligible",
  onCardClick,

  // Data counts for cards
  eligibleCount = 0,
  lastRefurbishedCount = 0,
  allCentersCount = 0,

  // Loading state
  loading = false,

  // Eligible Centers Card (from useTableSearch)
  eligibleTable,
  eligibleFilterOptions,
  onCreateRequestEligible,
  onNotifyEligible,
  onExportEligible,
  formatDate,

  // Last Refurbished Card (from useTableSearch)
  lastRefurbishedTable,
  lastRefurbishedFilterOptions,
  onViewLastRefurbished,
  onExportLastRefurbished,

  // All Centers Card (from useTableSearch)
  allCentersTable,
  allCentersFilterOptions,
  onNotifyAllCenters,
  onExportAllCenters,
  // History modal callback
  onShowHistory,
}) => {
  return (
    <div className="space-y-6">
      {/* 3 Clickable Summary Cards */}
      <div className="grid grid-cols-3 gap-6">
        <RefurbishmentCard
          icon={BuildingOfficeIcon}
          title="Eligible Centers"
          count={eligibleCount}
          isSelected={selectedCard === "eligible"}
          onClick={() => onCardClick("eligible")}
        />
        <RefurbishmentCard
          icon={BuildingOfficeIcon}
          title="Refurbished Centers"
          count={lastRefurbishedCount}
          isSelected={selectedCard === "lastRefurbished"}
          onClick={() => onCardClick("lastRefurbished")}
        />
        <RefurbishmentCard
          icon={BuildingOfficeIcon}
          title="All Centers"
          count={allCentersCount}
          isSelected={selectedCard === "allCenters"}
          onClick={() => onCardClick("allCenters")}
        />
      </div>

      {/* Conditional Card Rendering (with EnhancedDataTable) */}
      {selectedCard === "eligible" && (
        <EligibleCentersCard
          table={eligibleTable}
          loading={loading}
          onCreateRequest={onCreateRequestEligible}
          onNotify={onNotifyEligible}
          formatDate={formatDate}
          filterOptions={eligibleFilterOptions}
          onExport={onExportEligible}
          onShowHistory={onShowHistory}
        />
      )}
      {selectedCard === "lastRefurbished" && (
        <LastRefurbishedCard
          table={lastRefurbishedTable}
          loading={loading}
          onViewRequest={onViewLastRefurbished}
          formatDate={formatDate}
          filterOptions={lastRefurbishedFilterOptions}
          onExport={onExportLastRefurbished}
        />
      )}
      {selectedCard === "allCenters" && (
        <AllCentersCard
          table={allCentersTable}
          loading={loading}
          onNotify={onNotifyAllCenters}
          formatDate={formatDate}
          filterOptions={allCentersFilterOptions}
          onExport={onExportAllCenters}
        />
      )}
    </div>
  );
};

export default OverviewTab;
