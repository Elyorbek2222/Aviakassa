'use client';

import { Fragment, useState } from 'react';
import useSWR from 'swr';
import { History, Search } from 'lucide-react';
import { ROLE_LABELS } from '@/lib/auth';
import type { AuditEntry, AuditAction, AuditEntity } from '@/types/avia';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const ENTITY_LABELS: Record<AuditEntity, string> = {
  ticket: 'Bilet',
  payment: "To'lov",
  rasxod: 'Rasxod',
  refund: 'Refund',
  obmen: 'Obmen',
  inkassatsiya: 'Inkassatsiya',
  settings: 'Sozlamalar',
  otchot: 'Otchot',
  prixot: 'Prixot',
};

const ACTION_LABELS: Record<AuditAction, string> = {
  create: "Qo'shildi",
  update: 'Tahrirlandi',
  delete: "O'chirildi",
  clear: 'Tozalandi',
};

const ACTION_COLORS: Record<AuditAction, string> = {
  create: '#7CFF4F',
  update: '#2CA5E0',
  delete: '#FF3B30',
  clear: '#FF3B30',
};

function fmtTs(ts: string): string {
  try {
    return new Date(ts).toLocaleString('ru-RU', {
      timeZone: 'Asia/Tashkent',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return ts;
  }
}

export default function AuditPage() {
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [actor, setActor] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const qs = new URLSearchParams();
  if (entity) qs.set('entity', entity);
  if (action) qs.set('action', action);
  if (actor) qs.set('actor', actor);
  const { data, isLoading } = useSWR(`/api/avia/audit?${qs.toString()}`, fetcher, { refreshInterval: 30000 });

  const entries: AuditEntry[] = data?.audit || [];

  const selectStyle = {
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #1E2E24',
    backgroundColor: '#0A0F0D',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
  } as const;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
          <History size={24} style={{ color: '#7CFF4F' }} />
          Audit jurnali
        </h1>
      </div>

      <p style={{ color: '#8A9A8F', fontSize: 13, marginBottom: 16, marginTop: -12 }}>
        Kim, qachon, nimani o&apos;zgartirgani. Har bir qo&apos;shish/tahrir/o&apos;chirish shu yerda qayd etiladi.
      </p>

      {/* Filtrlar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={entity} onChange={(e) => setEntity(e.target.value)} style={selectStyle}>
          <option value="">Barcha bo&apos;limlar</option>
          {(Object.keys(ENTITY_LABELS) as AuditEntity[]).map((k) => (
            <option key={k} value={k}>{ENTITY_LABELS[k]}</option>
          ))}
        </select>
        <select value={action} onChange={(e) => setAction(e.target.value)} style={selectStyle}>
          <option value="">Barcha amallar</option>
          {(Object.keys(ACTION_LABELS) as AuditAction[]).map((k) => (
            <option key={k} value={k}>{ACTION_LABELS[k]}</option>
          ))}
        </select>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#4A5C50' }} />
          <input
            type="text"
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            placeholder="Xodim ismi bo'yicha qidirish..."
            style={{ ...selectStyle, width: '100%', paddingLeft: 36, boxSizing: 'border-box' }}
          />
        </div>
      </div>

      <div style={{ backgroundColor: '#141F19', border: '1px solid #1E2E24', borderRadius: 12, padding: 20 }}>
        {isLoading ? (
          <div style={{ color: '#8A9A8F', textAlign: 'center', padding: 40 }}>Yuklanmoqda...</div>
        ) : entries.length === 0 ? (
          <div style={{ color: '#4A5C50', textAlign: 'center', padding: 40, fontSize: 14 }}>Yozuv topilmadi</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1E2E24' }}>
                  {['Vaqt', 'Xodim', 'Amal', "Bo'lim", 'Tavsif', ''].map((h, i) => (
                    <th key={i} style={{ padding: '10px 12px', textAlign: 'left', color: '#8A9A8F', fontSize: 13, fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => {
                  const hasDetails = e.before !== undefined || e.after !== undefined;
                  const isOpen = openId === e.id;
                  return (
                    <Fragment key={e.id}>
                      <tr style={{ borderBottom: isOpen ? 'none' : '1px solid #1E2E24' }}>
                        <td style={{ padding: '10px 12px', color: '#8A9A8F', fontSize: 12, whiteSpace: 'nowrap' }}>{fmtTs(e.ts)}</td>
                        <td style={{ padding: '10px 12px', color: '#fff', fontSize: 13 }}>
                          {e.actorName}
                          <span style={{ color: '#4A5C50', fontSize: 11, marginLeft: 6 }}>
                            {ROLE_LABELS[e.actorRole] || e.actorRole}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 13 }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                            backgroundColor: (ACTION_COLORS[e.action] || '#fff') + '20',
                            color: ACTION_COLORS[e.action] || '#fff',
                          }}>
                            {ACTION_LABELS[e.action] || e.action}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: '#c8d8cc', fontSize: 13 }}>{ENTITY_LABELS[e.entity] || e.entity}</td>
                        <td style={{ padding: '10px 12px', color: '#c8d8cc', fontSize: 13 }}>{e.summary}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, textAlign: 'right' }}>
                          {hasDetails && (
                            <button
                              onClick={() => setOpenId(isOpen ? null : e.id)}
                              style={{ background: 'none', border: '1px solid #1E2E24', borderRadius: 6, color: '#8A9A8F', fontSize: 11, padding: '3px 8px', cursor: 'pointer' }}
                            >
                              {isOpen ? 'Yopish' : 'Batafsil'}
                            </button>
                          )}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr style={{ borderBottom: '1px solid #1E2E24' }}>
                          <td colSpan={6} style={{ padding: '0 12px 12px' }}>
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                              {e.before !== undefined && (
                                <pre style={{ flex: 1, minWidth: 260, margin: 0, padding: 12, backgroundColor: '#0A0F0D', border: '1px solid #1E2E24', borderRadius: 8, color: '#FF9F9F', fontSize: 11, overflowX: 'auto' }}>
                                  <span style={{ color: '#4A5C50' }}>Oldingi:</span>{'\n'}{JSON.stringify(e.before, null, 2)}
                                </pre>
                              )}
                              {e.after !== undefined && (
                                <pre style={{ flex: 1, minWidth: 260, margin: 0, padding: 12, backgroundColor: '#0A0F0D', border: '1px solid #1E2E24', borderRadius: 8, color: '#9FE8A0', fontSize: 11, overflowX: 'auto' }}>
                                  <span style={{ color: '#4A5C50' }}>Yangi:</span>{'\n'}{JSON.stringify(e.after, null, 2)}
                                </pre>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ color: '#4A5C50', fontSize: 12, marginTop: 12, textAlign: 'right' }}>
          Jami: {entries.length} ta yozuv
        </div>
      </div>
    </div>
  );
}
