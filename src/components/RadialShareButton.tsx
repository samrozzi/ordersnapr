import { useState, useEffect, useRef } from "react";
import { Share2, FileDown, Mail, Download, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface RadialShareButtonProps {
  onGeneratePDF: () => void;
  onSendEmail: () => void;
  onSaveFiles: () => void;
  onEmailDraft: () => void;
}

export const RadialShareButton = ({
  onGeneratePDF,
  onSendEmail,
  onSaveFiles,
  onEmailDraft,
}: RadialShareButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const menuItems = [
    { icon: FileDown, label: "PDF", onClick: onGeneratePDF, position: -90 },
    { icon: Send, label: "Email", onClick: onSendEmail, position: 0 },
    { icon: Download, label: "Save", onClick: onSaveFiles, position: 180 },
    { icon: Mail, label: "Draft", onClick: onEmailDraft, position: 90 },
  ];

  const handleItemClick = (onClick: () => void) => {
    onClick();
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Main circular button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground",
          "shadow-lg hover:shadow-xl transition-all duration-300",
          "flex items-center justify-center",
          isOpen && "scale-95"
        )}
      >
        <Share2 className={cn(
          "w-6 h-6 transition-transform duration-300",
          isOpen && "rotate-90"
        )} />
      </button>

      {/* Radial menu items */}
      {menuItems.map((item, index) => {
        const angle = (item.position * Math.PI) / 180;
        const radius = 50;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        return (
          <button
            key={index}
            onClick={() => handleItemClick(item.onClick)}
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
              "w-10 h-10 rounded-full bg-secondary text-secondary-foreground",
              "shadow-md hover:shadow-lg hover:scale-110",
              "flex items-center justify-center",
              "transition-all duration-300 ease-out",
              "group",
              !isOpen && "scale-0 opacity-0 pointer-events-none"
            )}
            style={{
              transform: isOpen
                ? `translate(${x}px, ${y}px)`
                : "translate(-50%, -50%) scale(0)",
              transitionDelay: isOpen ? `${index * 50}ms` : "0ms",
            }}
          >
            <item.icon className="w-4 h-4" />
            
            {/* Label - always visible */}
            <span className={cn(
              "absolute whitespace-nowrap bg-background/95 backdrop-blur-sm text-foreground text-[10px] font-medium",
              "px-1.5 py-0.5 rounded border border-border shadow-sm",
              "pointer-events-none z-50 transition-opacity duration-300",
              isOpen ? "opacity-100" : "opacity-0",
              item.position === -90 && "bottom-full mb-1",
              item.position === 0 && "left-full ml-1",
              item.position === 180 && "top-full mt-1",
              item.position === 90 && "right-full mr-1"
            )}>
              {item.label}
            </span>
          </button>
        );
      })}

      {/* Backdrop overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
};
