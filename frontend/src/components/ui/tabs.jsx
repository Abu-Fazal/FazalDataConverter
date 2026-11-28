import { createContext, useContext, useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const TabsContext = createContext(null);

function useTabs() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tabs components must be used within <Tabs>');
  return ctx;
}

function Tabs({ defaultValue, value, onValueChange, className, children, ...props }) {
  const [internal, setInternal] = useState(defaultValue);
  const baseId = useId();
  const current = value !== undefined ? value : internal;

  function select(next) {
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
  }

  return (
    <TabsContext.Provider value={{ current, select, baseId }}>
      <div className={cn('w-full', className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

function TabsList({ className, children, ...props }) {
  const listRef = useRef(null);

  function onKeyDown(e) {
    const tabs = [...listRef.current.querySelectorAll('[role="tab"]:not([disabled])')];
    const index = tabs.indexOf(document.activeElement);
    if (index === -1) return;

    let next = null;
    if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = tabs.length - 1;

    if (next !== null) {
      e.preventDefault();
      tabs[next].focus();
      tabs[next].click();
    }
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      onKeyDown={onKeyDown}
      className={cn('flex items-center gap-1 border-b border-border-subtle', className)}
      {...props}
    >
      {children}
    </div>
  );
}

function TabsTrigger({ value, className, disabled = false, children, ...props }) {
  const { current, select, baseId } = useTabs();
  const selected = current === value;

  return (
    <button
      type="button"
      role="tab"
      id={`${baseId}-tab-${value}`}
      aria-selected={selected}
      aria-controls={`${baseId}-panel-${value}`}
      tabIndex={selected ? 0 : -1}
      disabled={disabled}
      onClick={() => select(value)}
      className={cn(
        '-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-label-lg transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        selected
          ? 'border-brand-primary text-brand-primary'
          : 'border-transparent text-text-secondary hover:border-border-strong hover:text-text-primary',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function TabsContent({ value, className, children, ...props }) {
  const { current, baseId } = useTabs();
  if (current !== value) return null;

  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      tabIndex={0}
      className={cn('pt-4 focus-visible:outline-none', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };