import React from "react";
import { Card, CardContent } from "../ui/card";

const RefurbishmentCard = ({ icon, title, count, isSelected, onClick }) => {
  const Icon = icon; // Create Icon variable for JSX usage
  return (
    <Card
      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected ? "border-2 border-green-500" : "border"
      }`}
      onClick={onClick}
    >
      <CardContent className="px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div
            className={`p-3 rounded-full ${
              isSelected ? "bg-green-100" : "bg-gray-100"
            }`}
          >
            <Icon
              className={`w-8 h-8 ${
                isSelected ? "text-green-600" : "text-gray-600"
              }`}
            />
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900">{count}</p>
          </div>
        </div>
        <div className="mt-5">
          <p className="text-xl text-gray-900 mb-1">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default RefurbishmentCard;
