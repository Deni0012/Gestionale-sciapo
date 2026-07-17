import { useEffect, useState } from "react";
import api from "../services/api";
import "./TableMap.css";

function getToday() {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getStatusLabel(status) {
    const labels = {
        free: "Libero",
        booked: "Prenotato",
        busy: "Occupato",
        out: "Fuori servizio",
    };

    return labels[status] || "Libero";
}

function TablesMap({ date = getToday() }) {
    const [rooms, setRooms] = useState([]);
    const [selectedTable, setSelectedTable] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    async function loadTables() {
        try {
            setLoading(true);
            setError("");

            const response = await api.get("/tables-map", {
                params: {
                    date,
                },
            });

            setRooms(response.data.rooms);
        } catch (requestError) {
            console.error(
                "Errore caricamento piantina:",
                requestError
            );

            setError(
                requestError.response?.data?.message ||
                "Impossibile caricare la piantina."
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadTables();
    }, [date]);

    async function updateReservationStatus(
        reservationId,
        status
    ) {
        try {
            await api.patch(
                `/reservations/${reservationId}/status`,
                {
                    status,
                }
            );

            setSelectedTable(null);
            await loadTables();
        } catch (requestError) {
            console.error(
                "Errore aggiornamento stato:",
                requestError
            );

            alert(
                requestError.response?.data?.message ||
                "Impossibile aggiornare lo stato."
            );
        }
    }

    return (
        <div className="tables-map">
            <div className="tables-map-heading">
                <div>
                    <h2>Piantina tavoli</h2>
                    <p>
                        Clicca su un tavolo per vedere i dettagli.
                    </p>
                </div>

                <button
                    type="button"
                    className="refresh-tables-button"
                    onClick={loadTables}
                >
                    Aggiorna
                </button>
            </div>

            <div className="tables-legend">
                <span>
                    <i className="legend-dot free-dot" />
                    Libero
                </span>

                <span>
                    <i className="legend-dot booked-dot" />
                    Prenotato
                </span>

                <span>
                    <i className="legend-dot busy-dot" />
                    Occupato
                </span>

                <span>
                    <i className="legend-dot out-dot" />
                    Fuori servizio
                </span>
            </div>

            {loading ? (
                <div className="tables-message">
                    Caricamento tavoli...
                </div>
            ) : error ? (
                <div className="tables-message tables-error">
                    {error}
                </div>
            ) : (
                rooms.map((room) => (
                    <section key={room.id} className="room">
                        <div className="room-heading">
                            <h3>{room.name}</h3>

                            <span>
                                {
                                    room.tables.filter(
                                        (table) => table.status === "free"
                                    ).length
                                }{" "}
                                liberi
                            </span>
                        </div>

                        <div className="tables-grid">
                            {room.tables.map((table) => (
                                <button
                                    type="button"
                                    key={table.number}
                                    className={`table ${table.status}`}
                                    onClick={() => setSelectedTable(table)}
                                    title={`Tavolo ${table.number} - ${getStatusLabel(
                                        table.status
                                    )}`}
                                >
                                    <span className="table-number">
                                        {table.number}
                                    </span>

                                    <small>
                                        {getStatusLabel(table.status)}
                                    </small>
                                </button>
                            ))}
                        </div>
                    </section>
                ))
            )}

            {selectedTable && (
                <div
                    className="table-modal-overlay"
                    onClick={() => setSelectedTable(null)}
                >
                    <div
                        className="table-modal"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            type="button"
                            className="table-modal-close"
                            onClick={() => setSelectedTable(null)}
                        >
                            ×
                        </button>

                        <span
                            className={`table-modal-status ${selectedTable.status}`}
                        >
                            {getStatusLabel(selectedTable.status)}
                        </span>

                        <h2>Tavolo {selectedTable.number}</h2>

                        {!selectedTable.reservation ? (
                            <div className="empty-table-message">
                                Questo tavolo è libero.
                            </div>
                        ) : (
                            <>
                                <div className="table-reservation-details">
                                    <p>
                                        <strong>Cliente:</strong>{" "}
                                        {selectedTable.reservation.customer ||
                                            "Non disponibile"}
                                    </p>

                                    <p>
                                        <strong>Orario:</strong>{" "}
                                        {selectedTable.reservation.time}
                                    </p>

                                    <p>
                                        <strong>Coperti:</strong>{" "}
                                        {selectedTable.reservation.people}
                                    </p>

                                    <p>
                                        <strong>Telefono:</strong>{" "}
                                        {selectedTable.reservation.phone ||
                                            "Non disponibile"}
                                    </p>

                                    {selectedTable.reservation.notes && (
                                        <p>
                                            <strong>Note:</strong>{" "}
                                            {selectedTable.reservation.notes}
                                        </p>
                                    )}
                                </div>

                                <div className="table-modal-actions">
                                    {selectedTable.status === "booked" && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                updateReservationStatus(
                                                    selectedTable.reservation.id,
                                                    "confirmed"
                                                )
                                            }
                                        >
                                            Cliente arrivato
                                        </button>
                                    )}

                                    {selectedTable.status === "busy" && (
                                        <button
                                            type="button"
                                            className="complete-table-button"
                                            onClick={() =>
                                                updateReservationStatus(
                                                    selectedTable.reservation.id,
                                                    "completed"
                                                )
                                            }
                                        >
                                            Libera tavolo
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default TablesMap;