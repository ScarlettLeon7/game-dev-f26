# Catacomb II — peer playtest review

**Date:** November 1, 2026

**Play observed:** My first playthrough lasted 1 minute 35 seconds and reached 3/3 flags. I then replayed twice to try the movement and shooting controls. The second playthrough took about 2 minutes while I explored shooting directions. The third duration and total session time were not recorded.

**Browser:** Chrome. Device and play mode were not recorded.

**Agent viewing:** I watched an agent recording, but did not record which version. The specific observation below comes from a separate Codex-assisted inspection of the current hybrid recording.

## What worked well

The objective of capturing the three red flags was clear. The side panel with labeled controls and the explicit start/end screens made the interface easy to understand. I reached all three flags during my first playthrough.

## What was confusing

When fighting moving monsters, I was unsure whether particular enemies required particular weapons. Normal shots, bolts and nukes were available, but I did not understand their differences well enough to choose deliberately. I tried the available weapons to defeat enemies. A short explanation of each weapon’s purpose would help. Can every enemy be defeated with normal shots, and when should I use bolts or nukes?

## Combat experience and suggested improvement

While moving left with a monster approaching from the right, I wanted to shoot right without moving toward it. On replay, I tried Shift + movement. It does let me move and shoot in different directions, but I first have to face my target, hold Shift to lock that direction, and then move elsewhere. Against a moving enemy, that preparation felt awkward.

Consider an optional way to aim independently of movement, such as aiming toward the mouse cursor. This would let me adjust my shots while retreating. The existing facing-lock control works, so this is a usability preference rather than a bug.

## Agent recording and technical limits

In the [current hybrid recording, around 3:22](https://catacomb-peer-playtest.demonrain777.chatgpt.site/hybrid-escape.mp4#t=202), the flag counter shows 3/3 and the exits are open. The model selects the exit goal, and the following scripted steps move toward the gate. This is a sensible shift from collecting objectives to finishing the level. The separate model-choice and scripted-step labels make that division clear. Showing the other available goals alongside the selected one would make its prioritization easier to evaluate.

This demonstrates a successful hybrid run, with Gemini selecting goals and scripted skills handling movement and combat. It does not establish reliable performance across maps or Gemini’s ability to aim and move directly. The playback also states that its timing is adjusted, so it should not be treated as a demonstration of live response speed.

The recording and public evidence sheet were inspected with Codex assistance. Held-out validation, invalid-action handling, information boundaries, timeouts and budgets were not independently verified. No tests or raw traces were rerun.

## Bugs and availability

I did not notice gameplay bugs or access problems during the completed playthroughs. Before playing, I had encountered a message asking the host to reconnect, so availability appeared to depend on the author’s host being online.

My gameplay observations were organized and edited with Codex. The agent-recording observations are from the separate assisted inspection identified above. No additional human play experience or code-level verification is claimed.
