import { useEffect, useCallback, useRef } from 'react';

export const useAutoSave = (data, saveFunction, interval = 30000, enabled = true) => {
  const timeoutRef = useRef(null);
  const lastSavedRef = useRef(null);

  const save = useCallback(async () => {
    if (!enabled) return;
    
    try {
      await saveFunction(data);
      lastSavedRef.current = new Date();
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, [data, saveFunction, enabled]);

  useEffect(() => {
    if (!enabled) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(save, interval);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, save, interval, enabled]);

  return {
    lastSaved: lastSavedRef.current,
    saveNow: save,
  };
};