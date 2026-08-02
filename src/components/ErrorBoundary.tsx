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
        style={{ background: '#F7F7F7', fontFamily: 'Geist, sans-serif' }}
      >
        <p style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 18, color: '#000' }}>
          MYJUNGLE HIT A SNAG
        </p>
        <p style={{ fontWeight: 500, fontSize: 14, color: '#444', maxWidth: 320, lineHeight: 1.5 }}>
          {this.state.message}
        </p>
        <button
          type="button"
          onClick={this.handleRetry}
          className="btn-primary btn-green rounded-full border-2 border-black px-6 py-3 cursor-pointer"
          style={{ background: '#00FF66', fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: '#000' }}
        >
          TRY AGAIN
        </button>
      </div>
    )
  }
}
