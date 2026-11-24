# Family Wall Board (prototype)

A clickable mock-up of the family wall board, built to collect feedback before any real wiring is done. It follows the build brief and takes its look from Bryce's paper weekly planner.

Nothing here is connected yet. The calendar, meals and groceries are sample data. Sunday to Tuesday come from the paper planner, and the rest is made up so each screen has something to show.

## How to try it

Open `index.html` in a browser on a laptop or a tablet turned sideways. No install is needed.

The dark bar along the bottom is for testing only and will not be on the real board.

- **Screen buttons** jump straight to a screen: Planner, Morning, Menu, Bedtime, Sleep.
- **By the clock** lets the board pick the screen from the time of day, as the real one will.
- **Pretend it's** changes the time, so you can watch the board switch on its own.
- **Reset taps** clears the kid buttons, dinner votes and grocery ticks.
- **Notes** opens a box for feedback on each screen, with a button to send or copy it.

## Things to tap

- Kid buttons on the Morning and Bedtime screens. Finish both sides for the celebration.
- The Groceries button on the Planner.
- The red Vote chip next to Tuesday's dinner.
- At 6 p.m. and later, the screen turns warmer and dimmer.
- The kids' breakfast and lunch box on Today slides away at 8:30 a.m.

## Changing what it shows

Everything on screen comes from `data.js`: the week, the kid routines, the times each screen starts, the countdown dates and the photo list.

To use real photos, put them in the `photos` folder and list their file names under `photos` in `data.js`.

## Not built yet

The calendar link, the voice connector, sign-in, hosting and tablet setup all come later, per the brief. Taps are saved only in the browser they were made in.
