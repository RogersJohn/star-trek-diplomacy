import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '../hooks/useGameStore'
import { FACTION_COLORS, FACTION_NAMES } from '@star-trek-diplomacy/shared'
import MessageNotification from './MessageNotification'

export default function Messages({ gameState, faction }) {
  const { socket, sendMessage } = useGameStore()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedRecipient, setSelectedRecipient] = useState('all')
  const [messageText, setMessageText] = useState('')
  const [conversations, setConversations] = useState({})
  const [unreadCounts, setUnreadCounts] = useState({})
  const [notification, setNotification] = useState(null)
  const messagesEndRef = useRef(null)
  
  const allFactions = ['federation', 'klingon', 'romulan', 'cardassian', 'ferengi', 'breen', 'gorn']
  const otherFactions = allFactions.filter(f => f !== faction && !gameState?.eliminated?.includes(f))
  
  // Initialize conversations
  useEffect(() => {
    const initial = { all: [] }
    otherFactions.forEach(f => {
      initial[f] = []
    })
    setConversations(initial)
  }, [])
  
  // Listen for incoming messages
  useEffect(() => {
    if (!socket) return
    
    const handlePrivateMessage = (data) => {
      const { from, to, message, timestamp } = data
      
      // Determine conversation key
      let conversationKey
      if (to === 'all') {
        conversationKey = 'all'
      } else if (from === faction) {
        conversationKey = to
      } else {
        conversationKey = from
      }
      
      setConversations(prev => ({
        ...prev,
        [conversationKey]: [
          ...(prev[conversationKey] || []),
          { from, to, message, timestamp: timestamp || Date.now(), read: false }
        ]
      }))
      
      // Update unread count if not currently viewing that conversation
      if (conversationKey !== selectedRecipient || !isOpen) {
        setUnreadCounts(prev => ({
          ...prev,
          [conversationKey]: (prev[conversationKey] || 0) + 1
        }))
        
        // Show notification for incoming messages (not from self)
        if (from !== faction) {
          setNotification({
            from: FACTION_NAMES[from],
            text: message
          })
        }
      }
    }
    
    socket.on('private_message', handlePrivateMessage)
    socket.on('broadcast_message', handlePrivateMessage)
    
    return () => {
      socket.off('private_message', handlePrivateMessage)
      socket.off('broadcast_message', handlePrivateMessage)
    }
  }, [socket, faction, selectedRecipient, isOpen])
  
  // Mark messages as read when viewing conversation
  useEffect(() => {
    if (isOpen && selectedRecipient) {
      setUnreadCounts(prev => ({
        ...prev,
        [selectedRecipient]: 0
      }))
    }
  }, [isOpen, selectedRecipient])
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversations, selectedRecipient])
  
  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!messageText.trim() || !socket) return
    
    const newMessage = {
      from: faction,
      to: selectedRecipient,
      message: messageText,
      timestamp: Date.now()
    }
    
    // Add to local conversations immediately
    setConversations(prev => ({
      ...prev,
      [selectedRecipient]: [
        ...(prev[selectedRecipient] || []),
        { ...newMessage, read: true }
      ]
    }))
    
    // Send via socket
    if (selectedRecipient === 'all') {
      socket.emit('broadcast_message', newMessage)
    } else {
      socket.emit('private_message', newMessage)
    }
    
    setMessageText('')
  }
  
  const currentMessages = conversations[selectedRecipient] || []
  const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0)
  
  return (
    <>
      {/* Message Notification */}
      {notification && (
        <MessageNotification 
          message={notification} 
          onClose={() => setNotification(null)}
        />
      )}
      
      {/* Messages Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 bg-lcars-blue hover:bg-lcars-tan text-white font-bold px-4 py-3 rounded-full shadow-lg z-40 transition-colors"
      >
        💬 Messages
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>
      
      {/* Messages Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 w-96 h-[600px] bg-space-blue border-2 border-lcars-orange rounded-lg shadow-2xl z-40 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-lcars-orange">
            <h3 className="text-lcars-orange font-bold">Diplomatic Communications</h3>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-lcars-orange text-xl"
            >
              ✕
            </button>
          </div>
          
          {/* Recipient Selector */}
          <div className="p-3 border-b border-gray-700">
            <label className="text-gray-400 text-xs mb-1 block">Message To:</label>
            <div className="grid grid-cols-4 gap-1">
              <button
                onClick={() => setSelectedRecipient('all')}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  selectedRecipient === 'all'
                    ? 'bg-lcars-orange text-black font-bold'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                All
                {unreadCounts.all > 0 && (
                  <span className="ml-1 bg-red-500 text-white rounded-full px-1">
                    {unreadCounts.all}
                  </span>
                )}
              </button>
              {otherFactions.map(f => (
                <button
                  key={f}
                  onClick={() => setSelectedRecipient(f)}
                  className={`px-2 py-1 text-xs rounded transition-colors relative ${
                    selectedRecipient === f
                      ? 'font-bold ring-2 ring-white'
                      : 'hover:opacity-80'
                  }`}
                  style={{
                    backgroundColor: selectedRecipient === f ? FACTION_COLORS[f] : `${FACTION_COLORS[f]}40`,
                    color: selectedRecipient === f ? (f === 'ferengi' || f === 'breen' ? '#000' : '#fff') : FACTION_COLORS[f]
                  }}
                >
                  {FACTION_NAMES[f].substring(0, 3)}
                  {unreadCounts[f] > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                      {unreadCounts[f]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          
          {/* Messages Display */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-900">
            {currentMessages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                {selectedRecipient === 'all' 
                  ? 'No public messages yet. Start the conversation!'
                  : `No messages with ${FACTION_NAMES[selectedRecipient]}. Begin negotiations!`
                }
              </div>
            ) : (
              currentMessages.map((msg, i) => {
                const isFromMe = msg.from === faction
                const timestamp = new Date(msg.timestamp).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })
                
                return (
                  <div
                    key={i}
                    className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 ${
                        isFromMe 
                          ? 'bg-lcars-blue text-black' 
                          : 'bg-gray-800 text-white'
                      }`}
                    >
                      {!isFromMe && (
                        <div 
                          className="text-xs font-bold mb-1"
                          style={{ color: FACTION_COLORS[msg.from] }}
                        >
                          {FACTION_NAMES[msg.from]}
                        </div>
                      )}
                      <div className="text-sm break-words">{msg.message}</div>
                      <div className={`text-[10px] mt-1 ${isFromMe ? 'text-blue-900' : 'text-gray-500'}`}>
                        {timestamp}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={`Message ${selectedRecipient === 'all' ? 'everyone' : FACTION_NAMES[selectedRecipient]}...`}
                className="flex-1 bg-gray-800 text-white px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-lcars-orange"
                maxLength={200}
              />
              <button
                type="submit"
                disabled={!messageText.trim()}
                className="bg-lcars-orange hover:bg-lcars-tan disabled:bg-gray-700 disabled:cursor-not-allowed text-black font-bold px-4 py-2 rounded transition-colors"
              >
                Send
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {messageText.length}/200 characters
            </div>
          </form>
        </div>
      )}
    </>
  )
}
