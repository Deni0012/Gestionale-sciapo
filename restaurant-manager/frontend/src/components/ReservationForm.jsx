import { useState } from "react";

function ReservationForm({ onAdd }) {
    const [reservation, setReservation] = useState({
        date: "",
        time: "",
        customer: "",
        phone: "",
        people: "",
        room: "Sala",
        table: "",
        notes: "",
    });

    function handleChange(e) {
        setReservation({
            ...reservation,
            [e.target.name]: e.target.value,
        });
    }

    function handleSubmit(e) {
        e.preventDeafult();

        console.log(reservation);
    }
}