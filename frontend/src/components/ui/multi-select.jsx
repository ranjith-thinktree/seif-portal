import React, { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "./button";
import { Badge } from "./badge";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command";
import { cn } from "../../utils/cn";

/**
 * MultiSelect Component with Search and Checkboxes
 * Modern approach using shadcn/ui components
 */
export const MultiSelect = ({
  options = [],
  selected = [],
  onChange,
  placeholder = "Select items...",
  searchPlaceholder = "Search...",
  emptyMessage = "No items found.",
  disabled = false,
  className = "",
  maxDisplay = 3,
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Get selected items details
  const selectedItems = options.filter((option) =>
    selected.includes(option.value)
  );

  // Handle selection toggle
  const handleSelect = (value) => {
    const isSelected = selected.includes(value);
    const newSelected = isSelected
      ? selected.filter((item) => item !== value)
      : [...selected, value];

    onChange(newSelected);
  };

  // Handle remove single item
  const handleRemove = (value, e) => {
    e.stopPropagation();
    const newSelected = selected.filter((item) => item !== value);
    onChange(newSelected);
  };

  // Clear all selections
  const handleClearAll = (e) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between min-h-10 h-auto",
            !selected.length && "text-muted-foreground",
            disabled && "cursor-not-allowed opacity-50",
            className
          )}
        >
          <div className="flex flex-wrap gap-1 flex-1">
            {selected.length === 0 ? (
              <span>{placeholder}</span>
            ) : (
              <>
                {selectedItems.slice(0, maxDisplay).map((item) => (
                  <Badge
                    key={item.value}
                    variant="secondary"
                    className="mr-1 mb-1"
                  >
                    {item.label}
                    <span
                      role="button"
                      tabIndex={0}
                      className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 inline-flex items-center cursor-pointer"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleRemove(item.value, e);
                        }
                      }}
                      onMouseDown={(e) => handleRemove(item.value, e)}
                      onClick={(e) => handleRemove(item.value, e)}
                    >
                      <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </span>
                  </Badge>
                ))}
                {selected.length > maxDisplay && (
                  <Badge variant="secondary" className="mb-1">
                    +{selected.length - maxDisplay} more
                  </Badge>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2 ml-2">
            {selected.length > 0 && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClearAll}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleClearAll(e);
                  }
                }}
                className="text-muted-foreground hover:text-foreground cursor-pointer inline-flex items-center"
              >
                <X className="h-4 w-4" />
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {options.map((option) => {
                const isSelected = selected.includes(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => handleSelect(option.value)}
                    className="cursor-pointer"
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <Check className="h-4 w-4" />
                    </div>
                    <span>{option.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
