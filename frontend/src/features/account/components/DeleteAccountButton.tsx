'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { deleteAccount } from '@features/account/actions';

export function DeleteAccountButton() {
  const t = useTranslations('Settings.privacyPage.delete');
  const [confirming, setConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [failed, setFailed] = useState(false);

  async function onConfirm() {
    setFailed(false);
    setIsDeleting(true);
    try {
      await deleteAccount();
    } catch {
      setFailed(true);
      setIsDeleting(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="btn self-start border border-danger bg-surface text-danger hover:bg-surface-2"
      >
        {t('submit')}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3" role="alert">
      <p className="text-sm font-semibold text-danger">{t('confirmText')}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isDeleting}
          onClick={onConfirm}
          className="btn bg-danger text-white"
        >
          {isDeleting ? t('confirming') : t('confirm')}
        </button>
        <button
          type="button"
          disabled={isDeleting}
          onClick={() => setConfirming(false)}
          className="btn-ghost"
        >
          {t('cancel')}
        </button>
      </div>
      {failed && <p className="text-sm text-danger">{t('error')}</p>}
    </div>
  );
}
