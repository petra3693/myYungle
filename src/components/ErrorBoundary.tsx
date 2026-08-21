import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  onReset?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  message: string
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message || 'Something went wrong.' }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[myJungle] Uncaught render error:', error, info.componentStack)
  }

  private handleRetry = () => {
    this.setState({ hasError: false, message: '' })
    this.props.onReset?.()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div
        className="flex flex-col items-center justify-center gap-4 min-h-dvh px-6 text-center"
        style={{ background: '#0D0D0D', fontFamily: 'Inter, sans-serif' }}
      >
        <p style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 20, color: '#fff' }}>
          my Jungle hit a snag
        </p>
        <p style={{ fontWeight: 500, fontSize: 14, color: '#8E8E93', maxWidth: 320, lineHeight: 1.5 }}>
          {this.state.message}
        </p>
        <button
          type="button"
          onClick={this.handleRetry}
          className="btn-fill px-6 py-3"
        >
          Try again
        </button>
      </div>
    )
  }
}
