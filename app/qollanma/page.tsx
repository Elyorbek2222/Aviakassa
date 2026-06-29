'use client';

import useSWR from 'swr';
import { BookOpen, Target, CheckCircle2 } from 'lucide-react';
import type { UserRole } from '@/lib/auth';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Guide {
  title: string;
  color: string;
  intro: string;
  steps: { t: string; d: string }[];
  maqsad: string;
}

const GUIDES: Record<UserRole, Guide> = {
  begzod: {
    title: 'Aviakassir — Qoʻllanma',
    color: '#F5A623',
    intro: 'Siz har kuni sotilgan aviabiletlarni tizimga kiritasiz va ularning qarzini kuzatasiz.',
    steps: [
      { t: '1. Bilet kiritish', d: 'Har bir sotilgan bilet uchun "Yangi Bilet" formasini toʻldiring: aviakompaniya, bilet raqami, yoʻlovchi, tarif (kelish narxi) va sotish narxi.' },
      { t: '2. Bilet raqami muhim', d: 'Bilet raqamini aniq kiriting — Finansist aynan shu raqam orqali mijozdan pul qabul qiladi va qarz shu raqamga bogʻlanadi.' },
      { t: '3. Holatni kuzating', d: '"Oʻz Biletlarim" jadvalida har bilet holati koʻrinadi: yashil "Yopilgan" = toʻliq toʻlangan, qizil = qarz qolgan (summa bilan).' },
      { t: '4. Qarzlarni yoping', d: 'Maqsad chizigʻi (progress) 100% boʻlishi kerak. Qizil biletlar boʻyicha mijoz bilan ishlang.' },
      { t: '5. Oylik koʻrish', d: 'Yuqori oʻngdagi oy tanlash orqali istalgan oy (yoki "Hammasi") holatini koʻring.' },
    ],
    maqsad: 'Kunlik yozilgan biletlarni 100% yopish — qarzdorlikni 0 ga tushirish.',
  },
  kassir: {
    title: 'Finansist — Qoʻllanma',
    color: '#2CA5E0',
    intro: 'Siz kunlik biletlar pulini qabul qilasiz, kassani boshqarasiz va kun oxirida balansni tekshirasiz.',
    steps: [
      { t: '1. Prixod (pul qabul qilish)', d: 'Bilet raqami orqali mijozdan pul oling. Toʻlov turini belgilang: Naqd, Plastik yoki Perechisleniya.' },
      { t: '2. Dollar / Obmen', d: 'Dollarda olsangiz: Valyuta = USD, dollar summa va kursni kiriting — UZS avtomatik hisoblanadi. Biletsiz boʻlsa "Obmen" sifatida saqlanadi.' },
      { t: '3. Rasxod', d: 'Kassadan chiqimlarni (rasxod) yozib boring — sabab bilan.' },
      { t: '4. Refund', d: 'Bilet puli qaytarilsa, Refund tabida bilet raqami va summa bilan chiqaring.' },
      { t: '5. Inkassatsiya', d: 'Aviakompaniyaga toʻlov yoki kun oxirida "Kassa topshirish" (yigʻilgan pulni topshirish) — Inkassatsiya tabida.' },
      { t: '6. Sverka (tekshirish)', d: '"Naqd Sverka" da qoʻlingizdagi naqd pulni kiriting — tizim kutilgan summa bilan solishtiradi. "Toʻgʻri keladi" boʻlishi kerak.' },
      { t: '7. Oylik hisobot', d: 'Oy tanlash orqali kunlik yoki oylik balans, prixod va qarzlarni koʻring.' },
    ],
    maqsad: 'Kunlik balans toʻgʻri kelishi va biletlar qarzi yopilishini taʻminlash.',
  },
  buxgalter: {
    title: 'Buxgalter — Qoʻllanma',
    color: '#9B59B6',
    intro: 'Siz aviakompaniyalar (partnyorlar) bilan hisob-kitobni yuritasiz.',
    steps: [
      { t: '1. Partnyorlar holati', d: '"Partnyorlar Holati" jadvalida har aviakompaniyaga qancha tarif yigʻilgan va qancha qarz borligini koʻring.' },
      { t: '2. Inkassatsiya', d: 'Aviakompaniyaga toʻlov qilganda Inkassatsiya formasini toʻldiring — partnyor qarzi shu bilan kamayadi.' },
      { t: '3. Tarix', d: '"Inkassatsiya Tarixi" da qilingan toʻlovlarni kuzating.' },
    ],
    maqsad: 'Aviakompaniyalar oldidagi qarzni oʻz vaqtida yopish.',
  },
  admin: {
    title: 'Admin — Qoʻllanma',
    color: '#7CFF4F',
    intro: 'Siz butun biznesning umumiy moliyaviy holatini oyma-oy nazorat qilasiz.',
    steps: [
      { t: '1. Oy tanlash', d: 'Yuqori oʻngdagi oy tanlash orqali davrni belgilang (oy yoki "Hammasi"). Barcha koʻrsatkichlar shu davrga moslashadi.' },
      { t: '2. KPI kartalar', d: 'Jami biletlar, sotuv, stok/kassa, partnyor qarzi va sof foydani koʻring.' },
      { t: '3. Grafiklar', d: 'Sotuv trendi va aviakompaniyalar boʻyicha taqqoslashni infografika orqali tahlil qiling.' },
      { t: '4. Qarzlar', d: 'Mijozlar va partnyorlar qarzdorlik jadvallarini kuzating.' },
    ],
    maqsad: 'Umumiy moliyaviy holatni nazorat qilish va qarorlar qabul qilish.',
  },
};

export default function QollanmaPage() {
  const { data: authData } = useSWR('/api/avia/auth', fetcher);
  const role = (authData?.user?.role as UserRole) || 'begzod';
  const g = GUIDES[role] || GUIDES.begzod;

  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <BookOpen size={22} style={{ color: g.color }} />
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>{g.title}</h1>
      </div>
      <p style={{ color: '#8A9A8F', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>{g.intro}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {g.steps.map((s) => (
          <div key={s.t} style={{ backgroundColor: '#141F19', border: '1px solid #1E2E24', borderRadius: 12, padding: '16px 18px', borderLeft: `3px solid ${g.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <CheckCircle2 size={15} style={{ color: g.color, flexShrink: 0 }} />
              <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>{s.t}</span>
            </div>
            <div style={{ color: '#8A9A8F', fontSize: 13, lineHeight: 1.6, paddingLeft: 23 }}>{s.d}</div>
          </div>
        ))}
      </div>

      <div style={{ backgroundColor: `${g.color}10`, border: `1px solid ${g.color}30`, borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Target size={20} style={{ color: g.color, flexShrink: 0 }} />
        <div>
          <div style={{ color: g.color, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Maqsad</div>
          <div style={{ color: '#fff', fontSize: 14, fontWeight: 600, marginTop: 2 }}>{g.maqsad}</div>
        </div>
      </div>
    </div>
  );
}
