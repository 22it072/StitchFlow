/**
 * PDF Export System - Reusable Export Button Component
 * StitchFlow Textile Manufacturing ERP
 *
 * Drop-in button for any page that needs PDF export.
 * Handles loading state, error display, and multiple export variants.
 *
 * Usage:
 *   <PdfExportButton
 *     onExport={handleExportPdf}
 *     label="Export PDF"
 *     variant="primary"
 *   />
 *
 *   // With multiple options (Print / Download)
 *   <PdfExportButton
 *     onExport={handleDownload}
 *     onPreview={handlePreview}
 *     showPreview
 *   />
 */

import React, { useState, useRef, useEffect } from 'react';
import { Download, Eye, Printer, ChevronDown, FileText, Loader2 } from 'lucide-react';

// ─────────────────────────────────────────────
// VARIANT STYLES
// ─────────────────────────────────────────────
const VARIANTS = {
  primary: {
    base:     'bg-blue-600 hover:bg-blue-700 text-white border border-blue-600',
    loading:  'bg-blue-400 text-white border border-blue-400 cursor-not-allowed',
    icon:     'text-white',
  },
  secondary: {
    base:     'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300',
    loading:  'bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed',
    icon:     'text-gray-500',
  },
  ghost: {
    base:     'bg-transparent hover:bg-gray-100 text-gray-600 border border-transparent',
    loading:  'bg-transparent text-gray-300 border border-transparent cursor-not-allowed',
    icon:     'text-gray-500',
  },
  success: {
    base:     'bg-green-600 hover:bg-green-700 text-white border border-green-600',
    loading:  'bg-green-400 text-white border border-green-400 cursor-not-allowed',
    icon:     'text-white',
  },
};

const SIZES = {
  sm:  { btn: 'px-2.5 py-1.5 text-xs', icon: 14, gap: 'gap-1'   },
  md:  { btn: 'px-3.5 py-2   text-sm', icon: 15, gap: 'gap-1.5' },
  lg:  { btn: 'px-4   py-2.5 text-sm', icon: 16, gap: 'gap-2'   },
};

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

/**
 * @param {object}   props
 * @param {Function} props.onExport      - Called when user clicks download
 * @param {Function} props.onPreview     - Called when user clicks preview (opens new tab)
 * @param {Function} props.onPrint       - Called when user clicks print
 * @param {boolean}  props.showPreview   - Show preview option
 * @param {boolean}  props.showPrint     - Show print option
 * @param {boolean}  props.showDropdown  - Show split button with dropdown
 * @param {string}   props.label         - Button label text
 * @param {string}   props.variant       - 'primary' | 'secondary' | 'ghost' | 'success'
 * @param {string}   props.size          - 'sm' | 'md' | 'lg'
 * @param {boolean}  props.disabled      - Disabled state
 * @param {string}   props.className     - Extra class overrides
 * @param {string}   props.loadingLabel  - Text while loading
 */
const PdfExportButton = ({
  onExport,
  onPreview,
  onPrint,
  showPreview  = false,
  showPrint    = false,
  showDropdown = false,
  label        = 'Export PDF',
  variant      = 'primary',
  size         = 'md',
  disabled     = false,
  className    = '',
  loadingLabel = 'Generating...',
}) => {
  const [loading,     setLoading]     = useState(false);
  const [dropOpen,    setDropOpen]    = useState(false);
  const [activeAction, setActiveAction] = useState(null); // 'download' | 'preview' | 'print'
  const dropRef = useRef(null);

  const variantStyle = VARIANTS[variant] || VARIANTS.primary;
  const sizeStyle    = SIZES[size]       || SIZES.md;

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropOpen) return;
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropOpen]);

  // ── Action Handler ────────────────────────────
  const handleAction = async (action, fn) => {
    if (!fn || loading || disabled) return;
    try {
      setLoading(true);
      setActiveAction(action);
      setDropOpen(false);
      await fn();
    } catch (err) {
      console.error(`PDF ${action} failed:`, err);
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  };

  const isLoading = loading;
  const btnBase   = `
    inline-flex items-center justify-center font-medium rounded-md
    transition-all duration-150 focus:outline-none focus:ring-2
    focus:ring-blue-500 focus:ring-offset-1 select-none
    ${sizeStyle.btn} ${sizeStyle.gap}
    ${isLoading || disabled
      ? variantStyle.loading + ' pointer-events-none'
      : variantStyle.base
    }
    ${className}
  `.trim();

  // ── Simple Button (no dropdown) ───────────────
  if (!showDropdown && !showPreview && !showPrint) {
    return (
      <button
        type="button"
        className={btnBase}
        onClick={() => handleAction('download', onExport)}
        disabled={isLoading || disabled}
        title={label}
      >
        {isLoading ? (
          <>
            <Loader2
              size={sizeStyle.icon}
              className="animate-spin"
            />
            <span>{loadingLabel}</span>
          </>
        ) : (
          <>
            <Download size={sizeStyle.icon} />
            <span>{label}</span>
          </>
        )}
      </button>
    );
  }

  // ── Split Button with Dropdown ────────────────
  if (showDropdown || showPreview || showPrint) {
    const dropdownItems = [
      {
        key:     'download',
        label:   'Download PDF',
        icon:    Download,
        action:  onExport,
        show:    true,
      },
      {
        key:     'preview',
        label:   'Preview PDF',
        icon:    Eye,
        action:  onPreview,
        show:    showPreview && !!onPreview,
      },
      {
        key:     'print',
        label:   'Print',
        icon:    Printer,
        action:  onPrint,
        show:    showPrint && !!onPrint,
      },
    ].filter(item => item.show);

    return (
      <div className="relative inline-flex" ref={dropRef}>
        {/* Primary action button */}
        <button
          type="button"
          className={`
            inline-flex items-center justify-center font-medium
            transition-all duration-150 focus:outline-none focus:ring-2
            focus:ring-blue-500 focus:ring-offset-1 select-none
            rounded-l-md border-r-0
            ${sizeStyle.btn} ${sizeStyle.gap}
            ${isLoading || disabled
              ? variantStyle.loading + ' pointer-events-none'
              : variantStyle.base
            }
          `}
          onClick={() => handleAction('download', onExport)}
          disabled={isLoading || disabled}
        >
          {isLoading && activeAction === 'download' ? (
            <Loader2 size={sizeStyle.icon} className="animate-spin" />
          ) : (
            <FileText size={sizeStyle.icon} />
          )}
          <span>
            {isLoading && activeAction === 'download' ? loadingLabel : label}
          </span>
        </button>

        {/* Dropdown toggle */}
        <button
          type="button"
          className={`
            inline-flex items-center justify-center
            rounded-r-md px-1.5 border-l
            transition-all duration-150 focus:outline-none focus:ring-2
            focus:ring-blue-500 focus:ring-offset-1
            ${isLoading || disabled
              ? variantStyle.loading + ' pointer-events-none'
              : variantStyle.base
            }
          `}
          onClick={() => setDropOpen(prev => !prev)}
          disabled={isLoading || disabled}
        >
          <ChevronDown
            size={12}
            className={`transition-transform duration-150 ${dropOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown Menu */}
        {dropOpen && (
          <div className="
            absolute right-0 top-full mt-1 z-50
            bg-white border border-gray-200 rounded-lg shadow-lg
            min-w-[160px] py-1 overflow-hidden
            animate-in fade-in slide-in-from-top-1
          ">
            {dropdownItems.map((item) => {
              const Icon = item.icon;
              const isItemLoading = isLoading && activeAction === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  className="
                    w-full flex items-center gap-2.5 px-3 py-2
                    text-sm text-gray-700 hover:bg-gray-50
                    transition-colors duration-100 text-left
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                  onClick={() => handleAction(item.key, item.action)}
                  disabled={isLoading}
                >
                  {isItemLoading ? (
                    <Loader2 size={14} className="animate-spin text-blue-500" />
                  ) : (
                    <Icon size={14} className="text-gray-400" />
                  )}
                  <span>{isItemLoading ? loadingLabel : item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }
};

export default PdfExportButton;