import React, { useContext, useState, Dispatch, SetStateAction } from 'react';
import { SavedGroceryList, GroceryMetadataTitleOutput } from '@/app/(tabs)/interface';

export interface ErrorResponse {
  statusCode: number;
  message: string;
  details?: string;
}

interface GroceryContextType {
  grocery: GroceryMetadataTitleOutput[] | null;
  setGrocery: Dispatch<SetStateAction<GroceryMetadataTitleOutput[] | null>>;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  groceryListHistory: SavedGroceryList[] | null;
  setGroceryListHistory: Dispatch<SetStateAction<SavedGroceryList[] | null>>;
}


const GroceryContext = React.createContext<GroceryContextType | undefined>(
  undefined,
); // necessary to pass types to createcontext so that the handler of context can know what to expect

export const GroceryContextProvider: any = ({ children }: any) => {
  const [grocery, setGrocery] = useState<GroceryMetadataTitleOutput[] | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<ErrorResponse | null>(null);
  const [groceryListHistory, setGroceryListHistory] = useState<
    SavedGroceryList[] | null>(null);

  const value: GroceryContextType = {
    grocery,
    setGrocery,
    isLoading,
    setIsLoading,
    groceryListHistory,
    setGroceryListHistory,
  };

  return (
    <GroceryContext.Provider value={value}>{children}</GroceryContext.Provider>
  );
};

export const useGroceryContext = () => {
  const context = useContext(GroceryContext);
  if (context === undefined) {
    throw new Error('useGrocerycontext error. Not used in a grocery provider');
  }
  return context;
};





