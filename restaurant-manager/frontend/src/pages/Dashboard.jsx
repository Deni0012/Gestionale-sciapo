import "./Dashboard.css";

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

        </div>
    );
}

export default Dashboard;