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
- Generate optional race audio through a browser-only Web Audio controller, initialized by a user gesture, to avoid asset downloads and autoplay failures.
- Use native horizontal track scrolling; user gestures pause automatic following until explicitly resumed.
