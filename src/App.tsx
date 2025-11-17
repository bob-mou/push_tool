import { FileDropZone } from '@/components/FileDropZone';
import { lazy, Suspense } from 'react';
const HelpPage = lazy(() => import('@/pages/HelpPage').then(m => ({ default: m.HelpPage })));
import './electron.css';

export default function App() {
  const isHelp = window.location.hash === '#/help' || new URLSearchParams(window.location.search).get('view') === 'help';
  return (
    <div className="h-full min-h-0 electron-drag flex flex-col">
      {isHelp ? (
        <Suspense fallback={<div className="p-4 text-gray-600">加载帮助...</div>}>
          <HelpPage />
        </Suspense>
      ) : (
        <FileDropZone />
      )}
    </div>
  );
}