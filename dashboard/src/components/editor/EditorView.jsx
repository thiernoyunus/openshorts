import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { getApiUrl } from '../../config';
import useEditorState from './useEditorState';
import EditorTopBar from './EditorTopBar';
import EditorCanvas, { EDITOR_FPS } from './EditorCanvas';
import EditorTimeline from './EditorTimeline';
import LayoutPanel from './LayoutPanel';

/**
 * Full-screen clip editor (docs/video-editor-plan.md Phase 3+4).
 * Loads the clip's framing.json and 16:9 source, previews the reframe live in
 * a Remotion Player, and lets the user change per-segment layout.
 */
export default function EditorView({ clip, index, jobId: _jobId, onClose }) {
    const [state, dispatch] = useEditorState();
    const [loadError, setLoadError] = useState(null);
    const playerRef = useRef(null);

    const framingUrl = clip.framing_url ? getApiUrl(clip.framing_url) : null;
    const sourceUrl = clip.source_url ? getApiUrl(clip.source_url) : null;

    useEffect(() => {
        if (!framingUrl) {
            setLoadError('This clip has no framing data. Reprocess the video to enable editing.');
            return;
        }
        let cancelled = false;
        fetch(framingUrl)
            .then((res) => {
                if (!res.ok) throw new Error(`Failed to load framing data (${res.status})`);
                return res.json();
            })
            .then((framing) => {
                if (cancelled) return;
                if (!framing || !framing.segments || !framing.source) {
                    throw new Error('Framing data is malformed.');
                }
                dispatch({ type: 'LOAD', framing });
            })
            .catch((e) => {
                if (!cancelled) setLoadError(e.message);
            });
        return () => {
            cancelled = true;
        };
    }, [framingUrl, dispatch]);

    const handleBack = useCallback(() => {
        if (state.dirty && !window.confirm('You have unsaved changes. Leave the editor anyway?')) {
            return;
        }
        onClose();
    }, [state.dirty, onClose]);

    // Esc closes (with the same dirty guard)
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') handleBack();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [handleBack]);

    const framing = state.framing;
    const durationInFrames = framing
        ? Math.max(1, Math.round((framing.source.durationFrames / framing.source.fps) * EDITOR_FPS))
        : 1;

    const title =
        clip.video_title_for_youtube_short || `Clip ${typeof index === 'number' ? index + 1 : ''}`;

    return (
        <div className="fixed inset-0 z-[120] bg-background flex flex-col animate-[fadeIn_0.15s_ease-out]">
            <EditorTopBar
                title={title}
                dirty={state.dirty}
                onBack={handleBack}
            />

            {loadError ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted p-8 text-center">
                    <AlertCircle size={28} className="text-red-400" />
                    <p className="text-sm max-w-md">{loadError}</p>
                </div>
            ) : !framing ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted">
                    <Loader2 size={28} className="animate-spin" />
                    <p className="text-sm">Loading editor…</p>
                </div>
            ) : (
                <>
                    <div className="flex-1 flex min-h-0">
                        {/* Canvas */}
                        <div className="flex-1 min-w-0 bg-canvas flex items-center justify-center p-6">
                            <EditorCanvas
                                ref={playerRef}
                                sourceUrl={sourceUrl}
                                framing={framing}
                                durationInFrames={durationInFrames}
                            />
                        </div>

                        {/* Tool rail */}
                        <LayoutPanel
                            framing={framing}
                            selectedIds={state.selectedIds}
                            dispatch={dispatch}
                        />
                    </div>

                    <EditorTimeline
                        framing={framing}
                        playerRef={playerRef}
                        selectedIds={state.selectedIds}
                        onSelect={(id, multi) => dispatch({ type: 'SELECT', id, multi })}
                    />
                </>
            )}
        </div>
    );
}
