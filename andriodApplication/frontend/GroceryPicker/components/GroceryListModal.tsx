import { Modal, View, Pressable, Dimensions } from "react-native";
import { Text } from "./ui/text";
import { useEffect, useState } from "react";
import { useSession } from "@/context/authContext";
import { useGroceryContext } from "@/context/groceryContext";
import { backend_url } from "@/lib/api";


export const GroceryListModal = ({
  isOpen,
  onClose,
  id,
}: {
  isOpen: boolean;
  onClose: () => void;
  id: string;
}) => {
    // Session Token & Grocery Context 
    const { session } = useSession();
    const { groceryListHistory, refreshVersion, setRefreshVersion } = useGroceryContext();

    // Obtain dimension of user screen
    const { width, height } = Dimensions.get("window");

    const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);
    const [currentListStatus, setCurrentListStatus] = useState<string>("");
   
   // populate current list status 
   useEffect(() => {
    if (!groceryListHistory) return;

    const currentStatus = groceryListHistory.find((list) => list.list_id === id)?.list_status;

    if (!currentStatus) return;

  setCurrentListStatus(currentStatus);
}, [id, groceryListHistory]);

    // Handle Update in general
    const handleUpdate = async (action : string) => {
        // Obtain current list status
        if (!groceryListHistory) return null;

        const currentStatus = groceryListHistory.find(list => list.list_id === id)?.list_status;

        if (!currentStatus) return null;

        setCurrentListStatus(currentStatus);

        // Create req package
        let req;
        if (action === 'delete') {
            req = [{
                list_id: id,
                list_status: 'deleted',
        }];
        } else if (action === 'purchased') {
            req = [{
                    list_id: id,
                    list_status: currentListStatus === 'purchased' ? 'incomplete' : 'purchased',
            }]
        } else if (action === 'archived') {
            req = [{
                list_id: id,
                list_status: currentListStatus === 'archived' ? 'incomplete' : 'archived',
            }]
        } else {
            console.log("Invalid package setting for modal");
            return;
        }
       
        const response = await fetch(`${backend_url}/lists/update`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${session?.access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(req),
        });    

        // Res Validation
        const output = await response.json();

        if (output.name === "ControllerError") {
            console.log("Delete failed. ");
            console.log(output.statusCode, output.message, output.details);
        } else {
            console.log(output.message, output.details); // debug. Msg for successful
            setRefreshVersion(refreshVersion + 1);
            setIsConfirmOpen(false);
            onClose();
        }
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
                <Pressable className="items-center" onPress={() => handleUpdate("purchased")}>
                    {currentListStatus === 'purchased' ?
                    <Text className="text-black dark:text-white">Unmark as Completed</Text>
                    :
                    <Text className="text-black dark:text-white">Mark as Completed</Text>
}
                </Pressable>

                <View className="flex-1 justify-center items-center w-full">
                    <Pressable className="items-center" onPress={() => handleUpdate("archived")}>
                        { currentListStatus === 'archived' ?
                         <Text className="text-black dark:text-white">Unhide list</Text>
                    :

                        <Text className="text-black dark:text-white">Hide List</Text>
                    }
                    </Pressable>
                </View>

                <Pressable className="items-center" onPress={() => handleUpdate("deleted")}>
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
              onPress={() => {
                handleUpdate("deleted");
            }}
            >
              <Text className="text-red-500 font-semibold">Confirm</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>     
    </View>
  );
};
