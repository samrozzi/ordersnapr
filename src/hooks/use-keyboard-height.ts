import { useState, useEffect, useRef } from "react";

export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const visualViewport = window.visualViewport;
    
    if (!visualViewport) {
      return;
    }

    const handleResize = () => {
      // Debounce to prevent rapid updates
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        const currentHeight = window.innerHeight;
        const viewportHeight = visualViewport.height;
        const heightDiff = currentHeight - viewportHeight;
        
        // If difference > 150px, keyboard is likely open
        setKeyboardHeight(heightDiff > 150 ? heightDiff : 0);
      }, 50);
    };

    visualViewport.addEventListener('resize', handleResize);
    visualViewport.addEventListener('scroll', handleResize);
    
    // Initial check
    handleResize();

    return () => {
      visualViewport.removeEventListener('resize', handleResize);
      visualViewport.removeEventListener('scroll', handleResize);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return keyboardHeight;
}
