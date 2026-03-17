import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import {
  MessageSquare,
  Users,
  UserPlus,
  LogOut,
  Send,
  Plus,
  Bell,
  Check,
  X,
} from "lucide-react";

interface User {
  id: string;
  email: string;
  name: string;
  avatarColor: string;
}

interface Friend extends User {}

interface Group {
  id: string;
  name: string;
  createdBy: string;
  members: string[];
  createdAt: number;
}

interface Message {
  id: string;
  from: string;
  to: string;
  text: string;
  timestamp: number;
  read: boolean;
  sender?: User;
}

interface FriendRequest {
  id: string;
  from: string;
  to: string;
  status: string;
  timestamp: number;
  sender?: User;
}

export function Chat() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedChat, setSelectedChat] = useState<{
    type: "dm" | "group";
    id: string;
    name: string;
  } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [newFriendEmail, setNewFriendEmail] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const accessToken = localStorage.getItem("accessToken");

  useEffect(() => {
    if (!accessToken) {
      navigate("/");
      return;
    }

    fetchCurrentUser();
    fetchFriends();
    fetchGroups();
    fetchFriendRequests();
  }, []);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 2000); // Poll every 2 seconds
      return () => clearInterval(interval);
    }
  }, [selectedChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-81e39e7b/me`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const data = await response.json();
      if (data.user) {
        setCurrentUser(data.user);
      }
    } catch (error) {
      console.error("Error fetching current user:", error);
    }
  };

  const fetchFriends = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-81e39e7b/friends`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const data = await response.json();
      if (data.friends) {
        setFriends(data.friends);
      }
    } catch (error) {
      console.error("Error fetching friends:", error);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-81e39e7b/groups`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const data = await response.json();
      if (data.groups) {
        setGroups(data.groups);
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  };

  const fetchFriendRequests = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-81e39e7b/friend-requests`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const data = await response.json();
      if (data.requests) {
        setFriendRequests(data.requests);
      }
    } catch (error) {
      console.error("Error fetching friend requests:", error);
    }
  };

  const fetchMessages = async () => {
    if (!selectedChat) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-81e39e7b/messages/${selectedChat.type}/${selectedChat.id}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const data = await response.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedChat) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-81e39e7b/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            to: selectedChat.id,
            text: messageText,
            type: selectedChat.type,
          }),
        }
      );

      if (response.ok) {
        setMessageText("");
        fetchMessages();
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const sendFriendRequest = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-81e39e7b/friend-request`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ toEmail: newFriendEmail }),
        }
      );

      const data = await response.json();
      if (response.ok) {
        setNewFriendEmail("");
        setShowAddFriend(false);
        alert("Friend request sent!");
      } else {
        alert(data.error || "Failed to send friend request");
      }
    } catch (error) {
      console.error("Error sending friend request:", error);
    }
  };

  const handleFriendRequest = async (requestId: string, action: "accept" | "reject") => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-81e39e7b/friend-request/${requestId}/${action}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (response.ok) {
        fetchFriendRequests();
        fetchFriends();
      }
    } catch (error) {
      console.error("Error handling friend request:", error);
    }
  };

  const createGroup = async () => {
    if (!newGroupName.trim()) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-81e39e7b/groups`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            name: newGroupName,
            memberIds: selectedMembers,
          }),
        }
      );

      if (response.ok) {
        setNewGroupName("");
        setSelectedMembers([]);
        setShowCreateGroup(false);
        fetchGroups();
      }
    } catch (error) {
      console.error("Error creating group:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    navigate("/");
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-indigo-600" />
              <h1 className="text-xl font-bold">ChatApp</h1>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
          {currentUser && (
            <div className="flex items-center gap-2">
              <Avatar>
                <AvatarFallback style={{ backgroundColor: currentUser.avatarColor }}>
                  {currentUser.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{currentUser.name}</p>
                <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-b flex gap-2">
          <Dialog open={showAddFriend} onOpenChange={setShowAddFriend}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1">
                <UserPlus className="w-4 h-4 mr-2" />
                Add Friend
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Friend</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Friend's Email</Label>
                  <Input
                    type="email"
                    placeholder="friend@example.com"
                    value={newFriendEmail}
                    onChange={(e) => setNewFriendEmail(e.target.value)}
                  />
                </div>
                <Button onClick={sendFriendRequest} className="w-full">
                  Send Request
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1">
                <Plus className="w-4 h-4 mr-2" />
                New Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Group</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Group Name</Label>
                  <Input
                    placeholder="My Group"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Add Members</Label>
                  <ScrollArea className="h-40 border rounded-md p-2 mt-2">
                    {friends.map((friend) => (
                      <div
                        key={friend.id}
                        className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        onClick={() => {
                          setSelectedMembers((prev) =>
                            prev.includes(friend.id)
                              ? prev.filter((id) => id !== friend.id)
                              : [...prev, friend.id]
                          );
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(friend.id)}
                          readOnly
                        />
                        <Avatar className="w-8 h-8">
                          <AvatarFallback style={{ backgroundColor: friend.avatarColor }}>
                            {friend.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{friend.name}</span>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
                <Button onClick={createGroup} className="w-full">
                  Create Group
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Friend Requests */}
        {friendRequests.length > 0 && (
          <div className="p-4 border-b">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between"
              onClick={() => setShowRequests(!showRequests)}
            >
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Friend Requests
              </div>
              <Badge variant="destructive">{friendRequests.length}</Badge>
            </Button>
            {showRequests && (
              <div className="mt-2 space-y-2">
                {friendRequests.map((request) => (
                  <Card key={request.id} className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback
                          style={{ backgroundColor: request.sender?.avatarColor }}
                        >
                          {request.sender?.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{request.sender?.name}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="flex-1"
                        onClick={() => handleFriendRequest(request.id, "accept")}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleFriendRequest(request.id, "reject")}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Decline
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chats List */}
        <Tabs defaultValue="friends" className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-2">
            <TabsTrigger value="friends" className="flex-1">
              Friends
            </TabsTrigger>
            <TabsTrigger value="groups" className="flex-1">
              Groups
            </TabsTrigger>
          </TabsList>
          <TabsContent value="friends" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-full">
              {friends.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No friends yet. Add some friends to start chatting!
                </div>
              ) : (
                <div className="p-2">
                  {friends.map((friend) => (
                    <div
                      key={friend.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-100 ${
                        selectedChat?.type === "dm" && selectedChat?.id === friend.id
                          ? "bg-indigo-50"
                          : ""
                      }`}
                      onClick={() =>
                        setSelectedChat({ type: "dm", id: friend.id, name: friend.name })
                      }
                    >
                      <Avatar>
                        <AvatarFallback style={{ backgroundColor: friend.avatarColor }}>
                          {friend.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{friend.name}</p>
                        <p className="text-xs text-gray-500 truncate">{friend.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          <TabsContent value="groups" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-full">
              {groups.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No groups yet. Create a group to start chatting!
                </div>
              ) : (
                <div className="p-2">
                  {groups.map((group) => (
                    <div
                      key={group.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-100 ${
                        selectedChat?.type === "group" && selectedChat?.id === group.id
                          ? "bg-indigo-50"
                          : ""
                      }`}
                      onClick={() =>
                        setSelectedChat({ type: "group", id: group.id, name: group.name })
                      }
                    >
                      <Avatar>
                        <AvatarFallback className="bg-purple-500 text-white">
                          <Users className="w-5 h-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{group.name}</p>
                        <p className="text-xs text-gray-500">
                          {group.members.length} members
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b p-4">
              <div className="flex items-center gap-3">
                {selectedChat.type === "dm" ? (
                  <Avatar>
                    <AvatarFallback
                      style={{
                        backgroundColor:
                          friends.find((f) => f.id === selectedChat.id)?.avatarColor || "#666",
                      }}
                    >
                      {selectedChat.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <Avatar>
                    <AvatarFallback className="bg-purple-500 text-white">
                      <Users className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div>
                  <h2 className="font-semibold">{selectedChat.name}</h2>
                  {selectedChat.type === "group" && (
                    <p className="text-xs text-gray-500">
                      {groups.find((g) => g.id === selectedChat.id)?.members.length} members
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => {
                  const isOwn = message.from === currentUser?.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex items-start gap-2 ${isOwn ? "flex-row-reverse" : ""}`}
                    >
                      {!isOwn && (
                        <Avatar className="w-8 h-8">
                          <AvatarFallback
                            style={{ backgroundColor: message.sender?.avatarColor }}
                          >
                            {message.sender?.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                        {!isOwn && selectedChat.type === "group" && (
                          <span className="text-xs text-gray-500 mb-1">
                            {message.sender?.name}
                          </span>
                        )}
                        <div
                          className={`max-w-md px-4 py-2 rounded-lg ${
                            isOwn
                              ? "bg-indigo-600 text-white"
                              : "bg-gray-200 text-gray-900"
                          }`}
                        >
                          <p className="text-sm">{message.text}</p>
                        </div>
                        <span className="text-xs text-gray-500 mt-1">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="bg-white border-t p-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                />
                <Button onClick={sendMessage}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Welcome to ChatApp
              </h3>
              <p className="text-gray-500">
                Select a friend or group to start chatting
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
