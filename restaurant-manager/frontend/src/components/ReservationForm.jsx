import { useEffect, useState } from "react";
import { rooms } from "../data/restaurantData";
import { timeSlots } from "../data/timeSlots";
import { getAvailableTables } from "../services/api";

function getToday() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function createEmptyReservation() {
    return {
        date: getToday(),
        time: "",
        customer: "",
        phone: "",
        people: "",
        room: "Sala",
        tables: [],
        notes: "",
        status: "booked",
    };
}

function ReservationForm({
    onAdd,
    onUpdate,
    editingReservation,
    onCancelEdit,
}) {
    const [reservation, setReservation] = useState(
        createEmptyReservation()
    );

    const [availableTables, setAvailableTables] = useState([]);
    const [loadingTables, setLoadingTables] = useState(false);
    const [tablesError, setTablesError] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!editingReservation) {
            setReservation(createEmptyReservation());
            return;
        }

        const customer = [
            editingReservation.first_name,
            editingReservation.last_name,
        ]
            .filter(Boolean)
            .join(" ");

        setReservation({
            date: editingReservation.date?.slice(0, 10) || getToday(),
            time: editingReservation.time?.slice(0, 5) || "",
            customer,
            phone: editingReservation.phone || "",
            people: editingReservation.people || "",
            room: editingReservation.room || "Sala",
            tables: Array.isArray(editingReservation.tables)
                ? editingReservation.tables.map(Number)
                : [],
            notes: editingReservation.notes || "",
            status: editingReservation.status || "booked",
        });
    }, [editingReservation]);

    useEffect(() => {
        async function loadTables() {
            if (
                !reservation.date ||
                !reservation.time ||
                !reservation.room
            ) {
                setAvailableTables([]);
                setTablesError("");
                return;
            }

            try {
                setLoadingTables(true);
                setTablesError("");

                const result = await getAvailableTables({
                    date: reservation.date,
                    time: reservation.time,
                    room: reservation.room,
                    reservationId: editingReservation?.id,
                });

                setAvailableTables(result);
            } catch (error) {
                console.error(
                    "Errore caricamento tavoli disponibili:",
                    error
                );

                setAvailableTables([]);

                setTablesError(
                    error.response?.data?.message ||
                    "Impossibile caricare i tavoli disponibili."
                );
            } finally {
                setLoadingTables(false);
            }
        }

        loadTables();
    }, [
        reservation.date,
        reservation.time,
        reservation.room,
        editingReservation?.id,
    ]);

    function handleChange(event) {
        const { name, value } = event.target;

        setReservation((previous) => ({
            ...previous,
            [name]: value,
            ...(name === "date" ||
                name === "time" ||
                name === "room"
                ? { tables: [] }
                : {}),
        }));
    }

    function handleTableToggle(tableNumber) {
        const normalizedNumber = Number(tableNumber);

        setReservation((previous) => {
            const alreadySelected =
                previous.tables.includes(normalizedNumber);

            const updatedTables = alreadySelected
                ? previous.tables.filter(
                    (number) => number !== normalizedNumber
                )
                : [...previous.tables, normalizedNumber];

            return {
                ...previous,
                tables: updatedTables.sort(
                    (first, second) => first - second
                ),
            };
        });
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (
            !reservation.date ||
            !reservation.time ||
            !reservation.customer.trim() ||
            !reservation.phone.trim() ||
            !reservation.people ||
            !reservation.room ||
            reservation.tables.length === 0
        ) {
            alert(
                "Compila tutti i campi obbligatori e seleziona almeno un tavolo."
            );
            return;
        }

        const peopleNumber = Number(reservation.people);

        if (
            !Number.isInteger(peopleNumber) ||
            peopleNumber < 1
        ) {
            alert("Inserisci un numero di persone valido.");
            return;
        }

        const payload = {
            date: reservation.date,
            time: reservation.time,
            customer: reservation.customer.trim(),
            phone: reservation.phone.trim(),
            people: peopleNumber,
            room: reservation.room,
            tables: reservation.tables.map(Number),
            notes: reservation.notes.trim(),
            status: reservation.status,
        };

        try {
            setSaving(true);

            if (editingReservation) {
                await onUpdate(editingReservation.id, payload);
            } else {
                await onAdd(payload);
            }

            setReservation(createEmptyReservation());
            setAvailableTables([]);
        } finally {
            setSaving(false);
        }
    }

    function handleCancel() {
        setReservation(createEmptyReservation());
        setAvailableTables([]);
        setTablesError("");
        onCancelEdit();
    }

    return (
        <div className="form">
            <h2>
                {editingReservation
                    ? `Modifica prenotazione #${editingReservation.id}`
                    : "Nuova Prenotazione"}
            </h2>

            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="date">Data</label>

                    <input
                        id="date"
                        type="date"
                        name="date"
                        value={reservation.date}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div>
                    <label htmlFor="time">Orario</label>

                    <select
                        id="time"
                        name="time"
                        value={reservation.time}
                        onChange={handleChange}
                        required
                    >
                        <option value="">Seleziona orario</option>

                        {timeSlots.map((slot) => (
                            <option key={slot} value={slot}>
                                {slot}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label htmlFor="customer">Nome cliente</label>

                    <input
                        id="customer"
                        type="text"
                        name="customer"
                        value={reservation.customer}
                        onChange={handleChange}
                        placeholder="Mario Rossi"
                        required
                    />
                </div>

                <div>
                    <label htmlFor="phone">Telefono</label>

                    <input
                        id="phone"
                        type="tel"
                        name="phone"
                        value={reservation.phone}
                        onChange={handleChange}
                        placeholder="3331234567"
                        required
                    />
                </div>

                <div>
                    <label htmlFor="people">Persone</label>

                    <input
                        id="people"
                        type="number"
                        name="people"
                        min="1"
                        value={reservation.people}
                        onChange={handleChange}
                        placeholder="Anche 18, 20 o 30"
                        required
                    />
                </div>

                <div>
                    <label htmlFor="room">Zona</label>

                    <select
                        id="room"
                        name="room"
                        value={reservation.room}
                        onChange={handleChange}
                        required
                    >
                        {rooms.map((room) => (
                            <option key={room.id} value={room.name}>
                                {room.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label htmlFor="status">Stato</label>

                    <select
                        id="status"
                        name="status"
                        value={reservation.status}
                        onChange={handleChange}
                    >
                        <option value="booked">Prenotata</option>
                        <option value="confirmed">
                            Cliente arrivato
                        </option>
                        <option value="completed">Terminata</option>
                        <option value="cancelled">Annullata</option>
                    </select>
                </div>

                <div className="tables-selection">
                    <label>Tavoli disponibili</label>

                    {!reservation.time && (
                        <p className="form-help">
                            Seleziona prima data e orario.
                        </p>
                    )}

                    {loadingTables && (
                        <p className="form-help">
                            Caricamento tavoli disponibili...
                        </p>
                    )}

                    {tablesError && (
                        <p className="form-error">{tablesError}</p>
                    )}

                    {!loadingTables &&
                        reservation.time &&
                        !tablesError &&
                        availableTables.length === 0 && (
                            <p className="form-error">
                                Nessun tavolo disponibile per questa data e
                                questo orario.
                            </p>
                        )}

                    <div className="table-options">
                        {availableTables.map((table) => {
                            const tableNumber = Number(
                                table.table_number
                            );

                            const selected =
                                reservation.tables.includes(tableNumber);

                            return (
                                <button
                                    key={tableNumber}
                                    type="button"
                                    className={`table-option ${selected ? "selected" : ""
                                        }`}
                                    onClick={() =>
                                        handleTableToggle(tableNumber)
                                    }
                                >
                                    Tavolo {tableNumber}
                                </button>
                            );
                        })}
                    </div>

                    {reservation.tables.length > 0 && (
                        <div className="selected-tables">
                            Tavoli selezionati:{" "}
                            <strong>
                                {reservation.tables.join(", ")}
                            </strong>
                        </div>
                    )}
                </div>

                <div className="form-notes">
                    <label htmlFor="notes">Note</label>

                    <textarea
                        id="notes"
                        name="notes"
                        value={reservation.notes}
                        onChange={handleChange}
                        placeholder="Compleanno, allergie, richieste..."
                    />
                </div>

                <div className="form-actions">
                    <button
                        type="submit"
                        disabled={saving || loadingTables}
                    >
                        {saving
                            ? "Salvataggio..."
                            : editingReservation
                                ? "Salva modifiche"
                                : "Salva prenotazione"}
                    </button>

                    {editingReservation && (
                        <button
                            type="button"
                            className="secondary-button"
                            onClick={handleCancel}
                            disabled={saving}
                        >
                            Annulla modifica
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}

export default ReservationForm;