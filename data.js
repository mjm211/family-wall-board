/*
  Family Wall Board: sample data for the prototype.

  Everything the board shows comes from this one file, so it is the only
  place to edit when trying things out. Later, the calendar link and the
  voice connector will fill this in instead.

  Sunday to Tuesday come from Bryce's paper planner. The rest is made up
  so every screen has something to show.
*/
window.BOARD_DATA = {
  settings: {
    // Placeholder times (24-hour clock). Change them here.
    times: {
      morningStart: "07:20", // kid morning mode begins
      morningEnd: "08:30",   // back to the planner
      kidFoodAway: "08:30",  // today's breakfast and lunch box slides away
      menuStart: "17:00",    // menu mode begins
      bedtimeStart: "19:00", // kid bedtime mode begins
      bedtimeEnd: "20:00",   // back to the planner
      eveningStart: "18:00", // screen turns warmer and dimmer
      sleepStart: "23:00",   // screen goes dark
      sleepEnd: "06:00"
    },
    photoSeconds: 15
  },

  kids: [
    { id: "briggs", name: "Briggs", character: "🦖", color: "#2b7de9", soft: "#e3efff", dark: "#174a94" },
    { id: "lark",   name: "Lark",   character: "🐥", color: "#ee7a1f", soft: "#fff0dc", dark: "#9c4508" }
  ],

  routines: {
    morning: [
      { id: "potty",     pic: "🚽", word: "Potty" },
      { id: "teeth",     pic: "🪥", word: "Teeth" },
      { id: "dressed",   pic: "👕", word: "Dressed" },
      { id: "breakfast", pic: "🥣", word: "Breakfast" },
      { id: "shoes",     pic: "👟", word: "Shoes" }
    ],
    bedtime: [
      { id: "pjs",        pic: "👚", word: "PJs" },
      { id: "toothbrush", pic: "🪥", word: "Toothbrush" },
      { id: "floss",      pic: "🦷", word: "Floss" }
    ]
  },

  // One entry per weekday, Sunday first.
  // mom.status is "home", "work" or "sleep" (sleeping after a night shift).
  week: [
    { // Sunday
      mom: { status: "home" },
      breakfast: "Pancakes and yogurt", lunch: "Grilled cheese",
      dinner: { dish: "Burgers, tots and toast" },
      events: []
    },
    { // Monday
      mom: { status: "work", shift: "7a-5p PARC" },
      breakfast: "Oatmeal and berries", lunch: "Turkey roll-ups",
      dinner: { dish: "Leftovers", note: "pizza, mac and cheese" },
      events: []
    },
    { // Tuesday
      mom: { status: "work", shift: "7a-5p PARC" },
      star: "Library book",
      breakfast: "Eggs and toast", lunch: "PB&J and apple slices",
      dinner: { vote: [{ name: "Pasta", pic: "🍝" }, { name: "Rice + chicken", pic: "🍚" }] },
      events: [
        { time: "10:40", what: "Roo" },
        { time: "6:30", what: "Bball (Millys driving)" }
      ]
    },
    { // Wednesday
      mom: { status: "home" },
      breakfast: "Yogurt and granola", lunch: "Quesadillas",
      dinner: { dish: "Tacos", recipe: "https://example.com/tacos" },
      events: [{ time: "4:00", what: "Swim lessons" }]
    },
    { // Thursday
      mom: { status: "work", shift: "7p-7a PARC" },
      star: "Show and tell",
      breakfast: "Waffles", lunch: "Ham sandwich",
      dinner: { dish: "Thai takeout" },
      events: [{ time: "3:15", what: "Dentist (Briggs)" }]
    },
    { // Friday
      mom: { status: "sleep" },
      breakfast: "Cereal and banana", lunch: "Pasta salad",
      dinner: { dish: "Homemade pizza" },
      events: [{ time: "5:30", what: "Movie night" }]
    },
    { // Saturday
      mom: { status: "home" },
      breakfast: "French toast", lunch: "Leftover pizza",
      dinner: { dish: "Chili and cornbread" },
      events: [
        { time: "9:00", what: "Soccer" },
        { time: "2:00", what: "Birthday party" }
      ]
    }
  ],

  groceries: [
    { group: "Dinner prep & fresh ingredients", items: ["Ground beef", "Taco shells", "Pizza dough", "Chicken thighs"] },
    { group: "Kids breakfast, lunch & snacks", items: ["Yogurt tubes", "Pancake mix", "Apple sauce pouches"] },
    { group: "Produce, dairy & staples", items: ["Milk", "Bananas", "Eggs", "Shredded cheese"] }
  ],

  // The board counts down to the next one, then moves on. Add birthdays here.
  countdowns: [
    { name: "Thanksgiving", pic: "🦃", date: "2026-11-26" },
    { name: "Christmas", pic: "🎄", date: "2026-12-25" },
    { name: "New Year's Day", pic: "🎉", date: "2027-01-01" },
    { name: "Valentine's Day", pic: "💌", date: "2027-02-14" },
    { name: "Easter", pic: "🐣", date: "2027-03-28" }
  ],

  // Drop real photos in the photos folder and list them here.
  // Wide (landscape) photos fit the frame best.
  photos: ["photos/family-1.jpg", "photos/sample-1.svg", "photos/sample-2.svg"]
};
