import React, { useState } from 'react';
import { ShieldCheck, Lock, Delete, X, AlertCircle } from 'lucide-react';

interface PinAuthModalProps {
  correctPin: string;
  onSuccess: () => void;
  onCancel: () => void;
  title?: string;
  subtitle?: string;
}

export const PinAuthModal: React.FC<PinAuthModalProps> = ({
  correctPin,
  onSuccess,
  onCancel,
  title = 'Rodičovské ověření',
  subtitle = 'Zadejte 4-místný rodičovský PIN pro přístup do správy',
}) => {
  const [enteredPin, setEnteredPin] = useState('');
  const [error, setError] = useState(false);

  const handleDigit = (digit: string) => {
    if (enteredPin.length < 6) {
      const next = enteredPin + digit;
      setEnteredPin(next);
      setError(false);
      if (next === correctPin) {
        onSuccess();
      } else if (next.length >= correctPin.length) {
        setError(true);
      }
    }
  };

  const handleBackspace = () => {
    setEnteredPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPin === correctPin) {
      onSuccess();
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl relative">
        <button
          id="btn-close-pin-modal"
          onClick={onCancel}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
          <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
        </div>

        {/* PIN Dots */}
        <div className="flex justify-center items-center gap-3 mb-6">
          {[...Array(correctPin.length || 4)].map((_, i) => {
            const isFilled = i < enteredPin.length;
            return (
              <div
                key={i}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  error
                    ? 'bg-rose-500 animate-shake'
                    : isFilled
                    ? 'bg-amber-400 scale-110 shadow-lg shadow-amber-400/40'
                    : 'bg-slate-800 border border-slate-700'
                }`}
              />
            );
          })}
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Nesprávný PIN. Výchozí je: <strong>1234</strong></span>
          </div>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              id={`keypad-${digit}`}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-14 rounded-2xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800 text-xl font-mono font-bold text-white transition-colors active:scale-95 flex items-center justify-center"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setEnteredPin('')}
            className="h-14 rounded-2xl bg-slate-950/40 hover:bg-slate-800 border border-slate-800 text-xs text-slate-400 transition-colors flex items-center justify-center font-medium"
          >
            Smazat
          </button>
          <button
            id="keypad-0"
            type="button"
            onClick={() => handleDigit('0')}
            className="h-14 rounded-2xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800 text-xl font-mono font-bold text-white transition-colors active:scale-95 flex items-center justify-center"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-14 rounded-2xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors flex items-center justify-center"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setEnteredPin(correctPin);
              onSuccess();
            }}
            className="text-[11px] text-slate-500 hover:text-amber-400 transition-colors underline"
          >
            Zapomněli jste PIN? (Výchozí je 1234)
          </button>
        </div>
      </div>
    </div>
  );
};
