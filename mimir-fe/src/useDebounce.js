// This function is used to delay the execution of a function. We use this for selecting sites when typing in the search bar.
// It is done so that a db call isn't made with every single keystroke, avoid multiple db calls.

import { useEffect, useState } from "react";

const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timeout);
  }, [value, delay]);

  return debouncedValue;
};

export default useDebounce;