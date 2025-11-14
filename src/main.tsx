import { StrictMode, Component, ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import './electron.css'

class ErrorBoundary extends Component<{ children: ReactNode }, { error?: Error }> {
  constructor(props) {
    super(props)
    this.state = { error: undefined }
  }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      const msg = this.state.error?.message || '渲染错误'
      const stack = (this.state.error as any)?.stack || ''
      return (
        <div style={{ padding: 16, fontFamily: 'system-ui, sans-serif' }}>
          <h1 style={{ fontSize: 18, marginBottom: 8 }}>页面渲染失败</h1>
          <div style={{ color: '#b91c1c', marginBottom: 8 }}>错误: {msg}</div>
          <pre style={{ background: '#f9fafb', padding: 12, borderRadius: 8, overflow: 'auto' }}>{stack}</pre>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
