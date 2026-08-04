const test = require("node:test");
const assert = require("node:assert/strict");
const { createItem, calculateStats, normalizeIsbn } = require("../app.js");

test("createItem uses defaults and keeps provided values", () => {
  const item = createItem({ title: "Dune", type: "book", rating: 5 });
  assert.equal(item.type, "book");
  assert.equal(item.title, "Dune");
  assert.equal(item.rating, 5);
});

test("calculateStats summarizes the collection", () => {
  const items = [
    createItem({ title: "Dune", type: "book", rating: 5, pages: 412 }),
    createItem({ title: "Watchmen", type: "comic", rating: 4, pages: 336 }),
    createItem({ title: "1984", type: "book", rating: 3, pages: 328 })
  ];
  const stats = calculateStats(items);
  assert.equal(stats.books, 2);
  assert.equal(stats.comics, 1);
  assert.equal(stats.avgRating, "4.0");
  assert.equal(stats.totalPages, 1076);
});

test("normalizeIsbn cleans the scanned code", () => {
  assert.equal(normalizeIsbn("9781234567897"), "9781234567897");
  assert.equal(normalizeIsbn("978-1-23-456789-7"), "9781234567897");
});
