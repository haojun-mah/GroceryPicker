import { createContext, Dispatch, SetStateAction, useContext, useState } from "react";
import { ErrorResponse, GroceryMetadataTitleOutput } from "./groceryContext";

interface GroceryRefinementList {
    groceryRefinement: GroceryMetadataTitleOutput | null,
    setGroceryRefinement: Dispatch<SetStateAction<GroceryMetadataTitleOutput | null>>,
    groceryShop: string[],
    setGroceryShop: (shop: string[]) => void,
    isLoading: boolean,
    error: ErrorResponse | null;
    setIsLoading: (loading: boolean) => void;
    setError: (error: ErrorResponse | null) => void;
}

const GroceryRefinementContext = createContext<GroceryRefinementList | undefined>(undefined);

export const GroceryRefinementContextProvider: any = ({ children }: any) => {
    const [groceryRefinement, setGroceryRefinement] = useState<GroceryMetadataTitleOutput | null>(null);
    const [groceryShop, setGroceryShop] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<ErrorResponse | null>(null);

    const value : GroceryRefinementList = {
        groceryRefinement,
        setGroceryRefinement,
        groceryShop,
        setGroceryShop,
        isLoading,
        error,
        setIsLoading,
        setError,
    }
    return (
        <GroceryRefinementContext.Provider value={value}>
            {children}
        </GroceryRefinementContext.Provider>
    )
}

export const useGroceryRefinementContext = () => {
    const context = useContext(GroceryRefinementContext);
    if (context === undefined) {
        throw new Error('useGroceryRefinementContext error. Not used in grocery provider');
    }
    return context;
}