import React, { useContext, useState } from "react";
import { useParams } from "react-router-dom";
import useWebSocket, { ReadyState } from "react-use-websocket";
import InfiniteScroll from "react-infinite-scroll-component";
import { AuthContext } from "../contexts/AuthContext";
import { MessageModel } from "../models/Message";
import { Message } from "./Message";
import { ChatLoader } from "./ChatLoader";

export function Chat() {
    const [page, setPage] = useState(2);
    const [hasMoreMessages, setHasMoreMessages] = useState(false);
    const { conversationName } = useParams();
    const [welcomeMessage, setWelcomeMessage] = useState("");
    const [messageHistory, setMessageHistory] = useState<any>([]);
    const [message, setMessage] = useState("");
    const [name, setName] = useState("");
    const { user } = useContext(AuthContext);

    const { readyState, sendJsonMessage } = useWebSocket(
        user ? `ws://127.0.0.1:8000/${conversationName}/` : null,
        {
            queryParams: {
                token: user ? user.token : "",
            },
            onOpen: () => {
                console.log("Connected!");
            },
            onClose: () => {
                console.log("Disconnected!");
            },
            // onMessage handler
            onMessage: (e) => {
                const data = JSON.parse(e.data);
                switch (data.type) {
                    case "welcome_message":
                        setWelcomeMessage(data.message);
                        break;
                    case "chat_message_echo":
                        setMessageHistory((prev: any) => [data.message, ...prev]);
                        break;
                    case "last_50_messages":
                        setMessageHistory(data.messages);
                        break;
                    default:
                        console.error("Unknown message type!");
                        break;
                }
            }
        }
    );

    async function fetchMessages() {
        const apiRes = await fetch(
            `http://127.0.0.1:8000/api/messages/?conversation=${conversationName}&page=${page}`,
            {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${user?.token}`
                }
            }
        );
        if (apiRes.status === 200) {
            const data: {
                count: number;
                next: string | null; // URL
                previous: string | null; // URL
                results: MessageModel[];
            } = await apiRes.json();
            setHasMoreMessages(data.next !== null);
            setPage(page + 1);
            setMessageHistory((prev: MessageModel[]) => prev.concat(data.results));
        }
    }

    const connectionStatus = {
        [ReadyState.CONNECTING]: "Connecting",
        [ReadyState.OPEN]: "Open",
        [ReadyState.CLOSING]: "Closing",
        [ReadyState.CLOSED]: "Closed",
        [ReadyState.UNINSTANTIATED]: "Uninstantiated"
    }[readyState];

    function handleChangeMessage(e: any) {
        setMessage(e.target.value);
    }

    // function handleChangeName(e: any) {
    //     setName(e.target.value);
    // }

    const handleSubmit = () => {
        sendJsonMessage({
            type: "chat_message",
            message,
            name
        });
        setName("");
        setMessage("");
    };

    return (
        <div>
            <span>The WebSocket is currently {connectionStatus}</span>
            <p>{welcomeMessage}</p>
            {/* <input
                name="name"
                placeholder="Name"
                onChange={handleChangeName}
                value={name}
                className="shadow-sm sm:text-sm border-gray-300 bg-gray-100 rounded-md"
            /> */}
            <input
                name="message"
                placeholder="Message"
                onChange={handleChangeMessage}
                value={message}
                className="ml-2 shadow-sm sm:text-sm border-gray-300 bg-gray-100 rounded-md"
            />
            <button
                className="ml-3 bg-gray-300 px-3 py-1"
                onClick={handleSubmit}
            >
                Submit
            </button>
            <hr />
            <ul className="mt-3 flex flex-col-reverse relative w-full border border-gray-200 overflow-y-auto p-6">
                <div
                    id="scrollableDiv"
                    className="h-[20rem] mt-3 flex flex-col-reverse relative w-full border border-gray-200 overflow-y-auto p-6"
                >
                    <div>
                        {/* Put the scroll bar always on the bottom */}
                        <InfiniteScroll
                            dataLength={messageHistory.length}
                            next={fetchMessages}
                            className="flex flex-col-reverse" // To put endMessage and loader to the top
                            inverse={true}
                            hasMore={hasMoreMessages}
                            loader={<ChatLoader />}
                            scrollableTarget="scrollableDiv"
                        >
                            {messageHistory.map((message: MessageModel) => (
                                <Message key={message.id} message={message} />
                            ))}
                        </InfiniteScroll>
                    </div>
                </div>
                {/* {messageHistory.map((message: MessageModel) => (
                    <Message key={message.id} message={message} />
                ))} */}
            </ul>
            {/* <ul>
                {messageHistory.map((message: any, idx: number) => (
                    <div className="border border-gray-200 py-3 px-3" key={idx}>
                        {message.from_user.username}: {message.content}
                    </div>
                ))}
            </ul> */}
        </div>
    );
}
