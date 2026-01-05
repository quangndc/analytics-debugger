import { useState } from 'react';
import { Activity, Settings, Smartphone, Shield, Search } from 'lucide-react';
import { cn } from '../lib/utils'; // Assuming utils is at src/lib/utils

type View = 'stream' | 'settings' | 'setup';

export function Layout() {
    const [activeView, setActiveView] = useState<View>('stream');

    return (
        <div className="flex h-screen w-full bg-background text-foreground font-sans overflow-hidden">
            {/* Sidebar */}
            <aside className="w-16 md:w-64 border-r border-border bg-card flex flex-col transition-all duration-300">
                <div className="p-4 flex items-center gap-3 border-b border-border h-16">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                        <Activity className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <span className="font-bold text-lg hidden md:block truncate">Analytics Debugger</span>
                </div>

                <nav className="flex-1 p-2 space-y-1">
                    <NavItem
                        icon={<Activity className="w-5 h-5" />}
                        label="Live Stream"
                        isActive={activeView === 'stream'}
                        onClick={() => setActiveView('stream')}
                    />
                    <NavItem
                        icon={<Smartphone className="w-5 h-5" />}
                        label="Device Setup"
                        isActive={activeView === 'setup'}
                        onClick={() => setActiveView('setup')}
                    />
                    <NavItem
                        icon={<Settings className="w-5 h-5" />}
                        label="Settings"
                        isActive={activeView === 'settings'}
                        onClick={() => setActiveView('settings')}
                    />
                </nav>

                <div className="p-4 border-t border-border">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm hidden md:flex">
                        <Shield className="w-4 h-4" />
                        <span>Proxy: Stopped</span>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Header */}
                <header className="h-16 border-b border-border px-6 flex items-center justify-between bg-card/50 backdrop-blur-sm">
                    <h1 className="text-xl font-semibold capitalize">{activeView.replace('-', ' ')}</h1>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Filter requests..."
                                className="pl-9 pr-4 py-2 h-9 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-ring w-64"
                            />
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 overflow-auto p-6">
                    {activeView === 'stream' && <StreamView />}
                    {activeView === 'setup' && <SetupView />}
                    {activeView === 'settings' && <div className="text-muted-foreground">Settings placeholder</div>}
                </div>
            </main>
        </div>
    );
}

function NavItem({ icon, label, isActive, onClick }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
        >
            {icon}
            <span className="hidden md:block">{label}</span>
        </button>
    );
}

function StreamView() {
    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-8 flex flex-col items-center justify-center text-center m-auto h-[60vh]">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <Activity className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">No Traffic Yet</h3>
                <p className="text-muted-foreground max-w-sm mt-2">
                    Start the proxy and configure your device to see analytics requests appear here.
                </p>
                <button className="mt-6 px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors">
                    Start Proxy
                </button>
            </div>
        </div>
    );
}

function SetupView() {
    return (
        <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">Device Setup</h2>
            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
                <div>
                    <h3 className="text-lg font-semibold mb-2">1. Install Root Certificate</h3>
                    <p className="text-muted-foreground mb-4">
                        To intercept HTTPS traffic, you need to install and trust our generated Root CA on your test device.
                    </p>
                    <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md font-medium">
                        View/Download Certificate
                    </button>
                </div>
                <div className="border-t border-border pt-6">
                    <h3 className="text-lg font-semibold mb-2">2. Configure Proxy</h3>
                    <p className="text-muted-foreground">
                        Set your device's WIFI proxy strictly to:
                    </p>
                    <div className="mt-3 bg-muted p-3 rounded-md family-mono text-sm flex gap-8">
                        <div>
                            <span className="block text-xs text-muted-foreground uppercase tracking-wider">IP Address</span>
                            <span className="font-semibold">192.168.1.X</span>
                        </div>
                        <div>
                            <span className="block text-xs text-muted-foreground uppercase tracking-wider">Port</span>
                            <span className="font-semibold">8888</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
