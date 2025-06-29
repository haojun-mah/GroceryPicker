import React, {
  createContext,
  Dispatch,
  SetStateAction,
  useContext,
  useState,
} from 'react';
import { View, ActivityIndicator } from 'react-native';
import { 
  GroceryMetadataTitleOutput, 
  SavedGroceryList 
} from '@/app/types/interface';

interface GroceryContextType {
  // Main grocery properties
  grocery: GroceryMetadataTitleOutput[] | null;
  setGrocery: Dispatch<SetStateAction<GroceryMetadataTitleOutput[] | null>>;
  groceryListHistory: SavedGroceryList[] | null;
  setGroceryListHistory: Dispatch<SetStateAction<SavedGroceryList[] | null>>;
  refreshVersion: number;
  setRefreshVersion: Dispatch<SetStateAction<number>>;
  
  // Grocery refinement properties
  groceryRefinement: GroceryMetadataTitleOutput | null;
  setGroceryRefinement: Dispatch<SetStateAction<GroceryMetadataTitleOutput | null>>;
  groceryShop: string[];
  setGroceryShop: (shop: string[]) => void;
  
  // Loading state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  
  // Purchased state
  purchasedState: Record<string, boolean>;
  setPurchasedState: Dispatch<SetStateAction<Record<string, boolean>>>;
}

const GroceryContext = createContext<GroceryContextType | undefined>(undefined);

export const GroceryContextProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  // Main grocery state
  const [grocery, setGrocery] = useState<GroceryMetadataTitleOutput[] | null>(null);
  const [groceryListHistory, setGroceryListHistory] = useState<SavedGroceryList[] | null>(null);
  const [refreshVersion, setRefreshVersion] = useState<number>(0);
  
  // Grocery refinement state
  const [groceryRefinement, setGroceryRefinement] = useState<GroceryMetadataTitleOutput | null>(null);
  const [groceryShop, setGroceryShop] = useState<string[]>([]);
  
  // Loading state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Purchased state
  const [purchasedState, setPurchasedState] = useState<Record<string, boolean>>({});

  const value: GroceryContextType = {
    grocery,
    setGrocery,
    groceryListHistory,
    setGroceryListHistory,
    refreshVersion,
    setRefreshVersion,
    groceryRefinement,
    setGroceryRefinement,
    groceryShop,
    setGroceryShop,
    isLoading,
    setIsLoading,
    purchasedState,
    setPurchasedState,
  };

  return (
    <GroceryContext.Provider value={value}>
      {children}
      {isLoading && (
        <View 
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: 'rgba(0, 0, 0, 0.1)', // 10% opacity
            justifyContent: 'center', 
            alignItems: 'center',
            zIndex: 1000
          }}
        >
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      )}
    </GroceryContext.Provider>
  );
};

export const useGroceryContext = () => {
  const context = useContext(GroceryContext);
  if (context === undefined) {
    throw new Error(
      'useGroceryContext must be used within a GroceryContextProvider'
    );
  }
  return context;
};

// Optional: Specialized hooks for specific functionality
export const useGroceryRefinement = () => {
  const { groceryRefinement, setGroceryRefinement } = useGroceryContext();
  return { groceryRefinement, setGroceryRefinement };
};

export const useGroceryShop = () => {
  const { groceryShop, setGroceryShop } = useGroceryContext();
  return { groceryShop, setGroceryShop };
};

export const useGroceryList = () => {
  const { grocery, setGrocery } = useGroceryContext();
  return { grocery, setGrocery };
};

export const useGroceryHistory = () => {
  const { groceryListHistory, setGroceryListHistory } = useGroceryContext();
  return { groceryListHistory, setGroceryListHistory };
};

export const usePurchasedState = () => {
  const { purchasedState, setPurchasedState } = useGroceryContext();
  return { purchasedState, setPurchasedState };
};