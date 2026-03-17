import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-81e39e7b/health", (c) => {
  return c.json({ status: "ok" });
});

// Sign up endpoint
app.post("/make-server-81e39e7b/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();

    if (!email || !password || !name) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Create user with Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.error('Signup error:', error);
      return c.json({ error: error.message }, 400);
    }

    // Store user profile
    await kv.set(`user:${data.user.id}`, {
      id: data.user.id,
      email,
      name,
      createdAt: new Date().toISOString()
    });

    return c.json({ 
      success: true,
      user: {
        id: data.user.id,
        email,
        name
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    return c.json({ error: 'Signup failed' }, 500);
  }
});

// Get user profile
app.get("/make-server-81e39e7b/user/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    const user = await kv.get(`user:${userId}`);
    
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    return c.json({ error: 'Failed to get user' }, 500);
  }
});

// Send friend request
app.post("/make-server-81e39e7b/friends/request", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { friendEmail } = await c.req.json();

    // Find friend by email
    const allUsers = await kv.getByPrefix('user:');
    const friend = allUsers.find((u: any) => u.email === friendEmail);

    if (!friend) {
      return c.json({ error: 'User not found' }, 404);
    }

    if (friend.id === user.id) {
      return c.json({ error: 'Cannot add yourself as a friend' }, 400);
    }

    // Check if already friends
    const existingFriendship = await kv.get(`friendship:${user.id}:${friend.id}`) || 
                               await kv.get(`friendship:${friend.id}:${user.id}`);
    
    if (existingFriendship) {
      return c.json({ error: 'Already friends or request pending' }, 400);
    }

    // Create friendship
    const friendshipId = `friendship:${user.id}:${friend.id}`;
    await kv.set(friendshipId, {
      user1Id: user.id,
      user2Id: friend.id,
      status: 'accepted',
      createdAt: new Date().toISOString()
    });

    return c.json({ success: true, friend });
  } catch (error) {
    console.error('Friend request error:', error);
    return c.json({ error: 'Failed to send friend request' }, 500);
  }
});

// Get friends list
app.get("/make-server-81e39e7b/friends", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const friendships = await kv.getByPrefix('friendship:');
    const friendIds: string[] = [];

    friendships.forEach((f: any) => {
      if (f.user1Id === user.id) {
        friendIds.push(f.user2Id);
      } else if (f.user2Id === user.id) {
        friendIds.push(f.user1Id);
      }
    });

    const friends = await Promise.all(
      friendIds.map(id => kv.get(`user:${id}`))
    );

    return c.json({ friends: friends.filter(Boolean) });
  } catch (error) {
    console.error('Get friends error:', error);
    return c.json({ error: 'Failed to get friends' }, 500);
  }
});

// Create group
app.post("/make-server-81e39e7b/groups", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { name, memberIds } = await c.req.json();

    if (!name) {
      return c.json({ error: 'Group name is required' }, 400);
    }

    const groupId = crypto.randomUUID();
    const members = [user.id, ...(memberIds || [])];

    await kv.set(`group:${groupId}`, {
      id: groupId,
      name,
      creatorId: user.id,
      members,
      createdAt: new Date().toISOString()
    });

    return c.json({ 
      success: true,
      group: {
        id: groupId,
        name,
        members,
        creatorId: user.id
      }
    });
  } catch (error) {
    console.error('Create group error:', error);
    return c.json({ error: 'Failed to create group' }, 500);
  }
});

// Get user's groups
app.get("/make-server-81e39e7b/groups", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const allGroups = await kv.getByPrefix('group:');
    const userGroups = allGroups.filter((g: any) => g.members?.includes(user.id));

    return c.json({ groups: userGroups });
  } catch (error) {
    console.error('Get groups error:', error);
    return c.json({ error: 'Failed to get groups' }, 500);
  }
});

// Send message
app.post("/make-server-81e39e7b/messages", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { chatId, text, chatType } = await c.req.json();

    if (!chatId || !text) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const messageId = crypto.randomUUID();
    const message = {
      id: messageId,
      chatId,
      chatType,
      senderId: user.id,
      text,
      timestamp: new Date().toISOString()
    };

    await kv.set(`message:${chatId}:${messageId}`, message);

    return c.json({ success: true, message });
  } catch (error) {
    console.error('Send message error:', error);
    return c.json({ error: 'Failed to send message' }, 500);
  }
});

// Get messages for a chat
app.get("/make-server-81e39e7b/messages/:chatId", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const chatId = c.req.param('chatId');
    const messages = await kv.getByPrefix(`message:${chatId}:`);
    
    // Sort by timestamp
    const sortedMessages = messages.sort((a: any, b: any) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return c.json({ messages: sortedMessages });
  } catch (error) {
    console.error('Get messages error:', error);
    return c.json({ error: 'Failed to get messages' }, 500);
  }
});

Deno.serve(app.fetch);
