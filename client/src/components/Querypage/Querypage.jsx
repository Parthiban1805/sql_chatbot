import { jwtDecode } from 'jwt-decode';
import { RefreshCw, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import apiClient from '../../api/axiosConfig';
import src from '../../assets/image.png';
import Sidebar from '../Sidebar/Sidebar';

// NOTE: Remember to remove the import for "./Querypage.css"

function StudentQueryApp() {
  const [user, setUser] = useState(null);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [chatHistoryList, setChatHistoryList] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      try {
        const decoded = jwtDecode(storedToken);
        setUser(decoded);
        fetchConversationsList();
      } catch (error) {
        console.error('Invalid token:', error);
        localStorage.removeItem('authToken');
      }
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversationsList = async () => {
    try {
      const response = await apiClient.get("/conversations");
      setChatHistoryList(response.data || []);
    } catch (error) {
      console.error("Error fetching chat history list:", error.message);
    }
  };

  const handleSelectConversation = async (conversationId) => {
    if (loading) return;
    setLoading(true);
    setMessages([]);
    try {
      const response = await apiClient.get(`/conversation/${conversationId}`);
      setMessages(response.data);
      setCurrentConversationId(conversationId);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      setMessages([{ type: 'error', content: 'Failed to load this chat.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setCurrentConversationId(null);
    setQuery('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    if (!localStorage.getItem('authToken')) {
      setMessages((prev) => [...prev, { type: 'error', content: 'Authentication error. Please login again.' }]);
      return;
    }

    const newUserMessage = { type: 'user', content: query };
    setMessages((prev) => [...prev, newUserMessage]);
    setQuery('');
    setLoading(true);

    try {
      const response = await apiClient.post('/query', { query, conversationId: currentConversationId });
      const { natural_language_response, newConversation } = response.data;
      const newBotMessage = { type: 'bot', content: natural_language_response || 'No results found' };
      setMessages((prev) => [...prev, newBotMessage]);

      if (newConversation && newConversation.id) {
        setCurrentConversationId(newConversation.id);
        // Add new chat to the top of the history list
        setChatHistoryList((prev) => [newConversation, ...prev.filter(c => c.id !== newConversation.id)]);
      }

    } catch (err) {
      const errorMessage = err.response?.data?.error || 'A server error occurred.';
      setMessages((prev) => [...prev, { type: 'error', content: errorMessage }]);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions to parse response content
  const extractImageUrls = (text) => {
    const regex = /(https?:\/\/[^\s]+(\.jpg|\.jpeg|\.png|\.gif))/g;
    return text.match(regex) || [];
  };

  const parseContent = (content) => {
    // This function can be further improved based on expected response formats
    // For now, it handles simple text and image URLs found in the text.
    const lines = content.split('\n').filter(line => line.trim() !== '');
    const elements = [];
    lines.forEach(line => {
        const imageUrls = extractImageUrls(line);
        if(imageUrls.length > 0) {
            imageUrls.forEach(url => elements.push({ type: 'image', url: url }));
            const textPart = line.replace(imageUrls.join(' '), '').trim();
            if(textPart) elements.push({type: 'text', content: textPart});
        } else {
            elements.push({ type: 'text', content: line });
        }
    });
    return elements;
  };

  return (
    <div className="flex h-screen w-full bg-gray-800 text-gray-100">
      <Sidebar 
        history={chatHistoryList}
        onSelectHistory={handleSelectConversation}
        onNewChat={handleNewChat}
        activeConversationId={currentConversationId}
      />
      
      <div className="flex flex-grow flex-col">
        {/* Main Chat Area */}
        <main className="flex-grow overflow-y-auto p-4 md:p-6">
          {messages.length === 0 && !loading ? (
             // Welcome Screen for new chats
            <div className="flex h-full flex-col items-center justify-center text-center">
                <img src={src} className="h-16 mb-4" alt="Logo" />
                <h1 className="text-2xl font-bold">BIT Chatbot</h1>
                <p className="text-gray-400">Ask a question about the student database to get started.</p>
            </div>
          ) : (
            // Chat messages
            <div className="mx-auto w-full max-w-3xl space-y-6">
              {messages.map((msg, index) => (
                <div key={index} className={`flex items-start gap-3 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {/* Message Bubble */}
                  <div className={`max-w-xl rounded-lg p-3 lg:max-w-2xl ${
                      msg.type === 'user' ? 'bg-blue-600 text-white' 
                      : msg.type === 'bot' ? 'bg-gray-700 text-gray-200' 
                      : 'border border-red-500/50 bg-red-900/50 text-red-200'
                  }`}>
                    {msg.type === 'user' && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
                    {msg.type === 'error' && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
                    {msg.type === 'bot' && (
                      <div className="space-y-2">
                        {parseContent(msg.content).map((element, idx) => {
                           if (element.type === 'image') {
                            return <img key={idx} src={element.url} alt="Result" className="max-w-xs rounded-lg" />;
                          } else if (element.type === 'text') {
                            return <p key={idx} className="whitespace-pre-wrap break-words">{element.content}</p>;
                          }
                          return null;
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                  <div className="flex justify-start">
                      <div className="rounded-lg bg-gray-700 p-4">
                        <RefreshCw className="h-6 w-6 animate-spin text-gray-300" />
                      </div>
                  </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </main>
        
        {/* Chat Input Form Area */}
        <div className="w-full bg-gray-800 p-4 md:p-6">
            <form onSubmit={handleSubmit} className="relative mx-auto w-full max-w-3xl">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Enter your database query..."
                    className="w-full rounded-xl border border-gray-600 bg-gray-700 p-4 pr-14 text-gray-100 placeholder-gray-400 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button 
                  type="submit" 
                  disabled={loading || !query.trim()} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg bg-green-500 p-2 text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-gray-500"
                >
                    <Send size={20} />
                </button>
            </form>
        </div>
      </div>
    </div>
  );
}

export default StudentQueryApp;