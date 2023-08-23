import React, { useContext, useState, useEffect, useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useParams } from "react-router-dom";
import useWebSocket, { ReadyState } from "react-use-websocket";
import InfiniteScroll from "react-infinite-scroll-component";
import { AuthContext } from "../contexts/AuthContext";
import { MessageModel } from "../models/Message";
import { Message } from "./Message";
import { ChatLoader } from "./ChatLoader";
import { ConversationModel } from '../models/Conversation';

export function Chat() {
    const [page, setPage] = useState(2);
    const [hasMoreMessages, setHasMoreMessages] = useState(false);
    const [participants, setParticipants] = useState<string[]>([]);
    const [conversation, setConversation] = useState<ConversationModel | null>(null);
    const [meTyping, setMeTyping] = useState(false);
    const [typing, setTyping] = useState(false);

    const { conversationName } = useParams();
    const [welcomeMessage, setWelcomeMessage] = useState("");
    const [messageHistory, setMessageHistory] = useState<any>([]);
    const [message, setMessage] = useState("");
    const [name, setName] = useState("");
    const { user } = useContext(AuthContext);
    const timeout = useRef<any>();

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
                        setHasMoreMessages(data.has_more);
                        break;
                    case "user_join":
                        setParticipants((pcpts: string[]) => {
                            if (pcpts.includes(data.user)) {
                                return [...pcpts, data.user];
                            }
                            return pcpts;
                        });
                        break;
                    case "user_leave":
                        setParticipants((pcpts: string[]) => {
                            const newPcpts = pcpts.filter((x) => x !== data.user);
                            return newPcpts;
                        });
                        break;
                    case "online_user_list":
                        setParticipants(data.users);
                        break;
                    case 'typing':
                        updateTyping(data);
                        break;
                    default:
                        console.error("Unknown message type!");
                        break;
                }
            }
        }
    );

    useEffect(() => {
        async function fetchConversation() {
            const apiRes = await fetch(`http://127.0.0.1:8000/api/conversations/${conversationName}/`, {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: `Token ${user?.token}`
                }
            });
            if (apiRes.status === 200) {
                const data: ConversationModel = await apiRes.json();
                setConversation(data);
            }
        }
        fetchConversation();
    }, [conversationName, user])


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
        onType();
    }

    // function handleChangeName(e: any) {
    //     setName(e.target.value);
    // }

    const handleSubmit = () => {
        if (message.length === 0) return;
        if (message.length > 512) return;
        sendJsonMessage({
            type: "chat_message",
            message,
            name
        });
        setName("");
        setMessage("");
        clearTimeout(timeout.current);
        timeoutFunction();
    };
    const inputReference: any = useHotkeys(
        "enter",
        () => {
            handleSubmit();
        },
        {
            enableOnFormTags: ["INPUT"]
        }
    );

    useEffect(() => {
        (inputReference.current as HTMLElement).focus();
    }, [inputReference])

    function timeoutFunction() {
        setMeTyping(false);
        sendJsonMessage({ type: "typing", typing: false });
    }

    function onType() {
        if (meTyping === false) {
            setMeTyping(true);
            sendJsonMessage({ type: "typing", typing: true });
            timeout.current = setTimeout(timeoutFunction, 5000);
        } else {
            clearTimeout(timeout.current);
            timeout.current = setTimeout(timeoutFunction, 500);
        }
    }

    useEffect(() => () => clearTimeout(timeout.current), []);

    function updateTyping(event: { user: string; typing: boolean }) {
        if (event.user !== user!.username) {
            setTyping(event.typing);
        }
    }

    return (
        <div>
            <span>The WebSocket is currently {connectionStatus}</span>
            <p>{welcomeMessage}</p>
            {
                conversation && (
                    <div className="py-6">
                        <h3 className="text-3xl font-semibold text-gray-900">
                            Chat with user: {conversation.other_user.username}
                        </h3>
                        <span className="text-sm">
                            {conversation.other_user.username} is currently
                            {participants.includes(conversation.other_user.username) ? " online" : " offline"}
                        </span>
                        {
                            typing && <p className="truncate text-sm text-gray-500">typing...</p>
                        }
                    </div>
                )
            }
            <div className="flex w-full items-center justify-between border border-gray-200 p-3">
                <input
                    type="text"
                    placeholder="Message"
                    className="block w-full rounded-full bg-gray-100 py-2 outline-none focus:text-gray-700"
                    name="message"
                    value={message}
                    onChange={handleChangeMessage}
                    required
                    ref={inputReference}
                    maxLength={511}
                />
                <button className="ml-3 bg-gray-300 px-3 py-1" onClick={handleSubmit}>
                    Submit
                </button>
            </div>
            <hr />
            <ul className="relative flex flex-col-reverse w-full p-6 mt-3 overflow-y-auto border border-gray-200">
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
                    <div className="px-3 py-3 border border-gray-200" key={idx}>
                        {message.from_user.username}: {message.content}
                    </div>
                ))}
            </ul> */}
        </div>
    );
}
