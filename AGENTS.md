<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep race probability and automatic camera rules in browser-safe race helpers with concrete unit tests so the animation loop shares tested behavior.
- Play optional uploaded race audio through a browser-only Web Audio controller unlocked by a user gesture; cancel pending and active state loops when their animation ends.
- Bundle media as direct file imports (e.g. `@/assets/x.mp3`), never `/__l5e` asset pointers, because the app is self-hosted on Vercel where Lovable's asset CDN paths do not exist.
- Use native horizontal track scrolling; user gestures pause automatic following until explicitly resumed.
- Mid-race rubber-banding uses the elastic helpers in src/lib/race.ts (1s tick, gap-scaled chance, post-animation immunity, false hope, pile-ups, reverse boosts) so rules stay unit-tested.
- On phones the race always plays sideways (ask the device to rotate, fall back to drawing the stage rotated) and the track is uniformly scaled to fit the screen height; keep those pure helpers in src/lib/landscape.ts unit-tested so the layout rules stay checkable.
