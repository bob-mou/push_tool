import { FileDropZone } from '@/components/FileDropZone';
import { HelpPage } from '@/pages/HelpPage';
import './electron.css';

export default function App() {
  const isHelp = window.location.hash === '#/help' || new URLSearchParams(window.location.search).get('view') === 'help';
  return (
    <div className="h-full min-h-0 electron-drag flex flex-col">
      {isHelp ? <HelpPage /> : <FileDropZone />}
    </div>
  );
}
