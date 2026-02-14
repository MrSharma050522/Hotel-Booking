import { useState, useEffect } from "react";
import "./App.css";

const API_URL = "/api";

function App() {
  const [rooms, setRooms] = useState([]);
  const [numRooms, setNumRooms] = useState(1);
  const [bookedRooms, setBookedRooms] = useState([]);
  const [travelTime, setTravelTime] = useState(0);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch rooms on mount
  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await fetch(`${API_URL}/rooms`);
      const data = await res.json();
      setRooms(data);
      setBookedRooms([]);
      setTravelTime(0);
      setMessage("");
    } catch (err) {
      setMessage("Error connecting to server");
    }
  };

  const handleBook = async () => {
    if (numRooms < 1 || numRooms > 5) {
      setMessage("Please enter 1-5 rooms");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numRooms }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Booking failed");
        setBookedRooms([]);
        setTravelTime(0);
      } else {
        setBookedRooms(data.booked);
        setTravelTime(data.travelTime);
        setMessage(`Successfully booked ${numRooms} room(s)!`);
        // Refresh rooms to show updated state
        fetchRooms();
      }
    } catch (err) {
      setMessage("Error booking rooms");
    }
    setLoading(false);
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      await fetch(`${API_URL}/reset`, { method: "POST" });
      setMessage("All bookings reset");
      fetchRooms();
    } catch (err) {
      setMessage("Error resetting");
    }
    setLoading(false);
  };

  const handleRandom = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/random`, { method: "POST" });
      const data = await res.json();
      setMessage(data.message);
      fetchRooms();
    } catch (err) {
      setMessage("Error generating random occupancy");
    }
    setLoading(false);
  };

  // Group rooms by floor
  const floors = {};
  rooms.forEach((room) => {
    if (!floors[room.floor]) floors[room.floor] = [];
    floors[room.floor].push(room);
  });

  return (
    <div className="app">
      <div className="stats">
        <p>Total Rooms: 97</p>
        <p>Available: {rooms.filter((r) => !r.booked).length}</p>
        <p>Booked: {rooms.filter((r) => r.booked).length}</p>
      </div>
      {/* Controls */}
      <div className="controls">
        <div className="control-group">
          <label>Number of Rooms (1-5):</label>
          <input
            type="number"
            min="1"
            max="5"
            value={numRooms}
            onChange={(e) => setNumRooms(parseInt(e.target.value) || 1)}
          />
          <button onClick={handleBook} disabled={loading}>
            {loading ? "Processing..." : "Book Rooms"}
          </button>
        </div>

        <div className="control-group">
          <button onClick={handleRandom} disabled={loading}>
            Random Occupancy
          </button>
          <button onClick={handleReset} disabled={loading}>
            Reset All
          </button>
        </div>

        {message && <div className="message">{message}</div>}

        {bookedRooms.length > 0 && (
          <div className="booking-info">
            <h3>Last Booking:</h3>
            <p>Rooms: {bookedRooms.map((r) => r.number).join(", ")}</p>
            <p>Travel Time: {travelTime} minutes</p>
          </div>
        )}
      </div>

      {/* Building Visualization */}
      <div className="building">
        {/* <div className="stairs">🚶</div> */}
        {Object.entries(floors)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .map(([floorNum, floorRooms]) => (
            <div key={floorNum} className="floor">
              <div className="floor-label">Floor {floorNum}</div>
              <div className="rooms">
                {floorRooms
                  .sort((a, b) => a.number - b.number)
                  .map((room) => (
                    <div
                      key={room.number}
                      className={`room ${room.booked ? "booked" : "available"} ${
                        bookedRooms.some((br) => br.number === room.number)
                          ? "just-booked"
                          : ""
                      }`}
                      title={`Room ${room.number} - ${room.booked ? "Booked" : "Available"}`}
                    >
                      {room.number}
                    </div>
                  ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

export default App;
