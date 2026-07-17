import { useEffect, useState } from "react";
import api from "../services/api";
import StatsCard from "../components/StatsCard";
import TablesMap from "../components/TablesMap";
import "./Dashboard.css";

function getToday() {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(
        today.getMonth() + 1
    ).padStart(2, "0");
    const day = String(
        today.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatItalianDate(value) {
    if (!value) return "";

    const [year, month, day] = value.split("-");

    const date = new Date(
        Number(year),
        Number(month) - 1,
        Number(day)
    );

    return new Intl.DateTimeFormat("it-IT", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
    }).format(date);
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

function Dashboard() {
    const [selectedDate, setSelectedDate] =
        useState(getToday());

    const [dashboardData, setDashboardData] = useState({
        stats: {
            reservations: 0,
            people: 0,
            assignedTables: 0,
            freeTables: 90,
            totalTables: 90,
        },
        arrivals: [],
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadDashboard() {
            try {
                setLoading(true);
                setError("");

                const response = await api.get("/dashboard", {
                    params: {
                        date: selectedDate,
                    },
                });

                setDashboardData(response.data);
            } catch (requestError) {
                console.error(
                    "Errore caricamento Dashboard:",
                    requestError
                );

                setError(
                    requestError.response?.data?.message ||
                    "Impossibile caricare i dati della Dashboard."
                );
            } finally {
                setLoading(false);
            }
        }

        loadDashboard();
    }, [selectedDate]);

    const { stats, arrivals } = dashboardData;

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <div>
                    <span className="dashboard-eyebrow">
                        Servizio del ristorante
                    </span>

                    <h1>Dashboard</h1>

                    <p className="dashboard-date-label">
                        {formatItalianDate(selectedDate)}
                    </p>
                </div>

                <div className="dashboard-date-selector">
                    <label htmlFor="dashboard-date">
                        Seleziona giorno
                    </label>

                    <input
                        id="dashboard-date"
                        type="date"
                        value={selectedDate}
                        onChange={(event) =>
                            setSelectedDate(event.target.value)
                        }
                    />
                </div>
            </div>

            {error && (
                <div className="dashboard-error">
                    {error}
                </div>
            )}

            <div className="stats-grid">
                <StatsCard
                    title="Prenotazioni"
                    value={loading ? "..." : stats.reservations}
                    icon="📅"
                    subtitle="Prenotazioni attive"
                />

                <StatsCard
                    title="Coperti"
                    value={loading ? "..." : stats.people}
                    icon="👥"
                    subtitle="Persone prenotate"
                />

                <StatsCard
                    title="Tavoli assegnati"
                    value={
                        loading
                            ? "..."
                            : `${stats.assignedTables} / ${stats.totalTables}`
                    }
                    icon="🍽️"
                    subtitle="Tavoli utilizzati"
                />

                <StatsCard
                    title="Tavoli liberi"
                    value={loading ? "..." : stats.freeTables}
                    icon="🟢"
                    subtitle="Disponibili nel servizio"
                />
            </div>

            <section className="dashboard-section">
                <div className="section-heading">
                    <div>
                        <span className="section-eyebrow">
                            Agenda
                        </span>

                        <h2>Arrivi della serata</h2>
                    </div>

                    <span className="arrivals-count">
                        {arrivals.length} arrivi
                    </span>
                </div>

                {loading ? (
                    <div className="dashboard-message">
                        Caricamento arrivi...
                    </div>
                ) : arrivals.length === 0 ? (
                    <div className="dashboard-message">
                        Nessuna prenotazione per questa data.
                    </div>
                ) : (
                    <div className="arrivals">
                        {arrivals.map((reservation) => {
                            const fullName = [
                                reservation.first_name,
                                reservation.last_name,
                            ]
                                .filter(Boolean)
                                .join(" ");

                            return (
                                <article
                                    className="arrival-card"
                                    key={reservation.id}
                                >
                                    <div className="arrival-time">
                                        {reservation.time}
                                    </div>

                                    <div className="arrival-content">
                                        <div className="arrival-header">
                                            <h3>
                                                {fullName ||
                                                    "Cliente senza nome"}
                                            </h3>

                                            <span
                                                className={`arrival-status status-${reservation.status}`}
                                            >
                                                {getStatusLabel(
                                                    reservation.status
                                                )}
                                            </span>
                                        </div>

                                        <div className="arrival-details">
                                            <p>
                                                <strong>👥</strong>{" "}
                                                {reservation.people} persone
                                            </p>

                                            <p>
                                                <strong>🏠</strong>{" "}
                                                {reservation.room}
                                            </p>

                                            <p>
                                                <strong>🍽️</strong>{" "}
                                                Tavoli{" "}
                                                {reservation.tables?.length
                                                    ? reservation.tables.join(", ")
                                                    : "non assegnati"}
                                            </p>

                                            <p>
                                                <strong>📞</strong>{" "}
                                                {reservation.phone ||
                                                    "Telefono non disponibile"}
                                            </p>
                                        </div>

                                        {reservation.notes && (
                                            <div className="arrival-notes">
                                                {reservation.notes}
                                            </div>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

            <section className="dashboard-section">
                <div className="section-heading">
                    <div>
                        <span className="section-eyebrow">
                            Situazione tavoli
                        </span>

                        <h2>Piantina del ristorante</h2>
                    </div>
                </div>

                <TablesMap />
            </section>
        </div>
    );
}

export default Dashboard;