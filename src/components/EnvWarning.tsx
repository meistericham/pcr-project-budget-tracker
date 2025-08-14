import React from 'react';
import { AlertTriangle } from 'lucide-react';

const EnvWarning: React.FC = () => {
  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 mb-4">
      <div className="flex items-center">
        <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
        <div>
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            Development Environment Configuration
          </h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
            Missing Supabase configuration. Create <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">.env.development</code> with:
            <br />
            <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded text-xs">VITE_SUPABASE_URL=your-supabase-url</code>
            <br />
            <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded text-xs">VITE_SUPABASE_ANON_KEY=your-anon-key</code>
          </p>
        </div>
      </div>
    </div>
  );
};

export default EnvWarning;
