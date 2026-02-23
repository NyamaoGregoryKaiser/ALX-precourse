```javascript
import React from 'react';

const LoadingSpinner = () => {
  return (
    <div className="flex justify-center items-center h-full w-full">
      <div
        className="animate-spin inline-block w-8 h-8 border-[3px] border-current border-t-transparent text-primary rounded-full"
        role="status"
        aria-label="loading"
      >
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
};

export default LoadingSpinner;
```