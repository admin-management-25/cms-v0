import React from "react";
import { MapPin, Building2, Map, X } from "lucide-react";

const ActionPopup = ({
  isOpen,
  position,
  onClose,
  onAddLocation,
  onAddHub,
  onAddArea,
}) => {
  if (!isOpen) return null;

  const actions = [
    {
      icon: MapPin,
      label: "Add Location",
      color: "bg-blue-500 hover:bg-blue-600",
      onClick: onAddLocation,
    },
    {
      icon: Building2,
      label: "Add Hub",
      color: "bg-purple-500 hover:bg-purple-600",
      onClick: onAddHub,
    },
    {
      icon: Map,
      label: "Add Area",
      color: "bg-green-500 hover:bg-green-600",
      onClick: onAddArea,
    },
  ];

  // Calculate positions in a semi-circle (rainbow) above the clicked point
  const radius = 55;
  const startAngle = 155;
  const endAngle = 25;
  const angleStep = (startAngle - endAngle) / (actions.length - 1);

  // Calculate center of the arc for close button
  const centerAngle = (startAngle + endAngle) / 2;
  const centerRadian = (centerAngle * Math.PI) / 180;
  const closeButtonX = radius * Math.cos(centerRadian);
  const closeButtonY = -radius * Math.sin(centerRadian);

  return (
    <>
      {/* Backdrop overlay */}
      <div className="fixed inset-0 z-[999]" onClick={onClose} />

      {/* Main popup container - Fixed positioning relative to viewport */}
      <div
        className="fixed z-[1000] pointer-events-none"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        {/* Center point indicator with pulsing animation */}
        <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            {/* Pulsing rings */}
            <div className="absolute inset-0 animate-ping">
              <div className="w-3 h-3 rounded-full bg-blue-400 opacity-75" />
            </div>
            <div className="relative w-3 h-3 rounded-full bg-blue-500 shadow-lg" />
          </div>
        </div>

        {/* Action buttons in rainbow arc */}
        {actions.map((action, index) => {
          const angle = startAngle - angleStep * index;
          const radian = (angle * Math.PI) / 180;
          const x = radius * Math.cos(radian);
          const y = -radius * Math.sin(radian);

          return (
            <div
              key={index}
              className="absolute pointer-events-auto animate-scale-in"
              style={{
                left: `${x}px`,
                top: `${y}px`,
                animationDelay: `${index * 50}ms`,
                animationFillMode: "both",
              }}
            >
              <div className="relative -translate-x-1/2 -translate-y-1/2 group">
                {/* Button */}
                <button
                  onClick={action.onClick}
                  className={`${action.color} w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95`}
                >
                  <action.icon className="w-5 h-5 text-white" />
                </button>

                {/* Label tooltip - Now showing above */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                  <div className="bg-gray-900 text-white text-[10px] font-medium px-2 py-1 rounded-md whitespace-nowrap shadow-lg">
                    {action.label}
                    {/* Arrow pointing down */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[3px] border-t-gray-900" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Close button at the center of the arc */}
        <div
          className="absolute pointer-events-auto animate-scale-in"
          style={{
            left: `${closeButtonX - 6.5}px`,
            top: `${closeButtonY + 36}px`,
            animationDelay: "150ms",
            animationFillMode: "both",
          }}
        >
          <button
            onClick={onClose}
            className="w-8 h-8 -translate-x-1/2 -translate-y-1/2 bg-gray-800/90 hover:bg-gray-900 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95 border border-white/20"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Add custom CSS animation */}
      <style>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        .animate-scale-in {
          animation: scale-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
      `}</style>
    </>
  );
};

export default ActionPopup;
