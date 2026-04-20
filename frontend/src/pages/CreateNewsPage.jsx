import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { extractError } from '../utils/formatters'

const CATEGORIES = ['Technology', 'Sports', 'Politics', 'Entertainment', 'General']

export default function CreateNewsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [form, setForm] = useState({ title: '', description: '', category: 'General', image: null })
  const [error, setError] = useState('')

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/news/', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['news'] })
      navigate(`/news/${res.data.id}`)
    },
    onError: (err) => setError(extractError(err)),
  })

  if (!user || !user.is_verified || user.role === 'viewer') {
    return (
      <div className="glass p-12 text-center text-white/40 max-w-2xl mx-auto mt-10">
        <p className="text-4xl mb-4">🔒</p>
        <p className="text-lg font-semibold text-white mb-2">Contributor access required</p>
        <p className="text-sm mb-6">You need to be a verified contributor to publish articles.</p>
        <button className="btn-primary" onClick={() => navigate('/apply')}>Apply to Contribute</button>
      </div>
    )
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    const fd = new FormData()
    fd.append('title', form.title)
    fd.append('description', form.description)
    fd.append('category', form.category)
    if (form.image) fd.append('image', form.image)
    createMutation.mutate(fd)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="glass p-6 md:p-8 animate-fade-in">
        <h1 className="text-2xl font-bold text-white mb-1">Write an Article</h1>
        <p className="text-white/40 text-sm mb-8">Share your story with the MediaFlow community</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-white/60 text-sm mb-1.5">Title *</label>
            <input
              className="input-field"
              placeholder="Write a compelling headline (min. 5 chars)"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              minLength={5}
              required
            />
          </div>

          <div>
            <label className="block text-white/60 text-sm mb-1.5">Content *</label>
            <textarea
              className="input-field resize-none"
              rows={8}
              placeholder="Write your article body (min. 10 chars)…"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              minLength={10}
              required
            />
          </div>

          <div>
            <label className="block text-white/60 text-sm mb-1.5">Category *</label>
            <select
              className="input-field"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-white/60 text-sm mb-1.5">Cover image (optional)</label>
            <input
              type="file"
              accept="image/*"
              className="input-field file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0
                         file:text-xs file:font-medium file:bg-violet-500/20 file:text-violet-300
                         hover:file:bg-violet-500/30 cursor-pointer"
              onChange={(e) => setForm({ ...form, image: e.target.files[0] ?? null })}
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              className="btn-ghost flex-1"
              onClick={() => navigate(-1)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Publishing…' : 'Publish Article'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
