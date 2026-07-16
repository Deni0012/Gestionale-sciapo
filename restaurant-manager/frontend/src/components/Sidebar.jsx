import "./Sidebar.css";
import { NavLink } from "react-router-dom";

function Sidebar() {

    return (

        <aside className="sidebar">

            <h2 className="logo">🍽️ RM</h2>

            <nav>

                <ul>
                    <li>
                        <NavLink to="/">🏠 Dashboard</NavLink>
                    </li>

                    <li>
                        <NavLink to="/prenotazioni">📅 Prenotazioni</NavLink>
                    </li>

                    <li>
                        <NavLink to="/tavoli">🪑 Tavoli</NavLink>
                    </li>

                    <li>
                        <NavLink to="/clienti">👥 Clienti</NavLink>
                    </li>

                    <li>
                        <NavLink to="/statistiche">📊 Statistiche</NavLink>
                    </li>

                    <li>
                        <NavLink to="/impostazioni">⚙️ Impostazioni</NavLink>
                    </li>
                </ul>
            </nav>

        </aside>

    );

}

export default Sidebar;