import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { ScrollArea } from "../components/ui/scroll-area";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { MessageCircle, Users, UserPlus, LogOut, Send, Plus, UserMinus, Check, X, Bell } from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  name: string;
}

interface Friend extends User {}

interface FriendRequest {
  requesterId: string;
  receiverId: string;
  status: string;
  createdAt: string;
  requester: User;
}

interface Group {
  id: string;
  name: string;
  members: string[];
  creatorId: string;
}

interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  timestamp: string;
}

export default function ChatMain() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedChat, setSelectedChat] = useState<{ type: 'friend' | 'group', id: string, name: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [friendEmail, setFriendEmail] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedFriendsForGroup, setSelectedFriendsForGroup] = useState<string[]>([]);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<number>();

  const [accessToken, setAccessToken] = useState<string | null>(localStorage.getItem("accessToken"));
  const userId = localStorage.getItem("userId");
  
  const supabase = createClient(
    `https://${projectId}.supabase.co`,
    publicAnonKey
  );

  // Refresh access token periodically
  useEffect(() => {
    const refreshToken = async () => {
      console.log("Attempting to refresh token...");
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log("Session data:", session ? "Session exists" : "No session", "Error:", error);
      console.log("Access token from session:", session?.access_token ? session.access_token.substring(0, 20) + "..." : "None");
      console.log("Access token from localStorage:", localStorage.getItem("accessToken")?.substring(0, 20) + "...");
      
      if (session?.access_token) {
        setAccessToken(session.access_token);
        localStorage.setItem("accessToken", session.access_token);
        console.log("Token refreshed successfully");
      } else if (error) {
        console.error("Session refresh error:", error);
        // Token might be expired, redirect to login
        toast.error("Session expired. Please login again.");
        navigate("/");
      } else {
        console.log("No session found, using localStorage token");
        // Try using the token from localStorage
        const storedToken = localStorage.getItem("accessToken");
        if (storedToken) {
          setAccessToken(storedToken);
        } else {
          console.error("No token available");
          navigate("/");
        }
      }
    };
    
    // Refresh immediately
    refreshToken();
    
    // Refresh every 5 minutes
    const interval = setInterval(refreshToken, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!accessToken || !userId) {
      return;
    }

    loadCurrentUser();
    loadFriends();
    loadGroups();
    loadFriendRequests();

    // Poll for new messages every 2 seconds
    pollIntervalRef.current = window.setInterval(() => {
      if (selectedChat) {
        loadMessages(selectedChat.type, selectedChat.id);
      }
      // Also poll for friend requests
      loadFriendRequests();
    }, 2000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [accessToken, userId, selectedChat]);

  const loadCurrentUser = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-81e39e7b/user/${userId}`,
        {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }
      );
      const data = await response.json();
      if (data.user) {
        setCurrentUser(data.user);
      }
    } catch (error) {
      console.error("Failed to load user:", error);
    }
  };

  const loadFriends = async () => {
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
      console.error("Failed to load friends:", error);
    }
  };

  const loadGroups = async () => {
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
      console.error("Failed to load groups:", error);
    }
  };

  const loadMessages = async (chatType: 'friend' | 'group', chatId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-81e39e7b/messages/${chatId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const data = await response.json();
      if (data.messages) {
        setMessages(data.messages);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  };

  const loadFriendRequests = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-81e39e7b/friends/requests`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const data = await response.json();
      if (data.requests) {
        setFriendRequests(data.requests);
      }
    } catch (error) {
      console.error("Failed to load friend requests:", error);
    }
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-81e39e7b/friends/request`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ friendEmail }),
        }
      );

      const data = await response.json();
      console.log("Add friend response:", response.status, data);
      
      if (!response.ok) {
        toast.error(data.error || "Failed to add friend");
        return;
      }

      toast.success("Friend request sent successfully!");
      setFriendEmail("");
      setAddFriendOpen(false);
      loadFriends();
    } catch (error) {
      console.error("Add friend error:", error);
      toast.error("Failed to add friend");
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-81e39e7b/groups`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ name: groupName, memberIds: selectedFriendsForGroup }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Failed to create group");
        return;
      }

      toast.success("Group created successfully!");
      setGroupName("");
      setSelectedFriendsForGroup([]);
      setCreateGroupOpen(false);
      loadGroups();
    } catch (error) {
      console.error("Create group error:", error);
      toast.error("Failed to create group");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
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
            chatId: selectedChat.id,
            text: messageText,
            chatType: selectedChat.type,
          }),
        }
      );

      if (!response.ok) {
        toast.error("Failed to send message");
        return;
      }

      setMessageText("");
      loadMessages(selectedChat.type, selectedChat.id);
    } catch (error) {
      console.error("Send message error:", error);
      toast.error("Failed to send message");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userId");
    navigate("/");
  };

  const selectFriendChat = (friend: Friend) => {
    const chatId = [userId, friend.id].sort().join(":");
    setSelectedChat({ type: 'friend', id: chatId, name: friend.name });
    loadMessages('friend', chatId);
  };

  const selectGroupChat = (group: Group) => {
    setSelectedChat({ type: 'group', id: group.id, name: group.name });
    loadMessages('group', group.id);
  };

  const getSenderName = (senderId: string) => {
    if (senderId === userId) return "You";
    const friend = friends.find(f => f.id === senderId);
    if (friend) return friend.name;
    return "Unknown";
  };

  const toggleFriendForGroup = (friendId: string) => {
    setSelectedFriendsForGroup(prev =>
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleAcceptFriendRequest = async (requesterId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-81e39e7b/friends/accept`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ requesterId }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Failed to accept friend request");
        return;
      }

      toast.success("Friend request accepted!");
      loadFriendRequests();
      loadFriends();
    } catch (error) {
      console.error("Accept friend request error:", error);
      toast.error("Failed to accept friend request");
    }
  };

  const handleDeclineFriendRequest = async (requesterId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-81e39e7b/friends/decline`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ requesterId }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Failed to decline friend request");
        return;
      }

      toast.success("Friend request declined!");
      loadFriendRequests();
    } catch (error) {
      console.error("Decline friend request error:", error);
      toast.error("Failed to decline friend request");
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-81e39e7b/friends/remove`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ friendId }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Failed to remove friend");
        return;
      }

      toast.success("Friend removed!");
      loadFriends();
      if (selectedChat?.type === 'friend' && selectedChat.id.includes(friendId)) {
        setSelectedChat(null);
      }
    } catch (error) {
      console.error("Remove friend error:", error);
      toast.error("Failed to remove friend");
    }
  };

  return (
    <div className="size-full flex bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback className="bg-blue-600 text-white">
                {currentUser?.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold">{currentUser?.name}</div>
              <div className="text-xs text-gray-500">{currentUser?.email}</div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="size-5" />
          </Button>
        </div>

        <Tabs defaultValue="friends" className="flex-1 flex flex-col">
          <TabsList className="w-full grid grid-cols-2 rounded-none border-b">
            <TabsTrigger value="friends">Friends</TabsTrigger>
            <TabsTrigger value="groups">Groups</TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="flex-1 mt-0 overflow-hidden">
            <div className="p-2 space-y-2">
              <Dialog open={addFriendOpen} onOpenChange={setAddFriendOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full" variant="outline">
                    <UserPlus className="size-4 mr-2" />
                    Add Friend
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Friend</DialogTitle>
                    <DialogDescription>Enter your friend's email address</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddFriend}>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="friendEmail">Email</Label>
                        <Input
                          id="friendEmail"
                          type="email"
                          placeholder="friend@email.com"
                          value={friendEmail}
                          onChange={(e) => setFriendEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <DialogFooter className="mt-4">
                      <Button type="submit">Add Friend</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={requestsOpen} onOpenChange={setRequestsOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full" variant="outline">
                    <Bell className="size-4 mr-2" />
                    Friend Requests
                    {friendRequests.length > 0 && (
                      <Badge className="ml-auto" variant="destructive">
                        {friendRequests.length}
                      </Badge>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Friend Requests</DialogTitle>
                    <DialogDescription>
                      {friendRequests.length === 0 ? "No pending requests" : `${friendRequests.length} pending request${friendRequests.length > 1 ? 's' : ''}`}
                    </DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="max-h-96">
                    {friendRequests.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        No friend requests
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {friendRequests.map((request) => (
                          <div key={request.requesterId} className="flex items-center gap-3 p-3 border rounded-lg">
                            <Avatar>
                              <AvatarFallback className="bg-blue-600 text-white">
                                {request.requester.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="font-medium">{request.requester.name}</div>
                              <div className="text-xs text-gray-500">{request.requester.email}</div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="icon"
                                variant="default"
                                onClick={() => handleAcceptFriendRequest(request.requesterId)}
                              >
                                <Check className="size-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="destructive"
                                onClick={() => handleDeclineFriendRequest(request.requesterId)}
                              >
                                <X className="size-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            </div>

            <ScrollArea className="flex-1 px-2">
              {friends.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-8">
                  No friends yet. Add some friends to start chatting!
                </div>
              ) : (
                <div className="space-y-1">
                  {friends.map((friend) => (
                    <button
                      key={friend.id}
                      onClick={() => selectFriendChat(friend)}
                      className={`w-full p-3 rounded-lg flex items-center gap-3 hover:bg-gray-100 transition ${
                        selectedChat?.type === 'friend' && selectedChat.id.includes(friend.id)
                          ? 'bg-blue-50'
                          : ''
                      }`}
                    >
                      <Avatar>
                        <AvatarFallback className="bg-gray-300">
                          {friend.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <div className="font-medium">{friend.name}</div>
                        <div className="text-xs text-gray-500">{friend.email}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="groups" className="flex-1 mt-0 overflow-hidden">
            <div className="p-2">
              <Dialog open={createGroupOpen} onOpenChange={setCreateGroupOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full" variant="outline">
                    <Plus className="size-4 mr-2" />
                    Create Group
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Group</DialogTitle>
                    <DialogDescription>Create a new group chat</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateGroup}>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="groupName">Group Name</Label>
                        <Input
                          id="groupName"
                          type="text"
                          placeholder="My Group"
                          value={groupName}
                          onChange={(e) => setGroupName(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label>Add Members</Label>
                        <ScrollArea className="h-40 border rounded-md p-2 mt-2">
                          {friends.map((friend) => (
                            <label
                              key={friend.id}
                              className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedFriendsForGroup.includes(friend.id)}
                                onChange={() => toggleFriendForGroup(friend.id)}
                                className="rounded"
                              />
                              <span>{friend.name}</span>
                            </label>
                          ))}
                        </ScrollArea>
                      </div>
                    </div>
                    <DialogFooter className="mt-4">
                      <Button type="submit">Create Group</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <ScrollArea className="flex-1 px-2">
              {groups.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-8">
                  No groups yet. Create a group to start chatting!
                </div>
              ) : (
                <div className="space-y-1">
                  {groups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => selectGroupChat(group)}
                      className={`w-full p-3 rounded-lg flex items-center gap-3 hover:bg-gray-100 transition ${
                        selectedChat?.id === group.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <Avatar>
                        <AvatarFallback className="bg-purple-600 text-white">
                          <Users className="size-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <div className="font-medium">{group.name}</div>
                        <div className="text-xs text-gray-500">
                          {group.members.length} members
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="h-16 bg-white border-b border-gray-200 flex items-center px-6">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className={selectedChat.type === 'group' ? 'bg-purple-600 text-white' : 'bg-gray-300'}>
                    {selectedChat.type === 'group' ? (
                      <Users className="size-5" />
                    ) : (
                      selectedChat.name.charAt(0).toUpperCase()
                    )}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold">{selectedChat.name}</div>
                  <div className="text-xs text-gray-500">
                    {selectedChat.type === 'group' ? 'Group chat' : 'Direct message'}
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-4">
                {messages.map((message) => {
                  const isOwn = message.senderId === userId;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
                        {!isOwn && selectedChat.type === 'group' && (
                          <div className="text-xs text-gray-500 mb-1 px-3">
                            {getSenderName(message.senderId)}
                          </div>
                        )}
                        <div
                          className={`px-4 py-2 rounded-2xl ${
                            isOwn
                              ? 'bg-blue-600 text-white rounded-br-sm'
                              : 'bg-gray-200 text-gray-900 rounded-bl-sm'
                          }`}
                        >
                          <div>{message.text}</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 px-3">
                          {new Date(message.timestamp).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 bg-white border-t border-gray-200">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" size="icon">
                  <Send className="size-5" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-500">
              <MessageCircle className="size-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Select a chat to start messaging</p>
              <p className="text-sm mt-2">Choose a friend or group from the sidebar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}