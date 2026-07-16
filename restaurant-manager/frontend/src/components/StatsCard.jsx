import "./StatsCard.css";

function StatsCard({ title, value, icon }) {
    return (
        <div className="stats-card">
            <div className="stats-icon">{icon}</div>

            <div className="stats-info">
                <h3>{title}</h3>
                <h2>{value}</h2>
            </div>
        </div>
    );
}

export default StatsCard;