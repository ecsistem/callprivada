import { useState } from 'react';

/** Países suportados no checkout WayMB — bandeira + DDI. Padrão: Portugal. */
export const PHONE_COUNTRIES: { code: string; flag: string; name: string }[] = [
  { code: '+351', flag: '🇵🇹', name: 'Portugal' },
  { code: '+34',  flag: '🇪🇸', name: 'España' },
  { code: '+55',  flag: '🇧🇷', name: 'Brasil' },
  { code: '+33',  flag: '🇫🇷', name: 'France' },
  { code: '+44',  flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+49',  flag: '🇩🇪', name: 'Deutschland' },
  { code: '+39',  flag: '🇮🇹', name: 'Italia' },
  { code: '+41',  flag: '🇨🇭', name: 'Suisse' },
  { code: '+352', flag: '🇱🇺', name: 'Luxembourg' },
  { code: '+31',  flag: '🇳🇱', name: 'Nederland' },
  { code: '+32',  flag: '🇧🇪', name: 'Belgique' },
  { code: '+353', flag: '🇮🇪', name: 'Ireland' },
  { code: '+376', flag: '🇦🇩', name: 'Andorra' },
  { code: '+43',  flag: '🇦🇹', name: 'Österreich' },      // Áustria
  { code: '+45',  flag: '🇩🇰', name: 'Danmark' },          // Dinamarca
  { code: '+46',  flag: '🇸🇪', name: 'Sverige' },          // Suécia
  { code: '+47',  flag: '🇳🇴', name: 'Norge' },            // Noruega
  { code: '+358', flag: '🇫🇮', name: 'Suomi' },            // Finlândia
  { code: '+354', flag: '🇮🇸', name: 'Ísland' },           // Islândia
  { code: '+48',  flag: '🇵🇱', name: 'Polska' },           // Polônia
  { code: '+420', flag: '🇨🇿', name: 'Česko' },            // República Tcheca
  { code: '+421', flag: '🇸🇰', name: 'Slovensko' },        // Eslováquia
  { code: '+36',  flag: '🇭🇺', name: 'Magyarország' },     // Hungria
  { code: '+40',  flag: '🇷🇴', name: 'România' },          // Romênia
  { code: '+359', flag: '🇧🇬', name: 'България' },         // Bulgária
  { code: '+385', flag: '🇭🇷', name: 'Hrvatska' },         // Croácia
  { code: '+386', flag: '🇸🇮', name: 'Slovenija' },        // Eslovênia
  { code: '+370', flag: '🇱🇹', name: 'Lietuva' },          // Lituânia
  { code: '+371', flag: '🇱🇻', name: 'Latvija' },          // Letônia
  { code: '+372', flag: '🇪🇪', name: 'Eesti' },            // Estônia
  { code: '+356', flag: '🇲🇹', name: 'Malta' },            // Malta
  { code: '+357', flag: '🇨🇾', name: 'Κύπρος' },           // Chipre
  { code: '+377', flag: '🇲🇨', name: 'Monaco' },           // Mônaco
  { code: '+423', flag: '🇱🇮', name: 'Liechtenstein' },    // Liechtenstein
  { code: '+378', flag: '🇸🇲', name: 'San Marino' },       // San Marino

  { code: '+1',   flag: '🇺🇸', name: 'USA' },
];

/** Separa um telefone completo em DDI conhecido + número local. */
function splitPhone(full: string): { code: string; number: string } {
  const trimmed = (full ?? '').trim();
  if (trimmed.startsWith('+')) {
    // match do DDI mais longo primeiro (+351 antes de +35, +1…)
    const sorted = [...PHONE_COUNTRIES].sort((a, b) => b.code.length - a.code.length);
    for (const c of sorted) {
      if (trimmed.startsWith(c.code)) {
        return { code: c.code, number: trimmed.slice(c.code.length).trim() };
      }
    }
  }
  return { code: '+351', number: trimmed };
}

interface PhoneInputProps {
  /** Telefone completo com DDI, ex: "+351912345678" */
  value: string;
  onChange: (full: string) => void;
  placeholder?: string;
  required?: boolean;
  inputClassName?: string;
  selectClassName?: string;
}

/**
 * Input de telefone com select de país (bandeira + DDI).
 * Emite sempre o número completo: `${ddi}${numero}`.
 */
export function PhoneInput({ value, onChange, placeholder = '912 345 678', required, inputClassName = '', selectClassName = '' }: PhoneInputProps) {
  const initial = splitPhone(value);
  const [code, setCode] = useState(initial.code);
  const number = splitPhone(value).number;

  function emit(nextCode: string, nextNumber: string) {
    onChange(nextNumber.trim() ? `${nextCode}${nextNumber.replace(/\s+/g, '')}` : '');
  }

  return (
    <div className="flex gap-2">
      <select
        value={code}
        onChange={e => { setCode(e.target.value); emit(e.target.value, number); }}
        className={selectClassName || 'shrink-0 bg-[#2a3942] border border-white/10 rounded-xl px-2 py-3 text-white text-sm focus:outline-none focus:border-[#25d366] cursor-pointer'}
        aria-label="Código do país"
      >
        {PHONE_COUNTRIES.map(c => (
          <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
        ))}
      </select>
      <input
        required={required}
        type="tel"
        value={number}
        onChange={e => emit(code, e.target.value)}
        placeholder={placeholder}
        autoComplete="tel-national"
        className={inputClassName || 'flex-1 min-w-0 bg-[#2a3942] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#25d366]'}
      />
    </div>
  );
}
