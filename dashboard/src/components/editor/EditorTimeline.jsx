import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Play, Pause, SkipBack } from 'lucide-react';
import { EDITOR_FPS } from './EditorCanvas';
import { useFilmstrip, useWaveform } from './useMediaStrips';

const fmt = (frames) => {
    const totalSec = frames / EDITOR_FPS;
    const m = Math.floor(totalSec / 60);
    const s = Math.floor(totalSec % 60);
    const cs = Math.floor((totalSec % 1) * 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
};

const LAYOUT_LABEL = { fill: 'Fill', fit: 'Fit', split: 'Split', three: 'Three', four: 'Four' };

/**
 * Opus-style timeline: layout-chip row per framing segment with draggable
 * boundaries, a thumbnail filmstrip, an audio waveform, scrub-to-seek, and a
 * playhead synced to the Player.
 */
export default function EditorTimeline({ framing, playerRef, selectedIds, onSelect, dispatch, sourceUrl }) {
    const [frame, setFrame] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [drag, setDrag] = useState(null); // {boundaryIndex, frame}
    const stripRef = useRef(null);

    const srcFps = framing.source.fps;
    const totalSrcFrames = framing.source.durationFrames;
    const durationInFrames = Math.max(1, Math.round((totalSrcFrames / srcFps) * EDITOR_FPS));

    const thumbs = useFilmstrip(sourceUrl);
    const peaks = useWaveform(sourceUrl);

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

    const sourceFrameAtClientX = useCallback(
        (clientX) => {
            const rect = stripRef.current.getBoundingClientRect();
            const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
            return Math.round(fraction * totalSrcFrames);
        },
        [totalSrcFrames]
    );

    // Boundary dragging: live position in local state, single history entry
    // committed to the reducer on release
    const onBoundaryPointerDown = (boundaryIndex) => (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDrag({ boundaryIndex, frame: framing.segments[boundaryIndex].endFrame });
        try {
            e.target.setPointerCapture?.(e.pointerId);
        } catch { /* synthetic or already-released pointer */ }
    };
    const onStripPointerMove = (e) => {
        if (!drag) return;
        setDrag((d) => ({ ...d, frame: sourceFrameAtClientX(e.clientX) }));
    };
    const endBoundaryDrag = () => {
        if (!drag) return;
        dispatch({ type: 'SET_BOUNDARY', boundaryIndex: drag.boundaryIndex, frame: drag.frame });
        setDrag(null);
    };

    const scrubTo = (e) => {
        if (drag) return;
        seekToSourceFrame(sourceFrameAtClientX(e.clientX));
    };

    const playheadPct = Math.min(100, (frame / durationInFrames) * 100);
    const boundaryPct = (f) => (f / totalSrcFrames) * 100;

    return (
        <div className="border-t border-edge bg-surface px-4 py-3 select-none">
            {/* Transport */}
            <div className="flex items-center gap-3 mb-2.5">
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
                    Click a chip to select · drag chip edges to move boundaries · click strip to seek
                </span>
            </div>

            <div
                ref={stripRef}
                className="relative rounded-lg overflow-hidden border border-edge bg-canvas"
                onPointerMove={onStripPointerMove}
                onPointerUp={endBoundaryDrag}
                onPointerLeave={endBoundaryDrag}
            >
                {/* Layout chip row */}
                <div className="relative h-7 flex border-b border-edge">
                    {framing.segments.map((seg) => {
                        const widthPct = ((seg.endFrame - seg.startFrame) / totalSrcFrames) * 100;
                        const selected = selectedIds.includes(seg.id);
                        return (
                            <button
                                key={seg.id}
                                style={{ width: `${widthPct}%` }}
                                onClick={(e) => {
                                    onSelect(seg.id, e.shiftKey || e.metaKey || e.ctrlKey);
                                    seekToSourceFrame(seg.startFrame);
                                }}
                                className={`relative h-full border-r border-edge last:border-r-0 transition-colors text-left overflow-hidden ${
                                    selected ? 'bg-white/20' : 'bg-surface2/40 hover:bg-white/10'
                                }`}
                                title={`${seg.id} · ${LAYOUT_LABEL[seg.layout] || seg.layout}`}
                            >
                                <span
                                    className={`absolute top-1/2 -translate-y-1/2 left-1.5 text-[10px] font-medium px-1.5 py-px rounded truncate max-w-[85%] ${
                                        selected ? 'bg-fg text-[#18181b]' : 'bg-black/50 text-zinc-300'
                                    }`}
                                >
                                    {LAYOUT_LABEL[seg.layout] || seg.layout}
                                </span>
                            </button>
                        );
                    })}

                    {/* Boundary drag handles (between adjacent segments) */}
                    {framing.segments.slice(0, -1).map((seg, i) => {
                        const f = drag?.boundaryIndex === i ? drag.frame : seg.endFrame;
                        return (
                            <div
                                key={`b-${seg.id}`}
                                style={{ left: `${boundaryPct(f)}%` }}
                                onPointerDown={onBoundaryPointerDown(i)}
                                className="absolute top-0 bottom-0 w-2 -ml-1 cursor-col-resize group z-10"
                            >
                                <div className={`mx-auto w-[3px] h-full rounded ${drag?.boundaryIndex === i ? 'bg-viral' : 'bg-zinc-500 group-hover:bg-fg'}`} />
                            </div>
                        );
                    })}
                </div>

                {/* Filmstrip */}
                <div className="relative h-12 flex bg-black cursor-pointer" onPointerDown={scrubTo}>
                    {thumbs.length === 0 ? (
                        <div className="w-full h-full bg-surface2/30 animate-pulse" />
                    ) : (
                        thumbs.map((src, i) => (
                            <img
                                key={i}
                                src={src}
                                alt=""
                                draggable={false}
                                className="h-full object-cover pointer-events-none"
                                style={{ width: `${100 / thumbs.length}%` }}
                            />
                        ))
                    )}
                </div>

                {/* Waveform */}
                <div className="relative h-8 flex items-center gap-px px-px bg-canvas cursor-pointer" onPointerDown={scrubTo}>
                    {peaks === null ? (
                        <div className="w-full h-3 bg-surface2/30 animate-pulse rounded" />
                    ) : peaks.length === 0 ? (
                        <span className="w-full text-center text-[10px] text-zinc-600">no audio</span>
                    ) : (
                        peaks.map((v, i) => (
                            <div
                                key={i}
                                className="flex-1 bg-zinc-500/80 rounded-sm pointer-events-none"
                                style={{ height: `${Math.max(6, v * 100)}%` }}
                            />
                        ))
                    )}
                </div>

                {/* Boundary drag live guide across all rows */}
                {drag && (
                    <div
                        className="absolute top-0 bottom-0 w-px bg-viral pointer-events-none z-20"
                        style={{ left: `${boundaryPct(drag.frame)}%` }}
                    />
                )}

                {/* Playhead */}
                <div
                    className="absolute top-0 bottom-0 w-px bg-fg pointer-events-none z-20"
                    style={{ left: `${playheadPct}%` }}
                >
                    <div className="absolute -top-0.5 -left-[3px] w-[7px] h-[7px] rounded-full bg-fg" />
                </div>
            </div>
        </div>
    );
}
