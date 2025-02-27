import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Send, RefreshCw } from 'lucide-react';
import './Querypage.css';
import src from '../../assets/image.png';
import Sidebar from '../Sidebar/Sidebar';
import { jwtDecode } from 'jwt-decode';

function StudentQueryApp() {
  const [user, setUser] = useState(null);
  const [token,setToken]=useState(null)
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [firstPrompt, setFirstPrompt] = useState(true);
  const messagesEndRef = useRef(null);
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      try {
        const decoded = jwtDecode(storedToken);
        setUser(decoded);
        setToken(storedToken); // Update token state
        fetchChatHistory();
      } catch (error) {
        console.error('Invalid token:', error);
        localStorage.removeItem('token');
      }
    }
  }, []);

  useEffect(() => {
    const storedMessages = JSON.parse(localStorage.getItem('chatHistory')) || [];
    setMessages(storedMessages);  // Load chat history from localStorage
  }, []);

  const fetchChatHistory = async () => {
    const freshToken = localStorage.getItem('authToken');
    if (!freshToken) {
      return;
    }
    
    try {
      const response = await axios.get("http://localhost:3001/chat-history", {
        headers: { Authorization: `Bearer ${freshToken}` },
      });

      // Check if chat history exists in the response
      if (response.data.chat_history) {
        const chatHistory = response.data.chat_history;
        
        // Update the state with chat history from the database
        setMessages(chatHistory.map(msg => ({
          type: msg.user_message ? 'user' : 'bot',
          content: msg.user_message || msg.bot_response,
        })));
      }
    } catch (error) {
      console.error("Error fetching chat history:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem('authToken');
      }
    }
  };
  
  const extractImageUrls = (text) => {
    const regex = /(https?:\/\/[^\s]+(\.jpg|\.jpeg|\.png|\.gif))/g;
    const matches = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push(match[0]);
    }
    return matches;
  };

  const parseContent = (content) => {
    const lines = content.split('\n');
    const elements = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const studentMatch = line.match(/^([A-Z\s]+)$/);
      if (studentMatch && i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const imageUrls = extractImageUrls(nextLine);
        if (imageUrls.length > 0) {
          elements.push({
            type: 'student-info',
            name: studentMatch[1],
            imageUrl: imageUrls[0],
          });
          i += 2;
          continue;
        }
      }
      const imageUrls = extractImageUrls(line);
      if (imageUrls.length > 0) {
        let remainingText = line;
        const lineParts = [];
        imageUrls.forEach((url) => {
          const index = remainingText.indexOf(url);
          if (index !== -1) {
            const textBefore = remainingText.substring(0, index);
            if (textBefore.trim() !== '') {
              lineParts.push({ type: 'text', content: textBefore });
            }
            lineParts.push({ type: 'image', url });
            remainingText = remainingText.substring(index + url.length);
          }
        });
        if (remainingText.trim() !== '') {
          lineParts.push({ type: 'text', content: remainingText });
        }
        lineParts.forEach((part) => elements.push(part));
      } else {
        if (line.trim() !== '') {
          elements.push({ type: 'text', content: line });
        }
      }
      i++;
    }
    return elements;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
  
    const freshToken = localStorage.getItem('authToken');
    console.log("Fresh",freshToken)
    if (!freshToken) {
      setMessages((prev) => [
        ...prev, 
        { type: 'error', content: 'Please login to continue' }
      ]);
      return;
    }
    const newUserMessage = { type: 'user', content: query };

    // Update messages state with user query and store it in localStorage
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    localStorage.setItem('chatHistory', JSON.stringify(updatedMessages));  // Save chat history in localStorage
    setQuery('');
    setLoading(true);
    setFirstPrompt(false);

    

    try {
      const response = await axios.post(
        'http://localhost:3001/query',
        { query },
        { headers: { Authorization: `Bearer ${freshToken}` } } // Use freshToken here
      );
      

      const { natural_language_response } = response.data;
      const newBotMessage = { type: 'bot', content: natural_language_response || 'No results found' };

      // Add bot message to state and update localStorage
      const updatedMessagesWithBot = [...updatedMessages, newBotMessage];
      setMessages(updatedMessagesWithBot);
      localStorage.setItem('chatHistory', JSON.stringify(updatedMessagesWithBot));  // Save updated chat history in localStorage

      setMessages((prev) => [
        ...prev,
        { type: 'bot', content: natural_language_response || 'No results found' }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { type: 'error', content: err.response?.data?.error || 'Server error occurred' }
      ]);
    } finally {
      setLoading(false);
    }
};

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="app-container">
      <Sidebar onToggle={setSidebarExpanded} />
      
      <div className={`chat-gpt-container ${sidebarExpanded ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
        <div className="chat-header">
          <img src={src} className="chat-logo" alt="Logo" />
          <h1>BIT Chatbot</h1>
        </div>

        <div className="chat-messages">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.type}`}>
              <div className="message-content">
                {msg.type === 'user' && <p className="user-message">{msg.content}</p>}
                {msg.type === 'bot' && (
                  <>
                    {parseContent(msg.content).map((element, idx) => {
                      if (element.type === 'student-info') {
                        return (
                          <div key={idx} className="student-info">
                            <p className="student-name">{element.name}</p>
                            <img src={element.imageUrl} alt={element.name} className="student-image" />
                          </div>
                        );
                      } else if (element.type === 'image') {
                        return <img key={idx} src={element.url} alt="Result" className="content-image" />;
                      } else if (element.type === 'text') {
                        return <p key={idx} className="bot-message-text">{element.content}</p>;
                      }
                      return null;
                    })}
                  </>
                )}
                {msg.type === 'error' && <p className="error-message">{msg.content}</p>}
              </div>
            </div>
          ))}
          {loading && (
            <div className="message bot loading">
              <RefreshCw className="loading-icon" />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className={`chat-input-form ${firstPrompt ? 'centered' : 'bottom'}`}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your database query"
            className="chat-input"
          />
          <button type="submit" disabled={loading} className="chat-submit-btn">
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}

export default StudentQueryApp;