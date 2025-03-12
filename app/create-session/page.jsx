// pages/create-session.jsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import NavbarSection from '../../components/Navbar'

export default function CreateSession() {
  const { userId } = useAuth()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Math')
  const [isCreating, setIsCreating] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsCreating(true)
    
    try {
      const response = await fetch('/python/create-session', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          title,  
          category,
          user_id: userId 
        })
      })
      console.log("body sent", JSON.stringify({ 
        title, 
        category,
        user_id: userId 
      }))
      console.log("posted request response", response)
      
      const data = await response.json()
      console.log('Session created:', data)
      localStorage.setItem('currentSession', data.session_id)
      router.push(`/videos/live/${data.session_id}`)
      
    } catch (error) {
      console.error('Error creating session:', error)
    } finally {
      setIsCreating(false)
    }
  }


  return (
    <div className="min-h-screen bg-gray-900">
      <NavbarSection />
      <main className="container mx-auto py-12 px-4 max-w-2xl">
        <h1 className="text-3xl font-bold text-white mb-8">Start New Session</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-white mb-2">Session Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 rounded-lg bg-gray-800 text-white"
              required
            />
          </div>
          <div>
            <label className="block text-white mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-3 rounded-lg bg-gray-800 text-white"
            >
              {['Math', 'Physics', 'Biology', 'Chemistry', 'Computer Science'].map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            disabled={isCreating}
          >
            {isCreating ? 'Creating...' : 'Start Session'}
          </button>
        </form>
      </main>
    </div>
  )
}
