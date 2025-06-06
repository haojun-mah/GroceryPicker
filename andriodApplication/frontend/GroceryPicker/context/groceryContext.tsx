import React, { useContext, useState } from "react";

interface ErrorResponse {
  statusCode: number;
  message: string;
  details?: string; 
}

interface GroceryContextType {
  grocery: GroceryItem[][] | null;
  setGrocery: (grocery: GroceryItem[][] | null) => void; // defining types for parameter and return
  isLoading: boolean;
  error: ErrorResponse | null;
  setIsLoading: (loading: boolean) => void;
  setError: (error: ErrorResponse | null) => void;
}

export interface GroceryItem {
    "name" : string;
    "quantity" : number;
    "unit" : string;
}

const GroceryContext = React.createContext<GroceryContextType | undefined>(undefined); // necessary to pass types to createcontext so that the handler of context can know what to expect

export const GroceryContextProvider: any = ({children}: any) => {
    const [grocery, setGrocery] = useState<GroceryItem[][] | null>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<ErrorResponse | null>(null);


    const value: GroceryContextType = {
        grocery,
        setGrocery,
        isLoading,
        setIsLoading,
        error,
        setError,
    }

    return (
        <GroceryContext.Provider value={value}>
            {children}
        </GroceryContext.Provider>
    );
}

export const useGroceryContext = () => {
    const context = useContext(GroceryContext);
    if (context === undefined) {
        throw new Error('useGrocerycontext error. Not used in a grocery provider');
    }
    return context;
}




