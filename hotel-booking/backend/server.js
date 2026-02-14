const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

// Initialize room state
let rooms = {};

// Initialize rooms
function initRooms() {
  rooms = {};
  for (let floor = 1; floor <= 9; floor++) {
    for (let room = 1; room <= 10; room++) {
      const roomNum = floor * 100 + room;
      rooms[roomNum] = { floor, number: roomNum, booked: false };
    }
  }
  // Floor 10 - 7 rooms only
  for (let room = 1; room <= 7; room++) {
    const roomNum = 1000 + room;
    rooms[roomNum] = { floor: 10, number: roomNum, booked: false };
  }
}

initRooms();

// Get all rooms
app.get("/api/rooms", (req, res) => {
  res.json(Object.values(rooms));
});

// Reset all bookings
app.post("/api/reset", (req, res) => {
  Object.values(rooms).forEach((room) => (room.booked = false));
  res.json({ message: "All bookings reset" });
});

// Generate random occupancy
app.post("/api/random", (req, res) => {
  // Reset first
  Object.values(rooms).forEach((room) => (room.booked = false));

  // Random occupancy 30-70%
  const occupancy = Math.floor(Math.random() * 41) + 30;
  const roomNumbers = Object.keys(rooms);
  const numToBook = Math.floor((roomNumbers.length * occupancy) / 100);

  const toBook = [];
  while (toBook.length < numToBook) {
    const randomRoom =
      roomNumbers[Math.floor(Math.random() * roomNumbers.length)];
    if (!toBook.includes(randomRoom)) {
      toBook.push(randomRoom);
    }
  }

  toBook.forEach((num) => (rooms[num].booked = true));

  res.json({ message: `Random occupancy: ${occupancy}%` });
});

// Book rooms
app.post("/api/book", (req, res) => {
  const { numRooms } = req.body;

  if (numRooms > 5) {
    return res.status(400).json({ error: "Cannot book more than 5 rooms" });
  }

  const available = Object.values(rooms).filter((r) => !r.booked);

  if (available.length < numRooms) {
    return res
      .status(400)
      .json({ error: `Only ${available.length} rooms available` });
  }

  // Find optimal rooms
  const bookedRooms = findOptimalRooms(available, numRooms);

  bookedRooms.forEach((room) => {
    rooms[room.number].booked = true;
  });

  const travelTime = calculateTravelTime(bookedRooms);

  res.json({ booked: bookedRooms, travelTime });
});

function findOptimalRooms(available, numRooms) {
  // Group by floor
  const floors = {};
  available.forEach((room) => {
    if (!floors[room.floor]) floors[room.floor] = [];
    floors[room.floor].push(room);
  });

  // Sort rooms on each floor
  Object.keys(floors).forEach((f) => {
    floors[f].sort((a, b) => a.number - b.number);
  });

  // Try to find same floor first
  for (const floor in floors) {
    if (floors[floor].length >= numRooms) {
      // Find best consecutive rooms on this floor
      let bestOnFloor = null;
      let bestTime = Infinity;

      for (let i = 0; i <= floors[floor].length - numRooms; i++) {
        const candidate = floors[floor].slice(i, i + numRooms);
        const time = calculateTravelTime(candidate);
        if (time < bestTime) {
          bestTime = time;
          bestOnFloor = candidate;
        }
      }

      if (bestOnFloor) return bestOnFloor;
    }
  }

  // Need multiple floors - find floors closest to each other
  const sortedFloors = Object.keys(floors)
    .map(Number)
    .sort((a, b) => a - b);
  let bestCombo = null;
  let bestTime = Infinity;

  // Try each floor as starting point
  for (let i = 0; i < sortedFloors.length; i++) {
    const selected = [];
    let remaining = numRooms;
    let currentFloorIdx = i;

    while (remaining > 0 && currentFloorIdx < sortedFloors.length) {
      const floor = sortedFloors[currentFloorIdx];
      const take = Math.min(remaining, floors[floor].length);
      selected.push(...floors[floor].slice(0, take));
      remaining -= take;
      currentFloorIdx++;
    }

    if (selected.length >= numRooms) {
      const time = calculateTravelTime(selected.slice(0, numRooms));
      if (time < bestTime) {
        bestTime = time;
        bestCombo = selected.slice(0, numRooms);
      }
    }
  }

  return bestCombo || available.slice(0, numRooms);
}

function calculateTravelTime(roomList) {
  if (roomList.length <= 1) return 0;

  const sorted = [...roomList].sort((a, b) => a.number - b.number);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  // Floor travel (2 min per floor)
  const floorTravel = Math.abs(last.floor - first.floor) * 2;

  // Room travel
  let roomTravel = 0;
  if (first.floor === last.floor) {
    roomTravel = last.number - first.number;
  } else {
    const firstRoomPos = first.number % 100 === 0 ? 10 : first.number % 100;
    const lastRoomPos = last.number % 100 === 0 ? 10 : last.number % 100;
    roomTravel = firstRoomPos - 1 + (lastRoomPos - 1);
  }

  return floorTravel + roomTravel;
}

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
