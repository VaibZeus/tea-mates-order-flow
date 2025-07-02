import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Home, Coffee } from 'lucide-react';
import { Button } from './button';

interface NavigationHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  showHomeButton?: boolean;
  customBackAction?: () => void;
  children?: React.ReactNode;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  title,
  subtitle,
  showBackButton = true,
  showHomeButton = true,
  customBackAction,
  children
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (customBackAction) {
      customBackAction();
    } else {
      // Check if there's history to go back to
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/');
      }
    }
  };

  const handleHome = () => {
    navigate('/');
  };

  // Don't show navigation on home page
  const isHomePage = location.pathname === '/';

  return (
    <header className="bg-white/90 backdrop-blur-sm shadow-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Navigation Buttons */}
            {!isHomePage && (
              <div className="flex items-center space-x-2">
                {showBackButton && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBack}
                    className="p-2 hover:bg-gray-100"
                    title="Go back"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                )}
                {showHomeButton && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleHome}
                    className="p-2 hover:bg-gray-100"
                    title="Go to home"
                  >
                    <Home className="h-5 w-5" />
                  </Button>
                )}
              </div>
            )}

            {/* Logo and Title */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center">
                <Coffee className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{title}</h1>
                {subtitle && (
                  <p className="text-sm text-gray-600">{subtitle}</p>
                )}
              </div>
            </div>
          </div>

          {/* Custom content (like search, buttons, etc.) */}
          {children && (
            <div className="flex items-center space-x-4">
              {children}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};