import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { FeedbackProvider } from './components/ui/Feedback';
import ErrorBoundary from './components/ErrorBoundary';
import AppRouter from './router';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <FeedbackProvider>
            <AppRouter />
          </FeedbackProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
