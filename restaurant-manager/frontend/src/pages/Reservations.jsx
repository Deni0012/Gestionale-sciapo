import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import ReservationForm from "../components/ReservationForm";
import "./Reservations.css";

function formatItalianDate(value) {
    if (!value) return "";

    const normalizedValue = value.slice(0, 10);
    const [year, month, day] = normalizedValue.split("-");

    return `${day}/${month}/${year}`;
}

function getToday() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
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

function getFullName(reservation) {
    return [reservation.first_name, reservation.last_name]
        .filter(Boolean)
        .join(" ");
}

function Reservations() {
    const [reservations, setReservations] = useState([]);
    const [editingReservation, setEditingReservation] = useState(null);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");
    const [selectedDate, setSelectedDate] = useState(getToday());
    const [selectedRoom, setSelectedRoom] = useState("all");
    const [selectedStatus, setSelectedStatus] = useState("all");

    async function loadReservations() {
        try {
            setLoading(true);

            const response = await api.get("/reservations");
            setReservations(response.data);
        } catch (error) {
            console.error("Errore caricamento prenotazioni:", error);
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

    async function updateStatus(id, status) {
        try {
            await api.patch(`/reservations/${id}/status`, {
                status,
            });

            await loadReservations();
        } catch (error) {
            console.error("Errore aggiornamento stato:", error);

            alert(
                error.response?.data?.message ||
                "Errore durante l'aggiornamento dello stato."
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

    function clearFilters() {
        setSearch("");
        setSelectedDate(getToday());
        setSelectedRoom("all");
        setSelectedStatus("all");
    }

    const filteredReservations = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        return reservations
            .filter((reservation) => {
                const fullName = getFullName(reservation).toLowerCase();
                const phone = String(reservation.phone || "").toLowerCase();
                const tables = Array.isArray(reservation.tables)
                    ? reservation.tables.join(" ")
                    : "";

                const matchesSearch =
                    !normalizedSearch ||
                    fullName.includes(normalizedSearch) ||
                    phone.includes(normalizedSearch) ||
                    tables.includes(normalizedSearch);

                const reservationDate = reservation.date?.slice(0, 10);

                const matchesDate =
                    !selectedDate || reservationDate === selectedDate;

                const matchesRoom =
                    selectedRoom === "all" ||
                    reservation.room === selectedRoom;

                const matchesStatus =
                    selectedStatus === "all" ||
                    reservation.status === selectedStatus;

                return (
                    matchesSearch &&
                    matchesDate &&
                    matchesRoom &&
                    matchesStatus
                );
            })
            .sort((first, second) => {
                const firstTime = first.time || "";
                const secondTime = second.time || "";

                return firstTime.localeCompare(secondTime);
            });
    }, [
        reservations,
        search,
        selectedDate,
        selectedRoom,
        selectedStatus,
    ]);

    const totalPeople = filteredReservations.reduce(
        (total, reservation) =>
            total + Number(reservation.people || 0),
        0
    );

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
                        <span className="section-eyebrow">
                            Agenda del servizio
                        </span>

                        <h2>Prenotazioni</h2>

                        <p>
                            {filteredReservations.length} prenotazioni ·{" "}
                            {totalPeople} coperti
                        </p>
                    </div>

                    <button
                        type="button"
                        className="refresh-reservations-button"
                        onClick={loadReservations}
                    >
                        Aggiorna
                    </button>
                </div>

                <div className="reservation-filters">
                    <div className="search-field">
                        <label htmlFor="reservation-search">
                            Cerca cliente, telefono o tavolo
                        </label>

                        <input
                            id="reservation-search"
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Es. Rossi, 333 oppure 108"
                        />
                    </div>

                    <div>
                        <label htmlFor="reservation-date">
                            Giorno
                        </label>

                        <input
                            id="reservation-date"
                            type="date"
                            value={selectedDate}
                            onChange={(event) =>
                                setSelectedDate(event.target.value)
                            }
                        />
                    </div>

                    <div>
                        <label htmlFor="reservation-room">
                            Zona
                        </label>

                        <select
                            id="reservation-room"
                            value={selectedRoom}
                            onChange={(event) =>
                                setSelectedRoom(event.target.value)
                            }
                        >
                            <option value="all">Tutte le zone</option>
                            <option value="Sala">Sala</option>
                            <option value="Patio">Patio</option>
                            <option value="Esterno">Esterno</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="reservation-status">
                            Stato
                        </label>

                        <select
                            id="reservation-status"
                            value={selectedStatus}
                            onChange={(event) =>
                                setSelectedStatus(event.target.value)
                            }
                        >
                            <option value="all">Tutti gli stati</option>
                            <option value="booked">Prenotata</option>
                            <option value="confirmed">
                                Cliente arrivato
                            </option>
                            <option value="completed">Terminata</option>
                            <option value="cancelled">Annullata</option>
                        </select>
                    </div>

                    <button
                        type="button"
                        className="clear-filters-button"
                        onClick={clearFilters}
                    >
                        Azzera filtri
                    </button>
                </div>

                {loading ? (
                    <div className="reservations-message">
                        Caricamento prenotazioni...
                    </div>
                ) : filteredReservations.length === 0 ? (
                    <div className="reservations-message">
                        Nessuna prenotazione trovata con questi filtri.
                    </div>
                ) : (
                    <div className="service-agenda">
                        {filteredReservations.map((reservation) => {
                            const fullName =
                                getFullName(reservation) ||
                                "Cliente senza nome";

                            const selectedTables = Array.isArray(
                                reservation.tables
                            )
                                ? reservation.tables
                                : [];

                            return (
                                <article
                                    className={`agenda-row agenda-${reservation.status}`}
                                    key={reservation.id}
                                >
                                    <div className="agenda-time">
                                        {reservation.time?.slice(0, 5)}
                                    </div>

                                    <div className="agenda-main">
                                        <div className="agenda-customer">
                                            <span className="reservation-number">
                                                #{reservation.id}
                                            </span>

                                            <h3>{fullName}</h3>

                                            <p>
                                                {reservation.people} coperti ·{" "}
                                                {reservation.room}
                                            </p>
                                        </div>

                                        <div className="agenda-tables">
                                            <span>Tavoli</span>

                                            <strong>
                                                {selectedTables.length
                                                    ? selectedTables.join(", ")
                                                    : "Non assegnati"}
                                            </strong>
                                        </div>

                                        <div className="agenda-contact">
                                            <span>Telefono</span>

                                            <strong>
                                                {reservation.phone ||
                                                    "Non disponibile"}
                                            </strong>
                                        </div>

                                        <div className="agenda-status-control">
                                            <label
                                                htmlFor={`status-${reservation.id}`}
                                            >
                                                Stato
                                            </label>

                                            <select
                                                id={`status-${reservation.id}`}
                                                value={reservation.status}
                                                onChange={(event) =>
                                                    updateStatus(
                                                        reservation.id,
                                                        event.target.value
                                                    )
                                                }
                                            >
                                                <option value="booked">
                                                    Prenotata
                                                </option>

                                                <option value="confirmed">
                                                    Cliente arrivato
                                                </option>

                                                <option value="completed">
                                                    Terminata
                                                </option>

                                                <option value="cancelled">
                                                    Annullata
                                                </option>
                                            </select>
                                        </div>
                                    </div>

                                    {reservation.notes && (
                                        <div className="agenda-notes">
                                            <strong>Note:</strong>{" "}
                                            {reservation.notes}
                                        </div>
                                    )}

                                    <div className="agenda-actions">
                                        <span
                                            className={`reservation-status status-${reservation.status}`}
                                        >
                                            {getStatusLabel(reservation.status)}
                                        </span>

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