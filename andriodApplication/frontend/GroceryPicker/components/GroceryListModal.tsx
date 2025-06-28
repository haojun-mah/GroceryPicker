import { Modal, View, Pressable, Dimensions } from "react-native";
import { Text } from "./ui/text";
import { useState } from "react";

export const GroceryListModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
    // Obtain dimension of user screen
    const { width, height } = Dimensions.get("window");
    const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);

    const handleDeleteConfirm = () => {
        return;
    }
    return (
    <View>
        <Modal
        visible={isOpen}
        animationType="fade"
        transparent
        onRequestClose={onClose}
        >
        <Pressable
            onPress={onClose}
            className="w-full flex-1 justify-center items-center bg-black/50"
        >
            <View 
            className="bg-white dark:bg-gray-500 rounded-lg p-5 flex-col justify-between items-center"
            // stylesheets used instead of nativewind for granular styling control
            style={{
            width: width * 0.2,
            height: height * 0.3
            }}>
                <Pressable className="items-center">
                    <Text className="text-black dark:text-white">Mark as Completed</Text>
                </Pressable>

                <View className="flex-1 justify-center items-center w-full">
                    <Pressable className="items-center">
                    <Text className="text-black dark:text-white">Hide List</Text>
                    </Pressable>
                </View>

                <Pressable className="items-center" onPress={() => {
                    onClose();                  
                    setIsConfirmOpen(true);
                    }}>
                    <Text className="text-red-500">Delete List</Text>
                </Pressable>
            </View>
        </Pressable>
        </Modal>

        {/* Secondary Modal for Delete Option. This modal double confirms user intent to delete list*/}
              <Modal
        visible={isConfirmOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setIsConfirmOpen(false)}
      >
        <Pressable
          onPress={() => setIsConfirmOpen(false)}
          className="w-full flex-1 justify-center items-center bg-black/50"
        >
          <View
            className="bg-white dark:bg-gray-700 rounded-lg p-5 items-center"
            style={{
              width: width * 0.3,
              height: height * 0.25,
            }}
          >
            <Text className="text-lg text-black dark:text-white font-bold mb-4 text-center">
              Delete Grocery List?
            </Text>
            <Text className="text-sm text-gray-700 dark:text-gray-300 mb-6 text-center">
              You cannot revert this action after deletion.
            </Text>
            <Pressable
              className="px-4 py-2 rounded"
              onPress={handleDeleteConfirm}
            >
              <Text className="text-red-500 font-semibold">Confirm</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>     
    </View>
  );
};
