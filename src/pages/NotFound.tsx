import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { NavigationHeader } from "@/components/ui/navigation-header";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader 
        title="Page Not Found" 
        subtitle="The page you're looking for doesn't exist"
      />
      
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="h-12 w-12 text-red-600" />
          </div>
          <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Oops! Page not found</h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            The page you're looking for doesn't exist. It might have been moved, deleted, or you entered the wrong URL.
          </p>
          <div className="space-y-4">
            <Button 
              onClick={() => window.history.back()} 
              variant="outline"
              className="mr-4"
            >
              Go Back
            </Button>
            <Button 
              onClick={() => window.location.href = '/'}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            >
              Return to Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;