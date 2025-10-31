import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { X, ChevronDown, ChevronUp } from 'lucide-react';

interface LogEntry {
  timestamp: string;
  type: 'log' | 'error' | 'warn';
  message: string;
}

export const DebugConsole = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Override console methods to capture logs
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    const addLog = (type: 'log' | 'error' | 'warn', ...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      setLogs(prev => [...prev, {
        timestamp: new Date().toLocaleTimeString(),
        type,
        message
      }].slice(-50)); // Keep last 50 logs
    };

    console.log = (...args) => {
      originalLog(...args);
      addLog('log', ...args);
    };

    console.error = (...args) => {
      originalError(...args);
      addLog('error', ...args);
    };

    console.warn = (...args) => {
      originalWarn(...args);
      addLog('warn', ...args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 rounded-full w-12 h-12 p-0"
        variant="secondary"
      >
        🐛
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-[90vw] max-w-md shadow-lg">
      <div className="flex items-center justify-between p-2 border-b">
        <span className="text-sm font-semibold">Debug Console</span>
        <div className="flex gap-1">
          <Button
            onClick={() => setIsExpanded(!isExpanded)}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
          <Button
            onClick={() => setLogs([])}
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
          >
            Clear
          </Button>
          <Button
            onClick={() => setIsOpen(false)}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className={`overflow-auto p-2 space-y-1 text-xs font-mono ${isExpanded ? 'max-h-96' : 'max-h-48'}`}>
        {logs.length === 0 ? (
          <div className="text-muted-foreground text-center py-4">No logs yet</div>
        ) : (
          logs.map((log, idx) => (
            <div
              key={idx}
              className={`p-1 rounded ${
                log.type === 'error' 
                  ? 'bg-destructive/10 text-destructive' 
                  : log.type === 'warn'
                  ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                  : 'bg-muted'
              }`}
            >
              <span className="text-muted-foreground">[{log.timestamp}]</span>{' '}
              <span className="whitespace-pre-wrap break-all">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
