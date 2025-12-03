import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { formatDate } from '../utils/helpers';

function AdminPage({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [slots, setSlots] = useState([]);
  const [modelFeedback, setModelFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        const data = await api.getAdminDashboard();
        setDashboard(data);
      } else if (activeTab === 'users') {
        const data = await api.getUsers();
        setUsers(data);
      } else if (activeTab === 'activity') {
        const data = await api.getActivityLogs(100);
        setActivity(data);
      } else if (activeTab === 'slots') {
        const data = await api.getSlots();
        setSlots(data);
      } else if (activeTab === 'model-feedback') {
        const data = await api.getModelFeedback();
        setModelFeedback(data);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      // If unauthorized, trigger logout
      if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        onLogout();
      }
    }
    setLoading(false);
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.deleteUser(userId);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const getActionIcon = (action) => {
    const icons = {
      create_slot: '📁',
      upload_image: '📷',
      edit_entry: '✏️',
      submit_entry: '✅',
      delete_entry: '🗑️',
    };
    return icons[action] || '📌';
  };

  const getActionText = (log) => {
    const actions = {
      create_slot: `created slot "${log.slot}"`,
      upload_image: `uploaded image to "${log.slot}"`,
      edit_entry: `edited entry in "${log.slot}"`,
      submit_entry: `submitted entry in "${log.slot}"`,
      delete_entry: `deleted entry from "${log.slot}"`,
    };
    return actions[log.action] || log.action;
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'slots', label: 'All Slots', icon: '📁' },
    { id: 'model-feedback', label: 'Model Feedback', icon: '🎯' },
    { id: 'activity', label: 'Activity', icon: '📋' },
  ];

  return (
    <div className="app-layout">
      {/* Mobile Menu Toggle */}
      <button className="mobile-menu-toggle" onClick={() => setSidebarOpen(true)}>
        ☰
      </button>

      {/* Sidebar Overlay */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)}></div>

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon">🧵</div>
            <span className="sidebar-brand-text">Thread Counter</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-title">Main Menu</div>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSidebarOpen(false);
                }}
              >
                <span className="nav-item-icon">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">{user.username[0].toUpperCase()}</div>
            <div className="user-info">
              <div className="user-name">{user.username}</div>
              <div className="user-role">{user.role}</div>
            </div>
          </div>
          <button className="btn btn-secondary btn-block btn-sm" onClick={onLogout}>
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="page-header">
          <div className="page-header-left">
            <h1>
              {activeTab === 'dashboard' && '📊 Dashboard'}
              {activeTab === 'users' && '👥 User Management'}
              {activeTab === 'slots' && '📁 All Slots'}
              {activeTab === 'model-feedback' && '🎯 Model Feedback'}
              {activeTab === 'activity' && '📋 Activity Log'}
            </h1>
            <p>
              {activeTab === 'dashboard' && 'Overview of system activity and statistics'}
              {activeTab === 'users' && 'Manage user accounts and permissions'}
              {activeTab === 'slots' && 'View all slots created by users'}
              {activeTab === 'model-feedback' && 'Review user corrections to improve AI model accuracy'}
              {activeTab === 'activity' && 'Track all user actions in real-time'}
            </p>
          </div>
          <div className="page-header-actions">
            {activeTab === 'users' && (
              <button
                className="btn btn-primary"
                onClick={() => {
                  setEditingUser(null);
                  setShowUserModal(true);
                }}
              >
                ➕ Add User
              </button>
            )}
          </div>
        </header>

        <div className="page-content">
          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p className="loading-text">Loading...</p>
            </div>
          ) : (
            <>
              {/* Dashboard */}
              {activeTab === 'dashboard' && dashboard && (
                <>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-card-icon">👥</div>
                      <div className="stat-value">{dashboard.total_users}</div>
                      <div className="stat-label">Total Users</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-card-icon">📁</div>
                      <div className="stat-value">{dashboard.total_slots}</div>
                      <div className="stat-label">Total Slots</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-card-icon">📷</div>
                      <div className="stat-value">{dashboard.total_entries}</div>
                      <div className="stat-label">Total Entries</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-card-icon">✅</div>
                      <div className="stat-value">{dashboard.submitted_entries}</div>
                      <div className="stat-label">Submitted</div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title">📋 Recent Activity</h3>
                    </div>
                    <div className="card-body">
                      {dashboard.recent_activity.length === 0 ? (
                        <div className="empty-state">
                          <div className="empty-state-icon">📭</div>
                          <p className="empty-state-title">No activity yet</p>
                          <p className="empty-state-text">User actions will appear here</p>
                        </div>
                      ) : (
                        <div className="activity-list">
                          {dashboard.recent_activity.map((log, idx) => (
                            <div key={idx} className="activity-item">
                              <div className="activity-icon">{getActionIcon(log.action)}</div>
                              <div className="activity-content">
                                <div className="activity-text">
                                  <strong>{log.user}</strong> {getActionText(log)}
                                </div>
                                <div className="activity-time">{formatDate(log.timestamp)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Users */}
              {activeTab === 'users' && (
                <div className="card">
                  <div className="card-body">
                    <div className="table-container">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>User</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((u) => (
                            <tr key={u.id}>
                              <td>
                                <div className="flex items-center gap-3">
                                  <div
                                    className="user-avatar"
                                    style={{ width: 36, height: 36, fontSize: '0.875rem' }}
                                  >
                                    {u.username[0].toUpperCase()}
                                  </div>
                                  <strong>{u.username}</strong>
                                </div>
                              </td>
                              <td>
                                <span className="badge badge-primary">{u.role}</span>
                              </td>
                              <td>
                                <span className={`badge ${u.is_active ? 'badge-success' : 'badge-warning'}`}>
                                  {u.is_active ? '● Active' : '○ Inactive'}
                                </span>
                              </td>
                              <td>{formatDate(u.created_at)}</td>
                              <td>
                                <div className="flex gap-2">
                                  <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => {
                                      setEditingUser(u);
                                      setShowUserModal(true);
                                    }}
                                  >
                                    ✏️ Edit
                                  </button>
                                  {u.role !== 'admin' && (
                                    <button
                                      className="btn btn-danger btn-sm"
                                      onClick={() => handleDeleteUser(u.id)}
                                    >
                                      🗑️
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Slots */}
              {activeTab === 'slots' && (
                <>
                  {slots.length === 0 ? (
                    <div className="card">
                      <div className="empty-state">
                        <div className="empty-state-icon">📁</div>
                        <p className="empty-state-title">No slots yet</p>
                        <p className="empty-state-text">Users haven't created any slots</p>
                      </div>
                    </div>
                  ) : (
                    <div className="slots-grid">
                      {slots.map((slot) => (
                        <div key={slot.id} className="slot-card">
                          <div className="slot-card-header">
                            <div className="slot-name">{slot.name}</div>
                            <div className="slot-meta">by {slot.created_by}</div>
                          </div>
                          <div className="slot-card-body">
                            <div className="slot-stats">
                              <div className="slot-stat">
                                <div className="slot-stat-value">{slot.entry_count}</div>
                                <div className="slot-stat-label">Entries</div>
                              </div>
                              <div className="slot-stat">
                                <div className="slot-stat-value">{slot.latest_count}</div>
                                <div className="slot-stat-label">Latest Count</div>
                              </div>
                            </div>
                            {slot.latest_update && (
                              <div className="slot-footer">
                                <span>🕐</span>
                                {formatDate(slot.latest_update)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Model Feedback */}
              {activeTab === 'model-feedback' && modelFeedback && (
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">🎯 Model Training Feedback ({modelFeedback.total_corrections} corrections)</h3>
                  </div>
                  <div className="card-body">
                    {modelFeedback.entries.length === 0 ? (
                      <div className="empty-state">
                        <div className="empty-state-icon">✅</div>
                        <p className="empty-state-title">No corrections yet</p>
                        <p className="empty-state-text">
                          When users edit AI predictions, those entries will appear here for model improvement
                        </p>
                      </div>
                    ) : (
                      <div className="entries-list">
                        {modelFeedback.entries.map((entry) => (
                          <div key={entry.id} className="entry-card">
                            <div className="entry-image">
                              <img
                                src={api.getImageUrl(`/${entry.image_path}`)}
                                alt="Thread roll"
                                className="entry-thumbnail"
                                onError={(e) => {
                                  console.error('Image failed to load:', entry.image_path);
                                  e.target.style.display = 'none';
                                }}
                              />
                            </div>
                            <div className="entry-content">
                              <div className="entry-header">
                                <div>
                                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                                    Slot: <strong>{entry.slot_name}</strong> • User: <strong>{entry.user}</strong>
                                  </div>
                                  <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: 'var(--space-4)',
                                    marginTop: 'var(--space-3)'
                                  }}>
                                    <div style={{
                                      padding: 'var(--space-3)',
                                      background: 'rgba(239, 68, 68, 0.1)',
                                      borderRadius: 'var(--radius-md)',
                                      border: '1px solid rgba(239, 68, 68, 0.2)'
                                    }}>
                                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                                        🤖 AI Detected
                                      </div>
                                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444' }}>
                                        {entry.ai_detected.count}
                                      </div>
                                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                        {Object.entries(entry.ai_detected.colors || {}).map(([color, count]) => (
                                          <span key={color} style={{ marginRight: 8 }}>
                                            {color}: {count}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                    <div style={{
                                      padding: 'var(--space-3)',
                                      background: 'rgba(34, 197, 94, 0.1)',
                                      borderRadius: 'var(--radius-md)',
                                      border: '1px solid rgba(34, 197, 94, 0.2)'
                                    }}>
                                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                                        👤 User Corrected
                                      </div>
                                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#22c55e' }}>
                                        {entry.user_corrected.count}
                                      </div>
                                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                        {Object.entries(entry.user_corrected.colors || {}).map(([color, count]) => (
                                          <span key={color} style={{ marginRight: 8 }}>
                                            {color}: {count}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                  <div style={{
                                    marginTop: 'var(--space-3)',
                                    padding: 'var(--space-2) var(--space-3)',
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: '0.875rem'
                                  }}>
                                    <strong>Difference:</strong> {entry.difference.count > 0 ? '+' : ''}{entry.difference.count} threads
                                    {' • '}
                                    <strong>Accuracy:</strong> {entry.difference.accuracy_percent}%
                                  </div>
                                </div>
                              </div>
                              <div className="entry-meta">
                                <div className="entry-meta-item">
                                  <span>📅</span> Updated {formatDate(entry.updated_at)}
                                </div>
                                {entry.is_submitted && (
                                  <div className="badge badge-success">✅ Submitted</div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Activity */}
              {activeTab === 'activity' && (
                <div className="card">
                  <div className="card-body">
                    {activity.length === 0 ? (
                      <div className="empty-state">
                        <div className="empty-state-icon">📭</div>
                        <p className="empty-state-title">No activity yet</p>
                        <p className="empty-state-text">User actions will appear here</p>
                      </div>
                    ) : (
                      <div className="activity-list">
                        {activity.map((log) => (
                          <div key={log.id} className="activity-item">
                            <div className="activity-icon">{getActionIcon(log.action)}</div>
                            <div className="activity-content">
                              <div className="activity-text">
                                <strong>{log.user}</strong> {getActionText(log)}
                                {log.details?.count && (
                                  <span style={{ color: 'var(--text-muted)' }}>
                                    {' '}(Count: {log.details.count.from} → {log.details.count.to})
                                  </span>
                                )}
                              </div>
                              <div className="activity-time">{formatDate(log.timestamp)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* User Modal */}
      {showUserModal && (
        <UserModal
          user={editingUser}
          onClose={() => setShowUserModal(false)}
          onSave={() => {
            setShowUserModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function UserModal({ user, onClose, onSave }) {
  const [username, setUsername] = useState(user?.username || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(user?.role || 'user');
  const [isActive, setIsActive] = useState(user?.is_active ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (user) {
        await api.updateUser(user.id, {
          password: password || undefined,
          is_active: isActive,
        });
      } else {
        await api.createUser({ username, password, role });
      }
      onSave();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{user ? '✏️ Edit User' : '➕ Add User'}</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="login-error">⚠️ {error}</div>}

            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                className="form-input form-input-simple"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={!!user}
                required={!user}
                placeholder="Enter username"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                {user ? 'New Password (leave empty to keep current)' : 'Password'}
              </label>
              <input
                type="password"
                className="form-input form-input-simple"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!user}
                placeholder={user ? '••••••••' : 'Enter password'}
              />
            </div>

            {!user && (
              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  className="form-input form-input-simple"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            )}

            {user && (
              <div className="form-group">
                <label className="flex items-center gap-3" style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    style={{ width: 20, height: 20, accentColor: 'var(--primary)' }}
                  />
                  <span>Account is active</span>
                </label>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : user ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminPage;
