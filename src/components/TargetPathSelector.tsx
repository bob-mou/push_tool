import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/store/appStore';

interface OptionItem {
  name: string;
  path: string;
}

interface TargetPathSelectorProps {
  onSelect: (path: string | undefined) => void;
}

export function TargetPathSelector({ onSelect }: TargetPathSelectorProps) {
  const { selectedDevice } = useStore();
  const [options, setOptions] = useState<{ android: OptionItem[]; ios: OptionItem[] }>({ android: [], ios: [] });
  const [savedPaths, setSavedPaths] = useState<{ android?: string; ios?: string }>({});
  const [selectedKey, setSelectedKey] = useState<string>('');

  useEffect(() => {
    (async () => {
      try {
        const opts = await (window as any).electronAPI.getTransferPathOptions();
        const paths = await (window as any).electronAPI.getTransferPaths();
        setOptions({ android: Array.isArray(opts?.android) ? opts.android : [], ios: Array.isArray(opts?.ios) ? opts.ios : [] });
        setSavedPaths({ android: String(paths?.android || ''), ios: String(paths?.ios || '') });
      } catch {}
    })();
  }, []);

  const deviceType = selectedDevice?.type || 'android';
  const list = useMemo(() => {
    const base: OptionItem[] = deviceType === 'android' ? options.android : options.ios;
    const saved = deviceType === 'android' ? savedPaths.android : savedPaths.ios;
    const savedItem: OptionItem | null = saved && saved.trim() ? { name: '当前保存路径', path: saved.trim() } : null;
    const merged = savedItem ? [savedItem, ...base] : base;
    return merged;
  }, [deviceType, options, savedPaths]);

  useEffect(() => {
    const first = list[0]?.path;
    setSelectedKey(first || '');
    onSelect(first || undefined);
  }, [list]);

  useEffect(() => {
    const matched = list.find((i) => i.path === selectedKey)?.path;
    onSelect(matched || undefined);
  }, [selectedKey]);

  return (
    <select
      value={selectedKey}
      onChange={(e) => setSelectedKey(e.target.value)}
      className="px-2 py-1 rounded-lg bg-white shadow-md border border-gray-200 text-sm"
      disabled={!selectedDevice}
      title="选择目标目录"
    >
      {list.map((item) => (
        <option key={`${deviceType}-${item.name}-${item.path}`} value={item.path}>
          {item.name}
        </option>
      ))}
    </select>
  );
}