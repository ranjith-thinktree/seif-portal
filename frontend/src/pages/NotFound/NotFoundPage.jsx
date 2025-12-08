import React from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../constants";
import { Button, Card, CardContent } from "../../components/common";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

/**
 * Not Found (404) Page
 */
const NotFoundPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background-secondary px-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-secondary-500 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-foreground mb-2">404</h1>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Page Not Found
          </h2>
          <p className="text-muted-foreground mb-6">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Link to={ROUTES.DASHBOARD}>
            <Button variant="primary">Go to Dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFoundPage;
