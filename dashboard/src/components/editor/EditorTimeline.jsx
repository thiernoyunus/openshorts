import React, { useEffect, useState, useCallback } from 'react';
import { Play, Pause, SkipBack } from 'lucide-react';
import { EDITOR_FPS } from './EditorCanvas';

const fmt = (frames) => {
    const totalSec = frames / EDITOR_FPS;
    const m = Math.floor(totalSec / 60);
    const s = Math.floor(totalSec % 60);
    const cs = Math.floor((totalSec % 1) * 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
};

const LAYOUT_LABEL = { fill: 'Fill', fit: 'Fit', split: 'Split', three: 'Three', four: 'Four' };

/**
 * Opus-style segment timeline: one block per framing segment with a layout
 * chip, a playhead synced to the Player, click-to-select+seek, and
 * shift/cmd-click multi-select.
 */
export default function EditorTimeline({ framing, playerRef, selectedIds, onSelect }) {
    const [frame, setFrame] = useState(0);
    const [playing, setPlaying] = useState(false);

    const srcFps = framing.source.fps;
    const totalSrcFrames = framing.source.durationFrames;
    const durationInFrames = Math.max(1, Math.round((totalSrcFrames / srcFps) * EDITOR_FPS));

    useEffect(() => {
        const p = playerRef.current;
        if (!p) return;
        const onFrame = (e) => setFrame(e.detail.frame);
        const onPlay = () => setPlaying(true);
        const onPause = () => setPlaying(false);
        p.addEventListener('frameupdate', onFrame);
        p.addEventListener('play', onPlay);
        p.addEventListener('pause', onPause);
        return () => {
            p.removeEventListener('frameupdate', onFrame);
            p.removeEventListener('play', onPlay);
            p.removeEventListener('pause', onPause);
        };
    }, [playerRef]);

    const togglePlay = useCallback(() => {
        const p = playerRef.current;
        if (!p) return;
        if (p.isPlaying()) p.pause();
        else p.play();
    }, [playerRef]);

    const seekToSourceFrame = useCallback(
        (srcFrame) => {
            const p = playerRef.current;
            if (!p) return;
            p.pause();
            p.seekTo(Math.round((srcFrame / srcFps) * EDITOR_FPS));
        },
        [playerRef, srcFps]
    );

    const playheadPct = Math.min(100, (frame / durationInFrames) * 100);

    return (
        <div className="border-t border-edge bg-surface px-4 py-3 select-none">
            {/* Transport */}
            <div className="flex items-center gap-3 mb-3">
                <button
                    onClick={() => seekToSourceFrame(0)}
                    className="w-8 h-8 rounded-md flex items-center justify-center text-muted hover:text-fg hover:bg-white/5 transition-colors"
                    aria-label="Back to start"
                >
                    <SkipBack size={15} />
                </button>
                <button
                    onClick={togglePlay}
                    className="w-9 h-9 rounded-full bg-fg text-[#18181b] flex items-center justify-center hover:bg-white active:scale-95 transition-all"
                    aria-label={playing ? 'Pause' : 'Play'}
                >
                    {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                </button>
                <span className="text-xs text-muted tabular-nums">
                    {fmt(frame)} <span className="text-zinc-600">/</span> {fmt(durationInFrames)}
                </span>
                <span className="ml-auto text-[11px] text-muted">
                    Click a segment to select · shift-click for multi-select
                </span>
            </div>

            {/* Segment strip */}
            <div className="relative h-14 rounded-lg overflow-hidden bg-canvas border border-edge">
                <div className="absolute inset-0 flex">
                    {framing.segments.map((seg) => {
                        const widthPct =
                            ((seg.endFrame - seg.startFrame) / totalSrcFrames) * 100;
                        const selected = selectedIds.includes(seg.id);
                        return (
                            <button
                                key={seg.id}
                                style={{ width: `${widthPct}%` }}
                                onClick={(e) => {
                                    onSelect(seg.id, e.shiftKey || e.metaKey || e.ctrlKey);
                                    seekToSourceFrame(seg.startFrame);
                                }}
                                className={`relative h-full border-r border-edge last:border-r-0 transition-colors text-left ${
                                    selected
                                        ? 'bg-white/15'
                                        : 'bg-surface2/40 hover:bg-white/10'
                                }`}
                                title={`${seg.id} · ${LAYOUT_LABEL[seg.layout] || seg.layout}`}
                            >
                                <span
                                    className={`absolute top-1 left-1 text-[10px] font-medium px-1.5 py-0.5 rounded truncate max-w-[90%] ${
                                        selected
                                            ? 'bg-fg text-[#18181b]'
                                            : 'bg-black/50 text-zinc-300'
                                    }`}
                                >
                                    {LAYOUT_LABEL[seg.layout] || seg.layout}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Playhead */}
                <div
                    className="absolute top-0 bottom-0 w-px bg-fg pointer-events-none"
                    style={{ left: `${playheadPct}%` }}
                >
                    <div className="absolute -top-0.5 -left-[3px] w-[7px] h-[7px] rounded-full bg-fg" />
                </div>
            </div>
        </div>
    );
}
