// Configuration
const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbxYbGnuPozR8wk7KD6trdPryZFsmHyGRW2ePd-abP-G33Ti5fwtEwqRRoRFA1-zJgtgbA/exec';

// App State
const state = {
  currentUser: null,
  currentChat: null,
  chats: {},
  users: ["Rev", "Ska", "kinaa", "Eyram", "Yayra", "Stephen", "Diana"],
  groups: ["Global Chat", "Team Project", "Friends"],
  lastMessageId: 0,
  notifications: new Set(),
  sidebarExpanded: false,
  userContacts: [],
  pendingMessages: new Set(),
  messageRequests: [],
  blockedUsers: [],
  privacySettings: {
    whoCanMessage: 'everyone',
    readReceipts: true,
    lastSeen: 'everyone'
  },
  currentSection: 'chats',
  activeRequestId: null,
  currentReply: null, // {messageId, sender, text}
  currentForwardMessage: null, // {messageId, sender, text}
  replyMode: false,
  forwardMode: false,
  groupMembers: {
    'Global Chat': new Set(), // Will store unique members
    'Team Project': new Set(),
    'Friends': new Set()
  },
  userProfile: null
};

// Reaction Configuration
const REACTIONS = {
  '👍': { name: 'like', color: '#0084ff' },
  '❤️': { name: 'love', color: '#f02849' },
  '😂': { name: 'laugh', color: '#ff9500' },
  '😮': { name: 'wow', color: '#ff9500' },
  '😢': { name: 'sad', color: '#ff9500' },
  '😡': { name: 'angry', color: '#ff9500' },
  '🎉': { name: 'celebration', color: '#31a24c' },
  '👏': { name: 'clap', color: '#0084ff' },
  '🙌🏽': { name: 'thanks', color: '#0084ff' },
  '🔥': { name: 'fire', color: '#ff9500' }
};

const QUICK_REACTIONS = ['🙌🏽', '👍', '❤️', '😂', '🔥', '😮', '🎉'];

// DOM Elements
const elements = {
  // Modals
  profileModal: document.getElementById('profile-modal'),
  profileName: document.getElementById('profile-name'),
  profileStatus: document.getElementById('profile-status'),
  privacyModal: document.getElementById('privacy-modal'),
  blockedModal: document.getElementById('blocked-modal'),
  blockedUsersList: document.getElementById('blocked-users-list'),
  addContactModal: document.getElementById('add-contact-modal'),
  newContactName: document.getElementById('new-contact-name'),
  availableUsersList: document.getElementById('available-users-list'),
  
  // Notifications
  taskbarNotification: document.getElementById('taskbar-notification'),
  notificationText: document.getElementById('notification-text'),
  requestNotification: document.getElementById('request-notification'),
  requestNotificationText: document.getElementById('request-notification-text'),
  
  // Profile
  profileDisplayName: document.getElementById('profile-display-name'),
  profileStatusText: document.getElementById('profile-status-text'),
  avatarInitials: document.getElementById('avatar-initials'),
  
  // Sidebar
  sidebar: document.getElementById('sidebar'),
  requestsMenuItem: document.getElementById('requests-menu-item'),
  
  // Main content
  pageTitle: document.getElementById('page-title'),
  pageSubtitle: document.getElementById('page-subtitle'),
  cardsContainer: document.getElementById('cards-container'),
  welcomeMessage: document.getElementById('welcome-message'),
  
  // Chat view
  chatView: document.getElementById('chat-view'),
  currentChatAvatar: document.getElementById('current-chat-avatar'),
  currentChatInitials: document.getElementById('current-chat-initials'),
  currentChatTitle: document.getElementById('current-chat-title'),
  currentChatSubtitle: document.getElementById('current-chat-subtitle'),
  messagesContainer: document.getElementById('messages-container'),
  messageInput: document.getElementById('message-input'),
  sendBtn: document.getElementById('send-btn')
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  console.log('App loading...');
  
  checkProfile();
  setupEventListeners();
  
  // Auto-select default chat if user exists
  if (state.currentUser) {
    setTimeout(() => {
      initializeApp();
    }, 100);
  }
  
  console.log('App loaded');
});

// Initialize app after profile
function initializeApp() {
  loadPrivacySettings();
  loadBlockedUsers();
  loadGroupMembers();
  initializeChats();
  updateAllUnreadCounts();
  renderChatCards();

  // Initialize push notifications
  setTimeout(() => {
    initPushSystem();
  }, 2000);
  
  // Check for new messages every 1 second
  setInterval(fetchNewMessages, 1000);
  
  // Check for notifications every 5 seconds
  setInterval(checkNotifications, 5000);
}

// Debug function
function debugAppState() {
  console.log('=== DEBUG APP STATE ===');
  console.log('Current User:', state.currentUser);
  console.log('Current Chat:', state.currentChat);
  console.log('Chats:', Object.keys(state.chats));
  console.log('Current Section:', state.currentSection);
  console.log('========================');
}

// Load privacy settings
function loadPrivacySettings() {
  const savedSettings = localStorage.getItem('chatAppPrivacySettings');
  if (savedSettings) {
    state.privacySettings = JSON.parse(savedSettings);
  }
}

// Save privacy settings
function savePrivacySettings() {
  localStorage.setItem('chatAppPrivacySettings', JSON.stringify(state.privacySettings));
  showToast('Privacy settings saved', 'success');
  closeModal('privacy-modal');
}

// Load blocked users
function loadBlockedUsers() {
  const savedBlocked = localStorage.getItem('chatAppBlockedUsers');
  if (savedBlocked) {
    state.blockedUsers = JSON.parse(savedBlocked);
  }
}

// Save blocked users
function saveBlockedUsers() {
  localStorage.setItem('chatAppBlockedUsers', JSON.stringify(state.blockedUsers));
}

// Show modal
function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
  }
}

// Close modal
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
  }
}

// Show privacy settings
function showPrivacySettings() {
  showModal('privacy-modal');
  
  // Set current selection
  document.querySelectorAll('.privacy-option').forEach(option => {
    option.classList.remove('selected');
  });
  
  const selectedOption = document.querySelector(`.privacy-option[onclick*="${state.privacySettings.whoCanMessage}"]`);
  if (selectedOption) {
    selectedOption.classList.add('selected');
  }
}

// Close privacy modal
function closePrivacyModal() {
  closeModal('privacy-modal');
}

// Select privacy option
function selectPrivacyOption(option) {
  state.privacySettings.whoCanMessage = option;
  
  document.querySelectorAll('.privacy-option').forEach(opt => {
    opt.classList.remove('selected');
  });
  
  const selected = document.querySelector(`.privacy-option[onclick*="${option}"]`);
  if (selected) {
    selected.classList.add('selected');
  }
}

// Show blocked users
function showBlockedUsers() {
  showModal('blocked-modal');
  renderBlockedUsersList();
}

// Close blocked users modal
function closeBlockedModal() {
  closeModal('blocked-modal');
}

// Render blocked users list
function renderBlockedUsersList() {
  if (!elements.blockedUsersList) return;
  
  elements.blockedUsersList.innerHTML = '';
  
  if (state.blockedUsers.length === 0) {
    elements.blockedUsersList.innerHTML = 
      '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">No blocked users</div>';
    return;
  }
  
  state.blockedUsers.forEach(user => {
    const item = document.createElement('div');
    item.className = 'blocked-user-item';
    item.innerHTML = `
      <div class="blocked-user-name">${user}</div>
      <button class="unblock-btn" onclick="unblockUser('${user}')">Unblock</button>
    `;
    elements.blockedUsersList.appendChild(item);
  });
}

// Block a user
function blockUser(username) {
  if (!state.blockedUsers.includes(username)) {
    state.blockedUsers.push(username);
    saveBlockedUsers();
    
    // Remove any pending requests from this user
    state.messageRequests = state.messageRequests.filter(req => req.sender !== username);
    
    // Remove from chats if exists
    if (state.chats[username]) {
      delete state.chats[username];
    }
    
    // Re-render
    renderChatCards();
    showToast(`${username} has been blocked`, 'success');
  }
}

// Unblock a user
function unblockUser(username) {
  state.blockedUsers = state.blockedUsers.filter(user => user !== username);
  saveBlockedUsers();
  renderBlockedUsersList();
  showToast(`${username} has been unblocked`, 'success');
}

// Check if user can message based on privacy settings
function canUserMessage(sender) {
  if (state.blockedUsers.includes(sender)) {
    return false;
  }
  
  switch (state.privacySettings.whoCanMessage) {
    case 'everyone':
      return true;
    case 'contacts':
      return state.users.includes(sender) || state.userContacts.includes(sender);
    case 'nobody':
      return false;
    default:
      return true;
  }
}

// Profile Management
function checkProfile() {
  const savedProfile = localStorage.getItem('chatAppProfile');
  if (savedProfile) {
    try {
      const profile = JSON.parse(savedProfile);
      state.currentUser = profile.name;
      elements.profileDisplayName.textContent = profile.name;
      elements.profileStatusText.textContent = profile.status || 'Online';
      elements.avatarInitials.textContent = getInitials(profile.name);
      
      // Load user contacts
      const savedContacts = localStorage.getItem('chatAppContacts');
      if (savedContacts) {
        state.userContacts = JSON.parse(savedContacts);
        state.userContacts.forEach(contact => {
          if (!state.users.includes(contact)) {
            state.users.push(contact);
          }
        });
      }
      
      console.log('Profile loaded:', profile.name);
      
    } catch (error) {
      console.error('Error loading profile:', error);
      showModal('profile-modal');
    }
  } else {
    showModal('profile-modal');
  }
}

// Save profile function
function saveProfile() {
  const name = elements.profileName.value.trim();
  const status = elements.profileStatus.value.trim() || 'Online';
  
  console.log('Saving profile - Name:', name, 'Status:', status);
  
  if (!name) {
    showToast('Please enter your name', 'error');
    return;
  }
  
  const profile = {
    name,
    status,
    createdAt: new Date().toISOString()
  };
  
  // Save to localStorage
  localStorage.setItem('chatAppProfile', JSON.stringify(profile));
  console.log('Profile saved to localStorage');
  
  // Update state
  state.currentUser = name;
  
  // Update UI
  elements.profileDisplayName.textContent = name;
  elements.profileStatusText.textContent = status;
  elements.avatarInitials.textContent = getInitials(name);
  
  // Hide modal
  closeModal('profile-modal');
  console.log('Modal hidden');
  
  // Add to users list
  if (!state.users.includes(name)) {
    state.users.push(name);
  }
  
  // Load contacts
  const savedContacts = localStorage.getItem('chatAppContacts');
  if (savedContacts) {
    state.userContacts = JSON.parse(savedContacts);
    state.userContacts.forEach(contact => {
      if (!state.users.includes(contact)) {
        state.users.push(contact);
      }
    });
  }
  
  // Initialize app
  initializeApp();
  
  showToast(`Welcome ${name}!`, 'success');
  
  // Debug
  debugAppState();
}

// Get initials
function getInitials(name) {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

// Get color from string
function getColorFromString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 60%)`;
}

// Chat Management
function initializeChats() {
  if (!state.currentUser) {
    console.log('No current user, skipping chat initialization');
    return;
  }
  
  console.log('Initializing chats for user:', state.currentUser);
  
  // Clear existing chats
  state.chats = {};
  
  // Initialize individual chats
  state.users.forEach(user => {
    if (user !== state.currentUser) {
      state.chats[user] = {
        id: user,
        name: user,
        type: 'individual',
        messages: [],
        lastActivity: null,
        unread: 0
      };
    }
  });
  
  // Initialize group chats
  state.groups.forEach(group => {
    state.chats[group] = {
      id: group,
      name: group,
      type: 'group',
      messages: [],
      lastActivity: null,
      unread: 0
    };
  });
  
  console.log('Chats initialized:', Object.keys(state.chats));
}

// Render chat cards
function renderChatCards() {
  if (!elements.cardsContainer) return;
  
  elements.cardsContainer.innerHTML = '';
  
  // Filter chats based on current section
  let chatsToShow = [];
  
  if (state.currentSection === 'chats') {
    // Show regular chats (not requests)
    chatsToShow = Object.values(state.chats).filter(chat => 
      !chat.isRequest && chat.type !== 'request'
    );
    elements.pageTitle.textContent = 'Chats';
    elements.pageSubtitle.textContent = 'All your conversations';
  } else if (state.currentSection === 'requests') {
    // Show message requests
    chatsToShow = Object.values(state.chats).filter(chat => 
      chat.isRequest || chat.type === 'request'
    );
    elements.pageTitle.textContent = 'Message Requests';
    elements.pageSubtitle.textContent = 'Pending message requests';
  } else if (state.currentSection === 'groups') {
    // Show only groups
    chatsToShow = Object.values(state.chats).filter(chat => 
      chat.type === 'group'
    );
    elements.pageTitle.textContent = 'Groups';
    elements.pageSubtitle.textContent = 'Group conversations';
  }
  
  // Sort by last activity (most recent first)
  chatsToShow.sort((a, b) => {
    if (a.lastActivity && b.lastActivity) {
      return new Date(b.lastActivity) - new Date(a.lastActivity);
    }
    if (a.lastActivity && !b.lastActivity) return -1;
    if (!a.lastActivity && b.lastActivity) return 1;
    return a.name.localeCompare(b.name);
  });
  
  // Add chat cards
  chatsToShow.forEach(chat => {
    const chatCard = createChatCard(chat);
    elements.cardsContainer.appendChild(chatCard);
  });
  
  // Show welcome message if no chats
  if (chatsToShow.length === 0) {
    let message = '';
    if (state.currentSection === 'requests') {
      message = 'No pending message requests';
    } else if (state.currentSection === 'groups') {
      message = 'No group chats yet';
    } else {
      message = 'No chats yet. Add contacts to start chatting!';
    }
    elements.welcomeMessage.innerHTML = `<p>${message}</p>`;
    elements.welcomeMessage.style.display = 'block';
  } else {
    elements.welcomeMessage.style.display = 'none';
  }
  
  // Update requests badge
  updateRequestsBadge();
}

// Create chat card
function createChatCard(chat) {
  const isRequest = chat.isRequest || chat.type === 'request';
  const isActive = chat.id === state.currentChat;
  const initials = getInitials(chat.name);
  const color = getColorFromString(chat.name);
  const lastMessage = getLastMessagePreview(chat);
  const time = formatTime(chat.lastActivity);
  
  // Calculate unread count for this chat
  const unreadCount = calculateUnreadCount(chat);
  const hasUnread = unreadCount > 0;

  const card = document.createElement('div');
  card.className = `chat-card ${isActive ? 'active' : ''} ${isRequest ? 'request-card' : ''} ${hasUnread ? 'has-unread' : ''}`;
  card.dataset.chatId = chat.id;
  
  // Status text
  let statusText = '';
  if (isRequest) {
    statusText = 'Message Request';
  } else if (chat.type === 'group') {
    // REAL MEMBER COUNT
    const memberCount = state.groupMembers[chat.name] ? 
      state.groupMembers[chat.name].size : 
      (chat.name === 'Global Chat' ? 8 : 3); // Fallback
    
    statusText = `Group • ${memberCount} member${memberCount !== 1 ? 's' : ''}`;
  } else {
    statusText = chat.lastActivity ? 'Last seen ' + time : 'Not connected';
  }
  
  card.innerHTML = `
    <div class="chat-card-header">
      <div class="chat-card-avatar" style="background: ${color}">${initials}</div>
      <div class="chat-card-info">
        <div class="chat-card-title">
          <div class="chat-card-name">${chat.name}</div>
          <div class="chat-card-time">${time}</div>
        </div>
        <div class="chat-card-status">${statusText}</div>
        <div class="chat-card-preview">${lastMessage}</div>
      </div>
    </div>
    ${hasUnread ? `<div class="chat-card-badge">${unreadCount}</div>` : ''}
    ${isRequest ? `<div class="request-indicator">Request</div>` : ''}
  `;
  
  // Add click event
  card.addEventListener('click', () => openChatView(chat.id));
  
  // Add request actions if needed
  if (isRequest) {
    const actions = document.createElement('div');
    actions.className = 'chat-card-actions';
    actions.innerHTML = `
      <button class="card-btn accept" onclick="event.stopPropagation(); acceptRequest('${chat.sender || chat.name}')">Accept</button>
      <button class="card-btn decline" onclick="event.stopPropagation(); declineRequest('${chat.sender || chat.name}')">Decline</button>
      <button class="card-btn block" onclick="event.stopPropagation(); blockUserRequest('${chat.sender || chat.name}')">Block</button>
    `;
    card.appendChild(actions);
  }
  
  return card;
}

// Open chat view
function openChatView(chatId) {
  // Clear previous cache
  clearMessageCache();

  const chat = state.chats[chatId];
  if (!chat) return;
  
  state.currentChat = chatId;

  // MARK CHAT AS READ WHEN OPENED
  markChatAsRead(chatId);
  
  // Update chat view UI
  elements.currentChatInitials.textContent = getInitials(chat.name);
  elements.currentChatAvatar.style.background = getColorFromString(chat.name);
  elements.currentChatTitle.textContent = chat.name;
  
  if (chat.type === 'group') {
    const memberCount = state.groupMembers[chat.name] ? 
      state.groupMembers[chat.name].size : 
      (chat.name === 'Global Chat' ? 8 : 3);
    // Make it clickable
    elements.currentChatSubtitle.innerHTML = `
      <span style="cursor: pointer; text-decoration: underline;" 
            onclick="showGroupMembers('${chatId}')"
            title="Click to view members">
        Group • ${memberCount} member${memberCount !== 1 ? 's' : ''}
      </span>
    `;
  } else if (chat.isRequest) {
    elements.currentChatSubtitle.textContent = 'Message Request • Tap to view';
  } else if (chat.isTemporary) {
    elements.currentChatSubtitle.textContent = 'Tap to add to contacts';
  } else {
    elements.currentChatSubtitle.textContent = 'Online';
  }
  
  // Enable input
  elements.messageInput.disabled = false;
  elements.sendBtn.disabled = false;
  elements.messageInput.focus();
  
  // Clear unread count
  chat.unread = 0;
  
  // Show chat view
  elements.chatView.classList.add('active');
  
  // Load messages
  loadChatMessages();
  
  // Update cards (remove active class from others)
  document.querySelectorAll('.chat-card').forEach(card => {
    card.classList.remove('active');
    if (card.dataset.chatId === chatId) {
      card.classList.add('active');
    }
  });
  
  if (chat.type === 'group') {
    setTimeout(() => {
      scrollToBottom();
    }, 150); // Slightly longer delay for group chats
  }
}

// Close chat view
function closeChatView() {
  const currentChat = state.chats[state.currentChat];

  if (currentChat && currentChat.isTemporary && (!currentChat.messages || currentChat.messages.length === 0)) {
    delete state.chats[state.currentChat];
    renderChatCards(); // Update the card list
  }
  state.currentChat = null;
  elements.chatView.classList.remove('active');
  
  // Clear message input
  elements.messageInput.value = '';
  
  // Update cards
  document.querySelectorAll('.chat-card').forEach(card => {
    card.classList.remove('active');
  });
}

// Load chat messages
function loadChatMessages() {
  if (!elements.messagesContainer || !state.currentChat) return;

  const chat = state.chats[state.currentChat];
  if (!chat) return;
  
  // Clear container
  elements.messagesContainer.innerHTML = '';

  // Add "Add to Contacts" button for temporary chats
  if (chat.isTemporary && chat.type === 'individual') {
    const addContactHeader = document.createElement('div');
    addContactHeader.className = 'temporary-chat-header';
    addContactHeader.style.background = 'var(--card-bg)';
    addContactHeader.style.padding = '15px';
    addContactHeader.style.borderRadius = '10px';
    addContactHeader.style.marginBottom = '20px';
    addContactHeader.style.textAlign = 'center';
    addContactHeader.style.border = '1px solid var(--border-color)';
    
    addContactHeader.innerHTML = `
      <p style="margin-bottom: 10px; color: var(--text-secondary);">
        You're chatting with <strong>${chat.name}</strong> who is not in your contacts
      </p>
      <button onclick="addUserToContacts('${chat.name}')" 
              style="background: var(--online-status); color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600;">
        <i class="fas fa-user-plus" style="margin-right: 5px;"></i>
        Add to Contacts
      </button>
    `;
    
    elements.messagesContainer.appendChild(addContactHeader);
  }

  if (!chat || !chat.messages || chat.messages.length === 0) {
    if (chat && chat.isRequest) {
      // Show request view
      showRequestView(chat);
      return;
    }
    const welcome = document.createElement('div');
    welcome.className = 'welcome-message';
    welcome.innerHTML = `<p>No messages yet. Start the conversation!</p>`;
    elements.messagesContainer.appendChild(welcome);
    return;
  }
  
  let lastDate = null;
  chat.messages.forEach(message => {
    const messageDate = formatDate(message.timestamp);
    if (messageDate !== lastDate) {
      const dateSeparator = document.createElement('div');
      dateSeparator.className = 'date-separator';
      dateSeparator.innerHTML = `<span>${messageDate}</span>`;
      elements.messagesContainer.appendChild(dateSeparator);
      lastDate = messageDate;
    }
    
    // Load saved reactions for this message
    const messageWithReactions = loadSavedReactions(message);
    
    const messageElement = createMessageElement(messageWithReactions);
    elements.messagesContainer.appendChild(messageElement);
  });

  // Clear container
  elements.messagesContainer.innerHTML = '';
  
  // Show loading indicator for large chats
  if (chat.messages.length > 100) {
    elements.messagesContainer.innerHTML = '<div class="loading-messages">Loading messages...</div>';
    
    // Use setTimeout to allow UI to update before heavy rendering
    setTimeout(() => renderMessages(chat), 50);
  } else {
    renderMessages(chat);
  }
  
  scrollToBottom();
  
  // In loadChatMessages(), after scrollToBottom():
  if (chat && chat.type === 'group') {
    // Extra scroll for group chats
    setTimeout(() => {
      scrollToBottom();
    }, 200);
  }

  // After loading messages, apply linkification
  setTimeout(() => {
    applyLinkificationToExistingMessages();
  }, 100);

  // Preload next chat in background
  setTimeout(preloadNextChat, 500);
}

// Show request view
function showRequestView(chat) {
  const lastMessage = chat.messages[chat.messages.length - 1];
  
  elements.messagesContainer.innerHTML = `
    <div class="request-view">
      <div class="request-avatar-large">${getInitials(chat.name)}</div>
      <h2 class="request-title">Message Request</h2>
      <p>You have a message request from <strong>${chat.name}</strong></p>
      
      <div class="request-message">
        "${lastMessage.text}"
        <div class="request-meta">
          Received ${formatTime(lastMessage.timestamp)}
        </div>
      </div>
      
      <div class="request-actions-large">
        <button class="request-btn-large accept" onclick="acceptRequest('${chat.name}')">
          Accept
        </button>
        <button class="request-btn-large decline" onclick="declineRequest('${chat.name}')">
          Decline
        </button>
        <button class="request-btn-large block" onclick="blockUserRequest('${chat.name}')">
          Block
        </button>
      </div>
    </div>
  `;
}

// Separate rendering function for better performance
function renderMessages(chat) {
  if (!chat.messages || chat.messages.length === 0) {
    // Show empty state
    const welcome = document.createElement('div');
    welcome.className = 'welcome-message';
    welcome.innerHTML = `<p>No messages yet. Start the conversation!</p>`;
    elements.messagesContainer.appendChild(welcome);
    return;
  }
  
  // Use DocumentFragment for batch DOM operations
  const fragment = document.createDocumentFragment();
  let lastDate = null;
  let renderedCount = 0;
  
  // Only render recent messages initially (last 100)
  const messagesToRender = chat.messages.slice(-100);
  
  messagesToRender.forEach(message => {
    const messageDate = formatDate(message.timestamp);
    if (messageDate !== lastDate) {
      const dateSeparator = document.createElement('div');
      dateSeparator.className = 'date-separator';
      dateSeparator.innerHTML = `<span>${messageDate}</span>`;
      fragment.appendChild(dateSeparator);
      lastDate = messageDate;
    }
    
    const messageElement = createMessageElement(message);
    fragment.appendChild(messageElement);
    renderedCount++;
  });
  
  // Append all at once (faster)
  elements.messagesContainer.appendChild(fragment);
  
  // Show "load more" if there are older messages
  if (chat.messages.length > 100) {
    const loadMoreBtn = document.createElement('button');
    loadMoreBtn.className = 'load-more-btn';
    loadMoreBtn.innerHTML = `Load ${chat.messages.length - 100} older messages`;
    loadMoreBtn.onclick = () => loadAllMessages(chat);
    elements.messagesContainer.insertBefore(loadMoreBtn, elements.messagesContainer.firstChild);
  }
  
  console.log(`🚀 Rendered ${renderedCount} messages (optimized)`);
}

// Function to load all messages (when user clicks "load more")
function loadAllMessages(chat) {
  console.log('Loading all messages...');
  
  // Remove load more button
  const loadMoreBtn = document.querySelector('.load-more-btn');
  if (loadMoreBtn) loadMoreBtn.remove();
  
  // Clear and render all messages
  elements.messagesContainer.innerHTML = '';
  const fragment = document.createDocumentFragment();
  let lastDate = null;
  
  chat.messages.forEach(message => {
    const messageDate = formatDate(message.timestamp);
    if (messageDate !== lastDate) {
      const dateSeparator = document.createElement('div');
      dateSeparator.className = 'date-separator';
      dateSeparator.innerHTML = `<span>${messageDate}</span>`;
      fragment.appendChild(dateSeparator);
      lastDate = messageDate;
    }
    
    const messageElement = createMessageElement(message);
    fragment.appendChild(messageElement);
  });
  
  elements.messagesContainer.appendChild(fragment);
  console.log(`✅ Loaded all ${chat.messages.length} messages`);
}

// Create message element
const messageElementCache = new Map();
function createMessageElement(message) {
  // Create cache key
  const cacheKey = `${message.localId}_${message.timestamp}_${message.text.substring(0, 50)}`;
  
  // Check cache first
  if (messageElementCache.has(cacheKey)) {
    return messageElementCache.get(cacheKey).cloneNode(true);
  }

  // Skip rendering if it's a reaction message
  if (message.isReactionMessage) {
    return document.createElement('div'); // Return empty div
  }

  const div = document.createElement('div');
  const isSent = message.sender === state.currentUser;
  div.className = `message ${isSent ? 'sent' : 'received'}`;
  
  const time = formatMessageTime(message.timestamp);
  const messageId = message.localId || Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  // Store the message ID for later reference
  message.localId = messageId; // Ensure localId exists
  div.dataset.messageId = messageId; // Use the actual message ID

  // Ensure message has reactions object
  message.reactions = message.reactions || {};
  
  // Create reaction elements
  const reactionsHTML = createReactionElement(message);
  
  // Create message actions
  const messageActions = document.createElement('div');
  messageActions.className = 'message-actions';
  messageActions.innerHTML = `
    <button class="message-action-btn" title="React" onclick="event.stopPropagation(); toggleReactionPicker('${messageId}', this)">
      <i class="fas fa-smile"></i>
    </button>
    <button class="message-action-btn" title="Reply" onclick="event.stopPropagation(); setupReply('${messageId}', '${escapeHtml(message.sender)}', '${escapeHtml(message.text)}')">
      <i class="fas fa-reply"></i>
    </button>
    <button class="message-action-btn" title="Forward" onclick="event.stopPropagation(); setupForward('${messageId}', '${escapeHtml(message.sender)}', '${escapeHtml(message.text)}')">
      <i class="fas fa-share"></i>
    </button>
    <button class="message-action-btn" title="cancel" onclick="cancelReply()">
      <i class="fas fa-xmark"></i>
    </button>
  `;
  
  // Check if this is a group chat and message is from someone else
  const chat = state.chats[state.currentChat];
  const isGroupChat = chat && chat.type === 'group';
  const isOtherUser = message.sender !== state.currentUser;
  
  let messageContent = '';
  
  // Replace the reply indicator HTML creation with this:
  if (message.isReply && message.replyTo) {
    const canJumpToOriginal = message.replyTo.identifier && 
                            (chat.type !== 'group' || message.replyTo.sender === state.currentUser || 
                            message.sender === message.replyTo.sender);
    
    const indicatorClass = canJumpToOriginal ? 'reply-to-indicator clickable' : 'reply-to-indicator';
    const titleText = canJumpToOriginal ? 'Click to jump to original message' : 'Reply to another message';
    
    messageContent += `
      <div class="${indicatorClass}" ${canJumpToOriginal ? `onclick="scrollToReply('${message.replyTo.identifier}', '${escapeHtml(message.replyTo.sender)}', '${escapeHtml(message.replyTo.text)}')"` : ''} title="${titleText}">
        <i class="fas fa-reply"></i>
        <span class="reply-sender-name" style="color: yellow">${escapeHtml(message.replyTo.sender)}</span>
        <span class="reply-preview-text">
          ${escapeHtml(message.replyTo.text.substring(0, 60))}${message.replyTo.text.length > 60 ? '...' : ''}
        </span>
      </div>
    `;
  }
  
  // Add forwarded indicator if this is forwarded
  if (message.isForwarded) {
    messageContent += `
      <div class="reply-to-indicator" style="color:  #0084ff; background: black"
        <i class="fas fa-share"></i>
        <i class="fas fa-share"></i> ${escapeHtml(message.originalSender)}
      </div>
    `;
  }
  
  if (isGroupChat && isOtherUser) {
    // Create clickable username
    const usernameSpan = document.createElement('span');
    usernameSpan.className = 'message-sender clickable-username';
    usernameSpan.textContent = message.sender;
    usernameSpan.dataset.username = message.sender;
    usernameSpan.title = `Click to chat with ${message.sender}`;
    usernameSpan.style.cursor = 'pointer';
    usernameSpan.style.color = getColorFromString(message.sender);
    usernameSpan.style.textDecoration = 'underline';
    
    usernameSpan.addEventListener('click', (e) => {
      e.stopPropagation();
      handleUsernameClick(message.sender);
    });
    
    // Parse text for clickable links and phone numbers
    const parsedText = parseAndLinkify(message.text);
    
    div.innerHTML = `
      ${messageContent}
      <div class="message-text">${parsedText}</div>
      ${reactionsHTML}
      <div class="message-time">${time}</div>
    `;
    
    // Insert username and actions
    div.insertBefore(usernameSpan, div.firstChild);
    div.appendChild(messageActions);
    
  } else {
    // Regular message with actions
    const parsedText = parseAndLinkify(message.text);

    div.innerHTML = `
      ${messageContent}
      <div class="message-text">${parsedText}</div>
      ${reactionsHTML}
      <div class="message-time">${time}</div>
    `;
    div.appendChild(messageActions);
  }
  
  // Add click handler to show actions on mobile
  div.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
      messageActions.style.opacity = '1';
      messageActions.style.transform = 'translateY(0)';
      
      // Hide after delay
      setTimeout(() => {
        if (document.activeElement !== messageActions.querySelector('button')) {
          messageActions.style.opacity = '0';
          messageActions.style.transform = 'translateY(10px)';
        }
      }, 3000);
    }
  });
  
  // Store in cache before returning
  messageElementCache.set(cacheKey, div);
  
  return div;
}

// Clear cache when switching chats or on low memory
function clearMessageCache() {
  messageElementCache.clear();
  console.log('🧹 Message cache cleared');
}

// Add this reply function to scroll to original message
function scrollToReply(identifier, originalSender, originalText) {
  const currentChat = state.chats[state.currentChat];
  if (!currentChat) {
    showToast('No chat selected', 'info');
    return;
  }
  
  console.log('Looking for reply to:', { identifier, originalSender, originalText });
  
  // Try to find the original message by content
  // Look for messages from the same sender with similar text
  const originalMessage = currentChat.messages.find(msg => {
    // Check if this message matches the reply identifier
    if (msg.replyTo && msg.replyTo.identifier === identifier) {
      return true; // Direct match by identifier
    }
    
    // Content-based matching (fallback)
    const isSameSender = msg.sender === originalSender;
    const hasSimilarText = msg.text && originalText && 
                          (msg.text.includes(originalText.substring(0, 20)) || 
                          originalText.includes(msg.text.substring(0, 20)));
    
    return isSameSender && hasSimilarText;
  });
  
  if (originalMessage) {
    console.log('Found original message:', originalMessage);
    
    // Find the message element in DOM
    let messageElement;
    
    // Try by localId first
    if (originalMessage.localId) {
      messageElement = document.querySelector(`[data-message-id="${originalMessage.localId}"]`);
    }
    
    // If not found, try by content
    if (!messageElement) {
      // Find element that contains the text
      const allMessages = document.querySelectorAll('.message');
      for (const element of allMessages) {
        if (element.textContent.includes(originalMessage.text.substring(0, 30))) {
          messageElement = element;
          break;
        }
      }
    }
    
    if (messageElement) {
      console.log('Found DOM element, scrolling...');
      // Scroll to and highlight the message
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageElement.classList.add('reply-highlight');
      
      // Remove highlight after animation
      setTimeout(() => {
        messageElement.classList.remove('reply-highlight');
      }, 2000);
      
      return;
    } else {
      console.log('DOM element not found');
    }
  }
  
  // If we get here, try to find any message from that sender
  const anyMessageFromSender = currentChat.messages.find(msg => 
    msg.sender === originalSender
  );
  
  if (anyMessageFromSender && anyMessageFromSender.localId) {
    const messageElement = document.querySelector(`[data-message-id="${anyMessageFromSender.localId}"]`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageElement.classList.add('reply-highlight');
      setTimeout(() => {
        messageElement.classList.remove('reply-highlight');
      }, 2000);
      return;
    }
  }
  
  // If we get here, the original message isn't in current chat
  showToast(`Could not find the original message from ${originalSender}`, 'info');
}

// Add this function to handle username clicks:
function handleUsernameClick(username) {
  // Don't allow clicking on yourself
  if (username === state.currentUser) {
    showToast('That\'s you!', 'info');
    return;
  }
  
  // Check if user is blocked
  if (state.blockedUsers.includes(username)) {
    showToast(`${username} is blocked`, 'warning');
    return;
  }
  
  // Check if user already exists in contacts
  const isInContacts = state.users.includes(username) || state.userContacts.includes(username);
  
  if (isInContacts) {
    // User is in contacts - open chat or switch to existing chat
    openChatWithUser(username);
  } else {
    // User not in contacts - show options
    showUsernameOptions(username);
  }
}

// Add this function to open chat with user:
function openChatWithUser(username) {
  // Check if chat already exists
  if (state.chats[username]) {
    // Switch to existing chat
    closeChatView(); // Close current chat view first
    setTimeout(() => {
      openChatView(username);
    }, 100);
  } else {
    // Create new chat
    state.chats[username] = {
      id: username,
      name: username,
      type: 'individual',
      messages: [],
      lastActivity: null,
      unread: 0
    };
    
    // Switch to new chat
    closeChatView(); // Close current chat view first
    setTimeout(() => {
      openChatView(username);
      showToast(`Started chat with ${username}`, 'success');
    }, 100);
  }
}

// Add this function to show options for unknown users:
function showUsernameOptions(username) {
  // Create modal for username options
  const modalHTML = `
    <div class="modal-overlay active" id="username-options-modal">
      <div class="modal-content">
        <h2 class="modal-title">${username}</h2>
        <p style="text-align: center; margin-bottom: 20px; color: var(--text-secondary);">
          This user is not in your contacts
        </p>
        
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <button class="modal-btn primary" onclick="addUserToContacts('${username}')">
            <i class="fas fa-user-plus" style="margin-right: 8px;"></i>
            Add to Contacts & Chat
          </button>
          
          <button class="modal-btn" onclick="chatWithoutAdding('${username}')" style="background: var(--message-received);">
            <i class="fas fa-comment" style="margin-right: 8px;"></i>
            Chat Without Adding
          </button>
          
          <button class="modal-btn secondary" onclick="closeUsernameOptions()">
            Cancel
          </button>
        </div>
      </div>
    </div>
  `;
  
  // Create and show modal
  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = modalHTML;
  document.body.appendChild(modalContainer);
}

// Add this function to add user to contacts and chat:
function addUserToContacts(username) {
  // Add to contacts
  if (!state.users.includes(username)) {
    state.users.push(username);
  }
  
  if (!state.userContacts.includes(username)) {
    state.userContacts.push(username);
    localStorage.setItem('chatAppContacts', JSON.stringify(state.userContacts));
  }
  
  // Create chat
  state.chats[username] = {
    id: username,
    name: username,
    type: 'individual',
    messages: [],
    lastActivity: null,
    unread: 0
  };
  
  // Close modal
  closeUsernameOptions();
  
  // Switch to chat
  closeChatView();
  setTimeout(() => {
    openChatView(username);
    showToast(`${username} added to contacts`, 'success');
  }, 100);
}

// Add this function to chat without adding to contacts:
function chatWithoutAdding(username) {
  // Create temporary chat (not saved to contacts)
  state.chats[username] = {
    id: username,
    name: username,
    type: 'individual',
    messages: [],
    lastActivity: null,
    unread: 0,
    isTemporary: true // Mark as temporary
  };
  
  // Close modal
  closeUsernameOptions();
  
  // Switch to chat
  closeChatView();
  setTimeout(() => {
    openChatView(username);
    showToast(`Started chat with ${username}`, 'info');
  }, 100);
}

// Add this function to close username options modal:
function closeUsernameOptions() {
  const modal = document.getElementById('username-options-modal');
  if (modal) {
    modal.remove();
  }
}

// Get last message preview
function getLastMessagePreview(chat) {
  if (!chat.messages || !chat.messages.length) return 'No messages yet';
  const lastMessage = chat.messages[chat.messages.length - 1];
  const prefix = lastMessage.sender === state.currentUser ? 'You: ' : '';
  return prefix + lastMessage.text.substring(0, 50) + (lastMessage.text.length > 50 ? '...' : '');
}

// Format date
function formatDate(dateString) {
  if (!dateString) return '';
  
  const messageDate = new Date(dateString);
  const today = new Date();
  
  // Reset times to compare only dates
  const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterdayDay = new Date(todayDay);
  yesterdayDay.setDate(yesterdayDay.getDate() - 1);
  
  // Compare dates (ignoring time)
  if (messageDay.getTime() === todayDay.getTime()) {
    return 'Today';
  } else if (messageDay.getTime() === yesterdayDay.getTime()) {
    return 'Yesterday';
  } else {
    // More than 2 days ago
    return messageDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: today.getFullYear() !== messageDate.getFullYear() ? 'numeric' : undefined
    });
  }
}

// Format message time
function formatMessageTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
}

// Format time for chat cards (uses calendar days, not 24-hour periods)
function formatTime(dateString) {
  if (!dateString) return '';
  
  const messageDate = new Date(dateString);
  const now = new Date();
  
  // Get calendar dates (ignoring time)
  const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Calculate time difference in minutes
  const diffMinutes = Math.floor((now - messageDate) / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffMinutes / (60 * 24));
  
  // Check if same calendar day (Today)
  if (messageDay.getTime() === today.getTime()) {
    // Today - show relative time or exact time
    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      // Show time in 12-hour format
      return messageDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
  }
  
  // Check if yesterday
  if (messageDay.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  }
  
  // Check if within last 6 days (show weekday)
  if (diffDays < 7) {
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return weekdays[messageDate.getDay()];
  }
  
  // More than a week ago - show date
  // Check if same year
  if (messageDate.getFullYear() === now.getFullYear()) {
    // Same year: show month and day
    return messageDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  } else {
    // Different year: show full date
    return messageDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
}

// Scroll to bottom
function scrollToBottom() {
  if (!elements.messagesContainer) return;
  elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Show section
function showSection(section) {
  state.currentSection = section;
  
  // Update active menu item
  document.querySelectorAll('.menu-item').forEach(item => {
    item.classList.remove('active');
  });
  
  if (section === 'chats') {
    document.querySelector('.menu-item:nth-child(1)').classList.add('active');
  } else if (section === 'requests') {
    document.querySelector('.menu-item:nth-child(2)').classList.add('active');
  } else if (section === 'groups') {
    document.querySelector('.menu-item:nth-child(3)').classList.add('active');
  }
  
  // Render chat cards for this section
  renderChatCards();
}

// Update requests badge
function updateRequestsBadge() {
  if (!elements.requestsMenuItem) return;
  
  const requestCount = Object.values(state.chats).filter(chat => chat.isRequest).length;
  
  if (requestCount > 0) {
    elements.requestsMenuItem.classList.add('has-notifications');
  } else {
    elements.requestsMenuItem.classList.remove('has-notifications');
  }
}

// Toggle sidebar
function toggleSidebar() {
  state.sidebarExpanded = !state.sidebarExpanded;
  elements.sidebar.classList.toggle('expanded', state.sidebarExpanded);
  
  // For mobile, use active class
  if (window.innerWidth <= 768) {
    elements.sidebar.classList.toggle('active');
  }
}

// Message Functions
function sendMessage() {
  const text = elements.messageInput.value.trim();
  if (!text || !state.currentUser || !state.currentChat) return;
  
  const chat = state.chats[state.currentChat];
  if (chat && (chat.isRequest || chat.type === 'request')) {
    showToast('Cannot send messages to pending requests', 'error');
    return;
  }
  
  // Check if we're in reply mode
  if (state.replyMode && state.currentReply) {
    sendReplyMessage();
    return;
  }
  
  const messageId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  
  const message = {
    sender: state.currentUser,
    receiver: state.currentChat === 'Global Chat' ? 'GROUP' : state.currentChat,
    message: text,
    timestamp: new Date().toISOString(),
    localId: messageId,
    sharedId: createSharedMessageId({ // ADD THIS
      timestamp: new Date().toISOString(),
      sender: state.currentUser,
      receiver: state.currentChat === 'Global Chat' ? 'GROUP' : state.currentChat,
      text: text
    })
  };
  
  console.log('Sending message with ID:', messageId);
  
  state.pendingMessages.add(messageId);
  
  const existingMessage = chat.messages.find(m => 
    m.sender === state.currentUser && 
    m.text === text && 
    Math.abs(new Date(m.timestamp) - new Date(message.timestamp)) < 1000
  );
  
  if (!existingMessage) {
    chat.messages.push({
      sender: state.currentUser,
      receiver: state.currentChat,
      text: text,
      timestamp: message.timestamp,
      localId: messageId,
      sharedId: message.sharedId 
    });
    chat.lastActivity = message.timestamp;
    
    // Update card
    renderChatCards();
    
    const messageElement = createMessageElement({
      sender: state.currentUser,
      receiver: state.currentChat,
      text: text,
      timestamp: message.timestamp
    });
    elements.messagesContainer.appendChild(messageElement);
    elements.messageInput.value = '';
    
    scrollToBottom();
  }
  
  // Send to backend
  sendMessageToBackend(message)
    .then(response => {
      console.log('Message sent to backend:', messageId);
      setTimeout(() => {
        state.pendingMessages.delete(messageId);
      }, 3000);
      
      if (state.currentChat === 'Global Chat') {
        updateGroupMembers(state.currentChat, state.currentUser);
      }
    })
    .catch(error => {
      console.error('Error sending message:', error);
      showToast('Failed to send message', 'error');
      state.pendingMessages.delete(messageId);
    });
}

// Fetch new messages
function fetchNewMessages() {
  if (!state.currentUser) return;
  
  // Fetch from backend
  fetchMessagesFromBackend()
    .then(messages => {
      if (messages && messages.length > 0) {
        processNewMessages(messages);
      }
    })
    .catch(error => console.error('Error fetching messages:', error));
}

// Process new messages
function processNewMessages(messages) {
  let hasNewRequests = false;
  let needsCardUpdate = false; // NEW: Track if cards need updating
  
  messages.forEach(message => {
    const messageId = message.message_id || message.shared_id;
    
    if (state.notifications.has(messageId)) return;
    
    state.notifications.add(messageId);
    
    console.log('📥 New message received:', {
      sender: message.sender_id,
      text: message.content.substring(0, 50),
      sharedId: message.shared_id
    });

    // ===== ADD THIS REACTION PARSING =====
    // Check if this is a reaction message
    const reactionMatch = message.content.match(/\[REACTION:([^:]+):([^:]+):([^:]+):([^\]]+)\]/);
    if (reactionMatch) {
      const [_, targetMessageId, emoji, reactingUser, action] = reactionMatch;
      
      // Process the reaction
      processIncomingReaction(targetMessageId, emoji, reactingUser, action, message.timestamp);
      
      // Mark this as a reaction message (to filter it out later)
      message.isReactionMessage = true;
      
      // Skip further processing for reaction messages
      return;
    }

    // Check if this is a reply message
    const replyMatch = message.content.match(/\[REPLY_TO:([^:]+):([^\]]+)\] (.+) \|\| (.+)/);
    if (replyMatch) {
      // It's a reply message
      const [_, replyIdentifier, replyToSender, originalText, replyText] = replyMatch;
      
      message.isReply = true;
      message.text = replyText; // Use the reply text
      message.replyTo = {
        identifier: replyIdentifier,
        sender: replyToSender,
        text: originalText,
        timestamp: message.timestamp // Use same timestamp for now
      };
      // Ensure localId exists for this message too
      if (!message.localId) {
        message.localId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      }
    }
    
    // Skip messages from current user that we just sent
    if (message.sender_id === state.currentUser) {
      const isRecentMessage = new Date(message.timestamp).getTime() > Date.now() - 5000;
      if (isRecentMessage) {
        console.log('Skipping own recent message from backend:', message.content);
        return;
      }
    }
    
    // Check if sender is blocked
    if (state.blockedUsers.includes(message.sender_id)) {
      console.log('Message from blocked user:', message.sender_id);
      return;
    }
    
    // Determine which chat this belongs to
    let chatId;
    let isRequest = false;
    
    if (message.receiver_id === 'GROUP' || message.receiver_id === 'Global Chat') {
      chatId = 'Global Chat';
      // UPDATE: Track group members
      updateGroupMembers(chatId, message.sender_id);
    } else if (message.receiver_id === state.currentUser) {
      chatId = message.sender_id;
      
      // Check if this is a message from someone not in contacts
      if (!state.users.includes(message.sender_id) && !state.userContacts.includes(message.sender_id)) {
        if (canUserMessage(message.sender_id)) {
          isRequest = true;
          hasNewRequests = true;
          
          const requestId = `request_${message.sender_id}`;
          chatId = requestId;
          
          if (!state.chats[requestId]) {
            state.chats[requestId] = {
              id: requestId,
              name: message.sender_id,
              sender: message.sender_id,
              type: 'request',
              isRequest: true,
              messages: [message],
              lastActivity: message.timestamp,
              unread: 1,
              createdAt: new Date().toISOString()
            };
            
            showRequestNotification(message.sender_id, message.content);
            needsCardUpdate = true; // Cards need update
          } else {
            const requestChat = state.chats[requestId];
            requestChat.messages.push(message);
            requestChat.lastActivity = message.timestamp;
            requestChat.unread++;
            needsCardUpdate = true; // Cards need update
          }
        } else {
          console.log('Message blocked by privacy settings from:', message.sender_id);
          return;
        }
      }
    } else if (message.sender_id === state.currentUser) {
      chatId = message.receiver_id;
    } else {
      return;
    }
    
    // Add to chat (if not a request already handled above)
    if (state.chats[chatId] && !isRequest) {
      const chat = state.chats[chatId];
      
      const existingMessage = chat.messages.find(m => 
        m.sender === message.sender_id && 
        m.text === message.content && 
        Math.abs(new Date(m.timestamp) - new Date(message.timestamp)) < 1000
      );
      
      if (!existingMessage) {
        // Check if this is a forwarded message from the current user
        if (message.content.includes('[FORWARDED_FROM:')) {
          const forwardMatch = message.content.match(/\[FORWARDED_FROM:([^\]]+)\] (.+)/);
          if (forwardMatch) {
            const [_, originalSender, originalText] = forwardMatch;
            
            // Create proper forward structure
            const forwardMessage = {
              ...message,
              text: originalText,
              isForwarded: true,
              originalSender: originalSender
            };
            
            chat.messages.push(forwardMessage);
          } else {
            chat.messages.push(message);
          }
        } else if (message.sender_id === state.currentUser && message.content.includes('[Forwarded from')) {
          chat.messages.push({
            ...message,
            isForwarded: true
          });
        } else {
          // Regular message
          chat.messages.push(message);
        }
        
        chat.lastActivity = message.timestamp;

        // Mark that cards need update
        needsCardUpdate = true;
        
        // When showing notification for new messages
        if (chatId !== state.currentChat) {
          chat.unread = calculateUnreadCount(chat);
          showEnhancedNotification({ // Use enhanced notification
            sender: message.sender_id,
            text: message.content,
            chatId: chatId
          });
        }
      }
    }
  });
  
  // Update requests badge
  if (hasNewRequests) {
    updateRequestsBadge();
  }

  // NEW: Update chat cards if needed
  if (needsCardUpdate) {
    renderChatCards();
  }
  
  // If current chat is active, reload messages
  if (state.currentChat) {
    loadChatMessages();
  }
}

// Helper function to format reply messages for display
function formatReplyForDisplay(sender, originalText, replyText) {
  return `↪ Replying to "${originalText.substring(0, 30)}..."`;
}

// Show request notification
function showRequestNotification(sender, messageText) {
  if (!elements.requestNotification || !elements.requestNotificationText) return;
  
  elements.requestNotificationText.textContent = `${sender}: ${messageText.substring(0, 50)}...`;
  elements.requestNotification.classList.add('active');
  
  setTimeout(() => {
    if (elements.requestNotification) {
      elements.requestNotification.classList.remove('active');
    }
  }, 10000);
}

// View message request
function viewMessageRequest() {
  const requests = Object.values(state.chats).filter(chat => chat.isRequest);
  if (requests.length > 0) {
    requests.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
    const latestRequest = requests[0];
    
    showSection('requests');
    openChatView(latestRequest.id);
  }
  
  if (elements.requestNotification) {
    elements.requestNotification.classList.remove('active');
  }
}

// Dismiss request notification
function dismissRequestNotification() {
  if (elements.requestNotification) {
    elements.requestNotification.classList.remove('active');
  }
}

// Accept request
function acceptRequest(sender) {
  const requestId = `request_${sender}`;
  
  if (state.chats[requestId]) {
    const requestChat = state.chats[requestId];
    delete state.chats[requestId];
    
    if (!state.users.includes(sender) && !state.userContacts.includes(sender)) {
      state.userContacts.push(sender);
      state.users.push(sender);
      localStorage.setItem('chatAppContacts', JSON.stringify(state.userContacts));
    }
    
    state.chats[sender] = {
      id: sender,
      name: sender,
      type: 'individual',
      messages: requestChat.messages,
      lastActivity: requestChat.lastActivity,
      unread: calculateUnreadCount(requestChat)
    };

    // Handle new chat unread status
    handleNewChat(sender, requestChat.messages[0]);
    
    // If we're in the request, close chat view
    if (state.currentChat === requestId) {
      closeChatView();
    }
    
    renderChatCards();
    showToast(`${sender} added to contacts`, 'success');
  }
}

// Decline request
function declineRequest(sender) {
  const requestId = `request_${sender}`;
  
  if (state.chats[requestId]) {
    delete state.chats[requestId];
    
    if (state.currentChat === requestId) {
      closeChatView();
    }
    
    renderChatCards();
    showToast('Message request declined', 'info');
  }
}

// Block user from request
function blockUserRequest(sender) {
  blockUser(sender);
  
  const requestId = `request_${sender}`;
  if (state.chats[requestId]) {
    delete state.chats[requestId];
    
    if (state.currentChat === requestId) {
      closeChatView();
    }
  }
  
  renderChatCards();
}

// Show notification
function showEnhancedNotification(message) {
  if (!elements.taskbarNotification || !elements.notificationText) return;
  
  elements.notificationText.textContent = `New message from ${message.sender}`;
  elements.taskbarNotification.classList.add('active');
  
  Toastify({
    text: `New message from ${message.sender}: ${message.text.substring(0, 50)}...`,
    duration: 3000,
    gravity: "top",
    position: "right",
    backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)",
    stopOnFocus: true
  }).showToast();
  
  if (navigator.vibrate) {
    navigator.vibrate([200, 100, 200]);
  }
  
  setTimeout(() => {
    if (elements.taskbarNotification) {
      elements.taskbarNotification.classList.remove('active');
    }
  }, 5000);
}

// Check notifications
function checkNotifications() {
  let hasUnread = false;

  // Calculate unread counts for all chats
  updateAllUnreadCounts();

  // Check if any chat has unread messages (except current chat)
  for (const chatId in state.chats) {
    const chat = state.chats[chatId];
    if (chat.unread > 0 && chatId !== state.currentChat) {
      hasUnread = true;
      break;
    }
  }
  
  document.title = hasUnread ? '(*) ChatApp' : 'ChatApp';
}

// Clear chat
function clearChat() {
  if (!state.currentChat) return;
  
  if (confirm('Clear all messages in this chat?')) {
    state.chats[state.currentChat].messages = [];
    loadChatMessages();
    showToast('Chat cleared', 'info');
  }
}

// Initiate video call
function initiateVideoCall() {
  window.open('https://meet.jit.si/GRWCChurchConference', '_blank');
  showToast('Starting video call...', 'info');
}

// Show toast
function showToast(message, type = 'info') {
  const backgroundColor = type === 'error' ? '#f02849' : 
                         type === 'success' ? '#31a24c' : 
                         type === 'warning' ? '#ff9500' :
                         '#0084ff';
  
  Toastify({
    text: message,
    duration: 3000,
    gravity: "top",
    position: "right",
    backgroundColor: backgroundColor,
    stopOnFocus: true
  }).showToast();
}

// Contact Management
function showAddContactModal() {
  showModal('add-contact-modal');
  if (elements.newContactName) {
    elements.newContactName.value = '';
  }
  renderAvailableUsersList();
}

function closeAddContactModal() {
  closeModal('add-contact-modal');
}

function addNewContact() {
  if (!elements.newContactName) return;
  
  const contactName = elements.newContactName.value.trim();
  
  if (!contactName) {
    showToast('Please enter a username', 'error');
    return;
  }
  
  if (contactName === state.currentUser) {
    showToast('Cannot add yourself as a contact', 'error');
    return;
  }
  
  if (state.users.includes(contactName)) {
    showToast('Contact already exists', 'info');
    closeAddContactModal();
    return;
  }
  
  state.users.push(contactName);
  
  if (!state.userContacts.includes(contactName)) {
    state.userContacts.push(contactName);
    localStorage.setItem('chatAppContacts', JSON.stringify(state.userContacts));
  }
  
  state.chats[contactName] = {
    id: contactName,
    name: contactName,
    type: 'individual',
    messages: [],
    lastActivity: null,
    unread: 0
  };
  
  renderChatCards();
  showToast(`Added ${contactName} as contact`, 'success');
  closeAddContactModal();
}

function renderAvailableUsersList() {
  if (!elements.availableUsersList) return;
  
  elements.availableUsersList.innerHTML = '';
  
  const allUsers = ["Rev", "Ska", "kinaa", "Eyram", "Yayra", "Stephen", "Diana"];
  const availableUsers = allUsers.filter(user => 
    user !== state.currentUser && !state.users.includes(user)
  );
  
  if (availableUsers.length === 0) {
    elements.availableUsersList.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">No available users to add</div>';
    return;
  }
  
  availableUsers.forEach(user => {
    const contactItem = document.createElement('div');
    contactItem.className = 'contact-item';
    contactItem.innerHTML = `
      <div>
        <div class="contact-name">${user}</div>
        <div class="contact-status">Click to add</div>
      </div>
      <i class="fas fa-plus" style="color: var(--text-secondary);"></i>
    `;
    
    contactItem.onclick = () => {
      if (elements.newContactName) {
        elements.newContactName.value = user;
      }
    };
    
    elements.availableUsersList.appendChild(contactItem);
  });
}

// Search chats (placeholder)
function searchChats() {
  showToast('Search functionality coming soon!', 'info');
}

// Refresh chats
function refreshChats() {
  fetchNewMessages();
  showToast('Refreshing chats...', 'info');
}

// Setup event listeners
function setupEventListeners() {
  // Enter key to send message
  if (elements.messageInput) {
    elements.messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  // Add this to your setupEventListeners() function:
  elements.messagesContainer.addEventListener('click', (e) => {
    const username = e.target.closest('.clickable-username');
    if (username) {
      e.stopPropagation();
      const usernameText = username.dataset.username || username.textContent;
      handleUsernameClick(usernameText);
    }
  });

  // Add: Escape key to cancel reply
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.replyMode) {
      cancelReply();
      e.preventDefault();
    }
  });
  
  // Add: Click outside to hide message actions
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.message') && !e.target.closest('.message-actions')) {
      document.querySelectorAll('.message-actions').forEach(actions => {
        actions.style.opacity = '0';
        actions.style.transform = 'translateY(10px)';
      });
    }
  });
  
  // Profile modal enter key
  if (elements.profileName) {
    elements.profileName.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') saveProfile();
    });
  }
  
  if (elements.profileStatus) {
    elements.profileStatus.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') saveProfile();
    });
  }
  
  // Add contact modal enter key
  if (elements.newContactName) {
    elements.newContactName.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addNewContact();
    });
  }
  
  // Close modals when clicking outside
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      if (e.target.id === 'profile-modal' && state.currentUser) {
        closeModal('profile-modal');
      } else if (e.target.id === 'add-contact-modal') {
        closeModal('add-contact-modal');
      } else if (e.target.id === 'privacy-modal') {
        closeModal('privacy-modal');
      } else if (e.target.id === 'blocked-modal') {
        closeModal('blocked-modal');
      } else if (e.target.id === 'search-modal') {
        closeSearchModal();
      }
    }
  });
  
  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
      const sidebar = elements.sidebar;
      const isClickInsideSidebar = sidebar.contains(e.target);
      const isClickOnMenuButton = e.target.closest('.header-btn') !== null;
      
      if (!isClickInsideSidebar && !isClickOnMenuButton && sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
      }
    }
  });
}

// Add to setupEventListeners():
// Double-click to add quick reaction
document.addEventListener('dblclick', (e) => {
  const messageElement = e.target.closest('.message');
  if (messageElement && !e.target.closest('.message-actions') && !e.target.closest('.reaction')) {
    const messageId = messageElement.dataset.messageId;
    if (messageId) {
      // Add like reaction on double-click
      addReaction(messageId, '👍', state.currentUser);
      e.preventDefault();
      e.stopPropagation();
    }
  }
});

// Long press for reaction picker on mobile
let pressTimer;
document.addEventListener('touchstart', (e) => {
  const messageElement = e.target.closest('.message');
  if (messageElement) {
    pressTimer = setTimeout(() => {
      const messageId = messageElement.dataset.messageId;
      const messageActions = messageElement.querySelector('.message-actions');
      if (messageId && messageActions) {
        const reactButton = messageActions.querySelector('[title="React"]');
        if (reactButton) {
          toggleReactionPicker(messageId, reactButton);
        }
      }
    }, 500); // 500ms long press
  }
});

document.addEventListener('touchend', () => {
  clearTimeout(pressTimer);
});

document.addEventListener('touchmove', () => {
  clearTimeout(pressTimer);
});

// Add to setupEventListeners():
// Enter key in search
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && document.getElementById('search-modal').classList.contains('active')) {
    const searchInput = document.getElementById('search-users-input');
    if (document.activeElement === searchInput && searchInput.value.trim()) {
      filterSearchResults();
    }
  }
});

// ========== REPLY FUNCTIONALITY ==========

// Set up reply to a message
function setupReply(messageId, sender, text) {
  const replyIdentifier = createReplyIdentifier(sender, text);

  // Escape HTML to prevent issues
  const safeSender = escapeHtml(sender);
  const safeText = escapeHtml(text.substring(0, 100)); // Limit length

  state.currentReply = {
    messageId: messageId,
    identifier: replyIdentifier,
    sender,
    text,
    timestamp: new Date().toISOString()
  };
  state.replyMode = true;
  
  // Update input placeholder
  if (elements.messageInput) {
    elements.messageInput.placeholder = "Reply to " + sender + "...";
    elements.messageInput.focus();
  }
  
  // Show reply preview
  showReplyPreview();
}

// Show reply preview above input
function showReplyPreview() {
  if (!state.currentReply || !elements.inputArea) return;
  
  // Remove existing preview
  const existingPreview = document.getElementById('reply-preview');
  if (existingPreview) existingPreview.remove();
  
  // Create preview
  const preview = document.createElement('div');
  preview.id = 'reply-preview';
  preview.className = 'reply-preview';
  preview.innerHTML = `
    <div class="reply-preview-header">
      <div class="reply-preview-sender">Replying to ${state.currentReply.sender}</div>
      <button class="reply-preview-close" onclick="cancelReply()" id="cancel-reply-btn">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <div class="reply-preview-text">${escapeHtml(state.currentReply.text)}</div>
  `;
  
  // Add event listener to X button
  setTimeout(() => {
    const cancelBtn = document.getElementById('cancel-reply-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', cancelReply);
    }
  }, 100);
  
  // Insert before input area
  const inputArea = document.querySelector('.input-area');
  if (inputArea) {
    inputArea.insertBefore(preview, elements.messageInput);
  }
  showToast('Reply mode activated', 'info');
}

// Cancel reply
function cancelReply() {
  state.currentReply = null;
  state.replyMode = false;
  
  // Remove preview
  const preview = document.getElementById('reply-preview');
  if (preview) {
    preview.remove();
  }
  
  // Reset placeholder
  if (elements.messageInput) {
    elements.messageInput.placeholder = "Type a message...";
    elements.messageInput.value = '';
  }
}

// Send reply message
// Replace the entire sendReplyMessage function with this:

function sendReplyMessage() {
  if (!state.currentReply || !state.currentChat) return;
  
  const replyText = elements.messageInput.value.trim();
  if (!replyText) {
    showToast('Please enter a reply message', 'error');
    return;
  }
  
  const chat = state.chats[state.currentChat];
  if (!chat) return;
  
  // Create message with reply info
  const messageId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  const timestamp = new Date().toISOString();

  // Create a content-based identifier (not message ID)
  const replyIdentifier = createReplyIdentifier(state.currentReply.sender, state.currentReply.text);
  
  // Format for backend - use content-based identifier
  const replyMessageText = `[REPLY_TO:${replyIdentifier}:${state.currentReply.sender}] ${state.currentReply.text} || ${replyText}`;

  const message = {
    timestamp: timestamp,
    sender: state.currentUser,
    receiver: state.currentChat === 'Global Chat' ? 'GROUP' : state.currentChat,
    message: replyMessageText, // Include reply metadata in message
    localId: messageId,
  };
  
  // Create display message (what shows in UI)
  const displayMessage = {
    sender: state.currentUser,
    receiver: state.currentChat,
    text: replyText,
    timestamp: timestamp,
    localId: messageId,
    isReply: true,
    replyTo: {
      identifier: replyIdentifier,
      sender: state.currentReply.sender,
      text: state.currentReply.text,
      timestamp: state.currentReply.timestamp
    },
    sharedId: createSharedMessageId({ // ADD THIS
      timestamp: timestamp,
      sender: state.currentUser,
      receiver: state.currentChat === 'Global Chat' ? 'GROUP' : state.currentChat,
      text: replyText
    })
  };
  
  // Add to chat
  chat.messages.push(displayMessage);
  chat.lastActivity = timestamp;
  
  // Update UI
  const messageElement = createMessageElement(displayMessage);
  elements.messagesContainer.appendChild(messageElement);
  scrollToBottom();
  
  // Send to backend
  sendMessageToBackend(message)
    .catch(error => console.error('Error sending reply:', error));
    
  if (state.currentChat === 'Global Chat') {
    updateGroupMembers(state.currentChat, state.currentUser);
  }
  
  // Clear reply and input
  cancelReply();
  elements.messageInput.value = '';
  
  // Update chat cards
  renderChatCards();
  showToast('Reply sent', 'success');
}

// ========== FORWARD FUNCTIONALITY ==========

// Setup forward for a message
function setupForward(messageId, sender, text) {
  state.currentForwardMessage = {
    messageId,
    sender,
    text,
    timestamp: new Date().toISOString()
  };
  state.forwardMode = true;
  
  // Update preview
  document.getElementById('forward-preview-sender').textContent = sender;
  document.getElementById('forward-preview-text').textContent = text;
  
  // Show modal and populate chats
  showModal('message-actions-modal');
  document.getElementById('message-actions-title').textContent = 'Forward Message';
  populateForwardChats();
}

// Populate forward chats list
function populateForwardChats() {
  const list = document.getElementById('forward-chats-list');
  if (!list) return;
  
  list.innerHTML = '';
  
  // Get all chats except current one and requests
  const chats = Object.values(state.chats).filter(chat => 
    !chat.isRequest && 
    chat.type !== 'request' &&
    chat.id !== state.currentChat
  );
  
  if (chats.length === 0) {
    list.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-secondary);">No other chats available</div>';
    return;
  }
  
  chats.forEach(chat => {
    const item = document.createElement('div');
    item.className = 'forward-chat-item';
    item.dataset.chatId = chat.id;
    
    const initials = getInitials(chat.name);
    const color = getColorFromString(chat.name);
    
    item.innerHTML = `
      <div class="forward-chat-avatar" style="background: ${color}">${initials}</div>
      <div class="forward-chat-info">
        <div class="forward-chat-name">${chat.name}</div>
        <div class="forward-chat-type">${chat.type === 'group' ? 'Group' : 'Contact'}</div>
      </div>
      <i class="fas fa-check" style="display: none; color: var(--online-status);"></i>
    `;
    
    item.onclick = () => selectForwardChat(chat.id);
    
    list.appendChild(item);
  });
}

// Select chat for forwarding
let selectedForwardChat = null;

function selectForwardChat(chatId) {
  selectedForwardChat = chatId;
  
  // Update UI
  document.querySelectorAll('.forward-chat-item').forEach(item => {
    item.classList.remove('selected');
    const checkIcon = item.querySelector('.fa-check');
    if (checkIcon) checkIcon.style.display = 'none';
  });
  
  const selectedItem = document.querySelector(`.forward-chat-item[data-chat-id="${chatId}"]`);
  if (selectedItem) {
    selectedItem.classList.add('selected');
    const checkIcon = selectedItem.querySelector('.fa-check');
    if (checkIcon) checkIcon.style.display = 'block';
  }
  
  // Enable send button
  document.getElementById('send-forward-btn').disabled = false;
}

// Filter forward chats
function filterForwardChats() {
  const searchTerm = document.getElementById('forward-search-input').value.toLowerCase();
  const items = document.querySelectorAll('.forward-chat-item');
  
  items.forEach(item => {
    const chatName = item.querySelector('.forward-chat-name').textContent.toLowerCase();
    if (chatName.includes(searchTerm)) {
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  });
}

// Send forwarded message
function sendForwardedMessage() {
  if (!selectedForwardChat || !state.currentForwardMessage) return;
  
  const targetChat = state.chats[selectedForwardChat];
  if (!targetChat) return;

  // Create message with forward metadata
  const forwardMessageText = `[FORWARDED_FROM:${state.currentForwardMessage.sender}] ${state.currentForwardMessage.text}`;
  
  // Create forwarded message in the SAME FORMAT as regular messages
  const message = {
    timestamp: new Date().toISOString(),
    sender: state.currentUser,
    text: forwardMessageText,
    localId: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
    isForwarded: true,
    originalSender: state.currentForwardMessage.sender,
    originalMessage: state.currentForwardMessage.text,
    forwardedAt: new Date().toISOString(),
    sharedId: createSharedMessageId({ // ADD THIS
      timestamp: new Date().toISOString(),
      sender: state.currentUser,
      receiver: targetChat.id === 'Global Chat' ? 'GROUP' : targetChat.id,
      text: state.currentForwardMessage.text
    })
  };
  
  // Add to target chat with proper display text
  const displayMessage = {
    ...message,
    text: `↪ Forwarded from ${state.currentForwardMessage.sender}: ${state.currentForwardMessage.text}`,
  };
  
  targetChat.messages.push(displayMessage);
  targetChat.lastActivity = message.timestamp;
  
  // Send to backend (use the same format as regular messages)
  const backendMessage = {
    timestamp: message.timestamp,
    sender: state.currentUser,
    receiver: targetChat.id === 'Global Chat' ? 'GROUP' : targetChat.id,
    message: forwardMessageText // Include metadata
  };
  
  // Send to backend
  sendMessageToBackend(backendMessage)
    .catch(error => console.error('Error forwarding message:', error));
    
  if (state.currentChat === 'Global Chat') {
    updateGroupMembers(state.currentChat, state.currentUser);
  }
  
  // Show success
  showToast(`Message forwarded to ${targetChat.name}`, 'success');
  
  // Close modal
  closeMessageActionsModal();
  
  // Update chat cards
  renderChatCards();
}

// Close message actions modal
function closeMessageActionsModal() {
  closeModal('message-actions-modal');
  state.currentForwardMessage = null;
  selectedForwardChat = null;
  state.forwardMode = false;
  document.getElementById('send-forward-btn').disabled = true;
}

// Helper to check if reply can be jumped to
function canJumpToReply(replyMessage, currentChat) {
  if (!replyMessage || !replyMessage.replyTo || !currentChat) return false;
  
  // Reply must be in the same chat
  const isSameChat = replyMessage.replyTo.messageId && 
                    currentChat.messages.some(msg => 
                      msg.localId === replyMessage.replyTo.messageId
                    );
  
  // For group chats, additional checks
  if (currentChat.type === 'group') {
    return isSameChat && 
          (replyMessage.replyTo.sender === state.currentUser || 
            replyMessage.sender === replyMessage.replyTo.sender);
  }
  
  // For individual chats
  return isSameChat;
}

// Helper to find message by content
function findMessageByContent(chat, sender, text) {
  if (!chat || !chat.messages) return null;
  
  // Try exact match first
  for (const msg of chat.messages) {
    if (msg.sender === sender && msg.text === text) {
      return msg;
    }
  }
  
  // Try partial match (first 20 chars)
  const searchText = text.substring(0, Math.min(20, text.length));
  for (const msg of chat.messages) {
    if (msg.sender === sender && msg.text && msg.text.includes(searchText)) {
      return msg;
    }
  }
  
  // Try any message from sender
  for (const msg of chat.messages) {
    if (msg.sender === sender) {
      return msg;
    }
  }
  
  return null;
}

// Create a content-based identifier for replies
function createReplyIdentifier(sender, text) {
  // Create a hash from sender + first 20 chars of text
  const content = sender + ':' + text.substring(0, Math.min(20, text.length));
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return 'msg_' + Math.abs(hash).toString(36);
}

// Context menu for links
let currentContextMenuUrl = '';
let currentContextMenuPhone = '';

// Show context menu for links
document.addEventListener('contextmenu', (e) => {
  const clickedElement = e.target;
  
  // Check if clicked on a link or phone number
  if (clickedElement.classList.contains('clickable-link')) {
    e.preventDefault();
    currentContextMenuUrl = clickedElement.textContent;
    showLinkContextMenu(e.clientX, e.clientY);
  } else if (clickedElement.classList.contains('clickable-phone')) {
    e.preventDefault();
    currentContextMenuPhone = clickedElement.textContent;
    showPhoneContextMenu(e.clientX, e.clientY);
  }
});

// Close context menu on click
document.addEventListener('click', () => {
  hideContextMenu();
});

// Show link context menu
function showLinkContextMenu(x, y) {
  hideContextMenu();
  
  const menu = document.createElement('div');
  menu.className = 'link-context-menu';
  menu.id = 'link-context-menu';
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  
  const url = currentContextMenuUrl.startsWith('www.') ? 'https://' + currentContextMenuUrl : currentContextMenuUrl;
  
  menu.innerHTML = `
    <div class="context-menu-item" onclick="copyToClipboard('${escapeHtml(url)}', 'Link')">
      <i class="fas fa-copy"></i>
      <span>Copy Link</span>
    </div>
    <div class="context-menu-item" onclick="openInNewTab('${escapeHtml(url)}')">
      <i class="fas fa-external-link-alt"></i>
      <span>Open in New Tab</span>
    </div>
    <div class="context-menu-divider"></div>
    <div class="context-menu-item" onclick="shareLink('${escapeHtml(url)}')">
      <i class="fas fa-share"></i>
      <span>Share Link</span>
    </div>
  `;
  
  document.body.appendChild(menu);
  menu.classList.add('show');
}

// Show phone context menu
function showPhoneContextMenu(x, y) {
  hideContextMenu();
  
  const menu = document.createElement('div');
  menu.className = 'link-context-menu';
  menu.id = 'phone-context-menu';
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  
  const cleanNumber = currentContextMenuPhone.replace(/[\s\-\(\)]/g, '');
  
  menu.innerHTML = `
    <div class="context-menu-item" onclick="copyToClipboard('${cleanNumber}', 'Phone Number')">
      <i class="fas fa-copy"></i>
      <span>Copy Number</span>
    </div>
    <div class="context-menu-item" onclick="addToContacts('${cleanNumber}')">
      <i class="fas fa-address-book"></i>
      <span>Add to Contacts</span>
    </div>
    <div class="context-menu-divider"></div>
    <div class="context-menu-item" onclick="makePhoneCall('${cleanNumber}')">
      <i class="fas fa-phone"></i>
      <span>Call Now</span>
    </div>
  `;
  
  document.body.appendChild(menu);
  menu.classList.add('show');
}

// Hide context menu
function hideContextMenu() {
  const menu = document.getElementById('link-context-menu');
  const phoneMenu = document.getElementById('phone-context-menu');
  
  if (menu) menu.remove();
  if (phoneMenu) phoneMenu.remove();
}

// Helper functions for context menu
function copyToClipboard(text, label) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(`${label} copied to clipboard`, 'success');
    hideContextMenu();
  }).catch(err => {
    console.error('Failed to copy:', err);
    showToast('Failed to copy', 'error');
  });
}

function openInNewTab(url) {
  proceedToLink(url);
  hideContextMenu();
}

function shareLink(url) {
  if (navigator.share) {
    navigator.share({
      title: 'Check this link',
      url: url
    }).then(() => {
      hideContextMenu();
    }).catch(err => {
      console.error('Share failed:', err);
      copyToClipboard(url, 'Link');
    });
  } else {
    copyToClipboard(url, 'Link');
  }
}

function addToContacts(number) {
  // This would typically open the device's contacts app
  // For now, just copy to clipboard
  copyToClipboard(number, 'Phone Number');
  showToast('Paste the number in your contacts app', 'info');
}

// Apply linkification to all messages in current chat
function applyLinkificationToExistingMessages() {
  if (!state.currentChat || !elements.messagesContainer) return;
  
  const messageElements = elements.messagesContainer.querySelectorAll('.message-text');
  
  messageElements.forEach(element => {
    // Only process if not already linkified (no clickable links inside)
    if (!element.innerHTML.includes('clickable-link') && !element.innerHTML.includes('clickable-phone')) {
      const originalText = element.textContent;
      const linkifiedText = parseAndLinkify(originalText);
      
      // Only update if changes were made
      if (linkifiedText !== escapeHtml(originalText)) {
        element.innerHTML = linkifiedText;
      }
    }
  });
}

// Function to parse and make URLs/phones clickable
const linkifyCache = new Map();

function parseAndLinkify(text) {
  if (!text) return '';
  
  // Check cache first
  if (linkifyCache.has(text)) {
    return linkifyCache.get(text);
  }
  
  // Escape HTML first
  let safeText = escapeHtml(text);
  
  // Only parse if text contains potential links
  if (text.includes('http') || text.includes('www.') || 
      text.includes('@') || /\d{7,}/.test(text)) {
    
    // Parse URLs (http, https, ftp, www)
    safeText = safeText.replace(
      /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi,
      '<span class="clickable-link" onclick="handleLinkClick(\'$1\')">$1</span>'
    );
    
    // Parse www links without protocol
    safeText = safeText.replace(
      /(\bwww\.[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi,
      '<span class="clickable-link" onclick="handleLinkClick(\'https://$1\')">$1</span>'
    );
    
    // Parse email addresses
    safeText = safeText.replace(
      /(\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b)/gi,
      '<span class="clickable-link" onclick="handleEmailClick(\'$1\')">$1</span>'
    );
    
    // Parse phone numbers (various international formats)
    safeText = safeText.replace(
      /(\+?[\d\s\-\(\)]{7,}\d)/g,
      function(match) {
        // Clean the phone number for dialing
        const cleanNumber = match.replace(/[\s\-\(\)]/g, '');
        return `<span class="clickable-phone" onclick="handlePhoneClick('${cleanNumber}', '${match}')">${match}</span>`;
      }
    );
  }

  // Cache the result
  linkifyCache.set(text, safeText);
  return safeText;
}

// Handle URL clicks
function handleLinkClick(url) {
  // Add protocol if missing
  let fullUrl = url;
  if (!url.match(/^https?:\/\//i) && !url.match(/^ftp:\/\//i)) {
    if (url.startsWith('www.')) {
      fullUrl = 'https://' + url;
    } else {
      fullUrl = 'https://' + url;
    }
  }
  
  // Show confirmation for external links
  showLinkConfirmation(fullUrl);
}

// Handle email clicks
function handleEmailClick(email) {
  if (confirm(`Send email to ${email}?`)) {
    window.location.href = `mailto:${email}`;
  }
}

// Handle phone number clicks
function handlePhoneClick(cleanNumber, displayNumber) {
  showPhoneCallConfirmation(cleanNumber, displayNumber);
}

// Show confirmation modal for external links
function showLinkConfirmation(url) {
  const domain = extractDomain(url);
  
  const modalHTML = `
    <div class="modal-overlay active" id="link-confirmation-modal">
      <div class="modal-content">
        <h2 class="modal-title">Open External Link</h2>
        
        <div class="external-link-warning">
          <i class="fas fa-external-link-alt"></i>
          You are about to open an external website
        </div>
        
        <p style="margin: 15px 0; word-break: break-all; color: var(--text-secondary);">
          ${url}
        </p>
        
        <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 20px;">
          Domain: ${domain}
        </p>
        
        <div class="modal-actions">
          <button class="modal-btn secondary" onclick="closeLinkConfirmation()">
            Cancel
          </button>
          <button class="modal-btn primary" onclick="proceedToLink('${escapeHtml(url)}')">
            Open Link
          </button>
        </div>
      </div>
    </div>
  `;
  
  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = modalHTML;
  document.body.appendChild(modalContainer);
}

// Show phone call confirmation modal
function showPhoneCallConfirmation(cleanNumber, displayNumber) {
  const modalHTML = `
    <div class="modal-overlay active" id="phone-confirmation-modal">
      <div class="modal-content phone-call-modal">
        <i class="fas fa-phone-alt"></i>
        <h2 class="modal-title">Call Phone Number</h2>
        
        <div class="phone-number-display">
          ${displayNumber}
        </div>
        
        <p style="margin-bottom: 20px; color: var(--text-secondary);">
          Do you want to call this number?
        </p>
        
        <div class="modal-actions">
          <button class="modal-btn secondary" onclick="closePhoneConfirmation()">
            Cancel
          </button>
          <button class="modal-btn primary" onclick="makePhoneCall('${cleanNumber}')">
            <i class="fas fa-phone" style="margin-right: 8px;"></i>
            Call Now
          </button>
        </div>
      </div>
    </div>
  `;
  
  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = modalHTML;
  document.body.appendChild(modalContainer);
}

// Extract domain from URL
function extractDomain(url) {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : 'https://' + url);
    return urlObj.hostname;
  } catch (e) {
    return url;
  }
}

// Proceed to open link
function proceedToLink(url) {
  closeLinkConfirmation();
  window.open(url, '_blank', 'noopener,noreferrer');
}

// Make phone call
function makePhoneCall(number) {
  closePhoneConfirmation();
  window.location.href = `tel:${number}`;
}

// Close modals
function closeLinkConfirmation() {
  const modal = document.getElementById('link-confirmation-modal');
  if (modal) modal.remove();
}

function closePhoneConfirmation() {
  const modal = document.getElementById('phone-confirmation-modal');
  if (modal) modal.remove();
}

// Close modals when clicking outside
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    if (e.target.id === 'link-confirmation-modal') {
      closeLinkConfirmation();
    } else if (e.target.id === 'phone-confirmation-modal') {
      closePhoneConfirmation();
    }
  }
});

// ========== MESSAGE REACTIONS FUNCTIONS ==========

// Initialize reactions for a message
function initializeMessageReactions(message) {
  if (!message.reactions) {
    message.reactions = {};
  }
  
  // Initialize each reaction type
  Object.keys(REACTIONS).forEach(emoji => {
    if (!message.reactions[emoji]) {
      message.reactions[emoji] = {
        count: 0,
        users: []
      };
    }
  });
  
  return message;
}

// Add reaction to a message
function addReaction(messageId, emoji, username) {
  const currentChat = state.chats[state.currentChat];
  if (!currentChat) return;
  
  const message = currentChat.messages.find(msg => msg.localId === messageId);
  if (!message) return;
  
  // Ensure reactions object exists
  message.reactions = message.reactions || {};
  
  // Initialize this emoji if not exists
  if (!message.reactions[emoji]) {
    message.reactions[emoji] = {
      count: 0,
      users: []
    };
  }
  
  const reaction = message.reactions[emoji];
  
  // Check if user already reacted with this emoji
  const userIndex = reaction.users.indexOf(username);
  let action = 'add'; // Track whether we're adding or removing
  
  if (userIndex > -1) {
    // Remove reaction
    reaction.users.splice(userIndex, 1);
    reaction.count--;
    action = 'remove';
    
    if (reaction.count === 0) {
      delete message.reactions[emoji];
    }
    
    showToast(`Removed ${emoji} reaction`, 'info');
  } else {
    // Add reaction
    reaction.users.push(username);
    reaction.count++;
    action = 'add';
    
    showToast(`Reacted with ${emoji}`, 'success');
  }

  // Send reaction to Google Sheets for sync
  sendReactionToBackend(messageId, emoji, username, action);
  
  // Update the message in state
  const messageIndex = currentChat.messages.findIndex(msg => msg.localId === messageId);
  if (messageIndex > -1) {
    currentChat.messages[messageIndex] = { ...message };
  }
  
  // Update UI
  loadChatMessages();
  
  // Save reaction to localStorage for persistence
  saveMessageReactions(messageId, message.reactions);
}

// Save reactions to localStorage
function saveMessageReactions(messageId, reactions) {
  const key = `chatApp_reactions_${messageId}`;
  localStorage.setItem(key, JSON.stringify(reactions));
}

// Send reaction to Google Sheets
// Send reaction to Google Sheets
function sendReactionToBackend(messageId, emoji, username, action) {
  const currentChat = state.chats[state.currentChat];
  if (!currentChat) return;
  
  const message = currentChat.messages.find(msg => msg.localId === messageId);
  if (!message) {
    console.log('❌ Message not found for reaction:', messageId);
    return;
  }
  
  // Use sharedId if available, otherwise use localId
  const targetId = message.sharedId || messageId;
  console.log('📤 Sending reaction with target ID:', targetId);
  
  // Format: [REACTION:targetId:emoji:username:action]
  const reactionMessage = `[REACTION:${targetId}:${emoji}:${username}:${action}]`;
  
  const backendMessage = {
    timestamp: new Date().toISOString(),
    sender: username,
    receiver: state.currentChat === 'Global Chat' ? 'GROUP' : state.currentChat,
    message: reactionMessage
  };
  
  console.log('📤 Reaction payload:', backendMessage);
  
  // Send to Google Sheets
  sendMessageToBackend(backendMessage)
    .then(() => {
      console.log('✅ Reaction sent to backend:', reactionMessage);
    })
    .catch(error => {
      console.error('❌ Error sending reaction:', error);
      showToast('Failed to sync reaction', 'error');
    });
}

// Load reactions from localStorage
function loadMessageReactions(messageId) {
  const key = `chatApp_reactions_${messageId}`;
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : null;
}

// Toggle reaction picker
function toggleReactionPicker(messageId, element) {
  const picker = document.getElementById(`reaction-picker-${messageId}`);
  
  if (picker && picker.classList.contains('show')) {
    picker.classList.remove('show');
  } else {
    // Close any other open pickers
    document.querySelectorAll('.reaction-picker.show').forEach(p => {
      p.classList.remove('show');
    });
    
    // Create or show picker
    showReactionPicker(messageId, element);
  }
}

// Show reaction picker
function showReactionPicker(messageId, triggerElement) {
  // Remove existing picker
  const existingPicker = document.getElementById(`reaction-picker-${messageId}`);
  if (existingPicker) {
    existingPicker.remove();
  }
  
  // Get position for picker
  const rect = triggerElement.getBoundingClientRect();
  
  // Create picker
  const picker = document.createElement('div');
  picker.id = `reaction-picker-${messageId}`;
  picker.className = 'reaction-picker';
  
  // Add reaction options
  let pickerHTML = '';
  Object.keys(REACTIONS).forEach(emoji => {
    pickerHTML += `<div class="reaction-option" onclick="addReaction('${messageId}', '${emoji}', '${state.currentUser}')">${emoji}</div>`;
  });
  
  picker.innerHTML = pickerHTML;
  document.body.appendChild(picker);
  
  // Position picker
  const pickerWidth = picker.offsetWidth;
  const pickerHeight = picker.offsetHeight;
  
  let left = rect.left + (rect.width / 2) - (pickerWidth / 2);
  let top = rect.top - pickerHeight - 10;
  
  // Adjust if near screen edges
  if (left < 10) left = 10;
  if (left + pickerWidth > window.innerWidth - 10) {
    left = window.innerWidth - pickerWidth - 10;
  }
  if (top < 10) top = rect.bottom + 10;
  
  picker.style.left = `${left}px`;
  picker.style.top = `${top}px`;
  
  // Show with animation
  setTimeout(() => {
    picker.classList.add('show');
  }, 10);
  
  // Close picker when clicking outside
  setTimeout(() => {
    const closePicker = (e) => {
      if (!picker.contains(e.target) && e.target !== triggerElement) {
        picker.classList.remove('show');
        document.removeEventListener('click', closePicker);
        setTimeout(() => {
          if (picker.parentNode) {
            picker.remove();
          }
        }, 300);
      }
    };
    document.addEventListener('click', closePicker);
  }, 100);
}

// Create reaction element for a message
function createReactionElement(message) {
  if (!message.reactions || Object.keys(message.reactions).length === 0) {
    return '';
  }
  
  // Filter reactions with count > 0
  const activeReactions = Object.entries(message.reactions)
    .filter(([emoji, data]) => data.count > 0)
    .sort((a, b) => b[1].count - a[1].count);
  
  if (activeReactions.length === 0) {
    return '';
  }
  
  let reactionsHTML = '<div class="message-reactions">';
  
  activeReactions.forEach(([emoji, data]) => {
    const isUserReacted = data.users.includes(state.currentUser);
    const reactionClass = `reaction ${isUserReacted ? 'active' : ''}`;
    const userList = data.users.join(', ');
    
    reactionsHTML += `
      <div class="${reactionClass}" 
          onclick="addReaction('${message.localId}', '${emoji}', '${state.currentUser}')" 
          oncontextmenu="event.preventDefault(); showReactionDetails('${message.localId}', '${emoji}')"
          title="${userList} reacted with ${emoji}">
        <span class="reaction-emoji">${emoji}</span>
        <span class="reaction-count">${data.count}</span>
      </div>
    `;
  });
  
  reactionsHTML += '</div>';
  return reactionsHTML;
}

// Create a shared message ID that works across all users
function createSharedMessageId(message) {
  // Clean the text for consistent hashing
  const cleanText = (message.text || '').trim().substring(0, 50);
  const cleanSender = (message.sender || '').trim();
  const cleanReceiver = (message.receiver || '').trim();
  const cleanTimestamp = (message.timestamp || '').split('.')[0]; // Remove milliseconds
  
  // Create a consistent string for hashing
  const hashString = `${cleanTimestamp}:${cleanSender}:${cleanReceiver}:${cleanText}`;
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < hashString.length; i++) {
    const char = hashString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return `shared_${Math.abs(hash).toString(36)}`;
}

// Show reaction details
function showReactionDetails(messageId, emoji) {
  const currentChat = state.chats[state.currentChat];
  if (!currentChat) return;
  
  const message = currentChat.messages.find(msg => msg.localId === messageId);
  if (!message || !message.reactions || !message.reactions[emoji]) return;
  
  const reaction = message.reactions[emoji];
  
  const modalHTML = `
    <div class="modal-overlay active" id="reaction-details-modal">
      <div class="modal-content reaction-details-modal">
        <h2 class="modal-title" style="display: flex; align-items: center; gap: 10px;">
          <span>${emoji}</span>
          <span>${REACTIONS[emoji].name}</span>
        </h2>
        
        <div style="margin: 15px 0; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 10px;">${emoji}</div>
          <div style="color: var(--text-secondary);">
            ${reaction.count} reaction${reaction.count !== 1 ? 's' : ''}
          </div>
        </div>
        
        <div style="max-height: 300px; overflow-y: auto;">
          ${reaction.users.map(user => `
            <div class="reaction-detail-item">
              <div class="reaction-detail-left">
                <div class="profile-avatar small" style="background: ${getColorFromString(user)}; width: 36px; height: 36px;">
                  ${getInitials(user)}
                </div>
                <div>
                  <div class="reaction-detail-name">${user}</div>
                  <div class="reaction-detail-time">Reacted with ${emoji}</div>
                </div>
              </div>
              ${user === state.currentUser ? 
                '<button class="unblock-btn" onclick="removeOwnReaction(\'' + messageId + '\', \'' + emoji + '\')">Remove</button>' : 
                ''
              }
            </div>
          `).join('')}
        </div>
        
        <div class="modal-actions">
          <button class="modal-btn primary" onclick="closeReactionDetails()">
            Close
          </button>
        </div>
      </div>
    </div>
  `;
  
  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = modalHTML;
  document.body.appendChild(modalContainer);
}

// Remove own reaction from details view
function removeOwnReaction(messageId, emoji) {
  addReaction(messageId, emoji, state.currentUser);
  closeReactionDetails();
  setTimeout(() => {
    showReactionDetails(messageId, emoji);
  }, 100);
}

// Close reaction details modal
function closeReactionDetails() {
  const modal = document.getElementById('reaction-details-modal');
  if (modal) modal.remove();
}

// Load saved reactions when loading messages
function loadSavedReactions(message) {
  if (!message.localId) return message;
  
  const savedReactions = loadMessageReactions(message.localId);
  if (savedReactions) {
    message.reactions = { ...savedReactions };
  }
  
  return message;
}

// Process incoming reactions from other users
// Process incoming reactions from other users
function processIncomingReaction(targetMessageId, emoji, reactingUser, action, timestamp) {
  console.log('🔍 Processing incoming reaction:', { targetMessageId, emoji, reactingUser, action });
  debugReaction(targetMessageId, emoji, reactingUser, action);
  
  // First, check if targetMessageId is a sharedId (starts with "shared_")
  const isSharedId = targetMessageId.startsWith('shared_');
  
  let targetChat = null;
  let targetMessage = null;
  
  // Search through all chats
  for (const chatId in state.chats) {
    const chat = state.chats[chatId];
    if (!chat.messages) continue;
    
    // Try to find the message
    const foundMessage = chat.messages.find(msg => {
      if (isSharedId) {
        // Look for sharedId match
        return msg.sharedId === targetMessageId;
      } else {
        // Look for localId match (fallback)
        return msg.localId === targetMessageId;
      }
    });
    
    if (foundMessage) {
      targetChat = chat;
      targetMessage = foundMessage;
      console.log('✅ Found target message:', targetMessage.text.substring(0, 50));
      break;
    }
  }
  
  // If not found by ID, try to find by content (emergency fallback)
  if (!targetMessage) {
    console.log('⚠️ Message not found by ID, trying content matching...');
    
    // Extract possible message text from the sharedId or look for recent messages
    for (const chatId in state.chats) {
      const chat = state.chats[chatId];
      if (!chat.messages) continue;
      
      // Get most recent messages (last 20)
      const recentMessages = [...chat.messages]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 20);
      
      for (const msg of recentMessages) {
        // Check if message is from a similar time (within 5 minutes)
        const reactionTime = new Date(timestamp);
        const messageTime = new Date(msg.timestamp);
        const timeDiff = Math.abs(reactionTime - messageTime);
        
        if (timeDiff < 300000) { // 5 minutes
          targetChat = chat;
          targetMessage = msg;
          console.log('✅ Found recent message as fallback');
          break;
        }
      }
      
      if (targetMessage) break;
    }
  }
  
  if (!targetChat || !targetMessage) {
    console.log('❌ Could not find target message for reaction');
    showToast(`Reaction from ${reactingUser} could not be applied`, 'warning');
    return;
  }
  
  // Ensure reactions object exists
  targetMessage.reactions = targetMessage.reactions || {};
  
  // Initialize this emoji if not exists
  if (!targetMessage.reactions[emoji]) {
    targetMessage.reactions[emoji] = {
      count: 0,
      users: []
    };
  }
  
  const reaction = targetMessage.reactions[emoji];
  
  if (action === 'add') {
    // Add reaction if not already present
    if (!reaction.users.includes(reactingUser)) {
      reaction.users.push(reactingUser);
      reaction.count++;
      console.log(`✅ Added ${emoji} from ${reactingUser}`);
      
      // Show notification for reactions to your messages
      if (targetMessage.sender === state.currentUser && reactingUser !== state.currentUser) {
        showToast(`${reactingUser} reacted ${emoji} to your message`, 'info');
      }
    }
  } else if (action === 'remove') {
    // Remove reaction
    const userIndex = reaction.users.indexOf(reactingUser);
    if (userIndex > -1) {
      reaction.users.splice(userIndex, 1);
      reaction.count--;
      console.log(`✅ Removed ${emoji} from ${reactingUser}`);
      
      if (reaction.count === 0) {
        delete targetMessage.reactions[emoji];
      }
    }
  }
  
  // Update the message in the chat array
  const messageIndex = targetChat.messages.findIndex(msg => 
    msg.localId === targetMessage.localId
  );
  
  if (messageIndex > -1) {
    targetChat.messages[messageIndex] = { ...targetMessage };
  }
  
  // Save to localStorage
  saveMessageReactions(targetMessage.localId, targetMessage.reactions);
  
  // Update UI if we're currently viewing this chat
  if (state.currentChat === targetChat.id) {
    console.log('🔄 Reloading messages for current chat');
    loadChatMessages();
  }
  
  // Update chat cards
  renderChatCards();
  
  console.log('✅ Reaction processed successfully');
}

// Helper to find a message by ID across all chats
function findMessageById(messageId) {
  for (const chatId in state.chats) {
    const chat = state.chats[chatId];
    if (chat.messages) {
      const message = chat.messages.find(msg => msg.localId === messageId);
      if (message) {
        return { chat, message, chatId };
      }
    }
  }
  return null;
}

// Load reactions from existing messages in Google Sheets data
function loadReactionsFromExistingMessages() {
  // This would be called after loading initial messages
  // It would parse all existing messages for reaction data
  
  // For now, we'll rely on the polling to catch up
  // In a production app, you might want to parse all historical messages
  console.log('Reaction system initialized');
}

// Assign shared IDs to existing messages
function assignSharedIdsToExistingMessages() {
  for (const chatId in state.chats) {
    const chat = state.chats[chatId];
    if (chat.messages) {
      chat.messages.forEach(msg => {
        if (!msg.sharedId) {
          msg.sharedId = createSharedMessageId({
            timestamp: msg.timestamp,
            sender: msg.sender,
            receiver: msg.receiver || chatId,
            text: msg.text
          });
        }
      });
    }
  }
}

// Debug function for reactions
function debugReaction(targetMessageId, emoji, reactingUser, action) {
  console.log('=== REACTION DEBUG ===');
  console.log('Target Message ID:', targetMessageId);
  console.log('Emoji:', emoji);
  console.log('User:', reactingUser);
  console.log('Action:', action);
  
  // Log all messages with their IDs
  for (const chatId in state.chats) {
    const chat = state.chats[chatId];
    if (chat.messages) {
      console.log(`Chat: ${chatId}`);
      chat.messages.forEach((msg, index) => {
        console.log(`  [${index}] localId: ${msg.localId}, sharedId: ${msg.sharedId}, text: ${msg.text.substring(0, 30)}...`);
      });
    }
  }
  console.log('======================');
}

// Test function to verify reaction system
function testReactionSystem() {
  console.log('🧪 Testing reaction system...');
  
  if (!state.currentChat || !state.currentUser) {
    console.log('❌ No chat or user selected');
    return;
  }
  
  const currentChat = state.chats[state.currentChat];
  if (!currentChat.messages || currentChat.messages.length === 0) {
    console.log('❌ No messages in current chat');
    return;
  }
  
  // Get the latest message
  const latestMessage = currentChat.messages[currentChat.messages.length - 1];
  console.log('📝 Latest message:', latestMessage.text.substring(0, 50));
  console.log('🔑 Message IDs - localId:', latestMessage.localId, 'sharedId:', latestMessage.sharedId);
  
  // Test adding a reaction
  console.log('🧪 Testing reaction addition...');
  addReaction(latestMessage.localId, '👍', state.currentUser);
}

// Check for reaction sync issues
function checkReactionSync() {
  console.log('🔄 Checking reaction sync...');
  
  // Log reaction counts for debugging
  for (const chatId in state.chats) {
    const chat = state.chats[chatId];
    if (chat.messages) {
      let reactionCount = 0;
      chat.messages.forEach(msg => {
        if (msg.reactions) {
          Object.values(msg.reactions).forEach(reaction => {
            reactionCount += reaction.count;
          });
        }
      });
      
      if (reactionCount > 0) {
        console.log(`💬 Chat ${chatId}: ${reactionCount} total reactions`);
      }
    }
  }
}

// Call this every 30 seconds
setInterval(checkReactionSync, 30000);

// ========== UNREAD MESSAGE MANAGEMENT ==========

// Get last read timestamp for a chat
function getLastReadTimestamp(chatId) {
  const key = `chatApp_lastRead_${chatId}`;
  const timestamp = localStorage.getItem(key);
  return timestamp ? parseInt(timestamp) : 0; // 0 = never read
}

// Set last read timestamp for a chat
function setLastReadTimestamp(chatId) {
  const key = `chatApp_lastRead_${chatId}`;
  const timestamp = Date.now();
  localStorage.setItem(key, timestamp.toString());
  return timestamp;
}

// Calculate unread count for a chat
function calculateUnreadCount(chat) {
  if (!chat || !chat.messages || chat.messages.length === 0) {
    return 0;
  }
  
  const lastReadTimestamp = getLastReadTimestamp(chat.id);
  const currentUser = state.currentUser;
  
  // Count messages from others that are newer than last read timestamp
  let unreadCount = 0;
  
  for (const message of chat.messages) {
    // Skip messages from current user
    if (message.sender === currentUser) continue;
    
    // Skip reaction messages
    if (message.isReactionMessage) continue;
    
    const messageTime = new Date(message.timestamp).getTime();
    
    // Message is unread if it's newer than last read timestamp
    if (messageTime > lastReadTimestamp) {
      unreadCount++;
    }
  }
  
  return unreadCount;
}

// Update all chat unread counts
function updateAllUnreadCounts() {
  for (const chatId in state.chats) {
    const chat = state.chats[chatId];
    chat.unread = calculateUnreadCount(chat);
  }
  renderChatCards();
}

// Mark all messages in a chat as read
function markChatAsRead(chatId) {
  setLastReadTimestamp(chatId);
  const chat = state.chats[chatId];
  if (chat) {
    chat.unread = 0;
  }
  
  // Update UI
  document.querySelectorAll(`.chat-card[data-chat-id="${chatId}"]`).forEach(card => {
    card.classList.remove('has-unread');
    const badge = card.querySelector('.chat-card-badge');
    if (badge) badge.remove();
  });
  
  updateRequestsBadge();
  checkNotifications();
}

// Handle new chat creation (for message requests, new contacts, etc.)
function handleNewChat(chatId, initialMessage = null) {
  const chat = state.chats[chatId];
  if (!chat) return;
  
  // For new chats, set last read timestamp to before the first message
  if (initialMessage && initialMessage.timestamp) {
    const messageTime = new Date(initialMessage.timestamp).getTime();
    // Set last read to 1 second before the message
    const key = `chatApp_lastRead_${chatId}`;
    localStorage.setItem(key, (messageTime - 1000).toString());
  } else {
    // For completely new chats with no messages yet, mark as read
    setLastReadTimestamp(chatId);
  }
  
  // Calculate unread count
  chat.unread = calculateUnreadCount(chat);
  
  // Update UI
  renderChatCards();
}

// Mark all chats as read
function markAllAsRead() {
  for (const chatId in state.chats) {
    markChatAsRead(chatId);
  }
  
  showToast('All messages marked as read', 'success');
  updateAllUnreadCounts();
}

// Add to UI (optional - add a button somewhere)
function addMarkAllReadButton() {
  const button = document.createElement('button');
  button.innerHTML = '<i class="fas fa-check-double"></i> Mark All Read';
  button.style.position = 'fixed';
  button.style.bottom = '20px';
  button.style.right = '20px';
  button.style.zIndex = '999';
  button.style.padding = '10px 15px';
  button.style.background = 'var(--primary-color)';
  button.style.color = 'white';
  button.style.border = 'none';
  button.style.borderRadius = '20px';
  button.style.cursor = 'pointer';
  button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
  button.onclick = markAllAsRead;
  document.body.appendChild(button);
}

// ========== SEARCH FUNCTIONALITY ==========

// Show search modal
function showSearchModal() {
  showModal('search-modal');
  
  // Focus on search input
  setTimeout(() => {
    const searchInput = document.getElementById('search-users-input');
    if (searchInput) {
      searchInput.focus();
      searchInput.value = '';
    }
  }, 100);
  
  // Initial empty state
  document.getElementById('search-results-container').innerHTML = `
    <div class="search-empty-state">
      <i class="fas fa-search"></i>
      <p>Type to search all users</p>
    </div>
  `;
}

// Close search modal
function closeSearchModal() {
  closeModal('search-modal');
}

// Filter search results
function filterSearchResults() {
  const searchInput = document.getElementById('search-users-input');
  const searchTerm = searchInput.value.trim().toLowerCase();
  const resultsContainer = document.getElementById('search-results-container');
  
  if (!searchTerm) {
    resultsContainer.innerHTML = `
      <div class="search-empty-state">
        <i class="fas fa-search"></i>
        <p>Type to search all users</p>
      </div>
    `;
    return;
  }
  
  // Get all available users (contacts + non-contacts + groups)
  const allUsers = getAllSearchableUsers();
  
  // Filter users by search term
  const filteredUsers = allUsers.filter(user => 
    user.name.toLowerCase().includes(searchTerm) ||
    (user.type && user.type.toLowerCase().includes(searchTerm))
  );
  
  // Display results
  displaySearchResults(filteredUsers, searchTerm);
}

// Get all searchable users (contacts, non-contacts, groups)
function getAllSearchableUsers() {
  const users = [];
  const currentUser = state.currentUser;
  
  // 1. Add contacts (from state.users)
  state.users.forEach(user => {
    if (user !== currentUser) {
      users.push({
        id: user,
        name: user,
        type: 'contact',
        isInContacts: true,
        isGroup: false
      });
    }
  });
  
  // 2. Add predefined non-contacts
  const predefinedUsers = ["Rev", "Ska", "kinaa", "Eyram", "Yayra", "Stephen", "Diana"];
  predefinedUsers.forEach(user => {
    if (user !== currentUser && !state.users.includes(user)) {
      users.push({
        id: user,
        name: user,
        type: 'non-contact',
        isInContacts: false,
        isGroup: false
      });
    }
  });
  
  // 3. Add groups
  state.groups.forEach(group => {
    users.push({
      id: group,
      name: group,
      type: 'group',
      isInContacts: true, // Groups are always available
      isGroup: true
    });
  });
  
  // 4. Add any temporary chats
  for (const chatId in state.chats) {
    if (!users.some(u => u.id === chatId) && 
        chatId !== currentUser && 
        !chatId.startsWith('request_')) {
      
      const isGroup = state.chats[chatId]?.type === 'group';
      
      users.push({
        id: chatId,
        name: chatId,
        type: isGroup ? 'group' : 'non-contact',
        isInContacts: false,
        isGroup: isGroup
      });
    }
  }
  
  // Remove duplicates
  const uniqueUsers = [];
  const seenIds = new Set();
  
  users.forEach(user => {
    if (!seenIds.has(user.id)) {
      seenIds.add(user.id);
      uniqueUsers.push(user);
    }
  });
  
  // Sort: contacts first, then alphabetical
  uniqueUsers.sort((a, b) => {
    // Contacts first
    if (a.isInContacts && !b.isInContacts) return -1;
    if (!a.isInContacts && b.isInContacts) return 1;
    
    // Then groups
    if (a.isGroup && !b.isGroup) return -1;
    if (!a.isGroup && b.isGroup) return 1;
    
    // Then alphabetical
    return a.name.localeCompare(b.name);
  });
  
  return uniqueUsers;
}

// Display search results
function displaySearchResults(users, searchTerm) {
  const resultsContainer = document.getElementById('search-results-container');
  
  if (users.length === 0) {
    resultsContainer.innerHTML = `
      <div class="search-empty-state">
        <i class="fas fa-user-slash"></i>
        <p>No users found for "${searchTerm}"</p>
        <p style="font-size: 12px; margin-top: 10px;">Try a different search term</p>
      </div>
    `;
    return;
  }
  
  let resultsHTML = '';
  
  users.forEach(user => {
    const isCurrentChat = user.id === state.currentChat;
    const initials = getInitials(user.name);
    const color = getColorFromString(user.name);
    
    // Highlight search term in name
    const highlightedName = highlightText(user.name, searchTerm);
    
    resultsHTML += `
      <div class="search-user-item ${isCurrentChat ? 'active-chat' : ''}" 
          onclick="handleSearchUserClick('${user.id}', ${user.isInContacts}, ${user.isGroup})">
        
        <div class="search-user-avatar" style="background: ${color}">
          ${user.isGroup ? '<i class="fas fa-users"></i>' : initials}
        </div>
        
        <div class="search-user-info">
          <div class="search-user-name">${highlightedName}</div>
          <div class="search-user-status">
            <span class="search-user-type ${user.type}">
              ${user.type === 'contact' ? 'Contact' : 
                user.type === 'non-contact' ? 'Not in contacts' : 
                'Group'}
            </span>
            ${user.isGroup ? '• ' + (user.name === 'Global Chat' ? '8 members' : '3 members') : ''}
          </div>
        </div>
        
        <div class="search-user-actions">
          ${!user.isInContacts && !user.isGroup ? `
            <button class="search-action-btn add" 
                    onclick="event.stopPropagation(); addSearchUserToContacts('${user.id}')"
                    title="Add to contacts">
              <i class="fas fa-user-plus"></i>
            </button>
          ` : ''}
          
          <button class="search-action-btn chat" 
                  onclick="event.stopPropagation(); startChatWithSearchUser('${user.id}')"
                  title="${user.isGroup ? 'Open group' : 'Start chat'}">
            <i class="fas fa-comment"></i>
          </button>
        </div>
      </div>
    `;
  });
  
  resultsContainer.innerHTML = resultsHTML;
}

// Highlight search term in text
function highlightText(text, searchTerm) {
  if (!searchTerm) return escapeHtml(text);
  
  const escapedText = escapeHtml(text);
  const escapedSearchTerm = escapeHtml(searchTerm);
  
  const regex = new RegExp(`(${escapedSearchTerm})`, 'gi');
  return escapedText.replace(regex, '<span class="highlight">$1</span>');
}

// Handle click on search user
function handleSearchUserClick(userId, isInContacts, isGroup) {
  if (isGroup || isInContacts) {
    // Open existing chat or create one
    openChatWithUser(userId);
  } else {
    // Show options for non-contact
    showUsernameOptions(userId);
  }
  closeSearchModal();
}

// Add search user to contacts
function addSearchUserToContacts(username) {
  if (!state.users.includes(username)) {
    state.users.push(username);
  }
  
  if (!state.userContacts.includes(username)) {
    state.userContacts.push(username);
    localStorage.setItem('chatAppContacts', JSON.stringify(state.userContacts));
  }
  
  // Create chat if doesn't exist
  if (!state.chats[username]) {
    state.chats[username] = {
      id: username,
      name: username,
      type: 'individual',
      messages: [],
      lastActivity: null,
      unread: 0
    };
  }
  
  // Update search results
  filterSearchResults();
  
  showToast(`${username} added to contacts`, 'success');
}

// Start chat with search user
function startChatWithSearchUser(userId) {
  closeSearchModal();
  
  if (state.chats[userId]) {
    // Open existing chat
    openChatView(userId);
  } else {
    // Create new chat
    const isGroup = state.groups.includes(userId);
    
    if (isGroup) {
      state.chats[userId] = {
        id: userId,
        name: userId,
        type: 'group',
        messages: [],
        lastActivity: null,
        unread: 0
      };
    } else {
      state.chats[userId] = {
        id: userId,
        name: userId,
        type: 'individual',
        messages: [],
        lastActivity: null,
        unread: 0,
        isTemporary: !state.users.includes(userId)
      };
    }
    
    // Open the chat
    setTimeout(() => {
      openChatView(userId);
      showToast(`Started chat with ${userId}`, 'success');
    }, 100);
  }
}

// ========== PUSH NOTIFICATIONS ==========

// Check and request notification permission
async function initializePushNotifications() {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }
  
  if (!('serviceWorker' in navigator)) {
    console.log('This browser does not support service workers');
    return false;
  }
  
  // Register service worker
  try {
    const registration = await navigator.serviceWorker.register('/videochat/sw.js');
    console.log('Service Worker registered:', registration);
    
    // Request permission
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted');
      subscribeToPushNotifications(registration);
      return true;
    } else {
      console.log('Notification permission denied');
      return false;
    }
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return false;
  }
}

// Subscribe to push notifications
async function subscribeToPushNotifications(registration) {
  try {
    const subscribeOptions = {
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        'BCk-QqERU0qj5TsnFZ3ztGdJTTgO3tXp10KvLJj18E7QYQn3XU2EfHlLt6Ww6b3yWX2eY8uZvHnLpFtqjBcX3zU'
      )
    };
    
    const subscription = await registration.pushManager.subscribe(subscribeOptions);
    console.log('Push subscription successful:', subscription);
    
    // Save subscription to localStorage
    localStorage.setItem('pushSubscription', JSON.stringify(subscription));
    
    // Send subscription to your backend (Google Sheets)
    sendSubscriptionToBackend(subscription);
    
    return subscription;
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    return null;
  }
}

// Convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Send subscription to backend (using your existing Google Sheets)
async function sendSubscriptionToBackend(subscription) {
  const subscriptionData = {
    timestamp: new Date().toISOString(),
    action: 'push_subscription',
    subscription: JSON.stringify(subscription)
  };
  
  // Send to your Google Sheets
  sendMessageToBackend(subscriptionData)
    .then(() => {
      console.log('Push subscription sent to backend');
    })
    .catch(error => {
      console.error('Error sending subscription:', error);
    });
}

// Show local notification (for when browser is open)
function showLocalNotification(title, body, chatId = null) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }
  
  const options = {
    body: body,
    icon: 'https://cdn-icons-png.flaticon.com/512/733/733585.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/733/733585.png',
    tag: chatId || 'chat-notification',
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      chatId: chatId,
      url: window.location.href
    }
  };
  
  const notification = new Notification(title, options);
  
  notification.onclick = function(event) {
    event.preventDefault();
    window.focus();
    notification.close();
    
    if (chatId && state.chats[chatId]) {
      openChatView(chatId);
    }
  };
  
  // Auto-close after 10 seconds
  setTimeout(() => {
    notification.close();
  }, 10000);
  
  return notification;
}

// Enhanced showNotification function (update your existing one)
function showEnhancedNotification(message) {
  if (!message || !message.sender) return;
  
  // Check 1: Don't notify for messages in currently open chat
  if (state.currentChat && 
      (message.receiver === state.currentChat || 
      message.sender === state.currentChat)) {
    console.log('Suppressing notification - current chat is open');
    return;
  }
  
  // Check 2: Don't notify for own messages
  if (message.sender === state.currentUser) {
    console.log('Suppressing notification - own message');
    return;
  }
  
  // Check 3: Don't notify for reaction messages
  if (message.isReactionMessage || 
      (message.text && message.text.includes('[REACTION:'))) {
    console.log('Suppressing notification - reaction message');
    return;
  }
  
  // Check 4: Don't notify for already read messages
  // Get the chat this message belongs to
  let targetChatId = null;
  
  if (message.receiver === state.currentUser) {
    targetChatId = message.sender;
  } else if (message.receiver === 'GROUP' || message.receiver === 'Global Chat') {
    targetChatId = 'Global Chat';
  }
  
  if (targetChatId) {
    const lastReadTime = getLastReadTimestamp(targetChatId);
    const messageTime = new Date(message.timestamp).getTime();
    
    // If message is older than last read time, don't notify
    if (messageTime <= lastReadTime) {
      console.log('Suppressing notification - message already read');
      return;
    }
  }
  
  // Check 5: Don't notify for very old messages (just fetched from history)
  const messageAge = Date.now() - new Date(message.timestamp).getTime();
  if (messageAge > 60000) { // Older than 1 minute
    console.log('Suppressing notification - old message from history');
    return;
  }
  
  // If all checks pass, show the notification
  showNotification(message);

  // Your existing notification logic
  if (!elements.taskbarNotification || !elements.notificationText) return;
  
  elements.notificationText.textContent = `New message from ${message.sender}`;
  elements.taskbarNotification.classList.add('active');
  
  Toastify({
    text: `New message from ${message.sender}: ${message.text.substring(0, 50)}...`,
    duration: 3000,
    gravity: "top",
    position: "right",
    backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)",
    stopOnFocus: true
  }).showToast();
  
  // ADD PUSH NOTIFICATION
  if (Notification.permission === 'granted') {
    showLocalNotification(
      `New message from ${message.sender}`,
      message.text.substring(0, 100),
      message.chatId || state.currentChat
    );
  }
  
  if (navigator.vibrate) {
    navigator.vibrate([200, 100, 200]);
  }
  
  setTimeout(() => {
    if (elements.taskbarNotification) {
      elements.taskbarNotification.classList.remove('active');
    }
  }, 5000);
}

// Check for incoming push messages from Google Sheets
function checkForPushMessages() {
  // This would be called from your existing fetchNewMessages
  // or run on its own interval
  console.log('Checking for push messages...');
}

// Initialize on app start
async function initPushSystem() {
  // Check if we're in a secure context (HTTPS or localhost)
  if (window.isSecureContext) {
    const hasPermission = await initializePushNotifications();
    if (hasPermission) {
      console.log('Push notifications initialized');
      
      // Listen for visibility changes
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          console.log('Page is hidden - push notifications active');
        } else {
          console.log('Page is visible');
        }
      });
    }
  } else {
    console.log('Push notifications require HTTPS (or localhost)');
  }
}

// Show notification settings
function showNotificationSettings() {
  showModal('notification-modal');
  
  // Load saved settings
  const settings = getNotificationSettings();
  document.getElementById('enable-notifications').checked = settings.enabled;
  document.getElementById('sound-notifications').checked = settings.sound;
  document.getElementById('vibrate-notifications').checked = settings.vibrate;
  document.getElementById('notification-sound').value = settings.soundType;
}

// Get notification settings
function getNotificationSettings() {
  const defaultSettings = {
    enabled: true,
    sound: true,
    vibrate: true,
    soundType: 'default'
  };
  
  const saved = localStorage.getItem('notificationSettings');
  return saved ? JSON.parse(saved) : defaultSettings;
}

// Save notification settings
function saveNotificationSettings() {
  const settings = {
    enabled: document.getElementById('enable-notifications').checked,
    sound: document.getElementById('sound-notifications').checked,
    vibrate: document.getElementById('vibrate-notifications').checked,
    soundType: document.getElementById('notification-sound').value
  };
  
  localStorage.setItem('notificationSettings', JSON.stringify(settings));
  showToast('Notification settings saved', 'success');
  closeModal('notification-modal');
}

// Test notification
function testNotification() {
  showLocalNotification(
    'Test Notification',
    'This is a test notification from ChatApp',
    'test'
  );
  showToast('Test notification sent', 'info');
}

// Add notification button to settings menu
function addNotificationMenu() {
  const settingsMenu = document.querySelector('.settings-menu');
  if (settingsMenu) {
    const notificationItem = document.createElement('div');
    notificationItem.className = 'menu-item';
    notificationItem.onclick = showNotificationSettings;
    notificationItem.innerHTML = `
      <i class="fas fa-bell"></i>
      <span>Notifications</span>
    `;
    settingsMenu.appendChild(notificationItem);
  }
}

// Call this after app initialization
setTimeout(addNotificationMenu, 1000);

// Throttle function for performance
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Throttle scroll events
elements.messagesContainer.addEventListener('scroll', throttle(() => {
  // Your scroll handling code
}, 100));

// Throttle resize events
window.addEventListener('resize', throttle(() => {
  // Your resize handling
}, 250));

// Preload next likely chat
function preloadNextChat() {
  if (!state.currentChat) return;
  
  // Get chats sorted by last activity
  const sortedChats = Object.values(state.chats)
    .filter(chat => chat.id !== state.currentChat && chat.messages.length > 0)
    .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
  
  // Preload the most recent chat
  if (sortedChats.length > 0) {
    const nextChat = sortedChats[0];
    
    // Preload messages in background
    setTimeout(() => {
      if (state.currentChat !== nextChat.id) {
        // Just load into memory, don't render
        console.log(`Preloaded chat: ${nextChat.id}`);
      }
    }, 1000);
  }
}

// Auto-scroll to bottom for group chats
function autoScrollToBottom() {
  if (!state.currentChat) return;
  
  const chat = state.chats[state.currentChat];
  if (!chat || chat.type !== 'group') return;
  
  // Small delay to ensure messages are rendered
  setTimeout(() => {
    scrollToBottom();
    
    // Additional check after images/links load
    setTimeout(() => {
      scrollToBottom();
    }, 300);
  }, 100);
}

// Update group members when messages are sent/received
function updateGroupMembers(chatId, sender) {
  // Only process for groups
  if (!state.chats[chatId] || state.chats[chatId].type !== 'group') return;
  
  // Add sender to group members
  if (!state.groupMembers[chatId]) {
    state.groupMembers[chatId] = new Set();
  }
  
  state.groupMembers[chatId].add(sender);
  
  // Save to localStorage for persistence
  saveGroupMembers();
  
  console.log(`👥 Group ${chatId} now has ${state.groupMembers[chatId].size} members`);
}

// Save group members to localStorage
function saveGroupMembers() {
  const serialized = {};
  for (const groupName in state.groupMembers) {
    serialized[groupName] = Array.from(state.groupMembers[groupName]);
  }
  localStorage.setItem('chatApp_groupMembers', JSON.stringify(serialized));
}

// Load group members from localStorage
function loadGroupMembers() {
  const saved = localStorage.getItem('chatApp_groupMembers');
  if (saved) {
    const parsed = JSON.parse(saved);
    for (const groupName in parsed) {
      state.groupMembers[groupName] = new Set(parsed[groupName]);
    }
    console.log('👥 Loaded group members from storage');
  }
}

// Scan all existing messages to populate group members
function populateGroupMembersFromHistory() {
  console.log('👥 Scanning message history for group members...');
  
  for (const chatId in state.chats) {
    const chat = state.chats[chatId];
    if (chat.type === 'group' && chat.messages) {
      chat.messages.forEach(message => {
        updateGroupMembers(chatId, message.sender);
      });
      
      // Also add current user if they haven't messaged yet
      if (!state.groupMembers[chatId] || !state.groupMembers[chatId].has(state.currentUser)) {
        updateGroupMembers(chatId, state.currentUser);
      }
    }
  }
  
  console.log('👥 Group members populated from history');
}

// Call this after loading messages
// populateGroupMembersFromHistory();

// Show group members list
function showGroupMembers(chatId) {
  const chat = state.chats[chatId];
  if (!chat || chat.type !== 'group') return;
  
  const members = state.groupMembers[chatId] ? 
    Array.from(state.groupMembers[chatId]) : [];
  
  let membersHTML = '';
  members.forEach(member => {
    const isYou = member === state.currentUser;
    membersHTML += `
      <div style="display: flex; align-items: center; gap: 10px; padding: 10px; border-bottom: 1px solid var(--border-color);">
        <div class="profile-avatar small" style="background: ${getColorFromString(member)}">
          ${getInitials(member)}
        </div>
        <div>
          <div style="font-weight: 500;">${member} ${isYou ? '(You)' : ''}</div>
          <div style="font-size: 12px; color: var(--text-secondary);">
            ${isYou ? 'Group member' : 'Participant'}
          </div>
        </div>
      </div>
    `;
  });
  
  const modalHTML = `
    <div class="modal-overlay active" id="group-members-modal">
      <div class="modal-content">
        <h2 class="modal-title">${chat.name} Members</h2>
        <div style="margin: 15px 0; text-align: center;">
          <div style="font-size: 14px; color: var(--text-secondary);">
            ${members.length} member${members.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div style="max-height: 400px; overflow-y: auto;">
          ${membersHTML}
        </div>
        <div class="modal-actions">
          <button class="modal-btn primary" onclick="closeModal('group-members-modal')">
            Close
          </button>
        </div>
      </div>
    </div>
  `;
  
  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = modalHTML;
  document.body.appendChild(modalContainer);
}

// Update chat subtitle to be clickable
function makeGroupCountClickable() {
  // You can add click event to group count to show members
}

// ========== BACKEND INTEGRATION FUNCTIONS ==========

// Send message to backend
async function sendMessageToBackend(messageData) {
  try {
    const user = JSON.parse(localStorage.getItem('chatAppUser'));
    if (!user) {
      console.error('No user found in localStorage');
      return { success: false, error: 'User not logged in' };
    }
    
    // Add user ID if not present
    if (!messageData.sender_id && user.user_id) {
      messageData.sender_id = user.user_id;
    }
    
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messageData)
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Send message error:', error);
    return { success: false, error: error.message };
  }
}

// Fetch messages from backend
async function fetchMessagesFromBackend() {
  try {
    const user = JSON.parse(localStorage.getItem('chatAppUser'));
    if (!user) {
      console.error('No user found in localStorage');
      return [];
    }
    
    const lastFetch = localStorage.getItem('lastMessageFetch') || new Date().toISOString();
    
    const response = await fetch(
      `${BACKEND_URL}?action=get_messages&user_id=${user.user_id}&since=${lastFetch}`
    );
    
    const data = await response.json();
    
    if (data.success) {
      return data.messages;
    }
    return [];
  } catch (error) {
    console.error('Fetch messages error:', error);
    return [];
  }
}

// Register user with backend
async function registerUserBackend(username, phoneNumber) {
  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'register',
        username: username,
        phone_number: phoneNumber,
        display_name: username
      })
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: error.message };
  }
}

// Login user with backend
async function loginUserBackend(username, phoneNumber) {
  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'login',
        username: username,
        phone_number: phoneNumber
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Store user info
      localStorage.setItem('chatAppUser', JSON.stringify(data.user));
      state.currentUser = data.user.user_id;
      state.userProfile = data.user;
      
      // Initialize app
      initializeApp();
    }
    
    return data;
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
}

// Fetch users list from backend
async function fetchUsersListBackend(search = '') {
  try {
    const user = JSON.parse(localStorage.getItem('chatAppUser'));
    if (!user) return [];
    
    const response = await fetch(`${BACKEND_URL}?action=get_users&user_id=${user.user_id}&search=${encodeURIComponent(search)}`);
    const data = await response.json();
    
    if (data.success) {
      return data.users;
    }
    return [];
  } catch (error) {
    console.error('Fetch users error:', error);
    return [];
  }
}

// Update your existing functions to use backend
async function updateProfileBackend(displayName, status) {
  try {
    const user = JSON.parse(localStorage.getItem('chatAppUser'));
    if (!user) return { success: false, error: 'User not logged in' };
    
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'update_profile',
        user_id: user.user_id,
        display_name: displayName,
        status: status
      })
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Update profile error:', error);
    return { success: false, error: error.message };
  }
}
