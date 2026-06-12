import React from 'react';
import { Users, AlertCircle } from 'lucide-react';
import { tracksInSegment, LAYOUT_PANELS } from './useEditorState';

/** Mini glyph previews for each layout option (pure CSS). */
const LayoutGlyph = ({ layout }) => {
    const cell = 'bg-zinc-500 rounded-[1px]';
    if (layout === 'fill') return <div className={`w-4 h-7 ${cell}`} />;
    if (layout === 'fit')
        return (
            <div className="w-4 h-7 bg-zinc-700 rounded-[1px] flex items-center">
                <div className={`w-4 h-2.5 ${cell}`} />
            </div>
        );
    if (layout === 'split')
        return (
            <div className="w-4 h-7 flex flex-col gap-px">
                <div className={`flex-1 ${cell}`} />
                <div className={`flex-1 ${cell}`} />
            </div>
        );
    if (layout === 'three')
        return (
            <div className="w-4 h-7 flex flex-col gap-px">
                <div className={`flex-1 ${cell}`} />
                <div className={`flex-1 ${cell}`} />
                <div className={`flex-1 ${cell}`} />
            </div>
        );
    return (
        <div className="w-4 h-7 grid grid-cols-2 gap-px">
            <div className={cell} />
            <div className={cell} />
            <div className={cell} />
            <div className={cell} />
        </div>
    );
};

const OPTIONS = [
    { id: 'fill', label: 'Fill', desc: 'Crop to one speaker' },
    { id: 'fit', label: 'Fit', desc: 'Full width, blurred bars' },
    { id: 'split', label: 'Split', desc: '2 people stacked' },
    { id: 'three', label: 'Three', desc: '3 people stacked' },
    { id: 'four', label: 'Four', desc: '2×2 grid of 4 people' },
];

/**
 * Right rail: per-segment layout switcher (Opus parity: Fill / Fit / Split /
 * Three / Four). Multi-person options disable when the selected scene has
 * fewer concurrent face tracks than panels.
 */
export default function LayoutPanel({ framing, selectedIds, dispatch }) {
    const selectedSegments = framing.segments.filter((s) => selectedIds.includes(s.id));
    const primary = selectedSegments[0] || null;
    // For multi-select, available people = the minimum across selected segments
    const peopleAvailable = selectedSegments.length
        ? Math.min(...selectedSegments.map((s) => tracksInSegment(framing, s).length))
        : 0;

    return (
        <div className="w-[250px] shrink-0 border-l border-edge bg-surface overflow-y-auto custom-scrollbar">
            <div className="p-4">
                <h3 className="text-xs font-semibold text-fg uppercase tracking-wide mb-1">Layout</h3>
                {!primary ? (
                    <p className="text-xs text-muted mt-2">
                        Select a segment in the timeline to change its framing.
                    </p>
                ) : (
                    <>
                        <p className="text-[11px] text-muted mb-3">
                            {selectedSegments.length > 1
                                ? `${selectedSegments.length} segments selected`
                                : `Segment ${framing.segments.indexOf(primary) + 1} of ${framing.segments.length}`}
                            <span className="inline-flex items-center gap-1 ml-2 text-zinc-400">
                                <Users size={11} /> {peopleAvailable} detected
                            </span>
                        </p>
                        <div className="space-y-1.5">
                            {OPTIONS.map((opt) => {
                                const needed = LAYOUT_PANELS[opt.id];
                                const disabled = needed > 1 && peopleAvailable < needed;
                                const active = selectedSegments.every((s) => s.layout === opt.id);
                                return (
                                    <button
                                        key={opt.id}
                                        disabled={disabled}
                                        onClick={() => dispatch({ type: 'SET_LAYOUT', layout: opt.id })}
                                        title={
                                            disabled
                                                ? `Only ${peopleAvailable} ${peopleAvailable === 1 ? 'person' : 'people'} detected in this scene`
                                                : opt.desc
                                        }
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                                            active
                                                ? 'bg-white/10 border-white/25 text-fg'
                                                : disabled
                                                  ? 'bg-surface2/30 border-edge text-zinc-600 cursor-not-allowed'
                                                  : 'bg-surface2/50 border-edge text-fg hover:bg-white/5'
                                        }`}
                                    >
                                        <LayoutGlyph layout={opt.id} />
                                        <span className="min-w-0">
                                            <span className="block text-xs font-medium">{opt.label}</span>
                                            <span className={`block text-[10px] ${disabled ? 'text-zinc-600' : 'text-muted'}`}>
                                                {opt.desc}
                                            </span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        {peopleAvailable === 0 && (
                            <div className="mt-3 flex items-start gap-1.5 text-[11px] text-muted">
                                <AlertCircle size={12} className="mt-0.5 shrink-0" />
                                No faces were detected in this scene, so only Fill and Fit are available.
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
