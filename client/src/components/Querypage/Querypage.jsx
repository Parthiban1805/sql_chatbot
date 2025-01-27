import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Send, RefreshCw } from 'lucide-react';
import './Querypage.css'
import src from '../../assets/image.png'
function StudentQueryApp() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    // Add user message
    const userMessage = { type: 'user', content: query };
    setMessages(prev => [...prev, userMessage]);
    
    // Reset input
    setQuery('');
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:3001/query', { query });
      
      // Format results for display
      const formattedResults = response.data && response.data.natural_language_response 
      ? JSON.stringify(response.data.natural_language_response, null, 2)
      : 'No results found';
  
      const botMessage = { 
        type: 'bot', 
        content: formattedResults 
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      const errorMessage = { 
        type: 'error', 
        content: err.response?.data?.error || 'Server error occurred' 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="chat-container">
   

      <div className="chat-header">
      <div className="chat-logo-container">
      <img 
        src={src} 
        className="chat-logo" 
      />
    </div>
        <h1>BIT Database Chatbot</h1>
      </div>
      
      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={`message ${msg.type}`}
          >
            <div className="message-content">
              {msg.content}
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
      
      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter your database query"
          className="chat-input"
        />
        <button 
          type="submit" 
          disabled={loading}
          className="chat-submit-btn"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}

export default StudentQueryApp;