(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MarkovPricing = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const bands = [
    { max: 1900, price: 6300 },
    { max: 2500, price: 6800 },
    { max: 3000, price: 7250 },
    { max: 3500, price: 7500 },
    { max: 3800, price: 8300 },
    { max: 4200, price: 9000 },
    { max: 5500, price: 9500 },
  ];

  function basePrice(weight) {
    if (!Number.isInteger(weight) || weight <= 0 || weight > 5500) return null;
    return bands.find((band) => weight <= band.max).price;
  }

  function quote(weight, extras) {
    const base = basePrice(weight);
    if (base === null) return null;
    const options = (extras.embroidery ? 400 : 0) + (extras.hat ? 300 : 0) + (extras.bow ? 200 : 0);
    const total = base + options;
    return { base, options, total, deposit: total * 0.3, balance: total * 0.7 };
  }

  return { bands, basePrice, quote };
});
