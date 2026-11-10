import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styles from './TripExport.module.scss';

const GAP = 6;
const MARGIN = 8;

const Popover = ({ icon, text, label, buttonClassName = '', width = 260, disabled = false, children }) => {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const close = useCallback((restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  const toggle = () => {
    if (open) {
      close();
      return;
    }
    const rect = triggerRef.current.getBoundingClientRect();
    setAnchor({ below: rect.bottom + GAP, above: rect.top - GAP, right: rect.right });
    setOpen(true);
  };

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!open || !anchor || !menu) return;

    const height = menu.offsetHeight;
    const fitsBelow = anchor.below + height <= window.innerHeight - MARGIN;
    const top = fitsBelow ? anchor.below : Math.max(MARGIN, anchor.above - height);
    const left = Math.min(anchor.right - width, window.innerWidth - width - MARGIN);

    menu.style.top = `${top}px`;
    menu.style.left = `${Math.max(MARGIN, left)}px`;
    menu.style.visibility = 'visible';
  }, [open, anchor, width]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (e) => {
      if (menuRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return;
      close();
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close(true);
      }
    };
    const handleScroll = (e) => {
      if (menuRef.current?.contains(e.target)) return;
      close();
    };
    const handleResize = () => close();

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [open, close]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.trigger} ${buttonClassName}`}
        aria-label={label}
        title={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={toggle}>
        <FontAwesomeIcon icon={icon} aria-hidden="true" />
        {text && <span>{text}</span>}
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            className={styles.popover}
            role="dialog"
            aria-label={label}
            style={{ width, top: 0, left: 0, visibility: 'hidden' }}>
            {children(close)}
          </div>,
          document.body,
        )}
    </>
  );
};

export default Popover;
