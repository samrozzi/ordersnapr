import { useState, useEffect } from "react";

export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const visualViewport = window.visualViewport;
    
    if (!visualViewport) {
      return;
    }

    const handleResize = () => {
      const currentHeight = window.innerHeight;
      const viewportHeight = visualViewport.height;
      const heightDiff = currentHeight - viewportHeight;
      
      // If difference > 150px, keyboard is likely open
      // Add extra offset for iOS keyboard accessory view
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const accessoryOffset = isIOS ? 50 : 0;
      
      // Round to nearest 10px to reduce jitter from iOS predictive bar
      const newHeight = heightDiff > 150 ? Math.round((heightDiff + accessoryOffset) / 10) * 10 : 0;
      
      // Only update if change is significant (> 15px) to reduce jitter
      setKeyboardHeight(prev => Math.abs(newHeight - prev) > 15 ? newHeight : prev);
    };

    visualViewport.addEventListener('resize', handleResize);
    visualViewport.addEventListener('scroll', handleResize);
    
    // Initial check
    handleResize();

    return () => {
      visualViewport.removeEventListener('resize', handleResize);
      visualViewport.removeEventListener('scroll', handleResize);
    };
  }, []);

  return keyboardHeight;
}
