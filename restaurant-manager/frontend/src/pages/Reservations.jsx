import { useEffect, useState } from "react";
import api from "../services/api";
import ReservationForm from "../components/ReservationForm";
import "./Reservations.css";

function formatItalianDate(value) {
    if (!value) return "";

    const normalizedValue = value.slice(0, 10);
    const [year, month, day] = normalizedValue.split("-");

    return `${day}/${month}/${year}`;
}

function getStatusLabel(status) {
    const labels = {
        booked: "Prenotata",
        confirmed: "Cliente arrivato",
        completed: "Terminata",
        cancelled: "Annullata",
    };

    return labels[status] || "Prenotata";
}

function Reservations() {
    const [reservations, setReservations] = useState([]);
    const [editingReservation, setEditingReservation] =
        useState(null);
    const [loading, setLoading] = useState(true);

    async function loadReservations() {
        try {
            setLoading(true);

            const response = await api.get("/reservations");
            setReservations(response.data);
        } catch (error) {
            console.error(
                "Errore caricamento prenotazioni:",
                error
            );

            alert("Errore nel caricamento delle prenotazioni.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadReservations();
    }, []);

    async function addReservation(payload) {
        try {
            await api.post("/reservations", payload);
            await loadReservations();
        } catch (error) {
            console.error("Errore salvataggio:", error);

            alert(
                error.response?.data?.message ||
                "Errore nel salvataggio della prenotazione."
            );

            throw error;
        }
    }

    async function updateReservation(id, payload) {
        try {
            await api.put(`/reservations/${id}`, payload);

            setEditingReservation(null);
            await loadReservations();
        } catch (error) {
            console.error("Errore modifica:", error);

            alert(
                error.response?.data?.message ||
                "Errore durante la modifica della prenotazione."
            );

            throw error;
        }
    }

    async function deleteReservation(id) {
        const confirmed = window.confirm(
            "Vuoi eliminare definitivamente questa prenotazione?"
        );

        if (!confirmed) return;

        try {
            await api.delete(`/reservations/${id}`);

            if (editingReservation?.id === id) {
                setEditingReservation(null);
            }

            await loadReservations();
        } catch (error) {
            console.error("Errore eliminazione:", error);

            alert(
                error.response?.data?.message ||
                "Errore durante l'eliminazione della prenotazione."
            );
        }
    }

    function startEditing(reservation) {
        setEditingReservation(reservation);

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    }

    return (
        <div className="dashboard reservations-page">
            <ReservationForm
                onAdd={addReservation}
                onUpdate={updateReservation}
                editingReservation={editingReservation}
                onCancelEdit={() => setEditingReservation(null)}
            />

            <section className="reservations-section">
                <div className="reservations-heading">
                    <div>
                        <h2>Prenotazioni</h2>

                        <p>
                            {reservations.length}{" "}
                            {reservations.length === 1
                                ? "prenotazione presente"
                                : "prenotazioni presenti"}
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="reservations-message">
                        Caricamento prenotazioni...
                    </div>
                ) : reservations.length === 0 ? (
                    <div className="reservations-message">
                        Nessuna prenotazione presente.
                    </div>
                ) : (
                    <div className="reservation-list">
                        {reservations.map((reservation) => {
                            const fullName = [
                                reservation.first_name,
                                reservation.last_name,
                            ]
                                .filter(Boolean)
                                .join(" ");

                            const selectedTables = Array.isArray(
                                reservation.tables
                            )
                                ? reservation.tables
                                : [];

                            return (
                                <article
                                    className="card reservation-card"
                                    key={reservation.id}
                                >
                                    <div className="reservation-card-header">
                                        <div>
                                            <span className="reservation-number">
                                                Prenotazione #{reservation.id}
                                            </span>

                                            <h3>
                                                {fullName || "Cliente senza nome"}
                                            </h3>
                                        </div>

                                        <span
                                            className={`reservation-status status-${reservation.status}`}
                                        >
                                            {getStatusLabel(reservation.status)}
                                        </span>
                                    </div>

                                    <div className="reservation-details">
                                        <p>
                                            <strong>📅 Data:</strong>{" "}
                                            {formatItalianDate(reservation.date)}
                                        </p>

                                        <p>
                                            <strong>🕒 Orario:</strong>{" "}
                                            {reservation.time?.slice(0, 5)}
                                        </p>

                                        <p>
                                            <strong>👥 Coperti:</strong>{" "}
                                            {reservation.people}
                                        </p>

                                        <p>
                                            <strong>🏠 Zona:</strong>{" "}
                                            {reservation.room}
                                        </p>

                                        <p className="reservation-tables-row">
                                            <strong>🍽️ Tavoli:</strong>{" "}
                                            {selectedTables.length > 0
                                                ? selectedTables.join(", ")
                                                : "Non assegnati"}
                                        </p>

                                        <p>
                                            <strong>📞 Telefono:</strong>{" "}
                                            {reservation.phone ||
                                                "Non disponibile"}
                                        </p>
                                    </div>

                                    {reservation.notes && (
                                        <div className="reservation-notes">
                                            <strong>📝 Note</strong>
                                            <p>{reservation.notes}</p>
                                        </div>
                                    )}

                                    <div className="buttons reservation-actions">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                startEditing(reservation)
                                            }
                                        >
                                            Modifica
                                        </button>

                                        <button
                                            type="button"
                                            className="delete-button"
                                            onClick={() =>
                                                deleteReservation(reservation.id)
                                            }
                                        >
                                            Elimina
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}

export default Reservations;