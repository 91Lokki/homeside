# Quiet Currents — the home-base ambiance

*An algorithmic philosophy for the generative field behind the mascot, and for
the seeded variation that makes every team's mascot its own.*

## The movement

**Quiet Currents** is about presence without demand. A home base should feel
*inhabited* — gently breathing, never still, never loud. The screen stays
gallery-white; the life lives in motion you only notice when you stop to look.
This is the opposite of a dashboard's insistence. It is a window onto weather, not
a feed.

The aesthetic rejects spectacle. No bursts, no particles racing, no color
demanding attention. Instead: hundreds of near-invisible motes drifting along a
slow, seeded value-noise field, each leaving a whisper-thin trail that is always
fading back toward the canvas. The field is laminar by design — the noise drives a
narrow angular range so currents flow rather than scribble. What emerges is a calm
texture, like dust in a sunbeam or sediment turning in still water.

## How it expresses through code

The field is a 2D value-noise lattice, seeded from the team's three-letter code,
sampled per mote each frame to produce a flow angle. Motes advance a fraction of a
pixel per frame; the canvas is washed with a translucent rectangle of the
background color so trails decay continuously. Density scales with viewport area;
opacity sits near the threshold of perception. A small fraction of motes carry the
team's color at a fraction more alpha — the only color, and barely. The same seed
always yields the same drift, so a team's home base has a stable, ownable mood.

The mascot shares this seeded logic. Its body proportions, ears, markings, eye
spacing and crest are all drawn from the team's seed — the same code, the same
creature, every visit — while differing from every other team's. Growth is gentle
and structural: scale, warmth of color, and a single soft aura at deep bond. Never
a pile of accessories. The craft is in restraint: every parameter tuned so the
result reads as calm company, not decoration.

## Honoring reduced motion

Motion is never load-bearing. Under `prefers-reduced-motion`, the field renders a
single settled frame and stops; the mascot's idle breathing and blink halt. The
meaning — bond level, mood, record — is always carried by shape and number, never
by animation.
