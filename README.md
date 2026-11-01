# Decision Derby

Build a decision maker horse race game:
- The user can enter up to 5 inputs (choices to decide between, replacing a random wheel spinner).
- A horse is generated for each choice (up to 5) and they race in their own lanes to the finish line. The winning horse is the chosen decision.
- Visual style: Cartoon/illustrated look.
- Animated horses: Each horse has a running animation.
- Dynamic surprise status effects mid-race: Random surprise events occur while running that change horse states and speeds (e.g., drunk where it stumbles or runs backwards, old/tired running very slow, turbo/boost sprint, normal gallop). A horse changes state dynamically during the race so positions shift.
- Pre-race sequence: Before the race begins, the camera transitions/pans smoothly from the finish line back to the starting gates, a countdown displays, the gates open, and the race begins.
- Display the choices at the side of the horse/lanes so the labels don't obstruct or affect the horse artwork and animation.
- Finish line celebration and podium declaring the winning choice with an option to race again or edit choices.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/209fcd71-b40d-42d5-8f7c-af171bdd01e8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
