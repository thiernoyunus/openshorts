import React, { forwardRef, useMemo } from 'react';
import { Player } from '@remotion/player';
import { ShortVideo } from '../../remotion/compositions/ShortVideo';
import TrackerOverlay from './TrackerOverlay';

export const EDITOR_FPS = 30;

/**
 * The 9:16 preview canvas: a Remotion Player running the exact ShortVideo
 * composition the export uses, fed the live (possibly edited) framing config.
 */
const EditorCanvas = forwardRef(function EditorCanvas(
    { sourceUrl, framing, subtitles = null, durationInFrames, trackerOn = false, dispatch },
    playerRef
) {
    const inputProps = useMemo(
        () => ({
            videoUrl: '',
            sourceVideoUrl: sourceUrl,
            framing,
            durationInFrames,
            fps: EDITOR_FPS,
            width: 1080,
            height: 1920,
            subtitles,
            hook: null,
            effects: null,
        }),
        [sourceUrl, framing, subtitles, durationInFrames]
    );

    return (
        <div className="relative h-full aspect-[9/16] rounded-xl overflow-hidden border border-edge bg-black shadow-2xl">
            <Player
                ref={playerRef}
                component={ShortVideo}
                inputProps={inputProps}
                durationInFrames={durationInFrames}
                fps={EDITOR_FPS}
                compositionWidth={1080}
                compositionHeight={1920}
                style={{ width: '100%', height: '100%' }}
                clickToPlay={false}
                spaceKeyToPlayOrPause={false}
            />
            {trackerOn && (
                <TrackerOverlay playerRef={playerRef} framing={framing} dispatch={dispatch} />
            )}
        </div>
    );
});

export default EditorCanvas;
