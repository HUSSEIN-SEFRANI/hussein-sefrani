// لعبة المزارع — المحاصيل والحيوانات والزينة (الأسماء في i18n.js)
// buy: سعر الشراء · sell: سعر البيع · t: وقت النمو أو الإنتاج بالثواني · need: عدد قطع الأرض اللازمة لفتحه
window.FD = {
  COLS: 10, ROWS: 6,
  START_COINS: 24,
  START_PLOTS: [[3, 2], [4, 2], [5, 2], [3, 3], [4, 3], [5, 3], [3, 4], [4, 4], [5, 4]], // [عمود، صف]
  landPrice: (owned) => 10 + 5 * Math.max(0, owned - 9),
  CROPS: [
    { id: "corn", e: "🌽", buy: 4, sell: 10, t: 30, need: 0 },
    { id: "clover", e: "☘️", buy: 2, sell: 6, t: 20, need: 0, afterHarvest: true },
    { id: "wheat", e: "🌾", buy: 6, sell: 15, t: 45, need: 12 },
    { id: "carrot", e: "🥕", buy: 8, sell: 20, t: 60, need: 15 },
    { id: "tomato", e: "🍅", buy: 10, sell: 25, t: 75, need: 18 },
    { id: "strawberry", e: "🍓", buy: 14, sell: 34, t: 90, need: 22 },
    { id: "sunflower", e: "🌻", buy: 12, sell: 30, t: 80, need: 26 },
    { id: "watermelon", e: "🍉", buy: 20, sell: 50, t: 120, need: 32 },
    { id: "pumpkin", e: "🎃", buy: 25, sell: 65, t: 150, need: 40 },
  ],
  // الحيوانات تأكل من المخزن وتعطي منتجاً يُباع في السوق
  ANIMALS: [
    { id: "chicken", e: "🐔", buy: 40, feed: "corn", gives: "egg", t: 40, need: 12 },
    { id: "sheep", e: "🐑", buy: 80, feed: "clover", gives: "wool", t: 60, need: 15 },
    { id: "cow", e: "🐄", buy: 120, feed: "clover", gives: "milk", t: 60, need: 18 },
  ],
  PRODUCTS: [
    { id: "egg", e: "🥚", sell: 15 },
    { id: "wool", e: "🧶", sell: 26 },
    { id: "milk", e: "🥛", sell: 36 },
  ],
  DECOR: [
    { id: "flowers", e: "🌷", buy: 8 },
    { id: "mushroom", e: "🍄", buy: 10 },
    { id: "rock", e: "🪨", buy: 10 },
    { id: "balloon", e: "🎈", buy: 15 },
    { id: "pine", e: "🌲", buy: 20 },
    { id: "tree", e: "🌳", buy: 25 },
    { id: "lantern", e: "🏮", buy: 30 },
    { id: "duck", e: "🦆", buy: 40 },
    { id: "cat", e: "🐈", buy: 60 },
    { id: "dog", e: "🐕", buy: 70 },
    { id: "hut", e: "🛖", buy: 100 },
    { id: "fountain", e: "⛲", buy: 120 },
    { id: "house", e: "🏡", buy: 150 },
    { id: "tractor", e: "🚜", buy: 200 },
  ],
  AVATARS: ["👩‍🌾", "👨‍🌾", "🧑‍🌾", "👧", "👦", "🧒"],
  COLORS: ["#f59e0b", "#22c55e", "#3b82f6", "#ec4899", "#8b5cf6", "#ef4444"],
};
