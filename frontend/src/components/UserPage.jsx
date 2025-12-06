import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { formatDate, getColorHex } from '../utils/helpers';
import BBoxEditor from './BBoxEditor';
import {
  LayoutDashboard,
  FolderOpen,
  User,
  Home,
  Plus,
  Camera,
  CheckCircle,
  Layers,
  Clock,
  Upload,
  Edit3,
  Trash2,
  Target,
  Download,
  Grid3X3,
  ArrowLeft,
  Menu,
  LogOut,
  Settings,
  Lock,
  Info,
  ChevronRight,
  Image,
  FileText,
  Activity,
  BarChart3,
  Package
} from 'lucide-react';

function UserPage({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slotDetails, setSlotDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateSlot, setShowCreateSlot] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    if (activeTab === 'profile') {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        const data = await api.getUserDashboard();
        setDashboard(data);
      } else if (activeTab === 'slots') {
        await loadSlots();
        return; // loadSlots already sets loading to false
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    }
    setLoading(false);
  };

  const loadSlots = async () => {
    setLoading(true);
    try {
      const data = await api.getSlots();
      setSlots(data);
    } catch (err) {
      console.error('Failed to load slots:', err);
    }
    setLoading(false);
  };

  const loadSlotDetails = async (slotId) => {
    setLoading(true);
    try {
      const data = await api.getSlot(slotId);
      setSlotDetails(data);
      setSelectedSlot(slotId);
      setActiveTab('slot-detail');
    } catch (err) {
      console.error('Failed to load slot:', err);
    }
    setLoading(false);
  };

  const handleBackToSlots = () => {
    setSelectedSlot(null);
    setSlotDetails(null);
    setActiveTab('slots');
    loadSlots();
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

  const getActionIconComponent = (action) => {
    const iconMap = {
      create_slot: <FolderOpen size={18} />,
      upload_image: <Camera size={18} />,
      edit_entry: <Edit3 size={18} />,
      submit_entry: <CheckCircle size={18} />,
      delete_entry: <Trash2 size={18} />,
    };
    return iconMap[action] || <Activity size={18} />;
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

  return (
    <div className="app-layout">
      {/* Mobile Menu Toggle */}
      <button className="mobile-menu-toggle" onClick={() => setSidebarOpen(true)}>
        <Menu size={24} />
      </button>

      {/* Sidebar Overlay */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)}></div>

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon"><Package size={24} /></div>
            <span className="sidebar-brand-text">Thread Counter</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-title">Navigation</div>
            <button
              className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('dashboard');
                setSelectedSlot(null);
                setSidebarOpen(false);
              }}
            >
              <span className="nav-item-icon"><BarChart3 size={18} /></span>
              Dashboard
            </button>
            <button
              className={`nav-item ${activeTab === 'slots' || activeTab === 'slot-detail' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('slots');
                setSelectedSlot(null);
                setSidebarOpen(false);
              }}
            >
              <span className="nav-item-icon"><FolderOpen size={18} /></span>
              My Slots
            </button>
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
            <LogOut size={16} style={{marginRight: '6px'}} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        <div className="mobile-bottom-nav-inner">
          <button
            className={`mobile-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('dashboard');
              setSelectedSlot(null);
            }}
          >
            <Home size={22} className="mobile-nav-item-icon" />
            <span>Home</span>
          </button>
          <button
            className={`mobile-nav-item ${activeTab === 'slots' || activeTab === 'slot-detail' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('slots');
              setSelectedSlot(null);
            }}
          >
            <FolderOpen size={22} className="mobile-nav-item-icon" />
            <span>Slots</span>
          </button>
          <button
            className={`mobile-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('profile');
              setSelectedSlot(null);
            }}
          >
            <User size={22} className="mobile-nav-item-icon" />
            <span>Profile</span>
          </button>
        </div>
      </nav>

      {/* Floating Action Button for Create Slot */}
      {activeTab === 'slots' && (
        <button 
          className="mobile-fab"
          onClick={() => setShowCreateSlot(true)}
          aria-label="Create new slot"
        >
          <Plus size={24} />
        </button>
      )}

      {/* Main Content */}
      <main className="main-content">
        <header className="page-header">
          <div className="page-header-left">
            <h1>
              {activeTab === 'dashboard' && <><BarChart3 size={24} style={{marginRight: '8px', verticalAlign: 'middle'}} /> Dashboard</>}
              {activeTab === 'slots' && <><FolderOpen size={24} style={{marginRight: '8px', verticalAlign: 'middle'}} /> My Slots</>}
              {activeTab === 'slot-detail' && <><FolderOpen size={24} style={{marginRight: '8px', verticalAlign: 'middle'}} /> {slotDetails?.name || 'Slot'}</>}
              {activeTab === 'profile' && <><User size={24} style={{marginRight: '8px', verticalAlign: 'middle'}} /> Profile</>}
            </h1>
            <p>
              {activeTab === 'dashboard' && 'Overview of your activity and statistics'}
              {activeTab === 'slots' && 'Manage your thread counting slots'}
              {activeTab === 'slot-detail' && 'Upload images and track thread counts'}
              {activeTab === 'profile' && 'Manage your account settings'}
            </p>
          </div>
          <div className="page-header-actions">
            {activeTab === 'slot-detail' && (
              <button className="btn btn-secondary" onClick={handleBackToSlots}>
                <ArrowLeft size={16} /> Back
              </button>
            )}
            {activeTab === 'slots' && (
              <button className="btn btn-primary" onClick={() => setShowCreateSlot(true)}>
                <Plus size={16} /> Create Slot
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
              {activeTab === 'dashboard' && (
                <>
                  {!dashboard ? (
                    <div className="card">
                      <div className="empty-state">
                        <div className="empty-state-icon"><BarChart3 size={48} /></div>
                        <p className="empty-state-title">Unable to load dashboard</p>
                        <p className="empty-state-text">Please refresh the page or try again</p>
                        <button className="btn btn-primary" onClick={() => loadData()}>
                          Retry
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-card-icon"><FolderOpen size={28} /></div>
                      <div className="stat-value">{dashboard.total_slots}</div>
                      <div className="stat-label">My Slots</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-card-icon"><Image size={28} /></div>
                      <div className="stat-value">{dashboard.total_entries}</div>
                      <div className="stat-label">Total Entries</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-card-icon"><CheckCircle size={28} /></div>
                      <div className="stat-value">{dashboard.submitted_entries}</div>
                      <div className="stat-label">Submitted</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-card-icon"><Layers size={28} /></div>
                      <div className="stat-value">{dashboard.total_threads}</div>
                      <div className="stat-label">Total Threads</div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title"><Activity size={18} style={{marginRight: '8px'}} /> Recent Activity</h3>
                    </div>
                    <div className="card-body">
                      {dashboard.recent_activity.length === 0 ? (
                        <div className="empty-state">
                          <div className="empty-state-icon"><FileText size={48} /></div>
                          <p className="empty-state-title">No activity yet</p>
                          <p className="empty-state-text">Your actions will appear here</p>
                        </div>
                      ) : (
                        <div className="activity-list">
                          {dashboard.recent_activity.map((log, idx) => (
                            <div key={idx} className="activity-item">
                              <div className="activity-icon">{getActionIconComponent(log.action)}</div>
                              <div className="activity-content">
                                <div className="activity-text">
                                  {getActionText(log)}
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
                </>
              )}

              {/* Slots List */}
              {activeTab === 'slots' && (
                <>
                  {slots.length === 0 ? (
                    <div className="card">
                      <div className="empty-state">
                        <div className="empty-state-icon"><FolderOpen size={48} /></div>
                        <p className="empty-state-title">No slots yet</p>
                        <p className="empty-state-text">Create your first slot to start counting threads</p>
                        <button className="btn btn-primary" onClick={() => setShowCreateSlot(true)}>
                          <Plus size={16} style={{marginRight: '4px'}} /> Create Slot
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="slots-grid">
                      {slots.map((slot) => (
                        <div key={slot.id} className="slot-card" onClick={() => loadSlotDetails(slot.id)}>
                          <div className="slot-card-header">
                            <div className="slot-name">{slot.name}</div>
                            <div className="slot-meta">Created {formatDate(slot.created_at)}</div>
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
                                <Clock size={14} />
                                Last updated {formatDate(slot.latest_update)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Slot Detail */}
              {activeTab === 'slot-detail' && slotDetails && (
                <SlotDetail slot={slotDetails} onRefresh={() => loadSlotDetails(selectedSlot)} />
              )}

              {/* Profile */}
              {activeTab === 'profile' && (
                <ProfileView 
                  user={user} 
                  dashboard={dashboard}
                  onLogout={onLogout}
                  onChangePassword={() => setShowChangePassword(true)}
                />
              )}
            </>
          )}
        </div>
      </main>

      {/* Create Slot Modal */}
      {showCreateSlot && (
        <CreateSlotModal
          onClose={() => setShowCreateSlot(false)}
          onCreated={(slot) => {
            setShowCreateSlot(false);
            loadSlotDetails(slot.id);
          }}
        />
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePasswordModal
          onClose={() => setShowChangePassword(false)}
          onSuccess={() => setShowChangePassword(false)}
        />
      )}
    </div>
  );
}

function SlotDetail({ slot, onRefresh }) {
  const [uploading, setUploading] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
  const [showTableSidebar, setShowTableSidebar] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [bboxEntry, setBboxEntry] = useState(null); // Entry being edited in BBoxEditor
  const [bboxPredictions, setBboxPredictions] = useState([]);
  const [showCamera, setShowCamera] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null); // Image to be cropped before upload

  const handleFileSelect = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Convert file to data URL for cropping
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageToCrop(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = async (file) => {
    setUploading(true);
    try {
      await api.uploadEntry(slot.id, file);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
    setUploading(false);
  };

  const handleCroppedImage = (croppedBlob) => {
    const file = new File([croppedBlob], `cropped-${Date.now()}.jpg`, { type: 'image/jpeg' });
    setImageToCrop(null);
    handleFileUpload(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleCameraCapture = (e) => {
    e.stopPropagation();
    setShowCamera(true);
  };

  const handleCameraPhoto = (blob) => {
    // Convert blob to data URL for cropping
    if (!blob) {
      console.error('No blob received from camera');
      setShowCamera(false);
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target.result) {
        setImageToCrop(e.target.result);
      } else {
        console.error('Failed to read image data');
        alert('Failed to process captured image. Please try again.');
      }
    };
    reader.onerror = (err) => {
      console.error('FileReader error:', err);
      alert('Failed to process captured image. Please try again.');
    };
    reader.readAsDataURL(blob);
    setShowCamera(false);
  };

  const handleSubmitEntry = async (entryId) => {
    try {
      await api.submitEntry(entryId);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleOpenBBoxEditor = async (entry) => {
    try {
      // Try to get existing detections
      const data = await api.getEntryDetections(entry.id);
      if (data.detections && data.detections.length > 0) {
        setBboxPredictions(data.detections);
      } else {
        // Initialize from AI detection if no saved detections
        await api.initDetections(entry.id);
        const newData = await api.getEntryDetections(entry.id);
        setBboxPredictions(newData.detections || []);
      }
      setBboxEntry(entry);
    } catch (err) {
      console.error('Failed to load detections:', err);
      // Open with empty predictions
      setBboxPredictions([]);
      setBboxEntry(entry);
    }
  };

  const handleBBoxSave = (correctedBoxes) => {
    setBboxEntry(null);
    setBboxPredictions([]);
    onRefresh();
  };

  const handleDeleteEntry = async (entryId) => {
    if (!confirm('Delete this entry?')) return;
    try {
      await api.deleteEntry(entryId);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDownloadCsv = async () => {
    setDownloading(true);
    try {
      await api.downloadSlotCsv(slot.id);
    } catch (err) {
      alert(err.message);
    }
    setDownloading(false);
  };

  return (
    <div style={{ display: 'flex', gap: 'var(--space-6)' }}>
      {/* Main Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Upload Zone */}
        <div
          className={`upload-zone ${dragging ? 'dragging' : ''}`}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onClick={() => document.getElementById('file-upload').click()}
          style={{ marginBottom: 'var(--space-8)' }}
        >
          {uploading ? (
            <div className="loading-container" style={{ minHeight: 'auto', padding: 'var(--space-6)' }}>
              <div className="spinner"></div>
              <p className="loading-text">Processing image with AI...</p>
            </div>
          ) : (
            <>
              <div className="upload-icon"><Camera size={48} /></div>
              <h3 className="upload-title">Upload Thread Roll Image</h3>
              <p className="upload-subtitle">Drag & drop an image or click to browse</p>
              <div className="upload-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleCameraCapture}
                >
                  <Camera size={16} style={{marginRight: '4px'}} /> Take Photo
                </button>
                <button type="button" className="btn btn-secondary">
                  <FolderOpen size={16} style={{marginRight: '4px'}} /> Browse Files
                </button>
              </div>
            </>
          )}
          <input
            id="file-upload"
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files[0]) {
                handleFileSelect(e.target.files[0]);
                e.target.value = ''; // Reset to allow same file again
              }
            }}
          />
        </div>

        {/* Entries */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title"><FileText size={18} style={{marginRight: '8px'}} /> Entries ({slot.entries.length})</h3>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                className={`btn btn-sm ${viewMode === 'cards' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setViewMode('cards')}
                title="Card View"
              >
                <Grid3X3 size={16} />
              </button>
              <button
                className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setShowTableSidebar(true)}
                title="Table View"
              >
                <BarChart3 size={16} />
              </button>
              <button
                className="btn btn-sm btn-secondary"
                onClick={handleDownloadCsv}
                disabled={downloading || slot.entries.length === 0}
                title="Download CSV"
              >
                <Download size={16} /> CSV
              </button>
            </div>
          </div>
          <div className="card-body">
            {slot.entries.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><Camera size={48} /></div>
                <p className="empty-state-title">No entries yet</p>
                <p className="empty-state-text">Upload an image to start counting threads</p>
              </div>
            ) : (
              <div className="entries-list">
                {slot.entries.map((entry) => {
                  const imageUrl = entry.annotated_url || entry.image_url;
                  const fullImageUrl = api.getImageUrl(imageUrl);

                  // Debug log for first entry
                  if (slot.entries[0]?.id === entry.id) {
                    console.log('First entry image data:', {
                      entry_id: entry.id,
                      image_url: entry.image_url,
                      annotated_url: entry.annotated_url,
                      resolved_url: fullImageUrl,
                      full_entry: entry
                    });
                  }

                  return (
                  <div key={entry.id} className="entry-card">
                    <div className="entry-image">
                      {imageUrl ? (
                        <img
                          src={fullImageUrl}
                          alt="Thread Roll Entry"
                          className="entry-thumbnail"
                          onError={(e) => {
                            console.error('Image failed to load:', {
                              annotated_url: entry.annotated_url,
                              image_url: entry.image_url,
                              resolved_url: fullImageUrl,
                              entry_id: entry.id
                            });
                            // Try fallback to original image if annotated fails
                            if (entry.annotated_url && e.target.src.includes(entry.annotated_url)) {
                              e.target.src = api.getImageUrl(entry.image_url);
                            } else {
                              // Show a placeholder
                              e.target.style.display = 'none';
                              const placeholder = document.createElement('div');
                              placeholder.className = 'image-placeholder';
                              placeholder.textContent = 'Image unavailable';
                              e.target.parentNode.appendChild(placeholder);
                            }
                          }}
                          onLoad={() => {
                            console.log('Image loaded successfully:', entry.id);
                          }}
                        />
                      ) : (
                        <div className="image-placeholder">
                          No image available
                        </div>
                      )}
                    </div>
                    <div className="entry-content">
                      <div className="entry-header">
                        <span className="entry-count">{entry.final_count}</span>
                        <span className="entry-count-label">threads</span>
                        {entry.is_submitted && <span className="badge badge-success">✓ Submitted</span>}
                      </div>
                      <div className="entry-colors">
                        {Object.entries(entry.final_colors || {}).map(([color, count]) => (
                          <div key={color} className="color-tag">
                            <div className="color-dot" style={{ backgroundColor: getColorHex(color) }}></div>
                            <span className="color-name">{color}</span>
                            <span className="color-value">{count}</span>
                          </div>
                        ))}
                      </div>
                      <div className="entry-meta">
                        <div className="entry-meta-item">
                          <Clock size={14} />
                          {formatDate(entry.created_at)}
                        </div>
                        <div className="entry-meta-item">
                          <User size={14} />
                          {entry.user}
                        </div>
                        <div className="entry-meta-item">
                          <Activity size={14} />
                          {entry.processing_time}s
                        </div>
                      </div>
                      {/* Edit History Info */}
                      {entry.last_edited_by && (
                        <div className="entry-meta" style={{ marginTop: 'var(--space-2)', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--border-color)' }}>
                          <div className="entry-meta-item" style={{ color: 'var(--warning-500)' }}>
                            <Edit3 size={14} />
                            Edited by {entry.last_edited_by}
                          </div>
                          <div className="entry-meta-item">
                            <Clock size={14} />
                            {formatDate(entry.last_edited_at)}
                          </div>
                          {entry.edit_count > 0 && (
                            <div className="entry-meta-item">
                              <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                                {entry.edit_count} edit{entry.edit_count > 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="entry-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditingEntry(entry)}>
                        <Edit3 size={14} /> Edit
                      </button>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => handleOpenBBoxEditor(entry)}
                        title="Edit bounding boxes"
                      >
                        <Target size={14} /> Boxes
                      </button>
                      {!entry.is_submitted && (
                        <button className="btn btn-success btn-sm" onClick={() => handleSubmitEntry(entry.id)}>
                          <CheckCircle size={14} /> Submit
                        </button>
                      )}
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteEntry(entry.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table View Sidebar */}
      {showTableSidebar && (
        <TableViewSidebar
          slot={slot}
          onClose={() => setShowTableSidebar(false)}
          onDownloadCsv={handleDownloadCsv}
          downloading={downloading}
        />
      )}

      {/* Edit Entry Modal */}
      {editingEntry && (
        <EditEntryModal
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSave={() => {
            setEditingEntry(null);
            onRefresh();
          }}
        />
      )}

      {/* Bounding Box Editor */}
      {bboxEntry && (
        <BBoxEditor
          imageUrl={api.getImageUrl(bboxEntry.image_url)}
          entryId={bboxEntry.id}
          predictions={bboxPredictions}
          onSave={handleBBoxSave}
          onClose={() => {
            setBboxEntry(null);
            setBboxPredictions([]);
          }}
        />
      )}

      {/* Camera Modal */}
      {showCamera && (
        <CameraModal
          onCapture={handleCameraPhoto}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Crop Modal */}
      {imageToCrop && (
        <ImageCropModal
          imageData={imageToCrop}
          onCrop={handleCroppedImage}
          onClose={() => setImageToCrop(null)}
        />
      )}
    </div>
  );
}

function TableViewSidebar({ slot, onClose, onDownloadCsv, downloading }) {
  const [editHistory, setEditHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    loadEditHistory();
  }, [slot.id]);

  const loadEditHistory = async () => {
    setLoadingHistory(true);
    try {
      const history = await api.getSlotEditHistory(slot.id);
      setEditHistory(history);
    } catch (err) {
      console.error('Failed to load edit history:', err);
    }
    setLoadingHistory(false);
  };

  const totalThreads = slot.entries.reduce((sum, e) => sum + e.final_count, 0);
  const submittedCount = slot.entries.filter(e => e.is_submitted).length;

  return (
    <div className="table-sidebar-overlay" onClick={onClose}>
      <div className="table-sidebar" onClick={(e) => e.stopPropagation()}>
        <div className="table-sidebar-header">
          <h3><BarChart3 size={18} style={{marginRight: '8px'}} /> {slot.name} - Table View</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Summary Stats */}
        <div className="table-sidebar-stats">
          <div className="stat-mini">
            <span className="stat-mini-value">{slot.entries.length}</span>
            <span className="stat-mini-label">Entries</span>
          </div>
          <div className="stat-mini">
            <span className="stat-mini-value">{totalThreads}</span>
            <span className="stat-mini-label">Total Threads</span>
          </div>
          <div className="stat-mini">
            <span className="stat-mini-value">{submittedCount}</span>
            <span className="stat-mini-label">Submitted</span>
          </div>
        </div>

        {/* Download Button */}
        <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border-color)' }}>
          <button
            className="btn btn-primary btn-block"
            onClick={onDownloadCsv}
            disabled={downloading || slot.entries.length === 0}
          >
            {downloading ? 'Downloading...' : <><Download size={16} style={{marginRight: '4px'}} /> Download CSV</>}
          </button>
        </div>

        {/* Entries Table */}
        <div className="table-sidebar-content">
          <h4 style={{ padding: 'var(--space-3)', margin: 0, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={16} /> Entries
          </h4>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Count</th>
                  <th>Colors</th>
                  <th>Status</th>
                  <th>Uploaded By</th>
                  <th>Last Edited</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {slot.entries.map((entry, idx) => (
                  <tr key={entry.id}>
                    <td>{idx + 1}</td>
                    <td style={{ fontWeight: 600 }}>{entry.final_count}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
                        {Object.entries(entry.final_colors || {}).map(([color, count]) => (
                          <span
                            key={color}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              fontSize: '0.7rem',
                              padding: '1px 4px',
                              background: 'var(--bg-tertiary)',
                              borderRadius: '4px'
                            }}
                          >
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: getColorHex(color)
                              }}
                            />
                            {count}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      {entry.is_submitted ? (
                        <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>✓</span>
                      ) : (
                        <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>Pending</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.75rem' }}>{entry.user}</td>
                    <td style={{ fontSize: '0.75rem' }}>
                      {entry.last_edited_by ? (
                        <span style={{ color: 'var(--warning-500)' }}>
                          {entry.last_edited_by}
                        </span>
                      ) : '-'}
                    </td>
                    <td style={{ fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                      {formatDate(entry.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Edit History */}
          <h4 style={{ padding: 'var(--space-3)', margin: 0, background: 'var(--bg-secondary)', marginTop: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Edit3 size={16} /> Edit History
          </h4>
          <div className="edit-history-list">
            {loadingHistory ? (
              <div style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
                <div className="spinner" style={{ width: 24, height: 24 }}></div>
              </div>
            ) : editHistory.length === 0 ? (
              <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--text-muted)' }}>
                No edits yet
              </div>
            ) : (
              editHistory.slice(0, 20).map((h) => (
                <div key={h.id} className="edit-history-item">
                  <div className="edit-history-header">
                    <span className="edit-history-user"><User size={14} style={{marginRight: '4px'}} /> {h.user}</span>
                    <span className="edit-history-time">{formatDate(h.timestamp)}</span>
                  </div>
                  <div className="edit-history-detail">
                    <span className="edit-history-field">
                      {h.field_changed === 'count' ? '🔢 Count' : '🎨 Colors'}
                    </span>
                    <span className="edit-history-change">
                      {h.field_changed === 'count' ? (
                        <>
                          <span style={{ color: 'var(--danger-500)' }}>{h.old_value}</span>
                          {' → '}
                          <span style={{ color: 'var(--success-500)' }}>{h.new_value}</span>
                        </>
                      ) : (
                        <span style={{ fontSize: '0.7rem' }}>Colors updated</span>
                      )}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateSlotModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const slot = await api.createSlot(name, description);
      onCreated(slot);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title"><Plus size={18} style={{marginRight: '8px'}} /> Create New Slot</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="login-error">⚠️ {error}</div>}

            <div className="form-group">
              <label className="form-label">Slot Name *</label>
              <input
                type="text"
                className="form-input form-input-simple"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Rack A, Morning Shift, Section 1"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <textarea
                className="form-input form-input-simple"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add notes about this slot..."
                rows={3}
                style={{ resize: 'vertical', minHeight: 80 }}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Slot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditEntryModal({ entry, onClose, onSave }) {
  const [finalCount, setFinalCount] = useState(entry.final_count);
  const [colors, setColors] = useState(entry.final_colors || {});
  const [loading, setLoading] = useState(false);
  const [editingColorName, setEditingColorName] = useState(null);
  const [newColorName, setNewColorName] = useState('');
  const [wronglyMarked, setWronglyMarked] = useState(entry.wrongly_marked || 0);

  const handleColorChange = (colorName, value) => {
    setColors((prev) => ({
      ...prev,
      [colorName]: parseInt(value) || 0,
    }));
  };

  const addColor = () => {
    const colorName = prompt('Enter color name:');
    if (colorName && !colors[colorName]) {
      setColors((prev) => ({ ...prev, [colorName.toLowerCase()]: 0 }));
    }
  };

  const removeColor = (colorName) => {
    setColors((prev) => {
      const newColors = { ...prev };
      delete newColors[colorName];
      return newColors;
    });
  };

  const startEditingColorName = (colorName) => {
    setEditingColorName(colorName);
    setNewColorName(colorName);
  };

  const saveColorNameEdit = (oldColorName) => {
    if (newColorName && newColorName !== oldColorName && !colors[newColorName.toLowerCase()]) {
      setColors((prev) => {
        const newColors = { ...prev };
        const count = newColors[oldColorName];
        delete newColors[oldColorName];
        newColors[newColorName.toLowerCase()] = count;
        return newColors;
      });
    }
    setEditingColorName(null);
    setNewColorName('');
  };

  const cancelColorNameEdit = () => {
    setEditingColorName(null);
    setNewColorName('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.updateEntry(entry.id, {
        final_count: finalCount,
        final_colors: colors,
        wrongly_marked: wronglyMarked,
      });
      onSave();
    } catch (err) {
      alert(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title"><Edit3 size={18} style={{marginRight: '8px'}} /> Edit Entry</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Image Preview */}
            <div className="image-grid mb-6">
              <div className="image-box">
                <div className="image-box-title">ORIGINAL</div>
                <img 
                  src={api.getImageUrl(entry.image_url)} 
                  alt="Original" 
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-muted);">Original</div>';
                  }}
                />
              </div>
              <div className="image-box">
                <div className="image-box-title">DETECTED</div>
                <img 
                  src={api.getImageUrl(entry.annotated_url || entry.image_url)} 
                  alt="Annotated" 
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-muted);">Annotated</div>';
                  }}
                />
              </div>
            </div>

            {/* Count */}
            <div className="form-group">
              <label className="form-label">
                Total Thread Count
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 'var(--space-4)',
                marginBottom: 'var(--space-3)',
                padding: 'var(--space-3)',
                background: 'rgba(59, 130, 246, 0.05)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(59, 130, 246, 0.1)'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 'var(--space-1)', textTransform: 'uppercase' }}>
                    🤖 AI Detected
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--sapphire-500)' }}>
                    {entry.detected_count}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 'var(--space-1)', textTransform: 'uppercase' }}>
                    Your Count
                  </div>
                  <input
                    type="number"
                    className="form-input form-input-simple"
                    value={finalCount}
                    onChange={(e) => setFinalCount(parseInt(e.target.value) || 0)}
                    min={0}
                    style={{ fontSize: '1.5rem', fontWeight: 700, padding: '0.5rem', height: 'auto' }}
                  />
                </div>
              </div>
              {finalCount !== entry.detected_count && (
                <div style={{
                  padding: 'var(--space-2) var(--space-3)',
                  background: finalCount > entry.detected_count ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem',
                  color: finalCount > entry.detected_count ? '#22c55e' : '#ef4444'
                }}>
                  {finalCount > entry.detected_count ? '▲' : '▼'} Difference: {Math.abs(finalCount - entry.detected_count)} threads
                </div>
              )}
            </div>

            {/* Wrongly Marked Feedback */}
            <div className="form-group">
              <label className="form-label">
                ⚠️ AI Detection Feedback
              </label>
              <div style={{
                padding: 'var(--space-3)',
                background: 'rgba(245, 158, 11, 0.08)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(245, 158, 11, 0.2)'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 'var(--space-3)',
                  marginBottom: 'var(--space-2)'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 'var(--space-1)', textTransform: 'uppercase' }}>
                      Wrongly Marked by AI
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                      How many circles are incorrectly placed or missing?
                    </p>
                  </div>
                  <input
                    type="number"
                    className="form-input form-input-simple"
                    value={wronglyMarked}
                    onChange={(e) => setWronglyMarked(parseInt(e.target.value) || 0)}
                    min={0}
                    style={{ 
                      width: 80, 
                      textAlign: 'center', 
                      fontWeight: 600,
                      fontSize: '1.2rem',
                      background: 'var(--bg-primary)'
                    }}
                  />
                </div>
                {wronglyMarked > 0 && (
                  <div style={{
                    padding: 'var(--space-2)',
                    background: 'rgba(245, 158, 11, 0.15)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8rem',
                    color: '#f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)'
                  }}>
                    <BarChart3 size={14} />
                    AI Accuracy: {entry.detected_count > 0 ? Math.round(((entry.detected_count - wronglyMarked) / entry.detected_count) * 100) : 0}%
                    ({entry.detected_count - wronglyMarked} correct out of {entry.detected_count} detected)
                  </div>
                )}
              </div>
            </div>

            {/* Colors */}
            <div className="form-group">
              <div className="flex justify-between items-center mb-4">
                <label className="form-label" style={{ marginBottom: 0 }}>
                  Color Breakdown
                </label>
                <button type="button" className="btn btn-secondary btn-sm" onClick={addColor}>
                  <Plus size={14} style={{marginRight: '4px'}} /> Add Color
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {Object.entries(colors).map(([color, count]) => (
                  <div key={color} className="flex items-center gap-3">
                    <div
                      className="color-dot"
                      style={{
                        backgroundColor: getColorHex(color),
                        width: 28,
                        height: 28,
                        flexShrink: 0,
                      }}
                    ></div>
                    {editingColorName === color ? (
                      <div style={{ flex: 1, display: 'flex', gap: 'var(--space-2)' }}>
                        <input
                          type="text"
                          className="form-input form-input-simple"
                          style={{ flex: 1, textTransform: 'capitalize' }}
                          value={newColorName}
                          onChange={(e) => setNewColorName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveColorNameEdit(color);
                            if (e.key === 'Escape') cancelColorNameEdit();
                          }}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="btn btn-success btn-sm btn-icon"
                          onClick={() => saveColorNameEdit(color)}
                          title="Save"
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm btn-icon"
                          onClick={cancelColorNameEdit}
                          title="Cancel"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <span
                        style={{
                          flex: 1,
                          textTransform: 'capitalize',
                          fontWeight: 500,
                          cursor: 'pointer',
                          padding: 'var(--space-2)',
                          borderRadius: 'var(--radius-md)',
                          transition: 'background 0.2s',
                        }}
                        onClick={() => startEditingColorName(color)}
                        onMouseEnter={(e) => (e.target.style.background = 'rgba(59, 130, 246, 0.1)')}
                        onMouseLeave={(e) => (e.target.style.background = 'transparent')}
                        title="Click to edit color name"
                      >
                        {color}
                      </span>
                    )}
                    <input
                      type="number"
                      className="form-input form-input-simple"
                      style={{ width: 100, textAlign: 'center', fontWeight: 600 }}
                      value={count}
                      onChange={(e) => handleColorChange(color, e.target.value)}
                      min={0}
                    />
                    <button type="button" className="btn btn-danger btn-sm btn-icon" onClick={() => removeColor(color)}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ImageCropModal({ imageData, onCrop, onClose }) {
  const canvasRef = useRef(null);
  const [image, setImage] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null); // 'nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cropStart, setCropStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const img = document.createElement('img');
    img.onload = () => {
      setImage(img);
      // Initialize crop area to cover 80% of image from center
      const width = img.width * 0.8;
      const height = img.height * 0.8;
      const x = (img.width - width) / 2;
      const y = (img.height - height) / 2;
      setCrop({ x, y, width, height });
      setImageLoaded(true);
    };
    img.onerror = () => {
      console.error('Failed to load image for cropping');
      alert('Failed to load image. Please try again.');
      onClose();
    };
    img.src = imageData;
  }, [imageData, onClose]);

  useEffect(() => {
    if (!image || !canvasRef.current || !imageLoaded) return;
    drawCanvas();
  }, [image, crop, scale, imageLoaded]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    const maxWidth = 800;
    const maxHeight = 600;

    let displayWidth = image.width;
    let displayHeight = image.height;

    // Scale down large images to fit canvas
    if (displayWidth > maxWidth || displayHeight > maxHeight) {
      const ratio = Math.min(maxWidth / displayWidth, maxHeight / displayHeight);
      displayWidth *= ratio;
      displayHeight *= ratio;
      setScale(ratio);
    }

    canvas.width = displayWidth;
    canvas.height = displayHeight;

    // Draw image
    ctx.drawImage(image, 0, 0, displayWidth, displayHeight);

    // Draw semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // Clear crop area (make it visible)
    const scaledCrop = {
      x: crop.x * scale,
      y: crop.y * scale,
      width: crop.width * scale,
      height: crop.height * scale
    };

    ctx.clearRect(scaledCrop.x, scaledCrop.y, scaledCrop.width, scaledCrop.height);
    ctx.drawImage(
      image,
      crop.x, crop.y, crop.width, crop.height,
      scaledCrop.x, scaledCrop.y, scaledCrop.width, scaledCrop.height
    );

    // Draw crop border
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.strokeRect(scaledCrop.x, scaledCrop.y, scaledCrop.width, scaledCrop.height);

    // Draw resize handles (corners and edges)
    // Make handles larger on touch devices for better usability
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const handleSize = isTouchDevice ? 32 : 16;  // Larger for easier mobile interaction
    const edgeHandleSize = isTouchDevice ? 28 : 12;  // Larger for easier mobile interaction
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = isTouchDevice ? 4 : 2;  // Thicker border on mobile

    // Add glow effect on mobile for better visibility
    if (isTouchDevice) {
      ctx.shadowColor = 'rgba(59, 130, 246, 0.6)';
      ctx.shadowBlur = 8;
    }

    // Corner handles (bigger circles)
    const corners = [
      { x: scaledCrop.x, y: scaledCrop.y, cursor: 'nw' },
      { x: scaledCrop.x + scaledCrop.width, y: scaledCrop.y, cursor: 'ne' },
      { x: scaledCrop.x, y: scaledCrop.y + scaledCrop.height, cursor: 'sw' },
      { x: scaledCrop.x + scaledCrop.width, y: scaledCrop.y + scaledCrop.height, cursor: 'se' }
    ];
    corners.forEach(corner => {
      ctx.beginPath();
      ctx.arc(corner.x, corner.y, handleSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // Edge handles (smaller squares)
    const edges = [
      { x: scaledCrop.x + scaledCrop.width / 2, y: scaledCrop.y, cursor: 'n' }, // top
      { x: scaledCrop.x + scaledCrop.width / 2, y: scaledCrop.y + scaledCrop.height, cursor: 's' }, // bottom
      { x: scaledCrop.x, y: scaledCrop.y + scaledCrop.height / 2, cursor: 'w' }, // left
      { x: scaledCrop.x + scaledCrop.width, y: scaledCrop.y + scaledCrop.height / 2, cursor: 'e' } // right
    ];
    edges.forEach(edge => {
      ctx.fillRect(edge.x - edgeHandleSize / 2, edge.y - edgeHandleSize / 2, edgeHandleSize, edgeHandleSize);
      ctx.strokeRect(edge.x - edgeHandleSize / 2, edge.y - edgeHandleSize / 2, edgeHandleSize, edgeHandleSize);
    });

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  };

  const getHandleAtPosition = (x, y, isTouchEvent = false) => {
    const scaledCrop = {
      x: crop.x * scale,
      y: crop.y * scale,
      width: crop.width * scale,
      height: crop.height * scale
    };

    const handleSize = 16;
    const edgeHandleSize = 12;
    // Increase tolerance significantly for touch events (mobile)
    // 50px tolerance matches larger touch handles and average finger size
    const tolerance = isTouchEvent ? 50 : handleSize;

    // Check corner handles
    const corners = [
      { x: scaledCrop.x, y: scaledCrop.y, type: 'nw' },
      { x: scaledCrop.x + scaledCrop.width, y: scaledCrop.y, type: 'ne' },
      { x: scaledCrop.x, y: scaledCrop.y + scaledCrop.height, type: 'sw' },
      { x: scaledCrop.x + scaledCrop.width, y: scaledCrop.y + scaledCrop.height, type: 'se' }
    ];

    for (const corner of corners) {
      if (Math.abs(x - corner.x) < tolerance && Math.abs(y - corner.y) < tolerance) {
        return corner.type;
      }
    }

    // Check edge handles
    const edges = [
      { x: scaledCrop.x + scaledCrop.width / 2, y: scaledCrop.y, type: 'n' },
      { x: scaledCrop.x + scaledCrop.width / 2, y: scaledCrop.y + scaledCrop.height, type: 's' },
      { x: scaledCrop.x, y: scaledCrop.y + scaledCrop.height / 2, type: 'w' },
      { x: scaledCrop.x + scaledCrop.width, y: scaledCrop.y + scaledCrop.height / 2, type: 'e' }
    ];

    for (const edge of edges) {
      if (Math.abs(x - edge.x) < tolerance && Math.abs(y - edge.y) < tolerance) {
        return edge.type;
      }
    }

    // Check if inside crop area (for moving)
    if (x > scaledCrop.x && x < scaledCrop.x + scaledCrop.width &&
        y > scaledCrop.y && y < scaledCrop.y + scaledCrop.height) {
      return 'move';
    }

    return null;
  };

  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    // Scale coordinates to match canvas internal resolution
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const handle = getHandleAtPosition(x, y);

    if (handle && handle !== 'move') {
      setIsResizing(true);
      setResizeHandle(handle);
      setCropStart({ ...crop });
    } else if (handle === 'move') {
      setIsDragging(true);
    }

    setDragStart({ x, y });
  };

  const handleMouseMove = (e) => {
    if (!image) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    // Scale coordinates to match canvas internal resolution
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (isResizing) {
      const dx = (x - dragStart.x) / scale;
      const dy = (y - dragStart.y) / scale;

      setCrop(prev => {
        let newCrop = { ...prev };
        const minSize = 50; // Minimum crop size

        switch (resizeHandle) {
          case 'nw': // Top-left
            newCrop.x = Math.max(0, Math.min(cropStart.x + dx, cropStart.x + cropStart.width - minSize));
            newCrop.y = Math.max(0, Math.min(cropStart.y + dy, cropStart.y + cropStart.height - minSize));
            newCrop.width = cropStart.width + (cropStart.x - newCrop.x);
            newCrop.height = cropStart.height + (cropStart.y - newCrop.y);
            break;
          case 'ne': // Top-right
            newCrop.y = Math.max(0, Math.min(cropStart.y + dy, cropStart.y + cropStart.height - minSize));
            newCrop.width = Math.max(minSize, Math.min(cropStart.width + dx, image.width - cropStart.x));
            newCrop.height = cropStart.height + (cropStart.y - newCrop.y);
            break;
          case 'sw': // Bottom-left
            newCrop.x = Math.max(0, Math.min(cropStart.x + dx, cropStart.x + cropStart.width - minSize));
            newCrop.width = cropStart.width + (cropStart.x - newCrop.x);
            newCrop.height = Math.max(minSize, Math.min(cropStart.height + dy, image.height - cropStart.y));
            break;
          case 'se': // Bottom-right
            newCrop.width = Math.max(minSize, Math.min(cropStart.width + dx, image.width - cropStart.x));
            newCrop.height = Math.max(minSize, Math.min(cropStart.height + dy, image.height - cropStart.y));
            break;
          case 'n': // Top edge
            newCrop.y = Math.max(0, Math.min(cropStart.y + dy, cropStart.y + cropStart.height - minSize));
            newCrop.height = cropStart.height + (cropStart.y - newCrop.y);
            break;
          case 's': // Bottom edge
            newCrop.height = Math.max(minSize, Math.min(cropStart.height + dy, image.height - cropStart.y));
            break;
          case 'w': // Left edge
            newCrop.x = Math.max(0, Math.min(cropStart.x + dx, cropStart.x + cropStart.width - minSize));
            newCrop.width = cropStart.width + (cropStart.x - newCrop.x);
            break;
          case 'e': // Right edge
            newCrop.width = Math.max(minSize, Math.min(cropStart.width + dx, image.width - cropStart.x));
            break;
        }

        return newCrop;
      });
    } else if (isDragging) {
      const dx = (x - dragStart.x) / scale;
      const dy = (y - dragStart.y) / scale;

      setCrop(prev => {
        let newX = prev.x + dx;
        let newY = prev.y + dy;

        // Keep crop within image bounds
        newX = Math.max(0, Math.min(newX, image.width - prev.width));
        newY = Math.max(0, Math.min(newY, image.height - prev.height));

        return { ...prev, x: newX, y: newY };
      });

      setDragStart({ x, y });
    } else {
      // Update cursor based on hover position
      const handle = getHandleAtPosition(x, y);
      if (handle) {
        const cursorMap = {
          'nw': 'nw-resize',
          'ne': 'ne-resize',
          'sw': 'sw-resize',
          'se': 'se-resize',
          'n': 'n-resize',
          's': 's-resize',
          'e': 'e-resize',
          'w': 'w-resize',
          'move': 'move'
        };
        canvas.style.cursor = cursorMap[handle];
      } else {
        canvas.style.cursor = 'default';
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  };

  const handleCrop = () => {
    if (!image) return;

    // Create a new canvas for the cropped image
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = crop.width;
    cropCanvas.height = crop.height;
    const ctx = cropCanvas.getContext('2d');

    // Draw cropped portion
    ctx.drawImage(
      image,
      crop.x, crop.y, crop.width, crop.height,
      0, 0, crop.width, crop.height
    );

    // Convert to blob
    cropCanvas.toBlob((blob) => {
      if (blob) {
        onCrop(blob);
      }
    }, 'image/jpeg', 0.95);
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="crop-modal-title"
    >
      <div
        className="modal modal-crop"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '90vw', width: 'auto' }}
      >
        <div className="modal-header">
          <h3 id="crop-modal-title" className="modal-title">✂️ Crop Image</h3>
          <button
            className="modal-close"
            onClick={onClose}
            tabIndex="0"
            aria-label="Close crop modal"
          >
            ✕
          </button>
        </div>

        <div style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
          {!imageLoaded ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p className="loading-text">Loading image...</p>
            </div>
          ) : (
            <>
              <p className="crop-helper-text">
                <span style={{ display: 'block', fontWeight: '600', marginBottom: '4px' }}>
                  👆 Touch & Drag to Crop
                </span>
                <span style={{ fontSize: '0.75rem', opacity: '0.9' }}>
                  Drag corners to resize • Drag center to move
                </span>
              </p>
              <canvas
                ref={canvasRef}
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  cursor: 'default',
                  maxWidth: '100%',
                  display: 'block',
                  margin: '0 auto',
                  touchAction: 'none'
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={(e) => {
                  e.preventDefault(); // Prevent default touch behavior
                  const touch = e.touches[0];
                  const canvas = canvasRef.current;
                  const rect = canvas.getBoundingClientRect();
                  // Scale coordinates to match canvas internal resolution
                  const scaleX = canvas.width / rect.width;
                  const scaleY = canvas.height / rect.height;
                  const x = (touch.clientX - rect.left) * scaleX;
                  const y = (touch.clientY - rect.top) * scaleY;

                  // Add visual feedback for touch
                  canvas.classList.add('touching');
                  setTimeout(() => canvas.classList.remove('touching'), 200);

                  const handle = getHandleAtPosition(x, y, true); // Pass true for touch event

                  if (handle && handle !== 'move') {
                    setIsResizing(true);
                    setResizeHandle(handle);
                    setCropStart({ ...crop });
                  } else if (handle === 'move') {
                    setIsDragging(true);
                  }

                  setDragStart({ x, y });
                }}
                onTouchMove={(e) => {
                  if ((!isDragging && !isResizing) || !image) return;
                  e.preventDefault();
                  const touch = e.touches[0];
                  const canvas = canvasRef.current;
                  const rect = canvas.getBoundingClientRect();
                  // Scale coordinates to match canvas internal resolution
                  const scaleX = canvas.width / rect.width;
                  const scaleY = canvas.height / rect.height;
                  const x = (touch.clientX - rect.left) * scaleX;
                  const y = (touch.clientY - rect.top) * scaleY;

                  if (isResizing) {
                    const dx = (x - dragStart.x) / scale;
                    const dy = (y - dragStart.y) / scale;

                    setCrop(prev => {
                      let newCrop = { ...prev };
                      const minSize = 50;

                      switch (resizeHandle) {
                        case 'nw':
                          newCrop.x = Math.max(0, Math.min(cropStart.x + dx, cropStart.x + cropStart.width - minSize));
                          newCrop.y = Math.max(0, Math.min(cropStart.y + dy, cropStart.y + cropStart.height - minSize));
                          newCrop.width = cropStart.width + (cropStart.x - newCrop.x);
                          newCrop.height = cropStart.height + (cropStart.y - newCrop.y);
                          break;
                        case 'ne':
                          newCrop.y = Math.max(0, Math.min(cropStart.y + dy, cropStart.y + cropStart.height - minSize));
                          newCrop.width = Math.max(minSize, Math.min(cropStart.width + dx, image.width - cropStart.x));
                          newCrop.height = cropStart.height + (cropStart.y - newCrop.y);
                          break;
                        case 'sw':
                          newCrop.x = Math.max(0, Math.min(cropStart.x + dx, cropStart.x + cropStart.width - minSize));
                          newCrop.width = cropStart.width + (cropStart.x - newCrop.x);
                          newCrop.height = Math.max(minSize, Math.min(cropStart.height + dy, image.height - cropStart.y));
                          break;
                        case 'se':
                          newCrop.width = Math.max(minSize, Math.min(cropStart.width + dx, image.width - cropStart.x));
                          newCrop.height = Math.max(minSize, Math.min(cropStart.height + dy, image.height - cropStart.y));
                          break;
                        case 'n':
                          newCrop.y = Math.max(0, Math.min(cropStart.y + dy, cropStart.y + cropStart.height - minSize));
                          newCrop.height = cropStart.height + (cropStart.y - newCrop.y);
                          break;
                        case 's':
                          newCrop.height = Math.max(minSize, Math.min(cropStart.height + dy, image.height - cropStart.y));
                          break;
                        case 'w':
                          newCrop.x = Math.max(0, Math.min(cropStart.x + dx, cropStart.x + cropStart.width - minSize));
                          newCrop.width = cropStart.width + (cropStart.x - newCrop.x);
                          break;
                        case 'e':
                          newCrop.width = Math.max(minSize, Math.min(cropStart.width + dx, image.width - cropStart.x));
                          break;
                      }

                      return newCrop;
                    });
                  } else if (isDragging) {
                    const dx = (x - dragStart.x) / scale;
                    const dy = (y - dragStart.y) / scale;
                    setCrop(prev => {
                      let newX = prev.x + dx;
                      let newY = prev.y + dy;
                      newX = Math.max(0, Math.min(newX, image.width - prev.width));
                      newY = Math.max(0, Math.min(newY, image.height - prev.height));
                      return { ...prev, x: newX, y: newY };
                    });
                    setDragStart({ x, y });
                  }
                }}
                onTouchEnd={() => {
                  setIsDragging(false);
                  setIsResizing(false);
                  setResizeHandle(null);
                }}
              />
            </>
          )}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            tabIndex="0"
            aria-label="Cancel cropping"
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCrop}
            disabled={!imageLoaded}
            tabIndex="0"
            aria-label="Crop and upload image"
          >
            ✂️ Crop & Upload
          </button>
        </div>
      </div>
    </div>
  );
}

function CameraModal({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState('');
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use rear camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Unable to access camera. Please grant camera permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    setCapturing(true);

    // Set canvas dimensions to match video
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;

    // Draw video frame to canvas
    const ctx = canvasRef.current.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);

    // Convert canvas to blob
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        onCapture(blob);
        stopCamera();
      }
      setCapturing(false);
    }, 'image/jpeg', 0.95);
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal modal-camera"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '90vw',
          width: 'auto',
          background: '#000'
        }}
      >
        <div className="modal-header" style={{ background: 'rgba(0,0,0,0.8)', color: '#fff' }}>
          <h3 className="modal-title"><Camera size={18} style={{marginRight: '8px'}} /> Take Photo</h3>
          <button
            className="modal-close"
            onClick={handleClose}
            style={{ color: '#fff' }}
          >
            ✕
          </button>
        </div>

        <div style={{ position: 'relative', background: '#000' }}>
          {error ? (
            <div style={{
              padding: 'var(--space-8)',
              textAlign: 'center',
              color: '#fff'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}><Camera size={48} /></div>
              <p style={{ marginBottom: 'var(--space-4)' }}>{error}</p>
              <button className="btn btn-secondary" onClick={handleClose}>
                Close
              </button>
            </div>
          ) : (
            <>
              <video
                ref={(el) => {
                  if (el && stream) {
                    el.srcObject = stream;
                    el.play();
                  }
                  videoRef.current = el;
                }}
                autoPlay
                playsInline
                style={{
                  width: '100%',
                  maxHeight: '70vh',
                  display: 'block'
                }}
              />
              <canvas
                ref={(el) => { canvasRef.current = el; }}
                style={{ display: 'none' }}
              />
            </>
          )}
        </div>

        {!error && (
          <div
            className="modal-footer"
            style={{
              background: 'rgba(0,0,0,0.8)',
              display: 'flex',
              gap: 'var(--space-3)',
              justifyContent: 'center',
              padding: 'var(--space-5)'
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={capturePhoto}
              disabled={capturing || !stream}
              style={{ minWidth: 150 }}
            >
              {capturing ? 'Capturing...' : <><Camera size={18} style={{marginRight: '4px'}} /> Capture</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Profile View Component
function ProfileView({ user, dashboard, onLogout, onChangePassword }) {
  return (
    <div className="profile-container">
      {/* Profile Header Card */}
      <div className="profile-header-card">
        <div className="profile-avatar-large">
          {user.username[0].toUpperCase()}
        </div>
        <div className="profile-info">
          <h2 className="profile-name">{user.username}</h2>
          <span className="profile-role-badge">{user.role}</span>
        </div>
      </div>

      {/* Stats Summary */}
      {dashboard && (
        <div className="profile-stats-card">
          <h3 className="profile-section-title"><BarChart3 size={18} style={{marginRight: '8px'}} /> Your Statistics</h3>
          <div className="profile-stats-grid">
            <div className="profile-stat-item">
              <span className="profile-stat-value">{dashboard.total_slots}</span>
              <span className="profile-stat-label">Slots</span>
            </div>
            <div className="profile-stat-item">
              <span className="profile-stat-value">{dashboard.total_entries}</span>
              <span className="profile-stat-label">Entries</span>
            </div>
            <div className="profile-stat-item">
              <span className="profile-stat-value">{dashboard.submitted_entries}</span>
              <span className="profile-stat-label">Submitted</span>
            </div>
            <div className="profile-stat-item">
              <span className="profile-stat-value">{dashboard.total_threads}</span>
              <span className="profile-stat-label">Threads</span>
            </div>
          </div>
        </div>
      )}

      {/* Account Settings */}
      <div className="profile-settings-card">
        <h3 className="profile-section-title"><Settings size={18} style={{marginRight: '8px'}} /> Account Settings</h3>
        <div className="profile-settings-list">
          <button className="profile-setting-item" onClick={onChangePassword}>
            <span className="profile-setting-icon"><Lock size={18} /></span>
            <span className="profile-setting-text">Change Password</span>
            <span className="profile-setting-arrow"><ChevronRight size={18} /></span>
          </button>
        </div>
      </div>

      {/* App Info */}
      <div className="profile-info-card">
        <h3 className="profile-section-title"><Info size={18} style={{marginRight: '8px'}} /> About</h3>
        <div className="profile-info-list">
          <div className="profile-info-item">
            <span className="profile-info-label">App Version</span>
            <span className="profile-info-value">2.0.0</span>
          </div>
          <div className="profile-info-item">
            <span className="profile-info-label">Account Type</span>
            <span className="profile-info-value" style={{ textTransform: 'capitalize' }}>{user.role}</span>
          </div>
        </div>
      </div>

      {/* Logout Button */}
      <button className="profile-logout-btn" onClick={onLogout}>
        <LogOut size={18} style={{marginRight: '8px'}} /> Sign Out
      </button>
    </div>
  );
}

// Change Password Modal
function ChangePasswordModal({ onClose, onSuccess }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      alert('Password changed successfully!');
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to change password');
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title"><Lock size={18} style={{marginRight: '8px'}} /> Change Password</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="login-error">⚠️ {error}</div>}
            
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input
                type="password"
                className="form-input form-input-simple"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="form-input form-input-simple"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
                minLength={6}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                className="form-input form-input-simple"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UserPage;
