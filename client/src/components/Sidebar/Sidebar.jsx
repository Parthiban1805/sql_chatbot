import { Menu, MessageSquarePlus, X } from "lucide-react";
import { useState } from "react";

// NOTE: Remember to remove the import for "./Sidebar.css"

const Sidebar = ({ history, onSelectHistory, onNewChat, activeConversationId }) => {
  // The sidebar is expanded by default. It manages its own state.
  const [expanded, setExpanded] = useState(true);

  const handleNewChatClick = () => {
    onNewChat();
    // On mobile, collapse the sidebar after starting a new chat for a better view
    if (window.innerWidth < 768) {
      setExpanded(false);
    }
  };

  const handleHistoryClick = (id) => {
    onSelectHistory(id);
    // On mobile, collapse the sidebar after selecting a chat
    if (window.innerWidth < 768) {
      setExpanded(false);
    }
  };

  return (
    // The main sidebar container. Uses flexbox and transitions for width.
    <div
      className={`relative flex h-screen flex-col bg-gray-900 text-gray-100 transition-all duration-300 ease-in-out ${
        expanded ? "w-64" : "w-20"
      }`}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between border-b border-gray-700 p-4">
        {/* New Chat Button: Text is hidden when collapsed */}
        {expanded && (
          <button
            className="flex flex-grow items-center gap-3 rounded-md border border-gray-600 p-2 text-sm font-semibold transition-colors hover:bg-gray-800"
            onClick={handleNewChatClick}
          >
            <MessageSquarePlus size={20} />
            New Chat
          </button>
        )}
        
        {/* Toggle Button */}
        <button
          className="rounded-md p-2 transition-colors hover:bg-gray-800"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* History Section */}
      <div className="flex-grow overflow-y-auto overflow-x-hidden p-2">
        {expanded && (
          <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Recent
          </p>
        )}
        <div className="flex flex-col gap-1">
          {history.map((chat) => (
            <button
              key={chat.id}
              className={`w-full truncate rounded-md p-2 text-left text-sm transition-colors hover:bg-gray-800 ${
                activeConversationId === chat.id ? "bg-gray-700" : ""
              }`}
              onClick={() => handleHistoryClick(chat.id)}
              title={chat.title}
            >
              <span className={!expanded ? 'sr-only' : ''}>{chat.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sidebar Footer (Optional) */}
      <div className="mt-auto border-t border-gray-700 p-4">
        {/* You can add user info, settings, or a logout button here */}
        {expanded && <div className="text-sm text-gray-500">User Info</div>}
      </div>
    </div>
  );
};

export default Sidebar;