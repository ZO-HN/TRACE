import './index.css';
import LayoutResolver from './components/pwa/LayoutResolver';
import { isSupabaseConfigured } from './lib/supabase';

function App() {
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-bold text-white mb-2">Not configured</h1>
          <p className="text-sm text-gray-400">
            Missing <code className="text-primary">VITE_SUPABASE_URL</code> /{' '}
            <code className="text-primary">VITE_SUPABASE_ANON_KEY</code>. Create{' '}
            <code className="text-primary">.env.local</code> and restart the dev
            server (see README).
          </p>
        </div>
      </div>
    );
  }

  return <LayoutResolver />;
}

export default App;
