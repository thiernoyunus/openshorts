import { useReducer } from 'react';
import { cropForFace, smoothedFaceRect } from '../../remotion/compositions/ReframedVideo';

const HISTORY_LIMIT = 50;

/**
 * Editor state: the framing config being edited (docs/video-editor-plan.md §2),
 * the selected segment ids, a dirty flag for unsaved changes, and an
 * undo/redo history of framing snapshots (framing is immutable, so snapshots
 * are cheap references).
 */
export const editorReducer = (state, action) => {
    // Mutating actions snapshot the current framing for undo
    const withHistory = (framing) => ({
        ...state,
        framing,
        dirty: true,
        past: [...state.past.slice(-HISTORY_LIMIT + 1), state.framing],
        future: [],
    });

    switch (action.type) {
        case 'LOAD':
            return { framing: action.framing, selectedIds: [], dirty: false, past: [], future: [] };
        case 'SELECT': {
            const { id, multi } = action;
            if (!multi) return { ...state, selectedIds: [id] };
            const has = state.selectedIds.includes(id);
            return {
                ...state,
                selectedIds: has
                    ? state.selectedIds.filter((s) => s !== id)
                    : [...state.selectedIds, id],
            };
        }
        case 'SET_LAYOUT': {
            // Applies to every selected segment; switching layout clears any
            // manual crop (it belongs to the previous framing decision)
            const segments = state.framing.segments.map((s) =>
                state.selectedIds.includes(s.id)
                    ? { ...s, layout: action.layout, manualCrop: null }
                    : s
            );
            return withHistory({ ...state.framing, segments });
        }
        case 'SET_TRACKED_FACES': {
            const segments = state.framing.segments.map((s) =>
                s.id === action.segmentId
                    ? {
                          ...s,
                          trackedFaceIds: action.faceIds,
                          // For fill layouts the composition follows cameraKeyframes,
                          // so changing the tracked person supplies regenerated ones
                          ...(action.cameraKeyframes
                              ? { cameraKeyframes: action.cameraKeyframes }
                              : {}),
                      }
                    : s
            );
            return withHistory({ ...state.framing, segments });
        }
        case 'SET_MANUAL_CROP': {
            const segments = state.framing.segments.map((s) =>
                s.id === action.segmentId ? { ...s, manualCrop: action.crop } : s
            );
            return withHistory({ ...state.framing, segments });
        }
        case 'UNDO': {
            if (state.past.length === 0) return state;
            const previous = state.past[state.past.length - 1];
            return {
                ...state,
                framing: previous,
                dirty: true,
                past: state.past.slice(0, -1),
                future: [state.framing, ...state.future],
            };
        }
        case 'REDO': {
            if (state.future.length === 0) return state;
            const [next, ...rest] = state.future;
            return {
                ...state,
                framing: next,
                dirty: true,
                past: [...state.past, state.framing],
                future: rest,
            };
        }
        case 'MARK_SAVED':
            return { ...state, dirty: false };
        default:
            return state;
    }
};

export default function useEditorState() {
    return useReducer(editorReducer, {
        framing: null,
        selectedIds: [],
        dirty: false,
        past: [],
        future: [],
    });
}

/**
 * Face tracks visible inside a segment, sorted by coverage (how much of the
 * segment they span). Used to decide which multi-person layouts are possible
 * and to offer panel assignments. Samples are recorded every ~2 source frames.
 */
export function tracksInSegment(framing, segment) {
    if (!framing || !segment) return [];
    const segLen = Math.max(1, segment.endFrame - segment.startFrame);
    return framing.faceTracks
        .map((t) => {
            const inSeg = t.samples.filter(
                (s) => s.frame >= segment.startFrame && s.frame < segment.endFrame
            );
            return { id: t.id, coverage: inSeg.length / (segLen / 2) };
        })
        .filter((t) => t.coverage > 0.1)
        .sort((a, b) => b.coverage - a.coverage);
}

/** Panels per layout — keep in sync with ReframedVideo.tsx panelsForLayout. */
export const LAYOUT_PANELS = { fill: 1, fit: 1, split: 2, three: 3, four: 4 };

/**
 * Regenerate fill-layout camera keyframes by following one face track through
 * a segment (used when the user picks a different person to track). Mirrors
 * the pipeline's output shape; smoothing comes from smoothedFaceRect.
 */
export function buildFillKeyframes(framing, segment, trackId) {
    const track = framing.faceTracks.find((t) => t.id === trackId);
    if (!track) return [];
    const { width: srcW, height: srcH } = framing.source;
    const keyframes = [];
    for (let frame = segment.startFrame; frame < segment.endFrame; frame += 3) {
        const face = smoothedFaceRect(track, frame);
        if (!face) continue;
        const crop = cropForFace(face, 9 / 16, srcW, srcH);
        keyframes.push({
            frame,
            x: Number(crop.x.toFixed(4)),
            y: Number(crop.y.toFixed(4)),
            w: Number(crop.w.toFixed(4)),
            h: Number(crop.h.toFixed(4)),
        });
    }
    return keyframes;
}

/** Center crop with a given pixel aspect, in normalized coords. */
export function centerCropRect(panelAspect, srcW, srcH) {
    let cropHpx = srcH;
    let cropWpx = cropHpx * panelAspect;
    if (cropWpx > srcW) {
        cropWpx = srcW;
        cropHpx = cropWpx / panelAspect;
    }
    return {
        x: (srcW - cropWpx) / 2 / srcW,
        y: (srcH - cropHpx) / 2 / srcH,
        w: cropWpx / srcW,
        h: cropHpx / srcH,
    };
}
