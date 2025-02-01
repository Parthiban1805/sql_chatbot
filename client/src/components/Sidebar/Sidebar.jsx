import React, { useState } from "react";
import { Menu, X, MessageSquarePlus, Download, User } from "lucide-react";
import "./Sidebar.css";

const Sidebar = ({ onToggle }) => {
  const [expanded, setExpanded] = useState(false);

  const toggleSidebar = () => {
    setExpanded(!expanded);
    onToggle(!expanded); 
  };

  return (
    <div className={`sidebar ${expanded ? "expanded" : "collapsed"}`}>
      <button className="toggle-btn" onClick={toggleSidebar}>
        {expanded ? <X size={24} /> : <Menu size={24} />}
      </button>

      <button className="new-chat-btn" onClick={toggleSidebar}>
        <MessageSquarePlus size={24} />
        {expanded && <span>New Chat</span>}
      </button>

      <div className="sidebar-footer">
        

  
      </div>
    </div>
  );
};

export default Sidebar;
