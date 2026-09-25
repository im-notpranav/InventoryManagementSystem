import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/** Catches render errors so one broken page never blanks the whole app. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-card p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 grid place-items-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h1 className="font-display text-xl font-bold text-slate-900">Something went wrong</h1>
          <p className="text-sm text-slate-500 mt-2">
            An unexpected error stopped this screen from rendering. Reloading usually fixes it.
          </p>
          <pre className="mt-4 text-left text-[11px] text-slate-500 bg-slate-50 rounded-lg p-3 overflow-auto max-h-32">
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-brand-700 text-white text-sm font-medium hover:bg-brand-600"
          >
            <RefreshCw className="w-4 h-4" /> Reload
          </button>
        </div>
      </div>
    );
  }
}
