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
    { icon: FileDown, label: "Generate PDF", onClick: onGeneratePDF, position: 0 },
    { icon: Send, label: "Send Email", onClick: onSendEmail, position: 90 },
    { icon: Download, label: "Save Files", onClick: onSaveFiles, position: 180 },
    { icon: Mail, label: "Email Draft", onClick: onEmailDraft, position: 270 },
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
        const radius = 80;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        return (
          <button
            key={index}
            onClick={() => handleItemClick(item.onClick)}
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
              "w-12 h-12 rounded-full bg-secondary text-secondary-foreground",
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
            <item.icon className="w-5 h-5" />
            
            {/* Tooltip */}
            <span className={cn(
              "absolute whitespace-nowrap bg-popover text-popover-foreground text-xs",
              "px-2 py-1 rounded shadow-lg",
              "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
              "pointer-events-none z-50",
              item.position === 0 && "bottom-full mb-2",
              item.position === 90 && "left-full ml-2",
              item.position === 180 && "top-full mt-2",
              item.position === 270 && "right-full mr-2"
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
