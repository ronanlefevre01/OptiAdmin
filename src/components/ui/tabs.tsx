import * as React from "react";

type TabsCtx = { value: string; setValue: (v: string) => void };
const TabsContext = React.createContext<TabsCtx | null>(null);

type TabsProps = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
  className?: string;
  children: React.ReactNode;
};

export function Tabs({
  value,
  defaultValue,
  onValueChange,
  className,
  children,
}: TabsProps) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState<string>(defaultValue ?? "");
  const current = isControlled ? (value as string) : internal;

  const setValue = React.useCallback(
    (v: string) => {
      if (!isControlled) setInternal(v);
      onValueChange?.(v);
    },
    [isControlled, onValueChange]
  );

  const ctx = React.useMemo(() => ({ value: current, setValue }), [current, setValue]);

  return (
    <TabsContext.Provider value={ctx}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="tablist" className={className}>
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("TabsTrigger must be used inside <Tabs>");

  const active = ctx.value === value;
  const base =
    "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm border";
  const activeCls = active
    ? " bg-black text-white"
    : " bg-white text-black hover:bg-gray-50";

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={`tab-${value}`}
      onClick={() => ctx.setValue(value)}
      className={`${base} ${activeCls}${className ? ` ${className}` : ""}`}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("TabsContent must be used inside <Tabs>");

  const hidden = ctx.value !== value;
  return (
    <div
      role="tabpanel"
      id={`tab-${value}`}
      hidden={hidden}
      className={className}
    >
      {!hidden && children}
    </div>
  );
}
