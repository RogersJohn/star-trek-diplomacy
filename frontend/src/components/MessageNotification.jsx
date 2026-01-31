import { useState, useEffect } from 'react'

export default function MessageNotification({ message, onClose }) {
  const [isVisible, setIsVisible] = useState(true)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300) // Wait for fade out animation
    }, 5000)
    
    return () => clearTimeout(timer)
  }, [onClose])
  
  if (!message) return null
  
  return (
    <div
      className={`fixed top-20 right-4 bg-lcars-blue border-2 border-lcars-orange rounded-lg shadow-2xl p-4 max-w-sm z-50 transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl">💬</div>
        <div className="flex-1">
          <div className="text-lcars-orange font-bold text-sm mb-1">
            New Message from {message.from}
          </div>
          <div className="text-white text-sm line-clamp-2">
            {message.text}
          </div>
        </div>
        <button
          onClick={() => {
            setIsVisible(false)
            setTimeout(onClose, 300)
          }}
          className="text-white hover:text-lcars-orange"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
