import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { Video } from "@remotion/media";
import type { FramingConfig } from "../lib/types";
import { sourceToOutput } from "../lib/edl";

/**
 * B-roll inserts: full-canvas stock/AI footage covering the original video
 * during a span. Times stored in SOURCE frames, EDL-mapped onto the output
 * timeline; each clip plays from its own start via a Sequence. Muted (the
 * clip's own audio keeps playing underneath). Above the reframe, below text
 * and captions.
 */
export const BrollLayer: React.FC<{ framing: FramingConfig }> = ({
  framing,
}) => {
  const { fps } = useVideoConfig();
  const items = framing.broll ?? [];
  if (items.length === 0) return null;

  return (
    <AbsoluteFill>
      {items.map((b) => {
        const start = sourceToOutput(framing, b.startFrame, fps, true);
        const end = sourceToOutput(framing, b.endFrame, fps);
        if (start === null || end === null || end <= start) return null;
        return (
          <Sequence
            key={b.id}
            from={start}
            durationInFrames={end - start}
            layout="none"
          >
            <AbsoluteFill style={{ backgroundColor: "#000" }}>
              <Video
                src={b.url}
                muted
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
