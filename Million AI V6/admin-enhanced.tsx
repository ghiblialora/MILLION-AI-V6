import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut, User } from 'firebase/auth';

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCtyJLx_e_OZDaylQ7DnK4UuZkMqMMV0jI",
  authDomain: "million-ai-be745.firebaseapp.com",
  projectId: "million-ai-be745",
  storageBucket: "million-ai-be745.firebasestorage.app",
  messagingSenderId: "360147173018",
  appId: "1:360147173018:web:655ab43cc03a4cde50e923",
  measurementId: "G-0Z2MJQXSBF"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

// Types
interface AdminUser {
  email: string;
  uid: string;
  createdAt: number;
  lastActive: number;
  messageCount: number;
  isBanned: boolean;
}

interface AuditLog {
  id: string;
  adminEmail: string;
  action: string;
  target: string;
  timestamp: number;
  details: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'broadcast' | 'targeted';
  targetUsers?: string[];
  createdAt: number;
  createdBy: string;
}

// Enhanced Admin Panel
const EnhancedAdminPanel = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [conversationSearch, setConversationSearch] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationForm, setNotificationForm] = useState({ title: '', message: '', type: 'broadcast' });

  const ADMIN_EMAILS = ['admin@million.ai', 'itzdarshann@gmail.com'];
  const isAdmin = user && ADMIN_EMAILS.includes(user.email || '');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isAdmin) loadData();
  }, [isAdmin]);

  const loadData = () => {
    setUsers(JSON.parse(localStorage.getItem('admin_users') || '[]'));
    setAuditLogs(JSON.parse(localStorage.getItem('audit_logs') || '[]'));
    setNotifications(JSON.parse(localStorage.getItem('notifications') || '[]'));
  };

  const addAuditLog = (action: string, target: string, details: string) => {
    const log: AuditLog = {
      id: Date.now().toString(),
      adminEmail: user?.email || 'unknown',
      action,
      target,
      timestamp: Date.now(),
      details
    };
    const logs = [log, ...auditLogs].slice(0, 100); // Keep last 100
    setAuditLogs(logs);
    localStorage.setItem('audit_logs', JSON.stringify(logs));
  };

  const banUser = (email: string) => {
    if (confirm(`Ban ${email}?`)) {
      const updated = users.map(u => u.email === email ? { ...u, isBanned: true } : u);
      setUsers(updated);
      localStorage.setItem('admin_users', JSON.stringify(updated));
      
      const banned = JSON.parse(localStorage.getItem('banned_users') || '[]');
      if (!banned.includes(email)) {
        banned.push(email);
        localStorage.setItem('banned_users', JSON.stringify(banned));
      }
      
      addAuditLog('BAN_USER', email, 'User banned');
      alert(`${email} banned`);
    }
  };

  const sendNotification = () => {
    if (!notificationForm.title || !notificationForm.message) {
      alert('Please fill all fields');
      return;
    }

    const notification: Notification = {
      id: Date.now().toString(),
      ...notificationForm,
      createdAt: Date.now(),
      createdBy: user?.email || 'unknown'
    };

    const updated = [notification, ...notifications];
    setNotifications(updated);
    localStorage.setItem('notifications', JSON.stringify(updated));
    localStorage.setItem('user_notifications', JSON.stringify(updated)); // For main app
    
    addAuditLog('SEND_NOTIFICATION', notificationForm.type, notificationForm.title);
    setNotificationForm({ title: '', message: '', type: 'broadcast' });
    alert('Notification sent!');
  };

  // Analytics Data
  const getAnalyticsData = () => {
    const sessions = JSON.parse(localStorage.getItem('million_ai_sessions') || '[]');
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const messagesPerDay = last7Days.map(day => Math.floor(Math.random() * 50) + 10); // Mock data
    const usersPerDay = last7Days.map(day => Math.floor(Math.random() * 10) + 1);

    return { last7Days, messagesPerDay, usersPerDay };
  };

  const analytics = getAnalyticsData();
  const sessions = JSON.parse(localStorage.getItem('million_ai_sessions') || '[]');
  const filteredSessions = sessions.filter((s: any) => 
    s.title?.toLowerCase().includes(conversationSearch.toLowerCase()) ||
    s.messages?.some((m: any) => m.text?.toLowerCase().includes(conversationSearch.toLowerCase()))
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Admin Panel</h1>
          <p>Please login</p>
          <a href="/" className="mt-4 inline-block px-6 py-2 bg-blue-600 rounded hover:bg-blue-700">Login</a>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
          <p className="mb-4">No permission</p>
          <a href="/" className="inline-block px-6 py-2 bg-blue-600 rounded hover:bg-blue-700">Go to Main App</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">🎛️ Million AI Admin Pro</h1>
            <span className="text-sm text-gray-400">{user.email}</span>
          </div>
          <button onClick={() => signOut(auth)} className="px-4 py-2 bg-red-600 rounded hover:bg-red-700">
            Logout
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-gray-800 min-h-screen p-4 border-r border-gray-700">
          <nav className="space-y-2">
            {['dashboard', 'analytics', 'users', 'conversations', 'notifications', 'audit', 'settings'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`w-full text-left px-4 py-3 rounded capitalize ${
                  activeTab === tab ? 'bg-blue-600' : 'hover:bg-gray-700'
                }`}
              >
                {tab === 'dashboard' && '📊'} {tab === 'analytics' && '📈'} 
                {tab === 'users' && '👥'} {tab === 'conversations' && '💬'}
                {tab === 'notifications' && '🔔'} {tab === 'audit' && '🛡️'}
                {tab === 'settings' && '⚙️'} {tab}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          {/* Dashboard */}
          {activeTab === 'dashboard' && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Dashboard</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                  <div className="text-gray-400 text-sm mb-2">Total Users</div>
                  <div className="text-3xl font-bold">{users.length}</div>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                  <div className="text-gray-400 text-sm mb-2">Conversations</div>
                  <div className="text-3xl font-bold">{sessions.length}</div>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                  <div className="text-gray-400 text-sm mb-2">Total Messages</div>
                  <div className="text-3xl font-bold">
                    {sessions.reduce((acc: number, s: any) => acc + (s.messages?.length || 0), 0)}
                  </div>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                  <div className="text-gray-400 text-sm mb-2">Active Today</div>
                  <div className="text-3xl font-bold text-green-500">
                    {users.filter(u => u.lastActive >= new Date().setHours(0,0,0,0)).length}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Analytics */}
          {activeTab === 'analytics' && (
            <div>
              <h2 className="text-3xl font-bold mb-6">📈 Analytics Dashboard</h2>
              
              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Messages Chart */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                  <h3 className="text-xl font-bold mb-4">Messages (Last 7 Days)</h3>
                  <div className="flex items-end justify-between h-48 gap-2">
                    {analytics.messagesPerDay.map((count, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center">
                        <div 
                          className="w-full bg-blue-600 rounded-t transition-all hover:bg-blue-500"
                          style={{ height: `${(count / Math.max(...analytics.messagesPerDay)) * 100}%` }}
                          title={`${count} messages`}
                        />
                        <div className="text-xs mt-2 text-gray-400">{analytics.last7Days[i]}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Users Chart */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                  <h3 className="text-xl font-bold mb-4">New Users (Last 7 Days)</h3>
                  <div className="flex items-end justify-between h-48 gap-2">
                    {analytics.usersPerDay.map((count, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center">
                        <div 
                          className="w-full bg-green-600 rounded-t transition-all hover:bg-green-500"
                          style={{ height: `${(count / Math.max(...analytics.usersPerDay)) * 100}%` }}
                          title={`${count} users`}
                        />
                        <div className="text-xs mt-2 text-gray-400">{analytics.last7Days[i]}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Usage Stats */}
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h3 className="text-xl font-bold mb-4">Usage Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-gray-400 text-sm">Avg Messages/User</div>
                    <div className="text-2xl font-bold">
                      {users.length ? Math.round(users.reduce((acc, u) => acc + u.messageCount, 0) / users.length) : 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm">Avg Messages/Chat</div>
                    <div className="text-2xl font-bold">
                      {sessions.length ? Math.round(sessions.reduce((acc: number, s: any) => acc + (s.messages?.length || 0), 0) / sessions.length) : 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm">Active Rate</div>
                    <div className="text-2xl font-bold text-green-500">
                      {users.length ? Math.round((users.filter(u => u.lastActive >= Date.now() - 7*24*60*60*1000).length / users.length) * 100) : 0}%
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm">Ban Rate</div>
                    <div className="text-2xl font-bold text-red-500">
                      {users.length ? Math.round((users.filter(u => u.isBanned).length / users.length) * 100) : 0}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Users with Details */}
          {activeTab === 'users' && (
            <div>
              <h2 className="text-3xl font-bold mb-6">👥 User Management</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* User List */}
                <div className="lg:col-span-2">
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 mb-4 bg-gray-800 border border-gray-700 rounded"
                  />
                  
                  <div className="space-y-2">
                    {users.filter(u => u.email.toLowerCase().includes(searchTerm.toLowerCase())).map(u => (
                      <div 
                        key={u.uid}
                        onClick={() => setSelectedUser(u)}
                        className={`p-4 rounded cursor-pointer transition-colors ${
                          selectedUser?.uid === u.uid ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-bold">{u.email}</div>
                            <div className="text-sm text-gray-400">
                              {u.messageCount} messages • Last active: {new Date(u.lastActive).toLocaleDateString()}
                            </div>
                          </div>
                          {u.isBanned && <span className="px-2 py-1 bg-red-600 rounded text-xs">Banned</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* User Details Panel */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                  {selectedUser ? (
                    <div>
                      <h3 className="text-xl font-bold mb-4">User Details</h3>
                      <div className="space-y-4">
                        <div>
                          <div className="text-gray-400 text-sm">Email</div>
                          <div className="font-mono">{selectedUser.email}</div>
                        </div>
                        <div>
                          <div className="text-gray-400 text-sm">User ID</div>
                          <div className="font-mono text-xs">{selectedUser.uid}</div>
                        </div>
                        <div>
                          <div className="text-gray-400 text-sm">Created</div>
                          <div>{new Date(selectedUser.createdAt).toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-gray-400 text-sm">Last Active</div>
                          <div>{new Date(selectedUser.lastActive).toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-gray-400 text-sm">Total Messages</div>
                          <div className="text-2xl font-bold">{selectedUser.messageCount}</div>
                        </div>
                        <div>
                          <div className="text-gray-400 text-sm">Status</div>
                          <div>
                            {selectedUser.isBanned ? (
                              <span className="px-3 py-1 bg-red-600 rounded">Banned</span>
                            ) : (
                              <span className="px-3 py-1 bg-green-600 rounded">Active</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="pt-4 border-t border-gray-700">
                          <button
                            onClick={() => banUser(selectedUser.email)}
                            className={`w-full px-4 py-2 rounded ${
                              selectedUser.isBanned ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                            }`}
                          >
                            {selectedUser.isBanned ? 'Unban User' : 'Ban User'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-400 py-8">
                      Select a user to view details
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Conversations with Search */}
          {activeTab === 'conversations' && (
            <div>
              <h2 className="text-3xl font-bold mb-6">💬 Conversations</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Conversation List */}
                <div className="lg:col-span-2">
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={conversationSearch}
                    onChange={(e) => setConversationSearch(e.target.value)}
                    className="w-full px-4 py-2 mb-4 bg-gray-800 border border-gray-700 rounded"
                  />
                  
                  <div className="space-y-2">
                    {filteredSessions.map((session: any) => (
                      <div
                        key={session.id}
                        onClick={() => setSelectedConversation(session)}
                        className={`p-4 rounded cursor-pointer transition-colors ${
                          selectedConversation?.id === session.id ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'
                        }`}
                      >
                        <div className="font-bold">{session.title || 'Untitled'}</div>
                        <div className="text-sm text-gray-400">
                          {session.messages?.length || 0} messages • {new Date(session.updatedAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Conversation View */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 max-h-[600px] overflow-y-auto">
                  {selectedConversation ? (
                    <div>
                      <h3 className="text-xl font-bold mb-4">{selectedConversation.title}</h3>
                      <div className="space-y-4">
                        {selectedConversation.messages?.map((msg: any, i: number) => (
                          <div key={i} className={`p-3 rounded ${msg.role === 'user' ? 'bg-blue-900' : 'bg-gray-700'}`}>
                            <div className="text-xs text-gray-400 mb-1">{msg.role}</div>
                            <div className="text-sm">{msg.text}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-400 py-8">
                      Select a conversation to view
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <div>
              <h2 className="text-3xl font-bold mb-6">🔔 Notifications</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Send Notification */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                  <h3 className="text-xl font-bold mb-4">Send Notification</h3>
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Title"
                      value={notificationForm.title}
                      onChange={(e) => setNotificationForm({...notificationForm, title: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded"
                    />
                    <textarea
                      placeholder="Message"
                      value={notificationForm.message}
                      onChange={(e) => setNotificationForm({...notificationForm, message: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded h-32"
                    />
                    <select
                      value={notificationForm.type}
                      onChange={(e) => setNotificationForm({...notificationForm, type: e.target.value as any})}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded"
                    >
                      <option value="broadcast">Broadcast to All</option>
                      <option value="targeted">Targeted</option>
                    </select>
                    <button
                      onClick={sendNotification}
                      className="w-full px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
                    >
                      Send Notification
                    </button>
                  </div>
                </div>

                {/* Notification History */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                  <h3 className="text-xl font-bold mb-4">Notification History</h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {notifications.map(n => (
                      <div key={n.id} className="p-3 bg-gray-700 rounded">
                        <div className="font-bold">{n.title}</div>
                        <div className="text-sm text-gray-400">{n.message}</div>
                        <div className="text-xs text-gray-500 mt-2">
                          {n.type} • {new Date(n.createdAt).toLocaleString()} • by {n.createdBy}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Audit Logs */}
          {activeTab === 'audit' && (
            <div>
              <h2 className="text-3xl font-bold mb-6">🛡️ Audit Logs</h2>
              
              <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left">Timestamp</th>
                      <th className="px-6 py-3 text-left">Admin</th>
                      <th className="px-6 py-3 text-left">Action</th>
                      <th className="px-6 py-3 text-left">Target</th>
                      <th className="px-6 py-3 text-left">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map(log => (
                      <tr key={log.id} className="border-t border-gray-700 hover:bg-gray-750">
                        <td className="px-6 py-4 text-sm">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm">{log.adminEmail}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-blue-600 rounded text-xs">{log.action}</span>
                        </td>
                        <td className="px-6 py-4 text-sm">{log.target}</td>
                        <td className="px-6 py-4 text-sm text-gray-400">{log.details}</td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                          No audit logs yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Settings */}
          {activeTab === 'settings' && (
            <div>
              <h2 className="text-3xl font-bold mb-6">⚙️ Settings</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* API Key Management */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                  <h3 className="text-xl font-bold mb-4">🔑 API Key Management</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Gemini API Key</label>
                      <input
                        type="password"
                        placeholder="Enter new API key"
                        id="gemini-api-key"
                        defaultValue={localStorage.getItem('gemini_api_key') || ''}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded font-mono text-sm"
                      />
                    </div>
                    
                    <button
                      onClick={() => {
                        const input = document.getElementById('gemini-api-key') as HTMLInputElement;
                        const newKey = input.value.trim();
                        
                        if (!newKey) {
                          alert('Please enter an API key');
                          return;
                        }
                        
                        if (!newKey.startsWith('AIza')) {
                          if (!confirm('This doesn\'t look like a valid Gemini API key. Continue anyway?')) {
                            return;
                          }
                        }
                        
                        localStorage.setItem('gemini_api_key', newKey);
                        addAuditLog('UPDATE_API_KEY', 'Gemini', 'API key updated');
                        alert('✅ API Key updated successfully!');
                      }}
                      className="w-full px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
                    >
                      Update Gemini API Key
                    </button>
                    
                    <div className="pt-4 border-t border-gray-700">
                      <div className="text-sm text-gray-400 mb-2">Current Status:</div>
                      <div className="flex items-center gap-2">
                        {localStorage.getItem('gemini_api_key') ? (
                          <>
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            <span className="text-green-500">API Key Configured</span>
                          </>
                        ) : (
                          <>
                            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                            <span className="text-red-500">No API Key Set</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-700">
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to remove the API key?')) {
                            localStorage.removeItem('gemini_api_key');
                            (document.getElementById('gemini-api-key') as HTMLInputElement).value = '';
                            addAuditLog('REMOVE_API_KEY', 'Gemini', 'API key removed');
                            alert('API Key removed');
                          }
                        }}
                        className="w-full px-4 py-2 bg-red-600 rounded hover:bg-red-700"
                      >
                        Remove API Key
                      </button>
                    </div>
                    
                    <div className="mt-4 p-3 bg-blue-900/30 border border-blue-700 rounded text-sm">
                      <div className="font-bold mb-1">💡 How to get API Key:</div>
                      <div className="text-gray-300">
                        1. Visit <a href="https://aistudio.google.com/apikey" target="_blank" className="text-blue-400 underline">Google AI Studio</a><br/>
                        2. Click "Create API Key"<br/>
                        3. Copy and paste here
                      </div>
                    </div>
                  </div>
                </div>

                {/* System Information */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                  <h3 className="text-xl font-bold mb-4">System Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-gray-700">
                      <span className="text-gray-400">Storage Used:</span>
                      <span className="font-mono">{(JSON.stringify(localStorage).length / 1024).toFixed(2)} KB</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-700">
                      <span className="text-gray-400">Total Users:</span>
                      <span className="font-bold">{users.length}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-700">
                      <span className="text-gray-400">Total Sessions:</span>
                      <span className="font-bold">{sessions.length}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-700">
                      <span className="text-gray-400">Audit Logs:</span>
                      <span className="font-bold">{auditLogs.length}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-700">
                      <span className="text-gray-400">Banned Users:</span>
                      <span className="font-bold text-red-500">{users.filter(u => u.isBanned).length}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-400">Notifications Sent:</span>
                      <span className="font-bold">{notifications.length}</span>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-gray-700">
                    <h4 className="font-bold mb-3">Danger Zone</h4>
                    <button
                      onClick={() => {
                        if (confirm('⚠️ This will clear ALL audit logs. Continue?')) {
                          localStorage.removeItem('audit_logs');
                          setAuditLogs([]);
                          alert('Audit logs cleared');
                        }
                      }}
                      className="w-full px-4 py-2 bg-red-600 rounded hover:bg-red-700 mb-2"
                    >
                      Clear Audit Logs
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('⚠️ This will clear ALL notifications. Continue?')) {
                          localStorage.removeItem('notifications');
                          localStorage.removeItem('user_notifications');
                          setNotifications([]);
                          alert('Notifications cleared');
                        }
                      }}
                      className="w-full px-4 py-2 bg-red-600 rounded hover:bg-red-700"
                    >
                      Clear All Notifications
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<EnhancedAdminPanel />);
