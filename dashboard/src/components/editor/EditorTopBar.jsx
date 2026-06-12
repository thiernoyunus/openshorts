import React from 'react';
import { ArrowLeft, Save, Upload, Loader2 } from 'lucide-react';

export default function EditorTopBar({
    title,
    dirty,
    saving,
    exporting,
    exportProgress,
    onBack,
    onSave,
    onExport,
}) {
    return (
        <div className="h-14 shrink-0 border-b border-edge bg-surface flex items-center gap-3 px-4">
            <button
                onClick={onBack}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:text-fg hover:bg-white/5 transition-colors"
                aria-label="Back to clips"
            >
                <ArrowLeft size={18} />
            </button>
            <h1 className="text-sm font-medium text-fg truncate flex-1 min-w-0">
                {title}
                {dirty && (
                    <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-viral align-middle" title="Unsaved changes" />
                )}
            </h1>
            <button
                onClick={onSave}
                disabled={!dirty || saving || !onSave}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-surface2 text-fg border border-edge hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save changes
            </button>
            <button
                onClick={onExport}
                disabled={exporting || !onExport}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-fg text-[#18181b] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
                {exporting ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {exporting ? `Exporting… ${exportProgress ?? 0}%` : 'Export'}
            </button>
        </div>
    );
}
