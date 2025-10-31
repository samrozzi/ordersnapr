export const ThemedLightningBolt = () => {
  return (
    <svg 
      width="14" 
      height="42" 
      viewBox="0 0 14 42" 
      className="absolute z-20 pointer-events-none transition-opacity duration-300"
      style={{ 
        top: '50%', 
        left: '29%', 
        transform: 'translate(-50%, -50%)' 
      }}
    >
      <path 
        d="M7 0L2 16H7L4 28L12 12H7L7 0Z" 
        className="fill-primary transition-colors duration-300"
      />
    </svg>
  );
};
