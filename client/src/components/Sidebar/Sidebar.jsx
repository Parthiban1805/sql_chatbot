import React, { useState } from "react";
import { Menu, X, MessageSquarePlus } from "lucide-react";
import "./Sidebar.css";

const Sidebar = ({ onToggle, history, onSelectHistory, onNewChat, activeConversationId }) => {
  const [expanded, setExpanded] = useState(true); // Default to expanded on desktop

  const toggleSidebar = () => {
    const newState = !expanded;
    setExpanded(newState);
    onToggle(newState); 
  };
  
  const handleNewChatClick = () => {
    onNewChat();
    // Optional: close sidebar on mobile after clicking new chat
    if (window.innerWidth < 768 && expanded) {
      toggleSidebar();
    }
  }

  const handleHistoryClick = (id) => {
    onSelectHistory(id);
    // Optional: close sidebar on mobile after selecting a chat
    if (window.innerWidth < 768 && expanded) {
      toggleSidebar();
    }
  }

  return (
    <div className={`sidebar ${expanded ? "expanded" : "collapsed"}`}>
      <div className="sidebar-header">
        <button className="new-chat-btn" onClick={handleNewChatClick}>
          <MessageSquarePlus size={20} />
          {expanded && <span>New Chat</span>}
        </button>
        <button className="toggle-btn" onClick={toggleSidebar}>
          {expanded ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {expanded && (
        <div className="sidebar-history">
          <p className="history-title">Recent</p>
          <div className="history-list">
            {history.map((chat) => (
              <button
                key={chat.id}
                className={`history-item ${activeConversationId === chat.id ? 'active' : ''}`}
                onClick={() => handleHistoryClick(chat.id)}
                title={chat.title}
              >
                {chat.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="sidebar-footer">
        {/* You can add user info or logout button here */}
      </div>
    </div>
  );
};

export default Sidebar;