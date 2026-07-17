import "./StatsCard.css";

function StatsCard({
    title,
    value,
    icon,
    subtitle,
}) {
    return (
        <article className="stats-card">
            <div className="stats-icon">
                {icon}
            </div>

            <div className="stats-info">
                <span className="stats-title">
                    {title}
                </span>

                <strong className="stats-value">
                    {value}
                </strong>

                {subtitle && (
                    <span className="stats-subtitle">
                        {subtitle}
                    </span>
                )}
            </div>
        </article>
    );
}

export default StatsCard;