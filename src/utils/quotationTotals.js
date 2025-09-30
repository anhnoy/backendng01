function safeNum(n, d = 0) {
  const x = Number(n);
  return Number.isFinite(x) ? x : d;
}

function computeTotals(input) {
  const adults = safeNum(input.adults);
  const children = safeNum(input.children);
  const infants = safeNum(input.infants);
  const pricePerAdult = safeNum(input.pricePerAdult);
  const pricePerChild = safeNum(input.pricePerChild);
  const pricePerInfant = safeNum(input.pricePerInfant);

  const travelerTotal = adults * pricePerAdult + children * pricePerChild + infants * pricePerInfant;

  const adultRooms = safeNum(input.adultRooms);
  const childRooms = safeNum(input.childRooms);
  const adultRoomPrice = safeNum(input.adultRoomPrice);
  const childRoomPrice = safeNum(input.childRoomPrice);
  const roomTotal = adultRooms * adultRoomPrice + childRooms * childRoomPrice;

  let flightTotal = 0;
  const flightIncluded = !!input.flightIncluded;
  if (flightIncluded) {
    const flightAdultPrice = safeNum(input.flightAdultPrice);
    const flightChildPrice = safeNum(input.flightChildPrice);
    const flightInfantType = input.flightInfantType || '';
    const flightInfantSeatPrice = safeNum(input.flightInfantSeatPrice);
    const flightInfantLapPrice = safeNum(input.flightInfantLapPrice);
    flightTotal += adults * flightAdultPrice + children * flightChildPrice;
    if (infants > 0) {
      if (flightInfantType === 'seat') flightTotal += infants * flightInfantSeatPrice;
      else if (flightInfantType === 'lap') flightTotal += infants * flightInfantLapPrice;
    }
  }

  const totalFoodPrice = safeNum(input.totalFoodPrice);
  const packagePrice = safeNum(input.packagePrice);
  const subtotal = travelerTotal + roomTotal + flightTotal + totalFoodPrice + packagePrice;
  const discountPercent = Math.min(100, Math.max(0, safeNum(input.discountPercent)));
  const discountAmount = subtotal * (discountPercent / 100);
  const additionalCost = safeNum(input.additionalCost);
  const finalPrice = subtotal - discountAmount + additionalCost;

  return {
    travelerTotal,
    roomTotal,
    flightTotal,
    subtotal,
    discountAmount,
    finalPrice,
    currency: input.currency || 'THB'
  };
}

module.exports = { computeTotals };
