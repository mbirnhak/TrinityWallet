import { useEffect, useCallback, useReducer } from 'react';
import * as SecureStore from 'expo-secure-store';

type UseStateHook<T> = [T, (value: T) => void];

function useAsyncState<T>(initialValue: T): UseStateHook<T> {
  return useReducer(
    (state: T, action: T): T => action,
    initialValue
  ) as UseStateHook<T>;
}

export async function setStorageItemAsync(key: string, value: string | null) {
  if (value === null) {
    await SecureStore.deleteItemAsync(key);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

export function useStorageState<T>(key: string, defaultValue: T): UseStateHook<T> {
  // Public
  const [state, setState] = useAsyncState<T>(defaultValue);

  // Get
  useEffect(() => {
    SecureStore.getItemAsync(key).then(value => {
      if (value === null) {
        setState(defaultValue);
      } else {
        try {
          setState(JSON.parse(value));
        } catch (error) {
          console.error("Failed to parse stored value", error);
          setState(defaultValue);
        }
      }
    });
  }, [key, defaultValue]);

  // Set
  const setValue = useCallback(
    (value: T) => {
      const valueToStore = JSON.stringify(value);
      setState(value);
      setStorageItemAsync(key, valueToStore);
    },
    [key]
  );

  return [state, setValue];
}