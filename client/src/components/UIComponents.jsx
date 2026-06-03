// ============================================
// REUSABLE COMPONENTS FOR YOUR SaaS DASHBOARD
// ============================================

import { useState, useEffect, useRef } from 'react';
import { X, Check, AlertCircle, Info } from 'lucide-react';

// ============================================
// 1. MODAL COMPONENT
// ============================================

export function Modal({ isOpen, onClose, title, children, size = 'md' }) {
    if (!isOpen) return null;

    const sizes = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className={`card-elevated ${sizes[size]} w-full p-6 animate-slide-up`}>
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-surface-100">{title}</h3>
                    <button onClick={onClose} className="btn-icon btn-ghost">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="text-surface-300">
                    {children}
                </div>
            </div>
        </div>
    );
}

// ============================================
// 2. TOAST NOTIFICATION COMPONENT
// ============================================

export function Toast({ type = 'success', message, onClose }) {
    const config = {
        success: {
            icon: Check,
            className: 'bg-green-500/10 border-green-500/30 text-green-300',
        },
        error: {
            icon: AlertCircle,
            className: 'bg-red-500/10 border-red-500/30 text-red-300',
        },
        warning: {
            icon: AlertCircle,
            className: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300',
        },
        info: {
            icon: Info,
            className: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
        },
    };

    const { icon: Icon, className } = config[type];

    return (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-elevation-3 animate-slide-down ${className}`}>
            <Icon size={20} />
            <p className="text-sm font-medium flex-grow">{message}</p>
            {onClose && (
                <button onClick={onClose} className="text-current opacity-70 hover:opacity-100">
                    <X size={18} />
                </button>
            )}
        </div>
    );
}

// Usage with toast container
export function ToastContainer({ toasts = [], onRemove }) {
    return (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    type={toast.type}
                    message={toast.message}
                    onClose={() => onRemove(toast.id)}
                />
            ))}
        </div>
    );
}

// ============================================
// 3. LOADING SPINNER COMPONENT
// ============================================

export function LoadingSpinner({ size = 'md', color = 'primary' }) {
    const sizes = {
        sm: 'h-4 w-4 border-2',
        md: 'h-8 w-8 border-3',
        lg: 'h-12 w-12 border-4',
    };

    const colors = {
        primary: 'border-primary-500/30 border-t-primary-500',
        white: 'border-white/30 border-t-white',
        surface: 'border-surface-500/30 border-t-surface-500',
    };

    return (
        <div className={`${sizes[size]} ${colors[color]} rounded-full animate-spin`} />
    );
}

// Full page loading
export function LoadingScreen({ message = 'Loading...' }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-950/90 backdrop-blur-sm">
            <div className="text-center">
                <LoadingSpinner size="lg" />
                <p className="mt-4 text-surface-300">{message}</p>
            </div>
        </div>
    );
}

// ============================================
// 4. DROPDOWN MENU COMPONENT
// ============================================

export function Dropdown({ trigger, items, align = 'right' }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const alignClass = align === 'right' ? 'right-0' : 'left-0';

    return (
        <div className="relative" ref={dropdownRef}>
            <div onClick={() => setIsOpen(!isOpen)}>
                {trigger}
            </div>

            {isOpen && (
                <div className={`absolute ${alignClass} mt-2 min-w-[200px] card-elevated p-2 z-50 animate-slide-down`}>
                    {items.map((item, index) => (
                        <button
                            key={index}
                            onClick={() => {
                                item.onClick?.();
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-surface-300 hover:bg-surface-700/50 hover:text-surface-100 transition-colors"
                        >
                            {item.icon && <item.icon size={18} />}
                            <span>{item.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ============================================
// 5. EMPTY STATE COMPONENT
// ============================================

export function EmptyState({ icon: Icon, title, description, action }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            {Icon && (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-800/50 border border-surface-700/50 mb-4">
                    <Icon className="h-8 w-8 text-surface-400" />
                </div>
            )}
            <h3 className="text-lg font-semibold text-surface-200 mb-2">{title}</h3>
            <p className="text-surface-400 text-sm max-w-md mb-6">{description}</p>
            {action && action}
        </div>
    );
}

// ============================================
// 6. SKELETON LOADER COMPONENT
// ============================================

export function SkeletonCard() {
    return (
        <div className="card p-6 space-y-4">
            <div className="flex items-center gap-3">
                <div className="skeleton h-12 w-12 rounded-xl" />
                <div className="flex-grow space-y-2">
                    <div className="skeleton h-4 w-3/4 rounded" />
                    <div className="skeleton h-3 w-1/2 rounded" />
                </div>
            </div>
            <div className="space-y-2">
                <div className="skeleton h-3 w-full rounded" />
                <div className="skeleton h-3 w-5/6 rounded" />
                <div className="skeleton h-3 w-4/6 rounded" />
            </div>
        </div>
    );
}

export function SkeletonList({ count = 3 }) {
    return (
        <div className="space-y-3">
            {[...Array(count)].map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    );
}

// ============================================
// 7. ALERT COMPONENT
// ============================================

export function Alert({ type = 'info', title, message, onClose }) {
    const config = {
        success: {
            icon: Check,
            className: 'bg-green-500/10 border-green-500/30 text-green-300',
        },
        error: {
            icon: AlertCircle,
            className: 'bg-red-500/10 border-red-500/30 text-red-300',
        },
        warning: {
            icon: AlertCircle,
            className: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300',
        },
        info: {
            icon: Info,
            className: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
        },
    };

    const { icon: Icon, className } = config[type];

    return (
        <div className={`flex items-start gap-3 p-4 rounded-xl border ${className}`}>
            <Icon size={20} className="flex-shrink-0 mt-0.5" />
            <div className="flex-grow">
                {title && <p className="font-semibold mb-1">{title}</p>}
                <p className="text-sm opacity-90">{message}</p>
            </div>
            {onClose && (
                <button onClick={onClose} className="text-current opacity-70 hover:opacity-100 flex-shrink-0">
                    <X size={18} />
                </button>
            )}
        </div>
    );
}

// ============================================
// 8. FEATURE CARD COMPONENT
// ============================================

export function FeatureCard({ icon: Icon, title, description, badge }) {
    return (
        <div className="card-hover p-6 group">
            <div className="flex items-start justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 shadow-lg shadow-primary-500/20">
                    <Icon className="h-6 w-6 text-white" />
                </div>
                {badge && <span className="badge-primary">{badge}</span>}
            </div>
            <h3 className="text-lg font-semibold text-surface-100 group-hover:text-gradient transition-all mb-2">
                {title}
            </h3>
            <p className="text-surface-400 text-sm leading-relaxed">
                {description}
            </p>
        </div>
    );
}

// ============================================
// 9. STAT CARD COMPONENT
// ============================================

export function StatCard({ label, value, change, trend = 'up', icon: Icon }) {
    const trendColor = trend === 'up' ? 'text-green-400' : 'text-red-400';

    return (
        <div className="card p-6">
            <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-surface-400">{label}</p>
                {Icon && (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500/10">
                        <Icon className="h-5 w-5 text-primary-400" />
                    </div>
                )}
            </div>
            <div className="flex items-baseline gap-3">
                <h3 className="text-3xl font-bold text-surface-100">{value}</h3>
                {change && (
                    <span className={`text-sm font-medium ${trendColor}`}>
                        {trend === 'up' ? '↑' : '↓'} {change}
                    </span>
                )}
            </div>
        </div>
    );
}

// ============================================
// 10. PROGRESS BAR COMPONENT
// ============================================

export function ProgressBar({ value, max = 100, label, showPercentage = true }) {
    const percentage = Math.round((value / max) * 100);

    return (
        <div className="space-y-2">
            {(label || showPercentage) && (
                <div className="flex items-center justify-between">
                    {label && <span className="text-sm text-surface-300">{label}</span>}
                    {showPercentage && <span className="text-sm font-medium text-surface-200">{percentage}%</span>}
                </div>
            )}
            <div className="h-2 bg-surface-800 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}

// ============================================
// 11. AVATAR COMPONENT
// ============================================

export function Avatar({ src, name, size = 'md', status }) {
    const sizes = {
        sm: 'h-8 w-8 text-xs',
        md: 'h-10 w-10 text-sm',
        lg: 'h-12 w-12 text-base',
        xl: 'h-16 w-16 text-lg',
    };

    const getInitials = (name) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div className="relative inline-block">
            <div className={`${sizes[size]} rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-semibold ring-2 ring-surface-700/30`}>
                {src ? (
                    <img src={src} alt={name} className="w-full h-full rounded-xl object-cover" />
                ) : (
                    <span>{getInitials(name)}</span>
                )}
            </div>
            {status && (
                <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-surface-800 ${status === 'online' ? 'bg-green-500' :
                    status === 'busy' ? 'bg-red-500' :
                        'bg-surface-500'
                    }`} />
            )}
        </div>
    );
}

// ============================================
// 12. TABS COMPONENT
// ============================================

export function Tabs({ tabs, activeTab, onChange }) {
    return (
        <div className="flex gap-2 border-b border-surface-800/50">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    className={`px-4 py-3 text-sm font-medium transition-all border-b-2 ${activeTab === tab.id
                        ? 'border-primary-500 text-primary-400'
                        : 'border-transparent text-surface-400 hover:text-surface-200'
                        }`}
                >
                    {tab.icon && <tab.icon size={18} className="inline mr-2" />}
                    {tab.label}
                </button>
            ))}
        </div>
    );
}

// ============================================
// USAGE EXAMPLES
// ============================================

/*
// Example 1: Using Modal
function App() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button onClick={() => setShowModal(true)} className="btn-primary">
        Open Modal
      </button>
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Delete Conversation"
        size="md"
      >
        <p>Are you sure you want to delete this conversation?</p>
        <div className="flex gap-3 mt-6">
          <button onClick={() => setShowModal(false)} className="btn-secondary">
            Cancel
          </button>
          <button className="btn-accent">Delete</button>
        </div>
      </Modal>
    </>
  );
}

// Example 2: Using Toast
function App() {
  const [toasts, setToasts] = useState([]);

  const addToast = (type, message) => {
    const id = Date.now();
    setToasts([...toasts, { id, type, message }]);
    setTimeout(() => removeToast(id), 3000);
  };

  const removeToast = (id) => {
    setToasts(toasts.filter(t => t.id !== id));
  };

  return (
    <>
      <button onClick={() => addToast('success', 'Changes saved!')} className="btn-primary">
        Show Toast
      </button>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}

// Example 3: Using Dropdown
<Dropdown
  trigger={<button className="btn-ghost">Options</button>}
  align="right"
  items={[
    { icon: Edit, label: 'Edit', onClick: () => console.log('Edit') },
    { icon: Copy, label: 'Duplicate', onClick: () => console.log('Duplicate') },
    { icon: Trash, label: 'Delete', onClick: () => console.log('Delete') },
  ]}
/>

// Example 4: Empty State
<EmptyState
  icon={MessageSquare}
  title="No conversations yet"
  description="Start a new chat to begin your conversation with the AI assistant"
  action={<button className="btn-primary">New Chat</button>}
/>

// Example 5: Stats Grid
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <StatCard label="Total Queries" value="1,234" change="+12%" trend="up" icon={MessageSquare} />
  <StatCard label="Active Users" value="89" change="+5%" trend="up" icon={Users} />
  <StatCard label="Avg Response" value="1.2s" change="-8%" trend="down" icon={Clock} />
</div>
*/
