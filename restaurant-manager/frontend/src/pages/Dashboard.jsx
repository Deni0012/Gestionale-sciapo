import "./Dashboard.css";
import TablesMap from "../components/TablesMap";
import { reservations } from "../data/reservations"
import StatsCard from "../components/StatsCard";

function Dashboard() {
    return (
        <div className="dashboard">

            <h1>Dashboard</h1>

            <div className="stats-grid">

                <StatsCard
                    title="Prenotazioni"
                    value="18"
                    icon="📅"
                />

                <StatsCard
                    title="Coperti"
                    value="76"
                    icon="👥"
                />

                <StatsCard
                    title="Tavoli Occupati"
                    value="9 / 90"
                    icon="🍽️"
                />

                <StatsCard
                    title="Sale"
                    value="3"
                    icon="🏠"
                />

            </div>

            <h2 style={{ marginTop: "40px" }}>
                Arrivi di oggi

            </h2>

            <div className="arrivals">
                {reservations.map((reservation) => (
                    <div className="arrival-card" key={reservation.id}>
                        <h3>{reservation.customer}</h3>
                        <p>🕒 {reservation.time}</p>

                        <p>🍽 Tavolo {reservation.table}</p>

                        <p>👥 {reservation.people} persone</p>

                    </div>
                ))}

            </div>
            <TablesMap />
        </div>
    );
}

export default Dashboard;