'use client';

import { useEffect, useRef } from 'react';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function ProductModal({ isOpen, onClose, title, children }: ProductModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => onClose();
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      className="product-modal"
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className="product-modal-content">
        <div className="product-modal-header">
          <h3>{title}</h3>
          <button onClick={onClose} className="product-modal-close" aria-label="Cerrar">
            ✕
          </button>
        </div>
        <div className="product-modal-body">
          {children}
        </div>
      </div>
    </dialog>
  );
}
