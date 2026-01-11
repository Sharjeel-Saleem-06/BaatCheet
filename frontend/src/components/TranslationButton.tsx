/**
 * Translation Button Component
 * Shows translation option for Roman Urdu messages
 */

import { useState } from 'react';
import { Globe, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { audio } from '../services/api';
import clsx from 'clsx';

interface TranslationButtonProps {
  originalText: string;
  isRomanUrdu?: boolean;
  className?: string;
}

export default function TranslationButton({
  originalText,
  isRomanUrdu = false,
  className,
}: TranslationButtonProps) {
  const [translated, setTranslated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only show for Roman Urdu or mixed language content
  if (!isRomanUrdu) return null;

  const handleTranslate = async () => {
    // Toggle if already translated
    if (translated) {
      setShowTranslation(!showTranslation);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data } = await audio.translateToEnglish(originalText);
      
      if (data.success && data.data?.translatedText) {
        setTranslated(data.data.translatedText);
        setShowTranslation(true);
      } else {
        setError(data.error || 'Translation failed');
      }
    } catch (err) {
      console.error('Translation error:', err);
      setError('Failed to translate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={clsx('mt-2', className)}>
      <button
        onClick={handleTranslate}
        disabled={loading}
        className={clsx(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
          'bg-dark-600/50 hover:bg-dark-600 text-dark-300 hover:text-dark-100',
          'border border-dark-500/30 hover:border-dark-500/50',
          loading && 'opacity-50 cursor-not-allowed'
        )}
      >
        {loading ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Translating...</span>
          </>
        ) : (
          <>
            <Globe className="w-3 h-3" />
            <span>{translated ? (showTranslation ? 'Hide' : 'Show') : 'Translate'}</span>
            {translated && (
              showTranslation ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )
            )}
          </>
        )}
      </button>

      {/* Translation Result */}
      {showTranslation && translated && (
        <div className="mt-2 p-2.5 rounded-lg bg-dark-600/30 border border-dark-500/20">
          <div className="flex items-center gap-1.5 text-xs text-dark-400 mb-1">
            <Globe className="w-3 h-3" />
            <span>English Translation</span>
          </div>
          <p className="text-sm text-dark-200">{translated}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="mt-1 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
