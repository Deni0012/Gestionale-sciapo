import { useState } from "react";
import ReservationForm from "../components/ReservationForm";

function Reservations() {

    const [reservations, setReservations] = useState([]);

    function addReservation(newReservation) {

        setReservations([
            ...reservations,
            {
                id: Date.now(),
                ...newReservation,
            },
        ]);

    }

    return (
        <div className="dashboard">

            <ReservationForm onAdd={addReservation} />

            <h2 style={{ marginTop: 40 }}>Prenotazioni</h2>

            {reservations.length === 0 && (
                <p>Nessuna prenotazione.</p>
            )}

            {reservations.map((reservation) => (

                <div className="card" key={reservation.id}>

                    <h3>{reservation.customer}</h3>

                    <p>📅 {reservation.date}</p>

                    <p>🕒 {reservation.time}</p>

                    <p>👥 {reservation.people} persone</p>

                    <p>🏠 {reservation.room}</p>

                    <p>🍽 Tavolo {reservation.table}</p>

                    <p>📞 {reservation.phone}</p>

                    <p>{reservation.notes}</p>

                </div>

            ))}

        </div>
    );
}

export default Reservations;