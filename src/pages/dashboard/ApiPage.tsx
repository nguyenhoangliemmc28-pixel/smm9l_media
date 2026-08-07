import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, Copy, Check, RefreshCw, Eye, EyeOff, Code2, Terminal, Plus, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/lib/toast';
import { fetchApiKeys, generateApiKey, revokeApiKey } from '@/lib/services';
import { cn } from '@/lib/utils';
import type { IApiKey } from '@/lib/types';

const codeExamples: Record<string, (baseUrl: string) => string> = {
  Curl: (u) => `curl -X POST ${u}/orders \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "service_id": "UUID",
    "link": "https://facebook.com/your-page",
    "quantity": 1000
  }'`,
  NodeJS: (u) => `import axios from 'axios';

const response = await axios.post(
  '${u}/orders',
  { service_id: 'UUID', link: 'https://facebook.com/your-page', quantity: 1000 },
  { headers: { 'X-Api-Key': 'YOUR_API_KEY', 'Content-Type': 'application/json' } }
);
console.log(response.data);`,
  Python: (u) => `import requests

response = requests.post(
    '${u}/orders',
    headers={'X-Api-Key': 'YOUR_API_KEY', 'Content-Type': 'application/json'},
    json={'service_id': 'UUID', 'link': 'https://facebook.com/your-page', 'quantity': 1000}
)
print(response.json())`,
  PHP: (u) => `<?php
$ch = curl_init('${u}/orders');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['X-Api-Key: YOUR_API_KEY', 'Content-Type: application/json']);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['service_id' => 'UUID', 'link' => 'https://facebook.com/your-page', 'quantity' => 1000]));
echo curl_exec($ch);`,
};

const endpoints = [
  { method: 'POST', path: '/services', desc: 'Danh sách dịch vụ (không cần auth)' },
  { method: 'POST', path: '/balance', desc: 'Số dư ví' },
  { method: 'GET', path: '/orders', desc: 'Danh sách đơn hàng' },
  { method: 'POST', path: '/orders', desc: 'Tạo đơn hàng mới' },
  { method: 'GET', path: '/orders/{id}', desc: 'Chi tiết đơn hàng' },
  { method: 'POST', path: '/orders/{id}/refill', desc: 'Yêu cầu refill' },
  { method: 'POST', path: '/orders/{id}/cancel', desc: 'Hủy đơn hàng' },
];

export function ApiPage() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<IApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeLang, setActiveLang] = useState('Curl');
  const [generating, setGenerating] = useState(false);

  const apiBaseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-api`;

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await fetchApiKeys();
      setKeys(data);
      setLoading(false);
    })();
  }, []);

  const activeKey = keys.find((k) => k.status === 'ACTIVE');

  const copy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateApiKey();
      const data = await fetchApiKeys();
      setKeys(data);
      toast('API key mới đã được tạo', 'success');
    } catch {
      toast('Tạo API key thất bại', 'error');
    }
    setGenerating(false);
  };

  const handleRevoke = async (id: string) => {
    await revokeApiKey(id);
    const data = await fetchApiKeys();
    setKeys(data);
    toast('API key đã bị thu hồi', 'info');
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">API</h1>
        <p className="text-sm text-text-muted mt-1">Quản lý API key và tài liệu tích hợp</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-500/5 flex items-center justify-center">
              <KeyRound className="h-5 w-5 text-primary-300" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">API Keys</h3>
              <p className="text-xs text-text-muted">Dùng để xác thực mọi request API</p>
            </div>
          </div>
          <Button size="sm" loading={generating} onClick={handleGenerate}>
            <Plus className="h-3.5 w-3.5" /> Tạo key mới
          </Button>
        </div>

        {loading ? (
          <div className="skeleton h-12 rounded-input" />
        ) : keys.length === 0 ? (
          <div className="text-center py-8 text-text-muted">
            <p>Chưa có API key nào. Tạo key mới để bắt đầu sử dụng API.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {keys.map((k) => (
              <div key={k.id} className="flex items-center gap-2 rounded-input bg-bg-soft/60 border border-border p-2 pl-3.5">
                <code className="flex-1 text-sm text-white font-mono truncate">
                  {revealed[k.id] ? k.key : 'bsh_live_•••••••••••••••••••••••••'}
                </code>
                <button onClick={() => setRevealed((r) => ({ ...r, [k.id]: !r[k.id] }))} className="h-8 w-8 rounded-md flex items-center justify-center text-text-muted hover:text-white hover:bg-white/[0.06]">
                  {revealed[k.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button onClick={() => copy(k.key, k.id)} className="h-8 w-8 rounded-md flex items-center justify-center text-text-muted hover:text-white hover:bg-white/[0.06]">
                  {copiedKey === k.id ? <Check className="h-4 w-4 text-success-400" /> : <Copy className="h-4 w-4" />}
                </button>
                {k.status === 'ACTIVE' ? (
                  <button onClick={() => handleRevoke(k.id)} className="h-8 w-8 rounded-md flex items-center justify-center text-text-muted hover:text-danger-400 hover:bg-danger/5">
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : (
                  <Badge tone="danger" size="sm">Đã thu hồi</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="p-6 pb-3 flex items-center gap-3">
          <Code2 className="h-5 w-5 text-accent" />
          <h3 className="text-base font-semibold text-white">Ví dụ tạo đơn hàng</h3>
        </div>
        <div className="px-6 flex gap-1.5 overflow-x-auto no-scrollbar">
          {Object.keys(codeExamples).map((lang) => (
            <button key={lang} onClick={() => setActiveLang(lang)} className={cn('shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium', activeLang === lang ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30' : 'text-text-muted hover:text-white')}>{lang}</button>
          ))}
        </div>
        <div className="relative mt-3">
          <pre className="p-5 overflow-x-auto text-sm font-mono text-text-muted bg-bg-soft/40 leading-relaxed"><code>{codeExamples[activeLang](apiBaseUrl)}</code></pre>
          <button onClick={() => copy(codeExamples[activeLang](apiBaseUrl), 'code')} className="absolute top-3 right-3 h-8 w-8 rounded-lg flex items-center justify-center text-text-muted hover:text-white hover:bg-white/[0.06] glass">
            {copiedKey === 'code' ? <Check className="h-4 w-4 text-success-400" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-2">
          <Terminal className="h-5 w-5 text-success-400" />
          <h3 className="text-base font-semibold text-white">Base URL</h3>
        </div>
        <div className="flex items-center gap-2 rounded-input bg-bg-soft/60 border border-border p-3">
          <code className="flex-1 text-sm text-white font-mono break-all">{apiBaseUrl}</code>
          <button onClick={() => copy(apiBaseUrl, 'baseurl')} className="h-8 w-8 rounded-md flex items-center justify-center text-text-muted hover:text-white hover:bg-white/[0.06] shrink-0">
            {copiedKey === 'baseurl' ? <Check className="h-4 w-4 text-success-400" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-xs text-text-dim mt-2">Tất cả endpoint đều dùng prefix này. Truyền API key qua header <code className="text-primary-300">X-Api-Key</code>.</p>
      </Card>

      <Card className="overflow-hidden">
        <div className="p-6 pb-4 flex items-center gap-3">
          <Terminal className="h-5 w-5 text-success-400" />
          <h3 className="text-base font-semibold text-white">Danh sách endpoint</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-dim border-b border-border bg-bg-soft/30">
                <th className="font-medium py-3 px-4">Method</th><th className="font-medium py-3 px-4">Endpoint</th><th className="font-medium py-3 px-4">Mô tả</th>
              </tr>
            </thead>
            <tbody>
              {endpoints.map((e, i) => (
                <motion.tr key={e.path} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="border-b border-border/40 hover:bg-white/[0.02]">
                  <td className="py-3 px-4"><Badge tone={e.method === 'GET' ? 'accent' : 'primary'} size="sm">{e.method}</Badge></td>
                  <td className="py-3 px-4 font-mono text-white">{e.path}</td>
                  <td className="py-3 px-4 text-text-muted">{e.desc}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
