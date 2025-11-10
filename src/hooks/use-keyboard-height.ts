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
      
      setKeyboardHeight(heightDiff > 150 ? heightDiff + accessoryOffset : 0);
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
