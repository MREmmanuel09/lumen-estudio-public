'use client';

import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  confirmVariant?: 'primary' | 'outline';
  loading?: boolean;
  /** Texto que el usuario debe tipear para confirmar (opcional) */
  requireText?: string;
}

import { useState, useEffect } from 'react';

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  confirmVariant = 'primary',
  loading = false,
  requireText,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (!open) setTyped('');
  }, [open]);

  const canConfirm = !requireText || typed === requireText;

  return (
    <Modal open={open} onClose={onClose} ariaLabel={title} className="max-w-md">
      <div className="p-6">
        <h2 className="font-display text-2xl text-fg">{title}</h2>
        <p className="mt-3 text-sm text-fg-muted">{description}</p>

        {requireText && (
          <div className="mt-5">
            <label
              htmlFor="confirm-text"
              className="block font-detail text-xs uppercase tracking-widest text-fg-muted"
            >
              Tipeá <span className="text-accent">{requireText}</span> para confirmar
            </label>
            <input
              id="confirm-text"
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="mt-2 w-full border border-border bg-transparent px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
              autoComplete="off"
            />
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={!canConfirm}
            isLoading={loading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
