import { useReducer } from 'react';

/**
 * Editor state: the framing config being edited (docs/video-editor-plan.md §2),
 * the selected segment ids, and a dirty flag for unsaved changes.
 */
export const editorReducer = (state, action) => {
    switch (action.type) {
        case 'LOAD':
            return { framing: action.framing, selectedIds: [], dirty: false };
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
            return { ...state, framing: { ...state.framing, segments }, dirty: true };
        }
        case 'SET_TRACKED_FACES': {
            const segments = state.framing.segments.map((s) =>
                s.id === action.segmentId ? { ...s, trackedFaceIds: action.faceIds } : s
            );
            return { ...state, framing: { ...state.framing, segments }, dirty: true };
        }
        case 'SET_MANUAL_CROP': {
            const segments = state.framing.segments.map((s) =>
                s.id === action.segmentId ? { ...s, manualCrop: action.crop } : s
            );
            return { ...state, framing: { ...state.framing, segments }, dirty: true };
        }
        case 'MARK_SAVED':
            return { ...state, dirty: false };
        default:
            return state;
    }
};

export default function useEditorState() {
    return useReducer(editorReducer, { framing: null, selectedIds: [], dirty: false });
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
